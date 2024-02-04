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

class App {
    isLoading = true;

    artist = '';
    title = '';
    level = '';

    notes = [];
    head = 0;
    tail = 0;

    highwayLanes = [];
    highwayCount = 0;
    highwayWidth = 0;
    highwayLeft = 0;

    init() {
        this.screen = createGraphics(480, 480);

        this.seekbar = new Seekbar(this.screen, 0, 460, 480, 20);
        let restart = false;
        this.seekbar.seekStarted = () => {
            restart = this.audio.isPlaying;
            this.pause();
        }
        this.seekbar.seeked = () => {
            this.audio.time = this.seekbar.value;
            this.rewindNotes();
        };
        this.seekbar.seekEnded = () => {
            if (restart) {
                this.play();
                restart = false;
            }
        }

        this.audio = new Audio();
        this.audio.init();
    }

    // ロード
    async load(rlrr) {
        const m = rlrr.match(/([^/]+)\/([^/]+_(Easy|Medium|Hard|Expert)\.rlrr)/);
        if (!m) {
            throw new Error(`invalid rlrr file name: ${rlrr}`);
        }
        const dirname = m[1];
        const filename = m[2];
        this.level = m[3];

        const rlrrUrl = `/songs/${dirname}/${filename}`;
        const response = await fetch(rlrrUrl);
        if (!response.ok) {
            throw new Error(`failed to load rlrr: ${rlrrUrl}`);
        }
        const rlrrData = await response.json();

        const metaData = rlrrData.recordingMetadata;
        this.artist = metaData.artist;
        this.title = metaData.title;
        this.audio.length = metaData.length;

        document.title = `${this.title} [${this.level}]`;
        this.seekbar.max = this.audio.length;

        this.notes = rlrrData.events.map(event => {
            const t = Number(event.time) + BLUETOOTH_LATENCY;
            return {
                drum: event.name.split('_')[1],
                show: t - NOTE_VISIBLE_TIME,
                hit: t,
                hide: t + NOTE_HIDE_DELAY,
            }
        });

        const drumSet = ['HiHat', 'Crash15', 'Snare', 'Tom1', 'Tom2', 'FloorTom', 'Crash17', 'Ride17', 'Ride21'];
        const drums = this.notes.map(note => note.drum);
        this.highwayLanes = drumSet.filter(drum => drums.includes(drum));
        this.highwayCount = this.highwayLanes.length;
        this.highwayWidth = this.highwayCount * 40;
        this.highwayLeft = (480 - this.highwayWidth) / 2;

        const songUrls = rlrrData.audioFileData.songTracks.map(track => `/songs/${dirname}/${track}`);
        const drumUrls = rlrrData.audioFileData.drumTracks.map(track => `/songs/${dirname}/${track}`);
        await this.audio.load(songUrls, drumUrls);

        this.isLoading = false;
    }

    // オーディオコントロール
    play() {
        if (!this.isLoading && !this.audio.isPlaying) {
            if (this.audio.isEnded) {
                this.audio.time = 0;
                this.rewindNotes();
            }
            this.audio.play();
        }
    }
    pause() {
        this.audio.pause();
    }
    togglePlay() {
        if (!this.audio.isPlaying) {
            this.play();
        } else {
            this.pause()
        }
    }
    skip(newTime, continuePlaying) {
        this.audio.time = newTime;
        this.rewindNotes();
        if (this.audio.isPlaying && continuePlaying) {
            this.pause();
            if (!this.audio.isEnded) {
                this.play();
            }
        }
    }

    // 時間を進める
    tick() {
        this.audio.tick();
        this.seekbar.value = this.audio.time;
    }

    // 描画
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
        this.seekbar.draw(this.audio.isPlaying);
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
    rewindNotes() {
        this.head = 0;
        this.tail = 0;
    }
    seekVisibleNotes() {
        while (this.tail < this.notes.length && this.audio.time >= this.notes[this.tail].show) {
            this.tail++;
        }
        while (this.head < this.tail && this.audio.time > this.notes[this.head].hide) {
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
            if (this.audio.time < this.notes[i].hit) {
                guidelines[this.notes[i].hit] = true;
            }
        }

        this.screen.noStroke();
        this.screen.fill(color(64));
        this.screen.rectMode(CENTER);
        for (const hit of Object.keys(guidelines)) {
            const y = 440 - Math.max(hit - this.audio.time, 0) * 440 / NOTE_VISIBLE_TIME;
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
            const y = 440 - Math.max(note.hit - this.audio.time, 0) * 440 / NOTE_VISIBLE_TIME;
            const w = this.audio.time < note.hit ? this.highwayWidth : this.highwayWidth + 20;
            const h = this.audio.time < note.hit ? 6 : 12;
            const c = color(NOTES.Kick.color);
            const a = 255 - Math.max(this.audio.time - note.hit, 0) * 255 / NOTE_HIDE_DELAY;
            c.setAlpha(a);
            this.screen.fill(c);
            this.screen.rect(240, y, w, h);
        }

        this.screen.stroke(255);
        this.screen.strokeWeight(1);
        this.screen.rectMode(CENTER);
        for (const note of others) {
            const x = this.highwayLeft + this.highwayLanes.findIndex(name => name == note.drum) * 40 + 20;
            const y = 440 - Math.max(note.hit - this.audio.time, 0) * 440 / NOTE_VISIBLE_TIME;
            const c = color(NOTES[note.drum].color);
            const a = 255 - Math.max(this.audio.time - note.hit, 0) * 255 / NOTE_HIDE_DELAY;
            c.setAlpha(a);
            this.screen.fill(c);
            switch (NOTES[note.drum].shape) {
                case 'circle': {
                    const r = this.audio.time < note.hit ? 20 : 26;
                    this.screen.circle(x, y, r);
                    break;
                }
                case 'rect': {
                    const h = this.audio.time < note.hit ? 10 : 16;
                    const w = this.audio.time < note.hit ? 30 : 36;
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
            const newTime = Math.min(Math.max(this.audio.time + skip, 0), this.audio.length);
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
