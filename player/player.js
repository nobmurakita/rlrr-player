let songDir = '';
let rlrrFile = '';
let level = '';

const noteVisibleTime = 1500;
const noteHideDelay = 200;
let bluetoothLatency = 0;
// bluetoothLatency = 150;

let seekbar = null;

let metaData = {};
let songTracks = [];
let drumTracks = [];
let notes = [];
let notesCount = 0;
let highwayLanes = [];
let highwayCount = 0;
let highwayWidth = 0;
let highwayLeft = 0;

let songLength = 0;
let isLoaded = false;
let isPlaying = false;
let startTime = 0;
let currentTime = 0;
let head = 0;
let tail = 0;

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

function setup() {
    // canvas
    const canvas = createCanvas(480, 480);
    canvas.parent('player');

    // play or pause
    canvas.mouseClicked(() => {
        if (!isPlaying) {
            playTracks();
        } else {
            pauseTracks()
        }    
    });

    // seek
    let restart = false;
    seekbar = document.querySelector('#seekbar');
    seekbar.addEventListener('input', (event) => {
        if (isPlaying) {
            restart = true;
            pauseTracks();
        }
        currentTime = Number(event.target.value);
        head = 0;
        tail = 0;
    })
    seekbar.addEventListener('change', (event) => {
        if (restart) {
            playTracks();
            restart = false;
        }
    })

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
        const [dirname, filename] = rlrr.split('/');
        const m = filename.match(/.*_(Easy|Medium|Hard|Expert).rlrr/);
        if (m) {
            level = m[1];
            rlrrFile = `/songs/${dirname}/${filename}`;
            songDir = `/songs/${dirname}`;
        
            loadJSON(rlrrFile, rlrrLoaded);
        }    
    }
}

function rlrrLoaded(rlrr) {
    metaData = rlrr.recordingMetadata;

    const title = `${metaData.artist} - ${metaData.title} [${level}]`;
    document.title = title;
    document.querySelector('#title').textContent = title;

    songLength = Math.floor(Number(metaData.length) * 1000);
    seekbar.setAttribute('max', songLength);

    songTracks = Array(rlrr.audioFileData.songTracks.length);
    drumTracks = Array(rlrr.audioFileData.drumTracks.length);
    rlrr.audioFileData.songTracks.forEach((trackFileName, index) => {
        songTracks[index] = new Tone.Player(`${songDir}/${trackFileName}`, trackLoaded).toDestination();
    });
    rlrr.audioFileData.drumTracks.forEach((trackFileName, index) => {
        drumTracks[index] = new Tone.Player(`${songDir}/${trackFileName}`, trackLoaded).toDestination();
    });

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
}

function trackLoaded() {
    if (songTracks.findIndex(track => !track || !track.loaded) != -1) {
        return;
    }
    if (drumTracks.findIndex(track => !track || !track.loaded) != -1) {
        return;
    }

    isLoaded = true;
    console.log("ready");
}

function playTracks() {
    if (isLoaded && !isPlaying) {
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
    if (isLoaded) {
        if (isPlaying) {            
            currentTime = millis() - startTime;
            seekbar.value = currentTime;
            if (songLength <= currentTime) {
                pauseTracks();
                currentTime = 0;
            }
        }
        drawHighway();
        seekVisibleNotes();
        drawNoteGuidelines();
        drawNotes();
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

    const x = highwayLeft;
    const h = 6;
    noStroke();
    fill(color(128));
    rect(x, 460 - h / 2, highwayWidth, h);
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
        const y = 460 - Math.max(t - currentTime, 0) * 460 / noteVisibleTime;
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
        const y = 460 - Math.max(note.hit - currentTime, 0) * 460 / noteVisibleTime;
        const h = currentTime < note.hit ? 6 : 12;
        const c = color(NOTES.Kick.color);
        if (note.hit <= currentTime) {
            x -= 5;
            w += 10;
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
        const y = 460 - Math.max(note.hit - currentTime, 0) * 460 / noteVisibleTime;
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
