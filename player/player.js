
const noteVisibleTime = 1500;
const noteHideDelay = 200;
let bluetoothLatency = 0;
// bluetoothLatency = 150;

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
    constructor(canvas) {
        this.canvas = canvas;
        this.max = 0;
        this.value = 0;
    }
    contains(event) {
        const rect = this._getSeekbarRect();
        if (event.pageX < rect.left || rect.right < event.pageX) {
            return false;
        }
        if (event.pageY < rect.top || rect.bottom < event.pageY) {
            return false;
        }
        return true;
    }
    pressed() {
        this.isPressed = true;
        this.restart = isPlaying;
        pauseTracks();
    }
    seek(pageX) {
        if (this.isPressed) {
            const rect = this._getSeekbarRect();
            const x = Math.min(Math.max(pageX - rect.left, 0), 480);
            this.value = Math.floor(x * this.max / 480);

            currentTime = this.value;
            head = 0;
            tail = 0;    
        }
    }
    released() {
        if (this.restart) {
            playTracks();
        }
        this.isPressed = false;
        this.restart = false;
    }
    draw() {
        noStroke();

        const x = Math.floor(this.value * 480 / Math.max(this.max, 1));
        fill(64);
        rect(0, 460, 480, 20);
        fill(96);
        rect(0, 460, x, 20);

        const fmt = (t) => {
            const seconds = Math.floor(t / 1000);
            const min = Math.floor(seconds / 60);
            const sec = `0${seconds % 60}`.slice(-2);
            return `${min}:${sec}`;
        }
        fill(isPlaying || this.restart ? 255 : 128);
        textSize(10);
        textAlign(RIGHT, CENTER);
        text(`${fmt(this.value)} / ${fmt(this.max)}`, 476, 470);
    }
    _getSeekbarRect() {
        const rect = this.canvas.elt.getBoundingClientRect() ;

        rect.x += window.scrollX;
        rect.y += window.scrollY;

        rect.y += 460;
        rect.height = 20;

        return rect;
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
    // canvas
    const canvas = createCanvas(480, 480);
    canvas.parent('player');

    // play or pause
    canvas.mouseClicked(event => {
        if (seekbar.contains(event)) {
            return;
        }

        if (!isPlaying) {
            playTracks();
        } else {
            pauseTracks()
        }
    });

    // seekbar
    seekbar = new Seekbar(canvas);

    // rewind 5s
    document.querySelector('#rwd5').addEventListener('click', event => {
        currentTime = Math.max(currentTime - 5 * 1000, 0);
        seekbar.value = currentTime;
        head = 0;
        tail = 0;
        if (isPlaying) {
            pauseTracks();
            playTracks();
        }
    });

    // forward 5s
    document.querySelector('#fwd5').addEventListener('click', event => {
        currentTime = Math.min(currentTime + 5 * 1000, songLength);
        seekbar.value = currentTime;
        if (isPlaying) {
            pauseTracks();
            playTracks();
        }
    });

    // load song data
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
    }
}

function mousePressed(event) {
    if (seekbar.contains(event)) {
        seekbar.pressed()
        seekbar.seek(event.pageX);
    }
}

function mouseDragged(event) {
    if (seekbar.isPressed) {
        seekbar.seek(event.pageX);
    }
}

function mouseReleased() {
    if (seekbar.isPressed) {
        seekbar.released();
    }
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
    songLength = Math.floor(Number(metaData.length) * 1000);

    document.title = `${title} [${level}]`;
    seekbar.max = songLength;

    notes = rlrr.events.map(event => {
        const t = Math.floor(Number(event.time) * 1000) + bluetoothLatency;
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

    isLoading = false;
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
        const offset = currentTime / 1000;
        songTracks.forEach(track => track.start(0, offset));
        drumTracks.forEach(track => track.start(0, offset));
        startTime = millis() - currentTime;
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
    background(0);

    if (isLoading) {
        drawLoading();
    } else {
        if (isPlaying) {
            currentTime = millis() - startTime;
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
    noStroke();
    fill(255);
    textAlign(CENTER, CENTER);
    textSize(20);
    text("LOADING...", 240, 240);
}

function drawTitle() {
    noStroke();
    const c = color(192);
    c.setAlpha(128);
    fill(c)
    rect(0, 0, 480, 40);
    if (title) {
        fill(255);
        textAlign(LEFT, TOP);
        textSize(16);
        text(`${title} [${level}]`, 4, 4);
        textSize(12);
        text(artist, 4, 24);    
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
    noStroke();
    fill(color(32));
    rect(highwayLeft, 0, highwayWidth, 480);

    stroke(64);
    strokeWeight(1);
    const lineCount = highwayCount + 1;
    for (let i = 0; i < lineCount; i++) {
        const x = highwayLeft + i * 40;
        line(x, 0, x, 480);
    }

    const x = highwayLeft - 6;
    const w = highwayWidth + 12;
    const h = 6;
    noStroke();
    fill(color(192));
    rect(x, 440 - h / 2, w, h);
}

function drawNoteGuidelines() {
    stroke(64);
    strokeWeight(2);
    const s = {};
    for (let i = head; i < tail; i++) {
        if (currentTime < notes[i].hit) {
            s[notes[i].hit] = true;
        }
    }
    for (const t of Object.keys(s)) {
        const y = 440 - Math.max(t - currentTime, 0) * 440 / noteVisibleTime;
        line(highwayLeft, y, highwayLeft + highwayWidth, y);
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

    noStroke();
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
        fill(c);
        rect(x, y - h / 2, w, h);
    }

    noStroke();
    stroke(255);
    strokeWeight(1);
    for (const note of others) {
        const x = highwayLeft + highwayLanes.findIndex(name => name == note.drum) * 40 + 20;
        const y = 440 - Math.max(note.hit - currentTime, 0) * 440 / noteVisibleTime;
        const c = color(NOTES[note.drum].color);
        const a = 255 - Math.max(currentTime - note.hit, 0) * 255 / noteHideDelay;
        c.setAlpha(a);
        fill(c);
        switch(NOTES[note.drum].shape) {
            case 'circle': {
                const r = currentTime < note.hit ? 20 : 26;
                circle(x, y, r);
                break;
            }
            case 'rect': {
                const h = currentTime < note.hit ? 10 : 16;
                const w = currentTime < note.hit ? 30 : 36;
                rect(x - w / 2, y - h / 2, w, h);
                break;
            }
        }
    }
}
