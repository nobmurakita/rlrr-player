let app = null;
let viewportX = 0;
let viewportY = 0;
let viewportW = 480;
let viewportH = 480;

function setup() {
    createCanvas(0, 0);
    updateCanvasSize();

    app = new App();

    const url = new URL(window.location.href);
    const rlrr = url.searchParams.get('rlrr');
    if (rlrr) {
        app.load(rlrr);
    }
}

function draw() {
    background(32);

    app.sync();
    app.draw();
    image(app.screen, viewportX, viewportY, viewportW, viewportH);

    app.cursor(toAppX(mouseX), toAppY(mouseY));
}

function keyPressed() {
    app.keyPressed(key);
}

function mouseClicked() {
    app.mouseClicked(toAppX(mouseX), toAppY(mouseY));
}

function mousePressed() {
    app.mousePressed(toAppX(mouseX), toAppY(mouseY));
}

function mouseDragged() {
    app.mouseDragged(toAppX(mouseX), toAppY(mouseY));
}

function mouseReleased() {
    app.mouseReleased(toAppX(mouseX), toAppY(mouseY));
}

function toAppX(x) {
    return (x - viewportX) / viewportW * 480;
}

function toAppY(y) {
    return (y - viewportY) / viewportH * 480;
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
}
