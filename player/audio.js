
class Audio {
    audioCtx = null;
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

    init() {
        this.audioCtx = new AudioContext();
    }

    get isEnded() {
        return this.length + this.latency <= this.time;
    }

    async load(songUrls, drumUrls) {
        const songTrackPromises = songUrls.map(url => this.loadTrack(url));
        const drumTrackPromises = drumUrls.map(url => this.loadTrack(url));
        this.songBuffers = await Promise.all(songTrackPromises);
        this.drumBuffers = await Promise.all(drumTrackPromises);
        this.time = 0;
    }

    async loadTrack(url) {
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
            await this.audioCtx.close();
            this.audioCtx = new AudioContext();
            if (this.audioCtx.state == 'suspended') {
                await this.audioCtx.resume();
            }

            this.songSources = this.songBuffers.map(buffer => this.toAudioBufferSource(buffer));
            this.drumSources = this.drumBuffers.map(buffer => this.toAudioBufferSource(buffer));
            this.songSources.forEach(source => source.start(this.audioCtx.currentTime, this.time));
            this.drumSources.forEach(source => source.start(this.audioCtx.currentTime, this.time));
            this.startTime = this.audioCtx.currentTime - this.time;
            this.isPlaying = true;
        }
    }

    toAudioBufferSource(buffer) {
        const source = this.audioCtx.createBufferSource();
        source.buffer = buffer;
        source.connect(this.audioCtx.destination);
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
                this.pause();
            }
        }
    }
}