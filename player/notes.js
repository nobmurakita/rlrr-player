const NOTE_VISIBLE_TIME = 1.5;
const NOTE_AFTERGLOW_TIME = 0.2;

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

class Note {
    audioTime = 0;
    latency = 0;

    constructor(name, time) {
        this.name = name;
        this.drum = name.split('_')[1];

        const t = Number(time);
        this._showAt = t - NOTE_VISIBLE_TIME;
        this._fireAt = t;
        this._hideAt = t + NOTE_AFTERGLOW_TIME;
    }

    get showAt() {
        return this._showAt + this.latency;
    }

    get fireAt() {
        return this._fireAt + this.latency;
    }

    get hideAt() {
        return this._hideAt + this.latency;
    }

    get isVisible() {
        return this.showAt <= this.audioTime && this.audioTime <= this.hideAt;
    }

    get isAlive() {
        return this.audioTime < this.fireAt;
    }

    get progress() {
        return Math.min(this.audioTime - this.showAt, NOTE_VISIBLE_TIME) / NOTE_VISIBLE_TIME;
    }

    get afterglow() {
        return Math.min(this.audioTime - this.fireAt, NOTE_AFTERGLOW_TIME) / NOTE_AFTERGLOW_TIME;
    }

    get color() {
        const c = color(NOTES[this.drum].color);
        c.setAlpha(255 - this.afterglow * 255);
        return c;
    }
}

class Notes {
    audioTime = 0;
    notes = [];
    visibleNotes = [];

    constructor(screen) {
        this.screen = screen;
    }

    init(events) {
        this.notes = events.map(event => new Note(event.name, event.time));
    }

    get drums() {
        return this.notes.map(note => note.drum);
    }

    tick(audioTime, latency) {
        this.audioTime = audioTime;
        this.notes.forEach(note => {
            note.audioTime = audioTime;
            note.latency = latency;
        });
        this.visibleNotes = this.notes.filter(note => note.isVisible);
    }

    drawGuidelines(highwayWidth) {
        const guidelines = {};
        for (const note of this.visibleNotes) {
            if (note.isAlive) {
                guidelines[note.progress] = true;
            }
        }

        this.screen.noStroke();
        this.screen.fill(color(64));
        this.screen.rectMode(CENTER);
        for (const progress of Object.keys(guidelines)) {
            this.screen.rect(240, progress * 440, highwayWidth, 1);
        }
    }

    drawNotes(highwayLanes, highwayLeft, highwayWidth) {
        const kicks = [];
        const others = [];

        for (const note of this.visibleNotes) {
            if (note.drum == 'Kick') {
                kicks.push(note);
            } else {
                others.push(note);
            }
        }

        this.screen.noStroke();
        this.screen.rectMode(CENTER);
        for (const note of kicks) {
            const y = note.progress * 440;
            const [w, h] = note.isAlive ? [highwayWidth, 6] : [highwayWidth + 20, 12];
            this.screen.fill(note.color);
            this.screen.rect(240, y, w, h);
        }

        this.screen.strokeWeight(1);
        this.screen.rectMode(CENTER);
        for (const note of others) {
            const x = highwayLeft + highwayLanes.findIndex(name => name == note.drum) * 40 + 20;
            const y = note.progress * 440;
            this.screen.fill(note.color);
            switch (NOTES[note.drum].shape) {
                case 'circle': {
                    const [r, s] = note.isAlive ? [20, 'white'] : [26, 'yellow'];
                    this.screen.stroke(s);
                    this.screen.circle(x, y, r);
                    break;
                }
                case 'rect': {
                    const [w, h, s] = note.isAlive ? [30, 10, 'white'] : [36, 16, 'yellow'];
                    this.screen.stroke(s);
                    this.screen.rect(x, y, w, h);
                    break;
                }
            }
        }
    }
}