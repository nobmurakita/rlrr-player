
class Seekbar {
  constructor(screen, x, y, w, h) {
    this.screen = screen
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
    this.max = 0;
    this.value = 0;
    this.seekStarted = () => { };
    this.seeked = () => { };
    this.seekEnded = () => { };
  }
  isMouseOver(appMouseX, appMouseY) {
    if (appMouseX < this.x || this.x + this.w < appMouseX) {
      return false;
    }
    if (appMouseY < this.y || this.y + this.h < appMouseY) {
      return false;
    }
    return true;
  }
  seekStart(mouseX) {
    this.isDragging = true;
    this.seekStarted();
    this.seek(mouseX);
  }
  seek(mouseX) {
    if (this.isDragging) {
      const v = Math.min(Math.max(mouseX - this.x, 0), this.w);
      this.value = v * this.max / this.w;
      this.seeked(this.value);
    }
  }
  seekEnd() {
    this.isDragging = false;
    this.seekEnded();
  }
  draw(isPlaying) {
    const v = this.value * this.w / Math.max(this.max, 1);
    this.screen.noStroke();
    this.screen.rectMode(CORNER);
    this.screen.fill(64);
    this.screen.rect(this.x, this.y, this.w, this.h);
    this.screen.fill(96);
    this.screen.rect(this.x, this.y, v, this.h);

    const fmt = (t) => {
      const seconds = Math.floor(t);
      const min = Math.floor(seconds / 60);
      const sec = `0${seconds % 60}`.slice(-2);
      return `${min}:${sec}`;
    }
    this.screen.fill(isPlaying || this.restart ? 255 : 128);
    this.screen.textSize(this.h / 2);
    this.screen.textAlign(RIGHT, CENTER);
    this.screen.text(`${fmt(this.value)} / ${fmt(this.max)}`, this.x + this.w - 4, this.y + this.h / 2);
  }
}
