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

    document.getElementById('masterVolume').value = Math.floor(app.audio.masterGainNode.gain.value * 100)
    document.getElementById('masterVolume').addEventListener('input', event => {
        app.audio.masterGainNode.gain.value = event.target.value / 100;
    })
    document.getElementById('songVolume').value = Math.floor(app.audio.songGainNode.gain.value * 100)
    document.getElementById('songVolume').addEventListener('input', event => {
        app.audio.songGainNode.gain.value = event.target.value / 100;
    })
    document.getElementById('drumVolume').value = Math.floor(app.audio.drumGainNode.gain.value * 100)
    document.getElementById('drumVolume').addEventListener('input', event => {
        app.audio.drumGainNode.gain.value = event.target.value / 100;
    })
    document.getElementById('noteVolume').value = Math.floor(app.audio.noteGainNode.gain.value * 100)
    document.getElementById('noteVolume').addEventListener('input', event => {
        app.audio.noteGainNode.gain.value = event.target.value / 100;
    })
    document.getElementById('volumes').addEventListener('mouseleave', () => {
        if (document.activeElement != document.body) {
            document.activeElement.blur();
        }
    })

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

    const volumes = document.getElementById('volumes');
    volumes.style.right = `${windowWidth - (viewportX + viewportW)}px`;
}
