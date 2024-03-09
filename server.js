const { Hono } = require('hono');
const { serve } = require('@hono/node-server');
const { serveStatic } = require('@hono/node-server/serve-static');

const { readFile } = require('fs/promises');
const { dirname, join, resolve, relative } = require('path');
const { glob } = require('glob');
const { renderFile } = require('ejs');

let server = null;

const LEVELS = ['Easy', 'Medium', 'Hard', 'Expert'];

const getLevel = (rlrrFile) => {
  const re = new RegExp(`^.*_(${LEVELS.join('|')})\.rlrr$`);
  const m = rlrrFile.match(re);
  return m ? m[1] : null;
};

const formatLength = (t) => {
  const seconds = Math.floor(t);
  const min = Math.floor(seconds / 60);
  const sec = `0${seconds % 60}`.slice(-2);
  return `${min}:${sec}`;
};

const readRlrrFile = async (songsDir, rlrrFile) => {
  const level = getLevel(rlrrFile);
  if (level === null) {
    return null;
  }
  const levelNum = LEVELS.indexOf(level);

  const rlrr = JSON.parse(await readFile(rlrrFile));
  const metaData = rlrr.recordingMetadata;
  let coverImage = '/coverImage.png';
  if (metaData.coverImagePath) {
    const coverImageFullPath = join(dirname(rlrrFile), metaData.coverImagePath);
    coverImage = join('/songs', relative(songsDir, coverImageFullPath)).replace(/\\/g, '/');
  }
  const rlrrQueryParam = relative(songsDir, rlrrFile).replace(/\\/g, '/');
  return {
    artist: metaData.artist,
    title: metaData.title,
    length: formatLength(metaData.length),
    level: level,
    levelNum: levelNum,
    coverImage: encodeURI(coverImage),
    playerLink: `/player?rlrr=${encodeURI(rlrrQueryParam)}`,
  };
};

const classifySongs = (songs) => {
  const artists = {};
  for (const song of songs) {
    const { artist, title, levelNum } = song;
    artists[artist] = artists[artist] || {};
    artists[artist][title] = artists[artist][title] || LEVELS.map((level) => { return { level } });
    artists[artist][title][levelNum] = song;
  }

  const sortedKeys = (obj) => {
    const keys = Object.keys(obj);
    return keys.sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
  }

  const classified = [];
  for (const artist of sortedKeys(artists)) {
    const titles = [];
    for (const title of sortedKeys(artists[artist])) {
      const levels = artists[artist][title];
      const { length, coverImage } = levels.find((level) => level.length);
      titles.push({ title, length, coverImage, levels });
    }
    classified.push({ artist, titles });
  }
  return classified;
};

const getSongs = async (songsDir) => {
  if (!songsDir) {
    return [];
  }
  const rlrrFiles = await glob(`${songsDir}/*/*.rlrr`);
  const songs = await Promise.all(rlrrFiles.map((rlrrFile) => readRlrrFile(songsDir, rlrrFile)));
  return classifySongs(songs.filter(Boolean));
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

  app.use('/*', serveStatic({
    root: relative('.', resolve(resourcesPath, 'public')),
  }));

  if (songsDir) {
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
