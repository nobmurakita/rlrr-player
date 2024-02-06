
class Audio {
    audioCtx = null;
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

        // AudioContext の stuck 対策
        let prevContextTime = this.audioCtx.currentTime;
        const fixAudioContextStuck = async () => {
            if (this.audioCtx.state == 'running') {
                if (prevContextTime == this.audioCtx.currentTime) {
                    console.warn('AudioContext stuck');
                    await this.audioCtx.suspend();
                    await this.audioCtx.resume();
                }
                prevContextTime = this.audioCtx.currentTime;    
            }
            setTimeout(fixAudioContextStuck, 100);
        }
        setTimeout(fixAudioContextStuck, 100);
    }

    get isEnded() {
        return this.length <= this.time;
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

    play() {
        if (!this.isPlaying) {
            if (this.audioCtx.state == 'suspended') {
                this.audioCtx.resume();
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
            this.latency = this.audioCtx.baseLatency + this.audioCtx.outputLatency;
            this.time = Math.min(this.audioCtx.currentTime - this.startTime, this.length);
            if (this.isEnded) {
                this.pause();
            }
        }
    }
}