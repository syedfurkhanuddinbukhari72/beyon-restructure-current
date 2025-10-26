const { contextBridge, ipcRenderer } = require('electron');

const envName = process.env.NODE_ENV || 'production';

function applyPolyfills(target) {
  if (!target) return;
  if (typeof target.global === 'undefined') target.global = target;
  if (typeof target.globalThis === 'undefined') target.globalThis = target;
  if (!target.process) target.process = { env: { NODE_ENV: envName } };
  if (!target.process.env) target.process.env = { NODE_ENV: envName };
  if (!target.process.env.NODE_ENV) target.process.env.NODE_ENV = envName;
}

applyPolyfills(globalThis);

const api = {
  getVersion: () => ipcRenderer.invoke('app-version'),
  showSaveDialog: (opts) => ipcRenderer.invoke('show-save-dialog', opts),
  platform: process.platform,
};

// Attach printReceipt to api so it's available as electronAPI.printReceipt
api.printReceipt = (order, options = {}) => ipcRenderer.invoke('print-receipt', { order, options });
// Expose printer listing helper
api.listPrinters = () => ipcRenderer.invoke('list-printers');
// Expose ESC/POS connectivity test
api.testEscposConnection = (host, port, timeout) => ipcRenderer.invoke('test-escpos-connection', { host, port, timeout });

// Forward print-order messages from main to the renderer window reliably.
// This avoids missed postMessage deliveries when did-finish-load timing is flaky.
ipcRenderer.on('print-order', (event, order) => {
  try {
    if (typeof window !== 'undefined') {
      window.postMessage({ type: 'print-order', order }, '*');
    }
  } catch (e) {
    // best-effort forwarding - don't throw
    // console.debug('preload: failed to forward print-order', e);
  }
});

// Forward app-level shortcuts to renderer pages
ipcRenderer.on('app-shortcut', (event, payload) => {
  try {
    console.log('[preload] forwarding app-shortcut to renderer', payload);
    if (typeof window !== 'undefined') {
      window.postMessage({ type: 'app-shortcut', payload }, '*');
    }
  } catch (e) {}
});

if (process.contextIsolated) {
  try {
  contextBridge.exposeInMainWorld('electronAPI', api);
  contextBridge.exposeInMainWorld('process', { env: { NODE_ENV: envName } });
  contextBridge.exposeInMainWorld('global', {});
  } catch (err) {
    console.error('Failed to expose electronAPI with contextBridge', err);
  }
} else {
  if (typeof window !== 'undefined') {
  window.electronAPI = api;
    applyPolyfills(window);
  }
  applyPolyfills(globalThis);
}

// Provide a small debug message
if (process.env.NODE_ENV === 'development') {
  console.log('Electron preload loaded');
}
