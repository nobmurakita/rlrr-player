
const fs = require('fs');
const { join } = require('path');
const { app, Menu, dialog, BrowserWindow, ipcMain } = require('electron/main')
const Store = require('electron-store');
const { createServer } = require('./server.js');

const store = new Store();
let songsDir = null;
let win = null;

const loadMainWindow = async (songsDir) => {
  const resourcesPath = app.isPackaged ? process.resourcesPath : '.';
  const port = await createServer(resourcesPath, songsDir);
  win.loadURL(`http://127.0.0.1:${port}`);
};

const openSongsDir = async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog(win, {
    title: 'Open Directory',
    defaultPath: songsDir || app.getPath('home'),
    properties: ['openDirectory'],
  });
  if (canceled) {
    return;
  }
  songsDir = filePaths[0];
  store.set('songsDir', songsDir);
  loadMainWindow(songsDir);
};

const getPlayerOptions = () => {
  const defaultOptions = {
    masterVolume: 0.5,
    songVolume: 0.5,
    drumVolume: 0.5,
    noteVolume: 0.5,
    repeat: false,
  };
  const options = store.get('playerOptions') || {};
  return { ...defaultOptions, ...options };
};

const updatePlayerOptions = (_event, playerOptions) => {
  const currentOptions = getPlayerOptions();
  store.set('playerOptions', { ...currentOptions, ...playerOptions });
};

const createMenu = () => {
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    {
      label: app.getName(),
      submenu: [
        {
          label: `About RLRR Player`,
          click: () => dialog.showMessageBox(win, { message: `v${app.getVersion()}` }),
        },
        {
          label: 'Quit',
          role: 'quite',
        },
      ],
    },
    {
      label: 'File',
      submenu: [
        {
          label: 'Open...',
          accelerator: 'CmdOrCtrl+O',
          click: () => openSongsDir(),
        },
        {
          label: 'Close Window',
          role: 'close',
        }
      ],
    },
    {
      label: 'View',
      submenu: [
        {
          label: 'Reload',
          role: 'reload',
        },
        {
          label: 'Toggle Developer Tools',
          role: 'toggleDevTools',
        },
      ],
    },
  ]));
};

app.whenReady().then(async () => {
  songsDir = store.get('songsDir');
  if (songsDir) {
    if (!fs.existsSync(songsDir) || !fs.lstatSync(songsDir).isDirectory()) {
      songsDir = null;
      store.set('songsDir', null);
    }
  }

  ipcMain.handle('openSongsDir', openSongsDir);
  ipcMain.handle('getPlayerOptions', getPlayerOptions);
  ipcMain.on('updatePlayerOptions', updatePlayerOptions);

  createMenu();

  const sizeOption = { width: 600, height: 600, useContentSize: true };
  win = new BrowserWindow({
    ...sizeOption,
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
    },
  });
  win.webContents.setWindowOpenHandler(() => {
    return {
      action: 'allow',
      overrideBrowserWindowOptions: {
        ...sizeOption,
        webPreferences: {
          preload: join(__dirname, 'preload.js'),
        },
          }
    };
  });
  loadMainWindow(songsDir);
});
