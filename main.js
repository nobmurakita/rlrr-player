
const { app, BrowserWindow } = require('electron/main')
const { createServer } = require('./server.js');
require('dotenv').config();

app.whenReady().then(async () => {
    const songsDir = process.env.SONGS_DIR || './songs/';
    const port = await createServer(songsDir);
    const win = new BrowserWindow();
    win.loadURL(`http://127.0.0.1:${port}`);
});
