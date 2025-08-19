const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('menuAPI', {
  openLibrary: (page) => ipcRenderer.send('open-library-page', page)
});
