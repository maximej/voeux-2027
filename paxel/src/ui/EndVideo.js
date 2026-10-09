/**
 * Ending: the animated version of the image plays over it (its first frame is the image, so the
 * switch does not show), stops on its last frame, which then fades lightly, and `onDone` is called.
 * If the video cannot play (blocked, missing, too slow to start), `onDone` is called anyway.
 */

export class EndVideo {
  constructor(video, { video: src, fade, fadeMs, startTimeout }, onDone) {
    this.video = video;
    this.src = src;
    this.fadeMs = fadeMs;
    this.startTimeout = startTimeout;
    this.onDone = onDone;
    this.timers = [];
    video.style.setProperty('--fade', fade);
    video.style.setProperty('--fade-ms', `${fadeMs}ms`);
    video.addEventListener('playing', () => video.classList.add('is-playing'));
    video.addEventListener('ended', () => {
      video.classList.add('is-faded');
      this.later(() => this.done(), fadeMs);
    });
    video.addEventListener('error', () => this.done());
  }

  /** Starts downloading (called at the first scratch, so the page itself loads as fast as before). */
  warm() {
    if (this.video.getAttribute('src')) return;
    this.video.src = this.src;
    this.video.preload = 'auto';
    this.video.load();
  }

  play() {
    this.warm();
    this.finished = false;
    this.later(() => this.video.classList.contains('is-playing') || this.done(), this.startTimeout);
    this.video.currentTime = 0;
    this.video.play()?.catch(() => this.done());
  }

  done() {
    if (this.finished) return;
    this.finished = true;
    this.onDone();
  }

  reset() {
    this.timers.forEach(clearTimeout);
    this.timers = [];
    this.finished = true;
    this.video.pause();
    this.video.classList.remove('is-playing', 'is-faded');
    if (this.video.getAttribute('src')) this.video.currentTime = 0;
  }

  later(fn, ms) {
    this.timers.push(setTimeout(fn, ms));
  }
}
