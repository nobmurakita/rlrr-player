const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('rlrr', {
  openSongsDir: () => ipcRenderer.invoke('openSongsDir'),
});
