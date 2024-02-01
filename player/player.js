
const noteVisibleTime = 1.5;
const noteHideDelay = 0.2;
let bluetoothLatency = 0;
// bluetoothLatency = 0.15;

let offscreen = null;

let viewportX = 0;
let viewportY = 0;
let viewportW = 480;
let viewportH = 480;

let seekbar = null;

let songDir = '';
let rlrrFile = '';

let artist = '';
let title = '';
let level = '';
let songLength = 0;

let songTracks = [];
let drumTracks = [];
let notes = [];
let notesCount = 0;
let highwayLanes = [];
let highwayCount = 0;
let highwayWidth = 0;
let highwayLeft = 0;

let isLoading = true;
let isPlaying = false;
let startTime = 0;
let currentTime = 0;
let head = 0;
let tail = 0;

class Seekbar {
    constructor(x, y, w, h) {
        this.x = x;
        this.y = y;
        this.w = w;
        this.h = h;
        this.max = 0;
        this.value = 0;
    }
    isMouseOver(mouseX, mouseY) {
        if (mouseX < this.x || this.x + this.w < mouseX) {
            return false;
        }
        if (mouseY < this.y || this.y + this.h < mouseY) {
            return false;
        }
        return true;
    }
    seekStart(mouseX) {
        this.isDragging = true;
        this.restart = isPlaying;
        pauseTracks();
        this.seek(mouseX);
    }
    seek(mouseX) {
        if (this.isDragging) {
            const v = Math.min(Math.max(mouseX - this.x, 0), this.w);
            this.value = v * this.max / this.w;
            currentTime = this.value;
            head = 0;
            tail = 0;    
        }
    }
    seekEnd() {
        if (this.restart) {
            playTracks();
        }
        this.isDragging = false;
        this.restart = false;
    }
    draw() {
        offscreen.noStroke();

        const v = this.value * this.w / Math.max(this.max, 1);
        offscreen.fill(64);
        offscreen.rect(this.x, this.y, this.w, this.h);
        offscreen.fill(96);
        offscreen.rect(this.x, this.y, v, this.h);

        const fmt = (t) => {
            const seconds = Math.floor(t);
            const min = Math.floor(seconds / 60);
            const sec = `0${seconds % 60}`.slice(-2);
            return `${min}:${sec}`;
        }
        offscreen.fill(isPlaying || this.restart ? 255 : 128);
        offscreen.textSize(this.h / 2);
        offscreen.textAlign(RIGHT, CENTER);
        offscreen.text(`${fmt(this.value)} / ${fmt(this.max)}`, this.x + this.w - 4, this.y + this.h / 2);
    }
}

const NOTES = {
    Kick: { color: 'royalblue', shape: 'bar' },
    HiHat: { color: 'cyan', shape: 'circle' },
    Crash15: { color: 'magenta', shape: 'circle' },
    Snare: { color: 'red', shape: 'rect' },
    Tom1: { color: 'lightseagreen', shape: 'rect' },
    Tom2: { color: 'green', shape: 'rect' },
    FloorTom: { color: 'blueviolet', shape: 'rect' },
    Crash17: { color: 'orange', shape: 'circle' },
    Ride17: { color: 'yellow', shape: 'circle' },
    Ride21: { color: 'gold', shape: 'circle' },
}

async function setup() {
    createCanvas(0, 0);
    updateCanvasSize();

    offscreen = createGraphics(480, 480);
    seekbar = new Seekbar(0, 460, 480, 20);

    // loading
    const url = new URL(window.location.href);
    const rlrr = url.searchParams.get('rlrr');
    if (rlrr) {
        const m = rlrr.match(/([^/]+)\/([^/]+_(Easy|Medium|Hard|Expert)\.rlrr)/);
        if (!m) {
            throw new Error(`invalid rlrr file name: ${rlrr}`);
        }

        const dirname = m[1];
        const filename = m[2];
        level = m[3];

        songDir = `/songs/${dirname}`;
        rlrrFile = `/songs/${dirname}/${filename}`;

        await loadRlrr(rlrrFile);
        isLoading = false;
    }
}

function mouseClicked() {
    const offscreenX = toOffscreenX(mouseX);
    const offscreenY = toOffscreenY(mouseY);

    if (offscreenX < 0 || 480 < offscreenX) {
        return;
    }
    if (offscreenY < 0 || 480 < offscreenY) {
        return;
    }

    if (!seekbar.isMouseOver(offscreenX, offscreenY)) {
        if (!isPlaying) {
            playTracks();
        } else {
            pauseTracks()
        }
    }
}

function keyPressed() {
    if (key == ' ') {
        if (!isPlaying) {
            playTracks();
        } else {
            pauseTracks()
        }
    }
    if (key == 'ArrowLeft' || key == 'ArrowRight') {
        const skip = key == 'ArrowLeft' ? -5 : 5;
        currentTime = Math.max(currentTime + skip, 0);
        seekbar.value = currentTime;
        head = 0;
        tail = 0;
        if (isPlaying) {
            pauseTracks();
            playTracks();
        }
    }
    if (key == 'Backspace' || key == 'Delete') {
        currentTime = 0;
        seekbar.value = currentTime;
        head = 0;
        tail = 0;
        if (isPlaying) {
            pauseTracks();
            playTracks();
        }
    }
    if (key == 'Escape') {
        currentTime = 0;
        seekbar.value = currentTime;
        head = 0;
        tail = 0;
        pauseTracks();
    }
    if (key == 'f') {
        fullscreen(true);
    }
}

function mousePressed() {
    if (seekbar.isMouseOver(toOffscreenX(mouseX), toOffscreenY(mouseY))) {
        seekbar.seekStart(toOffscreenX(mouseX))
    }
}

function mouseDragged() {
    if (seekbar.isDragging) {
        seekbar.seek(toOffscreenX(mouseX));
    }
}

function mouseReleased() {
    if (seekbar.isDragging) {
        seekbar.seekEnd();
    }
}

// X座標をcanvasの座標系からoffscreenの座標系に変換
function toOffscreenX(x) {
    return (x - viewportX) / viewportW * 480;
}

// Y座標をcanvasの座標系からoffscreenの座標系に変換
function toOffscreenY(y) {
    return (y - viewportY) / viewportH * 480;
}

function windowResized() {
    updateCanvasSize();
}

function updateCanvasSize() {
    const wmin = Math.min(windowWidth, windowHeight);
    resizeCanvas(windowWidth, wmin);
    viewportX = (windowWidth - wmin) / 2;
    viewportY = 0;
    viewportW = wmin;
    viewportH = wmin;
}

async function loadRlrr(rlrrFile) {
    const response = await fetch(rlrrFile);
    if (!response.ok) {
        throw new Error(`could not load url: ${rlrrFile}`);
    }
    const rlrr = await response.json();

    const metaData = rlrr.recordingMetadata;
    artist = metaData.artist;
    title = metaData.title;
    songLength = metaData.length;

    document.title = `${title} [${level}]`;
    seekbar.max = songLength;

    notes = rlrr.events.map(event => {
        const t = Number(event.time) + bluetoothLatency;
        return {
            drum: event.name.split('_')[1],
            show: t - noteVisibleTime,
            hit: t,
            hide: t + noteHideDelay,
        }
    });
    notesCount = notes.length;

    const drumSet = ['HiHat', 'Crash15', 'Snare', 'Tom1', 'Tom2', 'FloorTom', 'Crash17', 'Ride17', 'Ride21'];
    const drums = notes.map(note => note.drum);
    highwayLanes = drumSet.filter(drum => drums.includes(drum));
    highwayCount = highwayLanes.length;
    highwayWidth = highwayCount * 40;
    highwayLeft = (480 - highwayWidth) / 2;

    const songTrackPromises = rlrr.audioFileData.songTracks.map(loadTrack);
    const drumTrackPromises = rlrr.audioFileData.drumTracks.map(loadTrack);
    songTracks = await Promise.all(songTrackPromises);
    drumTracks = await Promise.all(drumTrackPromises);
}

async function loadTrack(trackFileName) {
    const player = new Tone.Player().toDestination();
    return await player.load(`${songDir}/${trackFileName}`);
}

async function playTracks() {
    if (Tone.getContext().state == 'suspended') {
        await Tone.start();
    }
    if (!isLoading && !isPlaying) {
        if (songLength <= currentTime) {
            currentTime = 0;
            head = 0;
            tail = 0;
            seekbar.value = currentTime;
        }
        const now = Tone.now();
        songTracks.forEach(track => track.start(now, currentTime));
        drumTracks.forEach(track => track.start(now, currentTime));
        startTime = now - currentTime;
        isPlaying = true;
    }
}

function pauseTracks() {
    if (isPlaying) {
        songTracks.forEach(track => track.stop());
        drumTracks.forEach(track => track.stop());
        isPlaying = false;
    }
}

function draw() {
    background(32);
    drawOffscreen();
    image(offscreen, viewportX, viewportY, viewportW, viewportH);
    updateCursor();
}

function drawOffscreen() {
    offscreen.background(0);

    if (isLoading) {
        drawLoading();
    } else {
        if (isPlaying) {
            currentTime = Tone.now() - startTime;
            seekbar.value = currentTime;
            if (songLength <= currentTime) {
                pauseTracks();
            }
        }
        drawHighway();
        seekVisibleNotes();
        drawNoteGuidelines();
        drawNotes();
    }

    drawTitle();
    seekbar.draw();
}

function drawLoading() {
    offscreen.noStroke();
    offscreen.fill(255);
    offscreen.textAlign(CENTER, CENTER);
    offscreen.textSize(20);
    offscreen.text("LOADING...", 240, 240);
}

function drawTitle() {
    offscreen.noStroke();
    const c = color(192);
    c.setAlpha(128);
    offscreen.fill(c)
    offscreen.rect(0, 0, 480, 40);
    if (title) {
        offscreen.fill(255);
        offscreen.textAlign(LEFT, TOP);
        offscreen.textSize(16);
        offscreen.text(`${title} [${level}]`, 4, 4);
        offscreen.textSize(12);
        offscreen.text(artist, 4, 24);    
    }
}

function seekVisibleNotes() {
    while (tail < notesCount && currentTime >= notes[tail].show) {
        tail++;
    }
    while (head < tail && currentTime > notes[head].hide) {
        head++;
    }
}

function drawHighway() {
    offscreen.noStroke();
    offscreen.fill(color(32));
    offscreen.rect(highwayLeft, 0, highwayWidth, 480);

    offscreen.stroke(64);
    offscreen.strokeWeight(1);
    const lineCount = highwayCount + 1;
    for (let i = 0; i < lineCount; i++) {
        const x = highwayLeft + i * 40;
        offscreen.line(x, 0, x, 480);
    }

    const x = highwayLeft - 6;
    const w = highwayWidth + 12;
    const h = 6;
    offscreen.noStroke();
    offscreen.fill(color(192));
    offscreen.rect(x, 440 - h / 2, w, h);
}

function drawNoteGuidelines() {
    offscreen.stroke(64);
    offscreen.strokeWeight(2);
    const s = {};
    for (let i = head; i < tail; i++) {
        if (currentTime < notes[i].hit) {
            s[notes[i].hit] = true;
        }
    }
    for (const t of Object.keys(s)) {
        const y = 440 - Math.max(t - currentTime, 0) * 440 / noteVisibleTime;
        offscreen.line(highwayLeft, y, highwayLeft + highwayWidth, y);
    }
}

function drawNotes() {
    const kicks = [];
    const others = [];

    for (let i = head; i < tail; i++) {
        notes[i]
        if (notes[i].drum == 'Kick') {
            kicks.push(notes[i]);
        } else {
            others.push(notes[i]);
        }
    }

    offscreen.noStroke();
    for (const note of kicks) {
        let x = highwayLeft;
        let w = highwayWidth;
        const y = 440 - Math.max(note.hit - currentTime, 0) * 440 / noteVisibleTime;
        const h = currentTime < note.hit ? 6 : 12;
        const c = color(NOTES.Kick.color);
        if (note.hit <= currentTime) {
            x -= 10;
            w += 20;
        }
        const a = 255 - Math.max(currentTime - note.hit, 0) * 255 / noteHideDelay;
        c.setAlpha(a);
        offscreen.fill(c);
        offscreen.rect(x, y - h / 2, w, h);
    }

    offscreen.noStroke();
    offscreen.stroke(255);
    offscreen.strokeWeight(1);
    for (const note of others) {
        const x = highwayLeft + highwayLanes.findIndex(name => name == note.drum) * 40 + 20;
        const y = 440 - Math.max(note.hit - currentTime, 0) * 440 / noteVisibleTime;
        const c = color(NOTES[note.drum].color);
        const a = 255 - Math.max(currentTime - note.hit, 0) * 255 / noteHideDelay;
        c.setAlpha(a);
        offscreen.fill(c);
        switch(NOTES[note.drum].shape) {
            case 'circle': {
                const r = currentTime < note.hit ? 20 : 26;
                offscreen.circle(x, y, r);
                break;
            }
            case 'rect': {
                const h = currentTime < note.hit ? 10 : 16;
                const w = currentTime < note.hit ? 30 : 36;
                offscreen.rect(x - w / 2, y - h / 2, w, h);
                break;
            }
        }
    }
}

function updateCursor() {
    let inOffscreen = true;
    const offscreenX = toOffscreenX(mouseX);
    const offscreenY = toOffscreenY(mouseY);
    if (offscreenX < 0 || 480 < offscreenX) {
        inOffscreen = false;
    }
    if (offscreenY < 0 || 480 < offscreenY) {
        inOffscreen = false;
    }
    if (inOffscreen) {
        if (seekbar.isMouseOver(offscreenX, offscreenY)) {
            cursor('ew-resize')
        } else {
            cursor(isLoading ? 'wait' : 'pointer')
        }    
    } else {
        cursor('default');
    }
}
