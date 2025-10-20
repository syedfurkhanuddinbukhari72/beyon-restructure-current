const { app, BrowserWindow, Menu, ipcMain, dialog, shell } = require('electron');
const path = require('path');
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
    const exportDir = path.join(appRoot, '..', 'beyon79', 'out');

    // Try multiple possible export layouts so both flat and directory exports work.
    const adminFlat = path.join(exportDir, 'admin-unified.html');
    const adminDirIndex = path.join(exportDir, 'admin-unified', 'index.html');
    const rootIndex = path.join(exportDir, 'index.html');

    if (fs.existsSync(adminFlat)) {
      mainWindow.loadFile(adminFlat).catch(err => console.error('Failed to load export file (flat):', err));
    } else if (fs.existsSync(adminDirIndex)) {
      mainWindow.loadFile(adminDirIndex).catch(err => console.error('Failed to load export file (dir):', err));
    } else if (fs.existsSync(rootIndex)) {
      mainWindow.loadFile(rootIndex).catch(err => console.error('Failed to load export file (root):', err));
    } else {
      console.error('No exported HTML found in', exportDir, ' appRoot:', appRoot);
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
