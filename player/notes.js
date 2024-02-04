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

class Notes {
    notes = [];
    head = 0;
    tail = 0;

    constructor(screen) {
        this.screen = screen;
    }

    init(events) {
        this.notes = events.map(event => {
            const t = Number(event.time) + BLUETOOTH_LATENCY;
            return {
                drum: event.name.split('_')[1],
                show: t - NOTE_VISIBLE_TIME,
                hit: t,
                hide: t + NOTE_HIDE_DELAY,
            }
        });
    }

    get drums() {
        return this.notes.map(note => note.drum);
    }

    rewind() {
        this.head = 0;
        this.tail = 0;
    }

    seek(audioTime) {
        while (this.tail < this.notes.length && audioTime >= this.notes[this.tail].show) {
            this.tail++;
        }
        while (this.head < this.tail && audioTime > this.notes[this.head].hide) {
            this.head++;
        }
    }

    drawGuidelines(audioTime, highwayWidth) {
        const guidelines = {};
        for (let i = this.head; i < this.tail; i++) {
            if (audioTime < this.notes[i].hit) {
                guidelines[this.notes[i].hit] = true;
            }
        }

        this.screen.noStroke();
        this.screen.fill(color(64));
        this.screen.rectMode(CENTER);
        for (const hit of Object.keys(guidelines)) {
            const y = 440 - Math.max(hit - audioTime, 0) * 440 / NOTE_VISIBLE_TIME;
            this.screen.rect(240, y, highwayWidth, 1);
        }
    }

    drawNotes(audioTime, highwayLanes, highwayLeft, highwayWidth) {
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
            const y = 440 - Math.max(note.hit - audioTime, 0) * 440 / NOTE_VISIBLE_TIME;
            const w = audioTime < note.hit ? highwayWidth : highwayWidth + 20;
            const h = audioTime < note.hit ? 6 : 12;
            const c = color(NOTES.Kick.color);
            const a = 255 - Math.max(audioTime - note.hit, 0) * 255 / NOTE_HIDE_DELAY;
            c.setAlpha(a);
            this.screen.fill(c);
            this.screen.rect(240, y, w, h);
        }

        this.screen.stroke(255);
        this.screen.strokeWeight(1);
        this.screen.rectMode(CENTER);
        for (const note of others) {
            const x = highwayLeft + highwayLanes.findIndex(name => name == note.drum) * 40 + 20;
            const y = 440 - Math.max(note.hit - audioTime, 0) * 440 / NOTE_VISIBLE_TIME;
            const c = color(NOTES[note.drum].color);
            const a = 255 - Math.max(audioTime - note.hit, 0) * 255 / NOTE_HIDE_DELAY;
            c.setAlpha(a);
            this.screen.fill(c);
            switch (NOTES[note.drum].shape) {
                case 'circle': {
                    const r = audioTime < note.hit ? 20 : 26;
                    this.screen.circle(x, y, r);
                    break;
                }
                case 'rect': {
                    const h = audioTime < note.hit ? 10 : 16;
                    const w = audioTime < note.hit ? 30 : 36;
                    this.screen.rect(x, y, w, h);
                    break;
                }
            }
        }
    }
}