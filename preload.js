const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('rlrr', {
  openSongsDir: () => ipcRenderer.invoke('openSongsDir'),
  getPlayerOptions: () => ipcRenderer.invoke('getPlayerOptions'),
  updatePlayerOptions: (playerOptions) => ipcRenderer.send('updatePlayerOptions', playerOptions),
});
