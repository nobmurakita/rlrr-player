let app = null;
let viewportX = 0;
let viewportY = 0;
let viewportW = 480;
let viewportH = 480;

async function setup() {
    app = new App();
    app.init();

    const canvas = createCanvas(0, 0);
    updateCanvasSize();

    canvas.mouseClicked(() => {
        app.mouseClicked(toAppX(mouseX), toAppY(mouseY));
    });
    canvas.mousePressed(() => {
        app.mousePressed(toAppX(mouseX), toAppY(mouseY));
    });
    canvas.mouseMoved(() => {
        app.mouseDragged(toAppX(mouseX), toAppY(mouseY));
    });
    canvas.mouseReleased(() => {
        app.mouseReleased(toAppX(mouseX), toAppY(mouseY));
    });

    const options = await window.rlrr.getPlayerOptions();
    app.audio.masterGainNode.gain.value = options.masterVolume;
    app.audio.songGainNode.gain.value = options.songVolume;
    app.audio.drumGainNode.gain.value = options.drumVolume;
    app.audio.noteGainNode.gain.value = options.noteVolume;
    app.audio.repeat = options.repeat;

    document.getElementById('masterVolume').value = Math.floor(app.audio.masterGainNode.gain.value * 100);
    document.getElementById('masterVolume').addEventListener('input', event => {
        const masterVolume = event.target.value / 100;
        app.audio.masterGainNode.gain.value = masterVolume;
        window.rlrr.updatePlayerOptions({ masterVolume });
    });
    document.getElementById('songVolume').value = Math.floor(app.audio.songGainNode.gain.value * 100);
    document.getElementById('songVolume').addEventListener('input', event => {
        const songVolume = event.target.value / 100;
        app.audio.songGainNode.gain.value = songVolume;
        window.rlrr.updatePlayerOptions({ songVolume });
    });
    document.getElementById('drumVolume').value = Math.floor(app.audio.drumGainNode.gain.value * 100);
    document.getElementById('drumVolume').addEventListener('input', event => {
        const drumVolume = event.target.value / 100;
        app.audio.drumGainNode.gain.value = drumVolume;
        window.rlrr.updatePlayerOptions({ drumVolume });
    });
    document.getElementById('noteVolume').value = Math.floor(app.audio.noteGainNode.gain.value * 100);
    document.getElementById('noteVolume').addEventListener('input', event => {
        const noteVolume = event.target.value / 100;
        app.audio.noteGainNode.gain.value = noteVolume;
        window.rlrr.updatePlayerOptions({ noteVolume });
    });
    document.getElementById('repeat').checked = options.repeat;
    document.getElementById('repeat').addEventListener('input', event => {
        const repeat = event.target.checked;
        app.audio.repeat = repeat;
        window.rlrr.updatePlayerOptions({ repeat });
    });
    document.getElementById('options').addEventListener('mouseleave', () => {
        if (document.activeElement != document.body) {
            document.activeElement.blur();
        }
    });

    const url = new URL(window.location.href);
    const rlrr = url.searchParams.get('rlrr');
    if (rlrr) {
        await app.load(rlrr);
        if (app.audio.drumBuffers.length == 0) {
            document.getElementById('drumVolume').value = 0;
            document.getElementById('drumVolume').disabled = true;
        }
    }
}

function draw() {
    background(32);

    app.tick();
    app.draw();
    image(app.screen, viewportX, viewportY, viewportW, viewportH);

    app.cursor(toAppX(mouseX), toAppY(mouseY));
}

function toAppX(x) {
    return (x - viewportX) / viewportW * 480;
}

function toAppY(y) {
    return (y - viewportY) / viewportH * 480;
}

function keyPressed() {
    app.keyPressed(key);
}

function windowResized() {
    updateCanvasSize();
}

function updateCanvasSize() {
    const wmin = Math.min(windowWidth, windowHeight);
    resizeCanvas(windowWidth, wmin);
    viewportX = (windowWidth - wmin) / 2;
    viewportY = 0;
    viewportW = wmin;
    viewportH = wmin;

    const options = document.getElementById('options');
    options.style.right = `${windowWidth - (viewportX + viewportW)}px`;
}
