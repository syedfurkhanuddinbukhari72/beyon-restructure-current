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
