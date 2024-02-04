
class App {
    isLoading = true;

    artist = '';
    title = '';
    level = '';

    highwayLanes = [];
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
            this.notes.rewind();
        };
        this.seekbar.seekEnded = () => {
            if (restart) {
                this.play();
                restart = false;
            }
        }

        this.notes = new Notes(this.screen);

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

        this.notes.init(rlrrData.events);

        const drumSet = ['HiHat', 'Crash15', 'Snare', 'Tom1', 'Tom2', 'FloorTom', 'Crash17', 'Ride17', 'Ride21'];
        const drums = this.notes.drums;
        this.highwayLanes = drumSet.filter(drum => drums.includes(drum));
        this.highwayWidth = this.highwayLanes.length * 40;
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
                this.notes.rewind();
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
        this.notes.rewind();
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
            this.notes.seek(this.audio.time);
            this.drawHighwayLanes();
            this.notes.drawGuidelines(this.audio.time, this.highwayWidth);
            this.drawHighwayGoal();
            this.notes.drawNotes(this.audio.time, this.highwayLanes, this.highwayLeft, this.highwayWidth);
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
    drawHighwayLanes() {
        this.screen.stroke(64);
        this.screen.strokeWeight(1);
        this.screen.fill(color(32));
        this.screen.rectMode(CORNER);
        const highwayCount = this.highwayLanes.length;
        for (let i = 0; i < highwayCount; i++) {
            this.screen.rect(this.highwayLeft + i * 40, 0, 40, 480);
        }
    }
    drawHighwayGoal() {
        this.screen.noStroke();
        this.screen.fill(color(192));
        this.screen.rectMode(CENTER);
        this.screen.rect(240, 440, this.highwayWidth + 12, 6);
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
