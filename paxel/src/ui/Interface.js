/**
 * Minimal interface around the image: hint, pixel progress bar, brush ring (mouse only),
 * completion states (greeting message, restart button).
 */

const PALETTE = ['var(--red)', 'var(--yellow)', 'var(--blue)', 'var(--cyan)'];
const SVG = 'http://www.w3.org/2000/svg';

/** Ring outline: points around a circle, the radius varying a little so it looks hand-scratched. */
const RING_POINTS = 48;
const roughness = Array.from({ length: RING_POINTS }, () => Math.random() - 0.5);

export class Interface {
  constructor({ blocks }, message) {
    this.body = document.body;
    this.stage = document.querySelector('#stage');
    this.hint = document.querySelector('#hint');
    this.bar = document.querySelector('#progress');
    this.percent = document.querySelector('#percent');
    this.message = document.querySelector('#message');
    this.message.textContent = message;
    this.restart = document.querySelector('#restart');
    this.blocks = Array.from({ length: blocks }, (_, i) => {
      const block = document.createElement('i');
      block.style.setProperty('--on', PALETTE[i % PALETTE.length]);
      this.bar.append(block);
      return block;
    });
    this.lit = 0;

    this.ring = document.createElementNS(SVG, 'svg');
    this.ring.classList.add('brush');
    this.ring.setAttribute('aria-hidden', 'true');
    this.ringPath = document.createElementNS(SVG, 'path');
    this.ring.append(this.ringPath);
    this.stage.append(this.ring);
  }

  ready() {
    this.body.classList.remove('is-loading');
    this.stage.classList.add('is-ready');
  }

  failed() {
    this.body.classList.remove('is-loading');
    this.hint.textContent = 'Image indisponible';
  }

  progress(ratio) {
    const pct = Math.floor(ratio * 100);
    this.percent.value = `${pct} %`;
    this.bar.setAttribute('aria-valuenow', pct);
    const lit = Math.floor(ratio * this.blocks.length);
    for (let i = this.lit; i < lit; i++) this.blocks[i].classList.add('is-on');
    this.lit = Math.max(this.lit, lit);
    if (ratio > 0) this.hint.classList.add('is-hidden');
  }

  /** Threshold reached: scratching stops, the remaining cells are flipping. */
  complete() {
    this.body.classList.add('is-complete');
    this.brush(null);
  }

  /** Every cell has flipped: the image shines, then the greeting appears. */
  revealed() {
    this.body.classList.add('is-revealed');
    this.hint.hidden = true;
    this.message.hidden = false;
    this.percent.hidden = true;
    this.restart.hidden = false;
  }

  /** Back to the start (restart). */
  reset() {
    this.body.classList.remove('is-complete', 'is-revealed');
    this.hint.hidden = false;
    this.hint.classList.remove('is-hidden');
    this.message.hidden = true;
    this.percent.hidden = false;
    this.restart.hidden = true;
    this.blocks.forEach(block => block.classList.remove('is-on'));
    this.lit = 0;
    this.progress(0);
  }

  /** Brush ring following the mouse, `radius` in CSS px; null hides it. */
  brush(x, y, radius) {
    if (x == null || this.body.classList.contains('is-complete')) {
      this.ring.classList.remove('is-visible');
      return;
    }
    const pad = 4; // room for the outline's bumps
    const size = radius * 2 + pad * 2;
    this.ring.setAttribute('viewBox', `${-size / 2} ${-size / 2} ${size} ${size}`);
    this.ring.style.width = this.ring.style.height = `${size}px`;
    this.ring.style.transform = `translate(${x - size / 2}px, ${y - size / 2}px)`;
    this.ringPath.setAttribute('d', ringPath(radius, performance.now() / 600));
    this.ring.classList.add('is-visible');
  }
}

/** Closed outline of radius r: two slow waves (drifting with `phase`) plus a fixed fine roughness. */
function ringPath(r, phase) {
  let d = '';
  for (let i = 0; i < RING_POINTS; i++) {
    const a = (i / RING_POINTS) * Math.PI * 2;
    const k = 1 + 0.05 * Math.sin(3 * a + phase) + 0.03 * Math.sin(5 * a - phase * 1.3) + 0.035 * roughness[i];
    d += `${i ? 'L' : 'M'}${(Math.cos(a) * r * k).toFixed(1)} ${(Math.sin(a) * r * k).toFixed(1)}`;
  }
  return `${d}Z`;
}
