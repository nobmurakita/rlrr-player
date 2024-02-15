const { Hono } = require('hono');
const { serve } = require('@hono/node-server');
const { serveStatic } = require('@hono/node-server/serve-static');

const { readFile } = require('fs').promises;
const { relative } = require('path');
const { glob } = require('glob');
const { renderFile } = require('ejs');

exports.createServer = async (songsDir) => {
    const app = new Hono();

    app.get('/', async (c) => {
        const rlrrFiles = await glob(`${songsDir}/*/*.rlrr`);
    
        const songs = await Promise.all(rlrrFiles.map(async (rlrrFile) => {
            const rlrr = JSON.parse(await readFile(rlrrFile));
            const metaData = rlrr.recordingMetadata;
            const m = rlrrFile.match(/^.*_(Easy|Medium|Hard|Expert)\.rlrr$/);
            const level = m[1];
            const levelNum = ['Easy', 'Medium', 'Hard', 'Expert'].indexOf(level);
            return {
                artist: metaData.artist,
                title: metaData.title,
                level: level,
                levelNum: levelNum,
                playerLink: `/player?rlrr=${encodeURI(relative(songsDir, rlrrFile))}`,
            };
        }));
    
        songs.sort((a, b) => {
            aa = [a.artist, a.title, a.levelNum].join('|').toUpperCase();
            bb = [b.artist, b.title, b.levelNum].join('|').toUpperCase();
            return aa == bb ? 0 : (aa < bb ? -1 : 1);
        });
    
        return c.html(renderFile('index.ejs', { songs }));
    })
    
    app.use('/player/*', serveStatic({ root: '.' }));
    
    app.use('/songs/*', serveStatic({
        root: relative('.', songsDir),
        rewriteRequestPath: (path) => path.replace(/^\/songs/, ''),
    }));
    
    return new Promise(resolve => {
        serve({
            fetch: app.fetch,
            hostname: '127.0.0.1',
            port: 0,
        }, info => {
            resolve(info.port);
        });    
    });
};
