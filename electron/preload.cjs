const { contextBridge, ipcRenderer } = require('electron');

/**
 * ClinicFlow Desktop Preload Bridge
 * Exposes safe, isolated native APIs to the React renderer process.
 */
contextBridge.exposeInMainWorld('desktopAPI', {
  isDesktop: true,
  platform: process.platform,

  // Window Controls
  minimize: () => ipcRenderer.invoke('window:minimize'),
  maximize: () => ipcRenderer.invoke('window:maximize'),
  close: () => ipcRenderer.invoke('window:close'),
  isMaximized: () => ipcRenderer.invoke('window:isMaximized'),

  // Printer & Hardware Integration (Thermal Receipt & Laser Printers)
  getPrinters: () => ipcRenderer.invoke('printer:getList'),
  printDirect: (options) => ipcRenderer.invoke('printer:printDirect', options),

  // Native Notifications
  showNotification: (payload) => ipcRenderer.invoke('system:notify', payload),

  // External Links (Open in default system browser)
  openExternal: (url) => ipcRenderer.invoke('system:openExternal', url),

  // App Metadata
  getVersion: () => ipcRenderer.invoke('app:getVersion')
});
