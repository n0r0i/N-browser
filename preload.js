const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // --- Renderer to Main (Commands) ---
  createNewTab: () => ipcRenderer.send('create-new-tab'),
  switchToTab: (tabId) => ipcRenderer.send('switch-to-tab', tabId),
  closeTab: (tabId) => ipcRenderer.send('close-tab', tabId),

  navigateBack: () => ipcRenderer.send('nav-back'),
  navigateForward: () => ipcRenderer.send('nav-forward'),
  navigateReload: () => ipcRenderer.send('nav-reload'),
  loadURL: (url) => ipcRenderer.send('nav-load-url', url),

  minimizeWindow: () => ipcRenderer.send('minimize-window'),
  maximizeWindow: () => ipcRenderer.send('maximize-window'),
  closeWindow: () => ipcRenderer.send('close-window')

  // --- Main to Renderer (Events) ---
  onTabCreated: (callback) => ipcRenderer.on('tab-created', (_event, value) => callback(value)),
  onTabTitleUpdated: (callback) => ipcRenderer.on('tab-title-updated', (_event, value) => callback(value)),
  onURLUpdated: (callback) => ipcRenderer.on('url-updated', (_event, value) => callback(value)),
  onWindowStateChange: (callback) => ipcRenderer.on('window-state-changed', (_event, value) => callback(value)),
  onFaviconUpdated: (callback) => ipcRenderer.on('favicon-updated', (_event, value) => callback(value))
});
