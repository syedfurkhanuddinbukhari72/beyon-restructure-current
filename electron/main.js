const { app, BrowserWindow, Menu, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const isDev = process.env.NODE_ENV === 'development' || process.env.ELECTRON_DEV === 'true';

let mainWindow;

function createWindow() {
  const webPreferences = {
    preload: path.join(__dirname, 'preload.js'),
    contextIsolation: true,
    nodeIntegration: false,
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
    title: 'Beyon Admin Desktop'
  });

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
        const devUrl = `http://localhost:${p}/admin-unified`;
        mainWindow.loadURL(devUrl).catch((err) => console.error('Failed to load dev URL', devUrl, err));
        try { mainWindow.webContents.openDevTools(); } catch (e) {}
        return;
      }
    }
    // If none found, still try default and let it fail visibly
    const fallbackUrl = 'http://localhost:3000/admin-unified';
    console.warn('No dev port open on', portsToTry, '- attempting', fallbackUrl);
    mainWindow.loadURL(fallbackUrl).catch((err) => console.error('Failed to load dev URL', fallbackUrl, err));
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
    // Try both an unpacked resources folder and inside the app.asar bundle (appRoot)
    const candidateDirs = [
      path.join(resourcesPath, 'beyon79', 'out'),
      path.join(appRoot, 'beyon79', 'out')
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

    if (foundExportDir) {
      // Helpful listing to confirm what's inside the export dir
      try {
        const listed = fs.readdirSync(foundExportDir).slice(0, 50);
        console.log('Found exportDir, sample contents:', listed);
      } catch (e) { /* ignore listing errors */ }

      const adminFlat = path.join(foundExportDir, 'admin-unified.html');
      const adminDirIndex = path.join(foundExportDir, 'admin-unified', 'index.html');
      const rootIndex = path.join(foundExportDir, 'index.html');

      if (fs.existsSync(adminFlat)) {
        mainWindow.loadFile(adminFlat).catch(err => console.error('Failed to load export file (flat):', err));
      } else if (fs.existsSync(adminDirIndex)) {
        mainWindow.loadFile(adminDirIndex).catch(err => console.error('Failed to load export file (dir):', err));
      } else if (fs.existsSync(rootIndex)) {
        mainWindow.loadFile(rootIndex).catch(err => console.error('Failed to load export file (root):', err));
      } else {
        console.error('No admin index inside found exportDir:', foundExportDir);
      }
    } else {
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
  createWindow();
  // Simple menu
  const template = [
    { label: 'File', submenu: [{ role: 'quit' }] },
    { label: 'View', submenu: [{ role: 'reload' }, { role: 'toggledevtools' }] }
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

async function printReceiptJob(order, options = {}) {
  try {
    const printWin = new BrowserWindow({
      width: 400,
      height: 800,
      show: false,
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
      },
    });
    console.log('[printReceiptJob] Created hidden print window');
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
        const payload = JSON.stringify(order || {});
        await printWin.webContents.executeJavaScript(`window.postMessage({ type: 'print-order', order: ${payload} }, '*')`);
        const printed = await new Promise((resolve) => {
          printWin.webContents.print({ silent: !!options.silent }, (success, failureReason) => {
            resolve({ success, failureReason });
          });
        });
        return printed;
      } catch (e) {
        return { success: false, failureReason: String(e) };
      }
    };

    if (isDev) {
      await printWin.loadURL('http://localhost:3000/print-receipt').catch(() => {});
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
        if (require('fs').existsSync(flat)) {
          await printWin.loadFile(flat).catch(() => {});
        } else if (require('fs').existsSync(dirIndex)) {
          await printWin.loadFile(dirIndex).catch(() => {});
        } else {
          const rootIndex = path.join(foundExportDir, 'index.html');
          await printWin.loadFile(rootIndex).catch(() => {});
        }
      } else {
        console.error('[printReceiptJob] No exported HTML found for printing in candidates', candidateDirs);
      }
    }
    await new Promise((resolve) => {
      printWin.webContents.once('did-finish-load', () => {
        console.log('[printReceiptJob] print window did-finish-load');
        try { fs.appendFileSync(path.join(app.getPath('userData'), 'electron-print.log'), `${new Date().toISOString()} [printReceiptJob] print window did-finish-load\n`); } catch (e) {}
        resolve();
      });
      // Fallback in case did-finish-load doesn't fire
      setTimeout(() => {
        console.warn('[printReceiptJob] did-finish-load timeout, proceeding anyway');
        try { fs.appendFileSync(path.join(app.getPath('userData'), 'electron-print.log'), `${new Date().toISOString()} [printReceiptJob] did-finish-load timeout, proceeding anyway\n`); } catch (e) {}
        resolve();
      }, 2000);
    });

  console.log('[printReceiptJob] Sending order to print window and invoking print', { silent: !!options.silent });
  try { fs.appendFileSync(path.join(app.getPath('userData'), 'electron-print.log'), `${new Date().toISOString()} [printReceiptJob] Sending order to print window and invoking print silent=${!!options.silent}\n`); } catch (e) {}
  const result = await sendOrderAndPrint();
  console.log('[printReceiptJob] Print result:', result);
  try { fs.appendFileSync(path.join(app.getPath('userData'), 'electron-print.log'), `${new Date().toISOString()} [printReceiptJob] Print result: ${JSON.stringify(result)}\n`); } catch (e) {}
    try { printWin.close(); } catch (e) {}
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
