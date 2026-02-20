const { app, BrowserWindow, Menu, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const isDev = process.env.NODE_ENV === 'development' || process.env.ELECTRON_DEV === 'true';
const printerService = require('./services/PrinterService');
const shortcutManager = require('./managers/ShortcutManager');
const serverManager = require('./managers/ServerManager');

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
        try { mainWindow.webContents.openDevTools(); } catch (e) { }
        return;
      }
    }
    // If none found, still try default and let it fail visibly
    let fallbackUrl = 'http://localhost:3000/admin-unified?tab=Active';
    if (fallbackUrl.endsWith('/')) fallbackUrl = fallbackUrl.replace(/\/+$/g, '');
    console.warn('No dev port open on', portsToTry, '- attempting', fallbackUrl);
    try { mainWindow.loadURL(fallbackUrl).catch((err) => console.error('Failed to load dev URL', fallbackUrl, err)); } catch (err) { console.error('loadURL threw', err && err.message || err); }
    try { mainWindow.webContents.openDevTools(); } catch (e) { }
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
      } catch (e) { }
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
      // No static export. Try to auto-start Next.js standalone server via manager.
      // This handles port finding, spawning, and readiness polling.
      serverManager.startServer(resourcesPath, appRoot).then((url) => {
        if (url) {
          try {
            mainWindow.loadURL(url).catch((err) => console.error('Failed to load bundled standalone URL', url, err));
          } catch (err) { console.error('loadURL threw', err && err.message || err); }
        } else {
          console.error('No exported HTML found in any candidate dirs', candidateDirs, ' appRoot:', appRoot);
          console.error('Also failed to start standalone server (or none found).');
        }
      });
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


  createWindow();
  // Register global shortcuts via manager
  shortcutManager.registerShortcuts(mainWindow);

  // Keep a small in-memory cache to suppress duplicate shortcut sends caused by
  // OS key-repeat or rapid successive events. This prevents duplicate IPC
  // deliveries reaching the renderer when a key is held or the accelerator
  // fires multiple times.

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
            shortcutManager.sendAppShortcut(mainWindow, payload);
          }
        },
        {
          label: 'Ready tab',
          accelerator: 'Shift+R',
          click: () => {
            console.log('[menu] shortcut Ready tab (Shift+R) clicked');
            const payload = { action: 'switch_to_ready_tab' };
            // Use main-side dedupe/send helper
            shortcutManager.sendAppShortcut(mainWindow, payload);
          }
        },
        {
          label: 'Paid tab',
          accelerator: 'Shift+P',
          click: () => {
            console.log('[menu] shortcut Paid tab (Shift+P) clicked');
            const payload = { action: 'switch_to_paid_tab' };
            // Use main-side dedupe/send helper
            shortcutManager.sendAppShortcut(mainWindow, payload);
          }
        },
        {
          label: 'Archive tab',
          accelerator: 'Shift+H',
          click: () => {
            console.log('[menu] shortcut Archive tab (Shift+H) clicked');
            const payload = { action: 'switch_to_archive_tab' };
            // Use main-side dedupe/send helper
            shortcutManager.sendAppShortcut(mainWindow, payload);
          }
        },
        {
          label: 'Cancel order',
          accelerator: 'Shift+C',
          click: () => {
            console.log('[menu] shortcut Cancel order (Shift+C) clicked');
            const payload = { action: 'cancel_order' };
            // Use main-side dedupe/send helper
            shortcutManager.sendAppShortcut(mainWindow, payload);
          }
        },
        {
          label: 'Place order',
          accelerator: 'Shift+Enter',
          click: () => {
            console.log('[menu] shortcut Place order (Shift+Enter) clicked');
            const payload = { action: 'place_order' };
            shortcutManager.sendAppShortcut(mainWindow, payload);
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
              try { mainWindow.webContents.executeJavaScript(`window.postMessage(${JSON.stringify({ type: 'app-shortcut', payload })}, '*')`).catch(() => { }); } catch (e) { console.warn('[menu] executeJavaScript fallback failed', e && e.message); }
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

app.on('will-quit', () => {
  serverManager.stopServer();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

ipcMain.handle('app-version', () => app.getVersion());
ipcMain.handle('show-save-dialog', async (_, opts) => {
  return await dialog.showSaveDialog(opts || {});
});

ipcMain.handle('print-receipt', async (_, { order, options = {} } = {}) => {
  return await printerService.printReceipt(order, options);
});



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
  return await printerService.testTcpConnection(host, port, timeout);
});



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
