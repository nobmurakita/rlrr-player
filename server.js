const { Hono } = require('hono');
const { serve } = require('@hono/node-server');
const { serveStatic } = require('@hono/node-server/serve-static');

const { readFile } = require('fs').promises;
const { resolve, relative } = require('path');
const { glob } = require('glob');
const { renderFile } = require('ejs');

let server = null;

const getSongs = async (songsDir) => {
  if (!songsDir) {
    return [];
  }

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

  songs
    .sort((a, b) => a.levelNum - b.levelNum)
    .sort((a, b) => a.title.localeCompare(b.title))
    .sort((a, b) => a.artist.localeCompare(b.artist));

  return songs;
};

exports.createServer = async (resourcesPath, songsDir) => {
  if (server) {
    server.close();
    server = null;
  }

  const app = new Hono();

  app.get('/', async (c) => {
    const songs = await getSongs(songsDir);
    const templateFile = resolve(resourcesPath, 'index.ejs');
    return c.html(renderFile(templateFile, { songsDir, songs }));
  })

  if (songsDir) {
    app.use('/player/*', serveStatic({
      root: relative('.', resourcesPath),
    }));

    app.use('/songs/*', serveStatic({
      root: relative('.', songsDir),
      rewriteRequestPath: (path) => path.replace(/^\/songs/, ''),
    }));
  }

  return new Promise(resolve => {
    server = serve({
      fetch: app.fetch,
      hostname: '127.0.0.1',
      port: 0,
    }, info => {
      resolve(info.port);
    });
  });
};
