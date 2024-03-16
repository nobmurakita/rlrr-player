
const NOTE_SPRITE = {
    Kick: [0, 0.9],
    HiHat: [1, 0.9],
    Snare: [2, 0.9],
    Tom1: [3, 0.9],
    Tom2: [4, 0.9],
    FloorTom: [5, 0.9],
    Ride17: [6, 1.9],
    Ride21: [8, 1.9],
    Crash15: [10, 3.9],
    Crash17: [14, 3.9],
};

class Audio {
    audioCtx = null;
    masterGainNode = null;
    songGainNode = null;
    drumGainNode = null;
    noteGainNode = null;

    latencies = [];
    latency = 0;

    length = 0;
    songBuffers = [];
    drumBuffers = [];
    songSources = [];
    drumSources = [];

    isPlaying = false;
    startTime = 0;
    time = 0;

    repeat = false;

    init() {
        this.audioCtx = new AudioContext();
        this.masterGainNode = this.audioCtx.createGain();
        this.songGainNode = this.audioCtx.createGain();
        this.drumGainNode = this.audioCtx.createGain();
        this.noteGainNode = this.audioCtx.createGain();
        this.masterGainNode.gain.value = 0.5;
        this.songGainNode.gain.value = 0.5;
        this.drumGainNode.gain.value = 0.5;
        this.noteGainNode.gain.value = 0.5;
    }

    get isEnded() {
        return this.length + this.latency <= this.time;
    }

    async load(songUrls, drumUrls) {
        const songTrackPromises = songUrls.map(url => this.loadAudio(url));
        const drumTrackPromises = drumUrls.map(url => this.loadAudio(url));
        this.songBuffers = await Promise.all(songTrackPromises);
        this.drumBuffers = await Promise.all(drumTrackPromises);
        this.noteBuffer = await this.loadAudio('/player/noteSprite.ogg');
    }

    async loadAudio(url) {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`failed to load track: ${url}`);
        }
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await this.audioCtx.decodeAudioData(arrayBuffer);
        return audioBuffer;
    }

    async play() {
        if (!this.isPlaying) {
            await this.audioCtx.suspend();
            await this.audioCtx.resume();
            await this.audioCtx.suspend();
            await this.audioCtx.resume();
            this.songSources = this.songBuffers.map(buffer => this.toAudioBufferSource(buffer, this.songGainNode));
            this.drumSources = this.drumBuffers.map(buffer => this.toAudioBufferSource(buffer, this.drumGainNode));
            this.songSources.forEach(source => source.start(this.audioCtx.currentTime, this.time));
            this.drumSources.forEach(source => source.start(this.audioCtx.currentTime, this.time));
            this.startTime = this.audioCtx.currentTime - this.time;
            this.isPlaying = true;
        }
    }

    toAudioBufferSource(buffer, gainNode) {
        const source = this.audioCtx.createBufferSource();
        source.buffer = buffer;
        source.connect(gainNode).connect(this.masterGainNode).connect(this.audioCtx.destination);
        return source;
    }

    pause() {
        if (this.isPlaying) {
            this.songSources = this.songSources.map(source => this.stopAudioBufferSource(source));
            this.drumSources = this.drumSources.map(source => this.stopAudioBufferSource(source));
            this.isPlaying = false;    
        }
    }

    stopAudioBufferSource(source) {
        source.stop(this.audioCtx.currentTime);
        source.disconnect();
        source.buffer = null;
        return null;
    }

    skip(newTime, continuePlaying) {
        this.time = newTime;
        if (this.isPlaying && continuePlaying) {
            this.pause();
            if (!this.isEnded) {
                // スキップ時に即時 play すると Note.sounded が適切に処理されないため1フレーム以上の遅延を挟む
                setTimeout(() => this.play(), 1000 / 60);
            }
        }
    }

    soundNote(drum) {
        const [offset, duration] = NOTE_SPRITE[drum];
        const source = this.toAudioBufferSource(this.noteBuffer, this.noteGainNode);
        source.start(this.audioCtx.currentTime, offset, duration);
        setTimeout(() => {
            source.disconnect();
            source.buffer = null;
        }, duration * 1000);
    }

    tick() {
        if (this.isPlaying) {
            // 直近10フレームのレイテンシーの平均を取る
            this.latencies.push(this.audioCtx.baseLatency + this.audioCtx.outputLatency);
            if (this.latencies.length > 10) {
                this.latencies.shift();
            }
            this.latency = this.latencies.reduce((a, b) => a + b, 0) / this.latencies.length;

            this.time = Math.min(this.audioCtx.currentTime - this.startTime, this.length + this.latency);
            if (this.isEnded) {
                if (this.repeat) {
                    this.skip(0, true);
                } else {
                    this.pause();
                }
            }
        }
    }
}