const NOTE_VISIBLE_TIME = 1.5;
const NOTE_HIDE_DELAY = 0.2;
const BLUETOOTH_LATENCY = 0;
// const BLUETOOTH_LATENCY = 0.15;

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

let audioCtx = new AudioContext();

const toAudioBufferSource = buffer => {
    const source = audioCtx.createBufferSource();
    source.buffer = buffer;
    source.connect(audioCtx.destination);
    return source;
}

const stopAudioBufferSource = source => {
    source.stop(audioCtx.currentTime);
    source.disconnect();
    source.buffer = null;
    return null;
}

class App {
    constructor() {
        this.artist = '';
        this.title = '';
        this.level = '';
        this.songLength = 0;

        this.songBuffers = [];
        this.drumBuffers = [];
        this.songSources = [];
        this.drumSources = [];
        this.notes = [];
        this.notesCount = 0;
        this.highwayLanes = [];
        this.highwayCount = 0;
        this.highwayWidth = 0;
        this.highwayLeft = 0;

        this.isLoading = true;
        this.isPlaying = false;
        this.startTime = 0;
        this.currentTime = 0;
        this.head = 0;
        this.tail = 0;

        this.init();
    }
    init() {
        this.screen = createGraphics(480, 480);

        this.seekbar = new Seekbar(this.screen, 0, 460, 480, 20);
        let restart = false;
        this.seekbar.seekStarted = () => {
            restart = this.isPlaying;
            this.pause();
        }
        this.seekbar.seeked = () => {
            this.currentTime = this.seekbar.value;
            this.head = 0;
            this.tail = 0;
        };
        this.seekbar.seekEnded = () => {
            if (restart) {
                this.play();
            }
            restart = false;
        }
    }

    // load
    async load(rlrr) {
        const m = rlrr.match(/([^/]+)\/([^/]+_(Easy|Medium|Hard|Expert)\.rlrr)/);
        if (!m) {
            throw new Error(`invalid rlrr file name: ${rlrr}`);
        }

        const dirname = m[1];
        const filename = m[2];
        this.level = m[3];

        this.songDir = `/songs/${dirname}`;
        const rlrrFile = `/songs/${dirname}/${filename}`;

        await this.loadRlrr(rlrrFile);
        this.isLoading = false;
    }
    async loadRlrr(rlrrFile) {
        const response = await fetch(rlrrFile);
        if (!response.ok) {
            throw new Error(`could not load url: ${rlrrFile}`);
        }
        const rlrr = await response.json();

        const metaData = rlrr.recordingMetadata;
        this.artist = metaData.artist;
        this.title = metaData.title;
        this.songLength = metaData.length;

        document.title = `${this.title} [${this.level}]`;
        this.seekbar.max = this.songLength;

        this.notes = rlrr.events.map(event => {
            const t = Number(event.time) + BLUETOOTH_LATENCY;
            return {
                drum: event.name.split('_')[1],
                show: t - NOTE_VISIBLE_TIME,
                hit: t,
                hide: t + NOTE_HIDE_DELAY,
            }
        });
        this.notesCount = this.notes.length;

        const drumSet = ['HiHat', 'Crash15', 'Snare', 'Tom1', 'Tom2', 'FloorTom', 'Crash17', 'Ride17', 'Ride21'];
        const drums = this.notes.map(note => note.drum);
        this.highwayLanes = drumSet.filter(drum => drums.includes(drum));
        this.highwayCount = this.highwayLanes.length;
        this.highwayWidth = this.highwayCount * 40;
        this.highwayLeft = (480 - this.highwayWidth) / 2;

        const songTrackPromises = rlrr.audioFileData.songTracks.map(track => this.loadTrack(track));
        const drumTrackPromises = rlrr.audioFileData.drumTracks.map(track => this.loadTrack(track));
        this.songBuffers = await Promise.all(songTrackPromises);
        this.drumBuffers = await Promise.all(drumTrackPromises);
    }
    async loadTrack(trackFileName) {
        const url = `${this.songDir}/${trackFileName}`;
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`failed to load track: ${url}`);
        }
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
        return audioBuffer;
    }

    // play
    async play() {
        if (!this.isLoading && !this.isPlaying) {
            if (audioCtx.state == 'suspended') {
                await audioCtx.resume();
            }
            if (this.songLength <= this.currentTime) {
                this.currentTime = 0;
                this.head = 0;
                this.tail = 0;
                this.seekbar.value = this.currentTime;
            }
            this.songSources = this.songBuffers.map(toAudioBufferSource);
            this.drumSources = this.drumBuffers.map(toAudioBufferSource);
            this.songSources.forEach(source => source.start(audioCtx.currentTime, this.currentTime));
            this.drumSources.forEach(source => source.start(audioCtx.currentTime, this.currentTime));
            this.startTime = audioCtx.currentTime - this.currentTime;
            this.isPlaying = true;
        }
    }
    async pause() {
        if (this.isPlaying) {
            this.songSources = this.songSources.map(stopAudioBufferSource);
            this.drumSources = this.drumSources.map(stopAudioBufferSource);
            this.isPlaying = false;
        }
    }
    togglePlay() {
        if (!this.isPlaying) {
            this.play();
        } else {
            this.pause()
        }
    }
    skip(newTime, continuePlaying) {
        this.currentTime = newTime;
        this.seekbar.value = newTime;
        this.head = 0;
        this.tail = 0;
        const restart = this.isPlaying && continuePlaying;
        this.pause();
        if (restart) {
            this.play();
        }
    }

    // sync
    sync() {
        if (this.isPlaying) {
            this.currentTime = Math.min(audioCtx.currentTime - this.startTime, this.songLength);
            this.seekbar.value = this.currentTime;
            if (this.currentTime == this.songLength) {
                this.pause();
            }
        }
    }

    // draw
    draw() {
        this.screen.background(0);

        if (this.isLoading) {
            this.drawLoading();
        } else {
            this.drawHighway();
            this.seekVisibleNotes();
            this.drawNoteGuidelines();
            this.drawNotes();
        }

        this.drawTitle();
        this.seekbar.draw(this.isPlaying);
    }
    drawLoading() {
        this.screen.noStroke();
        this.screen.fill(255);
        this.screen.textAlign(CENTER, CENTER);
        this.screen.textSize(20);
        this.screen.text("LOADING...", 240, 240);
    }
    drawTitle() {
        this.screen.noStroke();
        const c = color(192);
        c.setAlpha(128);
        this.screen.fill(c)
        this.screen.rectMode(CORNER);
        this.screen.rect(0, 0, 480, 40);
        if (this.title) {
            this.screen.fill(255);
            this.screen.textAlign(LEFT, TOP);
            this.screen.textSize(16);
            this.screen.text(`${this.title} [${this.level}]`, 4, 4);
            this.screen.textSize(12);
            this.screen.text(this.artist, 4, 24);
        }
    }
    seekVisibleNotes() {
        while (this.tail < this.notesCount && this.currentTime >= this.notes[this.tail].show) {
            this.tail++;
        }
        while (this.head < this.tail && this.currentTime > this.notes[this.head].hide) {
            this.head++;
        }
    }
    drawHighway() {
        this.screen.stroke(64);
        this.screen.strokeWeight(1);
        this.screen.fill(color(32));
        this.screen.rectMode(CORNER);
        for (let i = 0; i < this.highwayCount; i++) {
            this.screen.rect(this.highwayLeft + i * 40, 0, 40, 480);
        }

        this.screen.noStroke();
        this.screen.fill(color(192));
        this.screen.rectMode(CENTER);
        this.screen.rect(240, 440, this.highwayWidth + 12, 6);
    }
    drawNoteGuidelines() {
        const guidelines = {};
        for (let i = this.head; i < this.tail; i++) {
            if (this.currentTime < this.notes[i].hit) {
                guidelines[this.notes[i].hit] = true;
            }
        }

        this.screen.noStroke();
        this.screen.fill(color(64));
        this.screen.rectMode(CENTER);
        for (const hit of Object.keys(guidelines)) {
            const y = 440 - Math.max(hit - this.currentTime, 0) * 440 / NOTE_VISIBLE_TIME;
            this.screen.rect(240, y, this.highwayWidth, 1);
        }
    }
    drawNotes() {
        const kicks = [];
        const others = [];

        for (let i = this.head; i < this.tail; i++) {
            if (this.notes[i].drum == 'Kick') {
                kicks.push(this.notes[i]);
            } else {
                others.push(this.notes[i]);
            }
        }

        this.screen.noStroke();
        this.screen.rectMode(CENTER);
        for (const note of kicks) {
            const y = 440 - Math.max(note.hit - this.currentTime, 0) * 440 / NOTE_VISIBLE_TIME;
            const w = this.currentTime < note.hit ? this.highwayWidth : this.highwayWidth + 20;
            const h = this.currentTime < note.hit ? 6 : 12;
            const c = color(NOTES.Kick.color);
            const a = 255 - Math.max(this.currentTime - note.hit, 0) * 255 / NOTE_HIDE_DELAY;
            c.setAlpha(a);
            this.screen.fill(c);
            this.screen.rect(240, y, w, h);
        }

        this.screen.stroke(255);
        this.screen.strokeWeight(1);
        this.screen.rectMode(CENTER);
        for (const note of others) {
            const x = this.highwayLeft + this.highwayLanes.findIndex(name => name == note.drum) * 40 + 20;
            const y = 440 - Math.max(note.hit - this.currentTime, 0) * 440 / NOTE_VISIBLE_TIME;
            const c = color(NOTES[note.drum].color);
            const a = 255 - Math.max(this.currentTime - note.hit, 0) * 255 / NOTE_HIDE_DELAY;
            c.setAlpha(a);
            this.screen.fill(c);
            switch (NOTES[note.drum].shape) {
                case 'circle': {
                    const r = this.currentTime < note.hit ? 20 : 26;
                    this.screen.circle(x, y, r);
                    break;
                }
                case 'rect': {
                    const h = this.currentTime < note.hit ? 10 : 16;
                    const w = this.currentTime < note.hit ? 30 : 36;
                    this.screen.rect(x, y, w, h);
                    break;
                }
            }
        }
    }

    // cursor
    cursor(appMouseX, appMouseY) {
        let inOffscreen = true;
        if (appMouseX < 0 || 480 < appMouseX) {
            inOffscreen = false;
        }
        if (appMouseY < 0 || 480 < appMouseY) {
            inOffscreen = false;
        }
        if (inOffscreen) {
            if (this.seekbar.isMouseOver(appMouseX, appMouseY)) {
                cursor('ew-resize')
            } else {
                cursor(this.isLoading ? 'wait' : 'pointer')
            }
        } else {
            cursor('default');
        }
    }

    // events
    keyPressed(key) {
        if (key == ' ') {
            this.togglePlay();
        }
        if (key == 'ArrowLeft' || key == 'ArrowRight') {
            const skip = key == 'ArrowLeft' ? -5 : 5;
            const newTime = Math.min(Math.max(this.currentTime + skip, 0), this.songLength);
            this.skip(newTime, true);
        }
        if (key == 'Backspace' || key == 'Delete') {
            this.skip(0, true);
        }
        if (key == 'Escape') {
            this.skip(0, false);
        }
        if (key == 'f') {
            fullscreen(true);
        }
    }
    mouseClicked(appMouseX, appMouseY) {
        if (appMouseX < 0 || 480 < appMouseX) { return };
        if (appMouseY < 0 || 480 < appMouseY) { return };
        if (!this.seekbar.isMouseOver(appMouseX, appMouseY)) {
            this.togglePlay();
        }
    }
    mousePressed(appMouseX, appMouseY) {
        if (this.seekbar.isMouseOver(appMouseX, appMouseY)) {
            this.seekbar.seekStart(appMouseX);
        }
    }
    mouseDragged(appMouseX, _appMouseY) {
        if (this.seekbar.isDragging) {
            this.seekbar.seek(appMouseX);
        }
    }
    mouseReleased(_appMouseX, _appMouseY) {
        if (this.seekbar.isDragging) {
            this.seekbar.seekEnd();
        }
    }
}
