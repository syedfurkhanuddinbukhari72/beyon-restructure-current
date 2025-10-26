const { app, BrowserWindow, Menu, ipcMain, dialog, shell, globalShortcut } = require('electron');
const path = require('path');
const fs = require('fs');
const isDev = process.env.NODE_ENV === 'development' || process.env.ELECTRON_DEV === 'true';

// During development we intentionally run with less-secure defaults (nodeIntegration /
// contextIsolation disabled) so the Next.js dev server and HMR work. Electron will
// warn loudly about missing/weak Content-Security-Policy in that case which is useful
// for production but noisy during local development. Silence the warning in dev only.
if (isDev) {
  try {
    // Standard Electron environment variable to suppress the security warning banner
    // in development. This does NOT change runtime security guarantees and must NOT
    // be enabled in production builds.
    process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = 'true';
    console.log('[main] development mode: ELECTRON_DISABLE_SECURITY_WARNINGS=true');
  } catch (e) {
    // best-effort - continue if we cannot set the env
  }
}

let mainWindow;
// Keep preview windows referenced so they are not garbage-collected and closed unexpectedly
const previewWindows = new Set();

// Disable only developer tools shortcuts
function disableDevTools() {
  // Only block specific dev tools shortcuts, not our application shortcuts
  const devToolsShortcuts = [
    'F12',
    'Ctrl+Shift+I',
    'CmdOrCtrl+Alt+I',
    'CmdOrCtrl+Shift+I',
    'F8',
    'CmdOrCtrl+Shift+C',
    'CmdOrCtrl+Shift+J',
    'CmdOrCtrl+Option+J',
    'CmdOrCtrl+Option+I',
    'CmdOrCtrl+Option+U',
    'CmdOrCtrl+U',
    'CmdOrCtrl+Shift+U'
  ];

  // Unregister any existing shortcuts to prevent conflicts
  globalShortcut.unregisterAll();
  
  // Block dev tools shortcuts
  devToolsShortcuts.forEach(shortcut => {
    globalShortcut.register(shortcut, () => {
      console.log(`Developer shortcut ${shortcut} is disabled`);
      return false;
    });
  });
  
  // Re-register our application shortcuts
  const appShortcuts = [
    'Shift+A', // Active tab
    'Shift+R', // Ready tab
    'Shift+P', // Paid tab
    'Shift+H', // History tab
    'Shift+C', // Cancel order
    'Shift+L'  // Local orders
  ];
  
  appShortcuts.forEach(shortcut => {
    globalShortcut.unregister(shortcut);
  });
}

function createWindow() {
  const webPreferences = {
    preload: path.join(__dirname, 'preload.js'),
    contextIsolation: true,
    nodeIntegration: false,
    devTools: false, // Disable dev tools
    webSecurity: true,
    allowRunningInsecureContent: false,
    experimentalFeatures: false,
    webgl: false,
    plugins: false,
    sandbox: true
  };

  if (isDev) {
    // For development we opt into nodeIntegration so that webpack/Next dev
    // bundles that expect `require` succeed. We also disable context isolation
    // so the preload polyfills can reach the renderer. This is dev-only.
    webPreferences.contextIsolation = false;
    webPreferences.nodeIntegration = true;
  }

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    webPreferences,
    show: false,
    title: 'Beyon Admin Desktop',
    // Disable context menu
    contextMenu: false
  });

  // Disable menu bar
  mainWindow.setMenuBarVisibility(false);
  
  // Disable dev tools in production
  if (!isDev) {
    mainWindow.webContents.on('devtools-opened', () => {
      mainWindow.webContents.closeDevTools();
    });
  }

  // Determine what to load: prefer dev server when developing or when
  // the static `out/admin-unified/index.html` is present. This makes packaged builds render the correct page.
  const fs = require('fs');
  const adminIndexPath = path.join(__dirname, '..', 'beyon79', 'out', 'admin-unified', 'index.html');
  const indexPath = path.join(__dirname, '..', 'beyon79', 'out', 'index.html');

  const net = require('net');

  function probePort(port, timeout = 1000) {
    return new Promise((resolve) => {
      const socket = new net.Socket();
      let isDone = false;
      socket.setTimeout(timeout);
      socket.once('connect', () => { isDone = true; socket.destroy(); resolve(true); });
      socket.once('timeout', () => { if (!isDone) { isDone = true; socket.destroy(); resolve(false); } });
      socket.once('error', () => { if (!isDone) { isDone = true; socket.destroy(); resolve(false); } });
      socket.connect(port, '127.0.0.1');
    });
  }

  const tryLoadDev = async () => {
    const portsToTry = [3000, 3001, 3002];
    for (const p of portsToTry) {
      // eslint-disable-next-line no-await-in-loop
      const ok = await probePort(p);
      if (ok) {
  // Use explicit ?tab=Active to avoid potential redirects between
  // /admin-unified and /admin-unified/ in dev server setups.
  let devUrl = `http://localhost:${p}/admin-unified?tab=Active`;
        // Ensure no trailing slash to avoid potential redirect loops
        if (devUrl.endsWith('/')) devUrl = devUrl.replace(/\/+$/g, '');
        // Load the canonical dev URL (no trailing slash). The dev server is
        // already being waited-on by the parent script using this same URL.
        try {
          mainWindow.loadURL(devUrl).catch((err) => console.error('Failed to load dev URL', devUrl, err && err.message || err));
        } catch (err) {
          console.error('loadURL threw', err && err.message || err);
        }
        try { mainWindow.webContents.openDevTools(); } catch (e) {}
        return;
      }
    }
    // If none found, still try default and let it fail visibly
  let fallbackUrl = 'http://localhost:3000/admin-unified?tab=Active';
  if (fallbackUrl.endsWith('/')) fallbackUrl = fallbackUrl.replace(/\/+$/g, '');
    console.warn('No dev port open on', portsToTry, '- attempting', fallbackUrl);
  try { mainWindow.loadURL(fallbackUrl).catch((err) => console.error('Failed to load dev URL', fallbackUrl, err)); } catch (err) { console.error('loadURL threw', err && err.message || err); }
    try { mainWindow.webContents.openDevTools(); } catch (e) {}
  };

  if (isDev || process.env.ELECTRON_DEV === 'true') {
    tryLoadDev();
  } else {
    // In production, serve from static export directory. Use app.getAppPath()
    // so this works whether the app is packaged (app.asar) or run from source.
    const appRoot = app.getAppPath();
    // When packaged, resources live under process.resourcesPath. Use that when available
    // so path resolution works correctly with app.asar and unpacked builds.
    const resourcesPath = process.resourcesPath || path.join(appRoot, '..');
    // Try both an unpacked resources folder and inside the app.asar bundle
    const candidateDirs = [
      path.join(resourcesPath, 'beyon79', 'out'),
      path.join(appRoot, 'beyon79', 'out'),
      path.join(__dirname, '..', 'beyon79', 'out'),
      path.join(process.resourcesPath, 'app.asar', 'beyon79', 'out') // For ASAR packaged builds
    ];

    // Diagnostic logging to help when packaged paths differ on user systems
    console.log('Production path candidates:', { appRoot, resourcesPath, candidateDirs });

    // Find the first candidate that exists
    let foundExportDir = null;
    for (const d of candidateDirs) {
      try {
        if (fs.existsSync(d)) { foundExportDir = d; break; }
      } catch (e) {}
    }

    // If we found a static export, load it. Otherwise try to detect a
    // Next "standalone" server bundle and start it automatically.
    if (foundExportDir) {
      // Helpful listing to confirm what's inside the export dir
      try {
        const listed = fs.readdirSync(foundExportDir).slice(0, 50);
        console.log('Found exportDir, sample contents:', listed);
      } catch (e) { /* ignore listing errors */ }

      const adminFlat = path.join(foundExportDir, 'admin-unified.html');
      const adminDirIndex = path.join(foundExportDir, 'admin-unified', 'index.html');
      const rootIndex = path.join(foundExportDir, 'index.html');

      console.log('Attempting to load files from:', foundExportDir);
      if (fs.existsSync(adminFlat)) {
        console.log('Loading flat file:', adminFlat);
        mainWindow.loadFile(adminFlat).catch(err => console.error('Failed to load export file (flat):', err));
      } else if (fs.existsSync(adminDirIndex)) {
        console.log('Loading dir index:', adminDirIndex);
        mainWindow.loadFile(adminDirIndex).catch(err => console.error('Failed to load export file (dir):', err));
      } else if (fs.existsSync(rootIndex)) {
        console.log('Loading root index:', rootIndex);
        mainWindow.loadFile(rootIndex).catch(err => console.error('Failed to load export file (root):', err));
      } else {
        console.error('No admin index inside found exportDir:', foundExportDir);
        console.error('Available files:', fs.readdirSync(foundExportDir));
      }
    } else {
      // No static export. Try to find a Next standalone server bundle that
      // may have been packaged instead (typical when using `next build` with
      // `output: 'standalone'`). We expect a layout like:
      //   beyon79/.next/standalone/<appName>/server.js
      const standaloneCandidates = [
        path.join(resourcesPath, 'beyon79', '.next', 'standalone'),
        path.join(appRoot, 'beyon79', '.next', 'standalone'),
        path.join(__dirname, '..', 'beyon79', '.next', 'standalone')
      ];

      let standaloneRoot = null;
      for (const sc of standaloneCandidates) {
        try {
          if (fs.existsSync(sc)) { standaloneRoot = sc; break; }
        } catch (e) {}
      }

      if (standaloneRoot) {
        try {
          // Locate the inner app folder (e.g. standalone/<appName>)
          const children = fs.readdirSync(standaloneRoot).filter(x => x && x !== 'node_modules');
          // Prefer folder containing a server.js
          let appFolder = null;
          for (const c of children) {
            const candidate = path.join(standaloneRoot, c);
            const srv = path.join(candidate, 'server.js');
            if (fs.existsSync(srv)) { appFolder = candidate; break; }
          }
          // If server.js is at the top of standaloneRoot, use that
          if (!appFolder) {
            const topSrv = path.join(standaloneRoot, 'server.js');
            if (fs.existsSync(topSrv)) appFolder = standaloneRoot;
          }

          if (appFolder) {
            const { spawn } = require('child_process');
            const net = require('net');
            // Find a free port (try 3000..3100)
            const findFreePort = async () => {
              for (let p = 3000; p <= 3100; p++) {
                /* eslint-disable no-await-in-loop */
                const ok = await new Promise((resolve) => {
                  const s = net.createServer().once('error', () => resolve(false)).once('listening', () => s.close(() => resolve(true))).listen(p, '127.0.0.1');
                });
                if (ok) return p;
              }
              return 0;
            };

            (async () => {
              try {
                const port = await findFreePort();
                if (!port) throw new Error('no free port');
                const serverJs = fs.existsSync(path.join(appFolder, 'server.js')) ? path.join(appFolder, 'server.js') : path.join(standaloneRoot, 'server.js');
                console.log('Starting bundled Next standalone server:', serverJs, 'on port', port);
                const child = spawn(process.execPath || 'node', [serverJs], {
                  cwd: appFolder,
                  env: Object.assign({}, process.env, { PORT: String(port) }),
                  stdio: ['ignore', 'pipe', 'pipe']
                });

                child.stdout && child.stdout.on('data', (d) => console.log('[next-standalone]', d.toString().trim()));
                child.stderr && child.stderr.on('data', (d) => console.error('[next-standalone][err]', d.toString().trim()));

                // Ensure child is killed when app exits
                const killChild = () => {
                  try { child.kill(); } catch (e) {}
                };
                process.on('exit', killChild);
                process.on('SIGINT', killChild);
                process.on('SIGTERM', killChild);

                // Poll server readiness
                const http = require('http');
                const urlToLoad = `http://127.0.0.1:${port}/admin-unified?tab=Active`;
                const start = Date.now();
                const deadline = 20000; // 20s
                const ping = async () => {
                  return new Promise((resolve) => {
                    const req = http.get(urlToLoad, (res) => { res.destroy(); resolve(true); });
                    req.on('error', () => resolve(false));
                    req.setTimeout(1000, () => { req.destroy(); resolve(false); });
                  });
                };

                while (Date.now() - start < deadline) {
                  // eslint-disable-next-line no-await-in-loop
                  const up = await ping();
                  if (up) {
                    try {
                      mainWindow.loadURL(urlToLoad).catch((err) => console.error('Failed to load bundled standalone URL', urlToLoad, err));
                    } catch (err) { console.error('loadURL threw', err && err.message || err); }
                    return;
                  }
                  // small wait
                  // eslint-disable-next-line no-await-in-loop
                  await new Promise(r => setTimeout(r, 300));
                }
                console.error('Bundled standalone server did not become ready within timeout');
              } catch (e) {
                console.error('Failed to start bundled Next standalone server', e && e.message || e);
              }
            })();
            return;
          }
        } catch (e) {
          console.error('Error while attempting to start standalone server fallback', e && e.message || e);
        }
      }

      console.error('No exported HTML found in any candidate dirs', candidateDirs, ' appRoot:', appRoot);
    }
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

app.whenReady().then(() => {
  // Disable dev tools shortcuts
  disableDevTools();
  
  createWindow();
  // Track double press for 'm' key
  let lastMPress = 0;
  // Track double press for 'b' and 'p' keys (print/bill)
  let lastBPress = 0;
  let lastPPress = 0;
  // Register global shortcuts that work even when app is not focused
  globalShortcut.register('Shift+A', () => {
    console.log('[globalShortcut] Shift+A pressed');
    const payload = { action: 'switch_to_active_tab' };
    if (mainWindow && mainWindow.webContents) {
      mainWindow.webContents.send('app-shortcut', payload);
      console.log('[globalShortcut] sent switch_to_active_tab');
    }
  });
  globalShortcut.register('Shift+R', () => {
    console.log('[globalShortcut] Shift+R pressed');
    const payload = { action: 'switch_to_ready_tab' };
    if (mainWindow && mainWindow.webContents) {
      mainWindow.webContents.send('app-shortcut', payload);
      console.log('[globalShortcut] sent switch_to_ready_tab');
    }
  });
  globalShortcut.register('Shift+P', () => {
    console.log('[globalShortcut] Shift+P pressed');
    const payload = { action: 'switch_to_paid_tab' };
    if (mainWindow && mainWindow.webContents) {
      mainWindow.webContents.send('app-shortcut', payload);
      console.log('[globalShortcut] sent switch_to_paid_tab');
    }
  });
  globalShortcut.register('Shift+H', () => {
    console.log('[globalShortcut] Shift+H pressed');
    const payload = { action: 'switch_to_archive_tab' };
    if (mainWindow && mainWindow.webContents) {
      mainWindow.webContents.send('app-shortcut', payload);
      console.log('[globalShortcut] sent switch_to_archive_tab');
    }
  });
  globalShortcut.register('Shift+C', () => {
    console.log('[globalShortcut] Shift+C pressed');
    const payload = { action: 'open_cart' };
    if (mainWindow && mainWindow.webContents) {
      mainWindow.webContents.send('app-shortcut', payload);
      console.log('[globalShortcut] sent open_cart');
    }
  });
  globalShortcut.register('Shift+L', () => {
    console.log('[globalShortcut] Shift+L pressed');
    const payload = { action: 'local_mode' };
    if (mainWindow && mainWindow.webContents) {
      mainWindow.webContents.send('app-shortcut', payload);
      console.log('[globalShortcut] sent local_mode');
    }
  });
  globalShortcut.register('m', () => {
    console.log('[globalShortcut] m pressed');
    const now = Date.now();
    if (now - lastMPress < 500) {
      // Double press detected
      console.log('[globalShortcut] double m detected, opening manual order complete');
      const payload = { action: 'open_manual_order_complete' };
      if (mainWindow && mainWindow.webContents) {
        mainWindow.webContents.send('app-shortcut', payload);
        console.log('[globalShortcut] sent open_manual_order_complete');
      }
    }
    lastMPress = now;
  });
  globalShortcut.register('b', () => {
    console.log('[globalShortcut] b pressed');
    const now = Date.now();
    if (now - lastBPress < 500) {
      console.log('[globalShortcut] double b detected, opening bill');
      const payload = { action: 'open_bill' };
      if (mainWindow && mainWindow.webContents) {
        mainWindow.webContents.send('app-shortcut', payload);
        console.log('[globalShortcut] sent open_bill');
      }
    }
    lastBPress = now;
  });
  globalShortcut.register('p', () => {
    console.log('[globalShortcut] p pressed');
    const now = Date.now();
    if (now - lastPPress < 500) {
      console.log('[globalShortcut] double p detected, printing current order');
      const payload = { action: 'print_current' };
      if (mainWindow && mainWindow.webContents) {
        mainWindow.webContents.send('app-shortcut', payload);
        console.log('[globalShortcut] sent print_current');
      }
    }
    lastPPress = now;
  });
  globalShortcut.register('Shift+Backspace', () => {
    console.log('[globalShortcut] Shift+Backspace pressed');
    const payload = { action: 'go_back' };
    if (mainWindow && mainWindow.webContents) {
      mainWindow.webContents.send('app-shortcut', payload);
      console.log('[globalShortcut] sent go_back');
    }
  });

  // Keep a small in-memory cache to suppress duplicate shortcut sends caused by
  // OS key-repeat or rapid successive events. This prevents duplicate IPC
  // deliveries reaching the renderer when a key is held or the accelerator
  // fires multiple times.
  const recentShortcuts = new Map();
  function sendAppShortcut(payload) {
    try {
      const action = payload && payload.action;
      const now = Date.now();
      if (action) {
        const lastTs = recentShortcuts.get(action) || 0;
        if (now - lastTs < 350) {
          console.log('[menu] shortcut suppressed duplicate', action);
          return;
        }
        recentShortcuts.set(action, now);
      }
      if (mainWindow && mainWindow.webContents) {
        mainWindow.webContents.send('app-shortcut', payload);
        console.log('[menu] shortcut sent', action || JSON.stringify(payload));
      }
    } catch (e) {
      console.warn('[menu] sendAppShortcut error', e && e.message);
    }
  }
  // Simple menu
  const template = [
    {
      label: 'File',
      submenu: [
        { role: 'quit' }
      ]
    },
    {
      label: 'Shortcuts',
      submenu: [
        {
          label: 'Active tab',
          accelerator: 'Shift+A',
          click: () => {
            console.log('[menu] shortcut Active tab (Shift+A) clicked');
            const payload = { action: 'switch_to_active_tab' };
            // Use main-side dedupe/send helper
            sendAppShortcut(payload);
          }
        },
        {
          label: 'Ready tab',
          accelerator: 'Shift+R',
          click: () => {
            console.log('[menu] shortcut Ready tab (Shift+R) clicked');
            const payload = { action: 'switch_to_ready_tab' };
            // Use main-side dedupe/send helper
            sendAppShortcut(payload);
          }
        },
        {
          label: 'Paid tab',
          accelerator: 'Shift+P',
          click: () => {
            console.log('[menu] shortcut Paid tab (Shift+P) clicked');
            const payload = { action: 'switch_to_paid_tab' };
            // Use main-side dedupe/send helper
            sendAppShortcut(payload);
          }
        },
        {
          label: 'Archive tab',
          accelerator: 'Shift+H',
          click: () => {
            console.log('[menu] shortcut Archive tab (Shift+H) clicked');
            const payload = { action: 'switch_to_archive_tab' };
            // Use main-side dedupe/send helper
            sendAppShortcut(payload);
          }
        },
        {
          label: 'Cancel order',
          accelerator: 'Shift+C',
          click: () => {
            console.log('[menu] shortcut Cancel order (Shift+C) clicked');
            const payload = { action: 'cancel_order' };
            // Use main-side dedupe/send helper
            sendAppShortcut(payload);
          }
        },
        {
          label: 'Local orders',
          accelerator: 'Shift+L',
          click: () => {
            console.log('[menu] shortcut Local orders (Shift+L) clicked');
            const payload = { action: 'local_mode' };
            if (mainWindow && mainWindow.webContents) {
              mainWindow.webContents.send('app-shortcut', payload);
              try { mainWindow.webContents.executeJavaScript(`window.postMessage(${JSON.stringify({ type: 'app-shortcut', payload })}, '*')`).catch(()=>{}); } catch (e) { console.warn('[menu] executeJavaScript fallback failed', e && e.message); }
            }
          }
        }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'toggledevtools' }
      ]
    }
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

ipcMain.handle('app-version', () => app.getVersion());
ipcMain.handle('show-save-dialog', async (_, opts) => {
  return await dialog.showSaveDialog(opts || {});
});

ipcMain.handle('print-receipt', async (_, { order, options = {} } = {}) => {
  return await printReceiptJob(order, options);
});

// Helper: try printing using ESC/POS (network or USB) if module available.
async function printWithEscPos(order, printerConfig = {}) {
  try {
    // Try to require optional escpos libraries; they may not be installed.
    let escpos, Device, Printer;
    try {
      escpos = require('escpos');
      // modern escpos has Device and Printer exports
      Device = escpos.Device || escpos.USB || escpos.Network;
      Printer = escpos.Printer || escpos.Printer;
    } catch (e) {
      console.warn('[printWithEscPos] escpos module not installed. Install `escpos` or `node-thermal-printer` to enable raw printing.', e && e.message);
      return { success: false, failureReason: 'escpos module not installed' };
    }

    // Support network or usb configs
    const { type = 'network', host, port = 9100, path: devicePath } = printerConfig || {};
    let device;
    if (type === 'network' && host) {
      device = new escpos.Network(host, port);
    } else if (type === 'usb' && devicePath) {
      device = new escpos.USB();
    } else {
      // fallback: attempt default USB device
      try { device = new escpos.USB(); } catch (e) { /* ignore */ }
    }

    if (!device) return { success: false, failureReason: 'No escpos device created' };

    const printer = new escpos.Printer(device);
    return await new Promise((resolve) => {
      try {
        device.open(() => {
          try {
            printer
              .encode('utf8')
              .font('a')
              .align('lt')
              .text(`Order: ${order && order._id ? order._id : ''}`)
              .text('----------------')
              .text(order.items ? order.items.map((it) => `${it.name} x${it.quantity || 1} ₹${it.price || ''}`).join('\n') : '')
              .text('----------------')
              .text(`Total: ₹${order.total || order.amount || 0}`)
              .cut()
              .close();
            resolve({ success: true });
          } catch (err) {
            resolve({ success: false, failureReason: String(err) });
          }
        });
      } catch (err) {
        resolve({ success: false, failureReason: String(err) });
      }
    });
  } catch (e) {
    return { success: false, failureReason: String(e) };
  }
}

// Helper: send raw ESC/POS bytes over TCP to a networked thermal printer (port 9100)
async function printWithTcpEscPos(order, printerConfig = {}) {
  try {
    const { host, port = 9100, shopName = 'BEYON79' } = printerConfig || {};
    if (!host) return { success: false, failureReason: 'No host provided' };
    const net = require('net');
    return await new Promise((resolve) => {
      const socket = new net.Socket();
      let resolved = false;
      socket.setTimeout(5000);
      socket.once('error', (err) => {
        if (!resolved) { resolved = true; resolve({ success: false, failureReason: String(err) }); }
      });
      socket.once('timeout', () => {
        if (!resolved) { resolved = true; resolve({ success: false, failureReason: 'Socket timeout' }); socket.destroy(); }
      });
      socket.connect(port, host, () => {
        try {
          // Basic ESC/POS sequence: init, center header, left body, cut
          const ESC = '\x1B';
          const GS = '\x1D';
          const init = Buffer.from(ESC + '@', 'binary');
          const alignCenter = Buffer.from(ESC + 'a' + '\x01', 'binary');
          const alignLeft = Buffer.from(ESC + 'a' + '\x00', 'binary');
          const boldOn = Buffer.from(ESC + 'E' + '\x01', 'binary');
          const boldOff = Buffer.from(ESC + 'E' + '\x00', 'binary');
          const cut = Buffer.from(GS + 'V' + '\x00', 'binary');

          const pieces = [init, alignCenter, boldOn, Buffer.from(String(shopName) + '\n', 'utf8'), boldOff, alignLeft, Buffer.from('----------------\n', 'utf8')];

          (order.items || []).forEach((it) => {
            const name = (it.name || '').replace(/\t|\r|\n/g, ' ');
            const qty = it.qty || it.quantity || 1;
            const price = typeof it.price === 'number' ? (`₹${it.price}`) : (it.price || '');
            pieces.push(Buffer.from(`${name} x${qty} ${price}\n`, 'utf8'));
          });

          pieces.push(Buffer.from('----------------\n', 'utf8'));
          pieces.push(Buffer.from(`Total: ₹${order.total || 0}\n`, 'utf8'));
          pieces.push(Buffer.from('\n\n', 'utf8'));
          pieces.push(cut);

          const payload = Buffer.concat(pieces);
          socket.write(payload);
          // give the printer a moment to process then end
          setTimeout(() => {
            try { socket.end(); } catch (e) {}
            if (!resolved) { resolved = true; resolve({ success: true }); }
          }, 200);
        } catch (err) {
          if (!resolved) { resolved = true; resolve({ success: false, failureReason: String(err) }); }
        }
      });
    });
  } catch (e) {
    return { success: false, failureReason: String(e) };
  }
}

// Simple wrapper (currently unused) for future spooler-specific operations
async function printWithSpooler(html, printerName, options = {}) {
  // For Windows spooler we already use webContents.print with deviceName in printReceiptJob.
  // This helper exists for clarity / future extension.
  return { success: false, failureReason: 'use webContents.print via printReceiptJob' };
}

// Return available system printers for the renderer to present a selection UI.
ipcMain.handle('list-printers', async (event) => {
  try {
    // Prefer the sender's webContents (the renderer that requested the list)
    const contents = event && event.sender;
    let printers = [];
    if (contents && typeof contents.getPrinters === 'function') {
      printers = contents.getPrinters();
    } else if (mainWindow && mainWindow.webContents && typeof mainWindow.webContents.getPrinters === 'function') {
      printers = mainWindow.webContents.getPrinters();
    }
    return { success: true, printers };
  } catch (e) {
    return { success: false, error: String(e) };
  }
});

// IPC: test a TCP connection to an ESC/POS network printer
ipcMain.handle('test-escpos-connection', async (_, { host, port = 9100, timeout = 3000 } = {}) => {
  try {
    if (!host) return { success: false, failureReason: 'No host provided' };
    const net = require('net');
    return await new Promise((resolve) => {
      const socket = new net.Socket();
      let finished = false;
      socket.setTimeout(timeout || 3000);
      socket.once('connect', () => {
        if (!finished) { finished = true; socket.destroy(); resolve({ success: true }); }
      });
      socket.once('timeout', () => {
        if (!finished) { finished = true; socket.destroy(); resolve({ success: false, failureReason: 'Connection timed out' }); }
      });
      socket.once('error', (err) => {
        if (!finished) { finished = true; socket.destroy(); resolve({ success: false, failureReason: String(err) }); }
      });
      socket.connect(Number(port || 9100), host);
    });
  } catch (e) {
    return { success: false, failureReason: String(e) };
  }
});

async function printReceiptJob(order, options = {}) {
  try {
    // If caller explicitly requested ESC/POS printing, attempt that first
    if (options && (options.method === 'escpos' || options.useEscPos === true)) {
      try {
        const escRes = await printWithEscPos(order, options.printerConfig || {});
        // If successful or a definitive failure, return it
        if (escRes && typeof escRes.success === 'boolean') return escRes;
      } catch (e) {
        console.warn('[printReceiptJob] escpos attempt failed, falling back to spooler', e && e.message);
      }
    }
    // Support direct TCP ESC/POS method (no native deps) for network printers
    if (options && options.method === 'tcp-escpos') {
      try {
        const tcpRes = await printWithTcpEscPos(order, options.printerConfig || {});
        if (tcpRes && typeof tcpRes.success === 'boolean') return tcpRes;
      } catch (e) {
        console.warn('[printReceiptJob] tcp-escpos attempt failed, falling back to spooler', e && e.message);
      }
    }
  const printWin = new BrowserWindow({
      width: 400,
      height: 800,
       // For preview mode we allow showing the window. Default hidden for silent printing.
       show: !!options.preview || false,
       // Use a narrow width for thermal preview if preview requested
       width: options && options.preview ? (options.previewWidth || 384) : 400,
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
      },
    });
    console.log('[printReceiptJob] Created hidden print window');
    // If this is a preview request, track the window so it doesn't get GC'd
    if (options && options.preview) {
      previewWindows.add(printWin);
      printWin.on('closed', () => {
        previewWindows.delete(printWin);
      });
    }
    // Also write to a persistent log so we can read logs even when the EXE is a GUI app
    try {
      const logDir = app.getPath && app.getPath('userData') ? app.getPath('userData') : path.join(__dirname, '..', 'logs');
      if (!fs.existsSync(logDir)) {
        try { fs.mkdirSync(logDir, { recursive: true }); } catch (e) {}
      }
      const logFile = path.join(logDir, 'electron-print.log');
      const now = new Date().toISOString();
      try { fs.appendFileSync(logFile, `${now} [printReceiptJob] Created hidden print window\n`); } catch (e) {}
    } catch (e) {}

    const sendOrderAndPrint = async () => {
      try {
        if (!printWin || printWin.isDestroyed()) return { success: false, failureReason: 'Print window not available' };
        const payload = JSON.stringify(order || {});
        try {
          await printWin.webContents.executeJavaScript(`window.postMessage({ type: 'print-order', order: ${payload} }, '*')`);
        } catch (ej) {
          console.warn('[printReceiptJob] executeJavaScript failed (continuing):', ej && ej.message);
          try { fs.appendFileSync(path.join(app.getPath('userData'), 'electron-print.log'), `${new Date().toISOString()} [printReceiptJob] executeJavaScript failed: ${String(ej)}\n`); } catch (ee) {}
        }

        // If preview mode is requested, don't call the system print API. Let the window remain visible for inspection.
        if (options && options.preview) {
          try { fs.appendFileSync(path.join(app.getPath('userData'), 'electron-print.log'), `${new Date().toISOString()} [printReceiptJob] Preview mode - not invoking print\n`); } catch (e) {}
          return { success: true, preview: true };
        }

        return await new Promise((resolve) => {
          if (!printWin || printWin.isDestroyed()) return resolve({ success: false, failureReason: 'Print window destroyed' });
          const printOpts = { silent: !!options.silent, printBackground: true };
          const printerName = (options && (options.printerName || options.deviceName)) || null;
          if (printerName) printOpts.deviceName = printerName;

          let settled = false;

          try {
            printWin.webContents.print(printOpts, (success, failureReason) => {
              if (settled) return;
              settled = true;
              try { fs.appendFileSync(path.join(app.getPath('userData'), 'electron-print.log'), `${new Date().toISOString()} [printReceiptJob] webContents.print callback -> success=${success} failureReason=${String(failureReason)}\n`); } catch (e) {}
              resolve({ success, failureReason });
            });
          } catch (printErr) {
            if (!settled) {
              settled = true;
              try { fs.appendFileSync(path.join(app.getPath('userData'), 'electron-print.log'), `${new Date().toISOString()} [printReceiptJob] webContents.print threw: ${String(printErr)}\n`); } catch (e) {}
              resolve({ success: false, failureReason: String(printErr) });
            }
          }

          // safety timeout in case the callback never fires
          setTimeout(() => {
            if (!settled) {
              settled = true;
              try { fs.appendFileSync(path.join(app.getPath('userData'), 'electron-print.log'), `${new Date().toISOString()} [printReceiptJob] print callback timeout\n`); } catch (e) {}
              resolve({ success: false, failureReason: 'Print callback timeout' });
            }
          }, 10000);
        });
      } catch (e) {
        return { success: false, failureReason: String(e) };
      }
    };

    const { pathToFileURL } = require('url');
    let pageUrl = null;
    if (isDev) {
      // In dev the dev server may not be on 3000 (next may pick a different port).
      // Probe common local dev ports and pick the first that responds so the
      // preview window can load correctly (fixes "Print window not available").
      const probePorts = [3000, 3001, 3002, 3003];
      const net = require('net');
      const tryPort = (port) => new Promise((resolve) => {
        const s = new net.Socket();
        let done = false;
        s.setTimeout(500);
        s.once('connect', () => { done = true; s.destroy(); resolve(true); });
        s.once('timeout', () => { if (!done) { done = true; s.destroy(); resolve(false); } });
        s.once('error', () => { if (!done) { done = true; s.destroy(); resolve(false); } });
        s.connect(port, '127.0.0.1');
      });
      for (const p of probePorts) {
        // eslint-disable-next-line no-await-in-loop
        try {
          // small await to check if port is open
          // If open, use that port for the print page URL
          // eslint-disable-next-line no-await-in-loop
          const ok = await tryPort(p);
          if (ok) { pageUrl = `http://localhost:${p}/print-receipt`; break; }
        } catch (e) { /* ignore */ }
      }
      if (!pageUrl) pageUrl = 'http://localhost:3000/print-receipt';
    } else {
      const appRoot = app.getAppPath();
      const resourcesPath = process.resourcesPath || path.join(appRoot, '..');
      const candidateDirs = [
        path.join(resourcesPath, 'beyon79', 'out'),
        path.join(appRoot, 'beyon79', 'out')
      ];
      console.log('[printReceiptJob] production print path candidates', { appRoot, resourcesPath, candidateDirs });

      let foundExportDir = null;
      for (const d of candidateDirs) {
        try { if (require('fs').existsSync(d)) { foundExportDir = d; break; } } catch (e) {}
      }
      if (foundExportDir) {
        try { console.log('[printReceiptJob] found export dir sample:', require('fs').readdirSync(foundExportDir).slice(0,50)); } catch (e) {}
        const flat = path.join(foundExportDir, 'print-receipt.html');
        const dirIndex = path.join(foundExportDir, 'print-receipt', 'index.html');
        const rootIndex = path.join(foundExportDir, 'index.html');
        if (require('fs').existsSync(flat)) {
          pageUrl = pathToFileURL(flat).href;
        } else if (require('fs').existsSync(dirIndex)) {
          pageUrl = pathToFileURL(dirIndex).href;
        } else if (require('fs').existsSync(rootIndex)) {
          pageUrl = pathToFileURL(rootIndex).href;
        } else {
          console.error('[printReceiptJob] No admin index inside found exportDir:', foundExportDir);
        }
      } else {
        console.error('[printReceiptJob] No exported HTML found for printing in candidates', candidateDirs);
      }
    }

    // If preview requested and order is small enough, add it to the URL query so
    // the renderer can read it synchronously on load (avoids missed postMessage).
    try {
      if (options && options.preview && order && pageUrl) {
        const encoded = encodeURIComponent(JSON.stringify(order));
        if (encoded.length < 8000) {
          // append as query string
          pageUrl += (pageUrl.includes('?') ? '&' : '?') + `order=${encoded}`;
        }
      }
    } catch (e) { /* ignore encoding issues */ }

    if (pageUrl) {
      await printWin.loadURL(pageUrl).catch(() => {});
    }
    await new Promise((resolve) => {
      printWin.webContents.once('did-finish-load', () => {
        console.log('[printReceiptJob] print window did-finish-load');
        try { fs.appendFileSync(path.join(app.getPath('userData'), 'electron-print.log'), `${new Date().toISOString()} [printReceiptJob] print window did-finish-load\n`); } catch (e) {}
        resolve();
      });
      // Fallback in case did-finish-load doesn't fire (give a little more time in production)
      setTimeout(() => {
        console.warn('[printReceiptJob] did-finish-load timeout, proceeding anyway');
        try { fs.appendFileSync(path.join(app.getPath('userData'), 'electron-print.log'), `${new Date().toISOString()} [printReceiptJob] did-finish-load timeout, proceeding anyway\n`); } catch (e) {}
        resolve();
      }, 5000);
    });

  console.log('[printReceiptJob] Sending order to print window and invoking print', { silent: !!options.silent });
  try { fs.appendFileSync(path.join(app.getPath('userData'), 'electron-print.log'), `${new Date().toISOString()} [printReceiptJob] Sending order to print window and invoking print silent=${!!options.silent}\n`); } catch (e) {}
  const result = await sendOrderAndPrint();
  console.log('[printReceiptJob] Print result:', result);
  try { fs.appendFileSync(path.join(app.getPath('userData'), 'electron-print.log'), `${new Date().toISOString()} [printReceiptJob] Print result: ${JSON.stringify(result)}\n`); } catch (e) {}
  // If this was a preview request, keep the preview window open so the user can inspect/print it.
  if (options && options.preview) {
    try { printWin.show(); printWin.focus(); } catch (e) {}
  } else {
    try { printWin.close(); } catch (e) {}
  }
  return result;
  } catch (err) {
    return { success: false, failureReason: String(err) };
  }
}

// Prevent navigation to external sites in production
app.on('web-contents-created', (event, contents) => {
  contents.on('will-navigate', (e, navigationUrl) => {
    const parsed = new URL(navigationUrl);
    if (!(isDev && parsed.origin === 'http://localhost:3000') && parsed.protocol !== 'file:') {
      e.preventDefault();
      shell.openExternal(navigationUrl);
    }
  });
});
