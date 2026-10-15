/**
 * The top image cut into a grid of pixels, over the image underneath.
 *
 *   tap(x, y)    lifts a cluster of pixels around the tapped one: they rise a little, glowing, and
 *                fade away. Each tap takes more of them; the last tap sends every pixel left flying.
 *   sift(k)      once the image trembles, a shake of strength k (0–1) sifts pixels like sand
 *                through a sieve: they shrink into grains and fall.
 *
 * Two canvases: `surface` holds the pixels still in place (the holes show the image underneath),
 * `effects` (larger than the image, see layout.overflow) the pixels leaving.
 */

const easeOut = t => 1 - (1 - t) ** 3;

export class Sieve {
  constructor(surface, effects, image, config, on = {}) {
    this.surface = surface;
    this.effects = effects;
    this.sctx = surface.getContext('2d');
    this.ectx = effects.getContext('2d');
    this.image = image;
    this.config = config;
    this.on = on;
    this.reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

    this.columns = config.grid.columns;
    this.rows = Math.round(this.columns * image.naturalHeight / image.naturalWidth);
    this.total = this.columns * this.rows;
    this.sizes = clusterSizes(this.total, config.taps.first, config.taps.count);
    this.colors = averageColors(image, this.columns, this.rows);
    this.glow = glowSprite(config.lift.glow);
    this.frame = this.frame.bind(this);
    this.reset();
  }

  reset() {
    this.alive = new Uint8Array(this.total).fill(1);
    this.left = this.total;
    this.taps = 0;
    this.particles = [];
    this.finished = false;
    this.surface.style.translate = '';
    if (this.width) this.drawSurface();
    this.on.progress?.(this);
  }

  get trembling() {
    return this.taps >= this.config.tremble.from && this.left > 0;
  }

  get done() {
    return this.left === 0;
  }

  /** Display size in CSS px and device pixel ratio. */
  resize(width, height, dpr) {
    this.width = width;
    this.height = height;
    this.dpr = dpr;
    this.surface.width = Math.round(width * dpr);
    this.surface.height = Math.round(height * dpr);
    const o = this.config.layout.overflow;
    this.margin = { x: width * o * dpr, y: height * o * dpr };
    this.effects.width = Math.round(width * (1 + 2 * o) * dpr);
    this.effects.height = Math.round(height * (1 + 2 * o) * dpr);
    this.cw = this.surface.width / this.columns;
    this.ch = this.surface.height / this.rows;
    this.drawSurface();
  }

  /** The top image, its grid, and a hole for each pixel already gone. */
  drawSurface() {
    const { sctx: ctx, cw, ch } = this;
    const { width, height } = this.surface;
    ctx.clearRect(0, 0, width, height);
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(this.image, 0, 0, width, height);
    ctx.strokeStyle = this.config.grid.line;
    ctx.lineWidth = Math.max(1, this.dpr * 0.5);
    ctx.beginPath();
    for (let c = 1; c < this.columns; c++) ctx.moveTo(Math.round(c * cw) + 0.5, 0), ctx.lineTo(Math.round(c * cw) + 0.5, height);
    for (let r = 1; r < this.rows; r++) ctx.moveTo(0, Math.round(r * ch) + 0.5), ctx.lineTo(width, Math.round(r * ch) + 0.5);
    ctx.stroke();
    for (let i = 0; i < this.total; i++) if (!this.alive[i]) this.hole(i);
  }

  /** Clears one pixel from the surface (rounded outwards, so no seam is left between holes). */
  hole(i) {
    const { cw, ch } = this;
    const c = i % this.columns, r = Math.floor(i / this.columns);
    const x0 = Math.floor(c * cw), y0 = Math.floor(r * ch);
    this.sctx.clearRect(x0, y0, Math.ceil((c + 1) * cw) - x0, Math.ceil((r + 1) * ch) - y0);
  }

  /** A tap at (x, y), CSS px from the top left of the image. Returns false if nothing is left. */
  tap(x, y) {
    if (this.done) return false;
    const col = clamp(Math.floor((x / this.width) * this.columns), 0, this.columns - 1);
    const row = clamp(Math.floor((y / this.height) * this.rows), 0, this.rows - 1);
    this.taps++;
    const last = this.taps >= this.config.taps.count; // the last tap sends every pixel left flying
    const count = last ? this.left : Math.min(this.left, this.sizes[this.taps - 1]);

    // The cluster: the pixels left nearest to the tapped one, with an irregular outline
    const { jitter } = this.config.taps;
    const candidates = [];
    for (let i = 0; i < this.total; i++) {
      if (!this.alive[i]) continue;
      const d = Math.hypot((i % this.columns) - col, Math.floor(i / this.columns) - row);
      candidates.push([d * (1 + jitter * (Math.random() * 2 - 1)), i]);
    }
    candidates.sort((a, b) => a[0] - b[0]);
    const cluster = candidates.slice(0, count);
    const far = cluster.length ? cluster[cluster.length - 1][0] || 1 : 1;
    const now = performance.now();
    const lift = last ? { ...this.config.lift, ...this.config.lift.final } : this.config.lift;
    // Large clusters: a halo behind one pixel in `stride` only (bigger), so phones keep up
    const stride = Math.max(1, Math.ceil(cluster.length / lift.halos));
    cluster.forEach(([d, i], n) => {
      this.remove(i);
      this.particles.push({
        kind: 'lift',
        i,
        start: now + (d / far) * lift.ripple,
        duration: lift.duration * (0.85 + Math.random() * 0.3),
        rise: this.reduced ? 0 : lift.rise[0] + Math.random() * (lift.rise[1] - lift.rise[0]),
        drift: this.reduced ? 0 : (Math.random() * 2 - 1) * lift.drift,
        halo: n % stride === 0 ? Math.sqrt(stride) : 0,
      });
    });
    this.on.progress?.(this);
    this.run();
    return true;
  }

  /**
   * A shake of strength k (0–1): sifts a share of the pixels left, once the image trembles
   * (`count` forces how many, for the last tap).
   */
  sift(k, count) {
    if (!this.trembling && count == null) return 0;
    const { perShake } = this.config.sift;
    const delay = this.config.sift.delay * (count > this.total * 0.2 ? 2.5 : 1); // a large pour lasts longer
    count ??= Math.round(this.total * (perShake[0] + (perShake[1] - perShake[0]) * k));
    count = Math.min(this.left, Math.max(1, count));
    const pool = [];
    for (let i = 0; i < this.total; i++) if (this.alive[i]) pool.push(i);
    const now = performance.now();
    for (let n = 0; n < count; n++) {
      const j = n + Math.floor(Math.random() * (pool.length - n));
      [pool[n], pool[j]] = [pool[j], pool[n]];
      const i = pool[n];
      this.remove(i);
      this.particles.push({ kind: 'sand', i, start: now + Math.random() * delay, vx: (Math.random() * 2 - 1) * 0.6 });
    }
    this.on.progress?.(this);
    this.run();
    return count;
  }

  remove(i) {
    this.alive[i] = 0;
    this.left--;
    this.hole(i);
  }

  run() {
    if (!this.raf) this.raf = requestAnimationFrame(this.frame);
  }

  frame(now) {
    this.raf = 0;
    const ctx = this.ectx;
    ctx.clearRect(0, 0, this.effects.width, this.effects.height);

    // Tremble: the whole surface shakes a little, more with every tap
    const { tremble } = this.config;
    if (this.trembling && !this.reduced) {
      const a = Math.min(tremble.max, (this.taps - tremble.from + 1) * tremble.amplitude);
      this.surface.style.translate = `${((Math.random() * 2 - 1) * a).toFixed(1)}px ${((Math.random() * 2 - 1) * a).toFixed(1)}px`;
    } else this.surface.style.translate = '';

    this.particles = this.particles.filter(p => (p.kind === 'lift' ? this.drawLift(p, now) : this.drawSand(p, now)));

    if (this.particles.length || this.trembling) this.run();
    else if (this.done && !this.finished) {
      this.finished = true;
      this.on.complete?.(this);
    }
  }

  /** Where pixel i sits on the effects canvas (device px). */
  origin(i) {
    return { x: this.margin.x + (i % this.columns) * this.cw, y: this.margin.y + Math.floor(i / this.columns) * this.ch };
  }

  /** The image part of pixel i, drawn at (x, y) with size (w, h). */
  piece(i, x, y, w, h) {
    const sw = this.image.naturalWidth / this.columns, sh = this.image.naturalHeight / this.rows;
    this.ectx.drawImage(this.image, (i % this.columns) * sw, Math.floor(i / this.columns) * sh, sw, sh, x, y, w, h);
  }

  /** A lifted pixel: rises a little, grows, glows, fades. Returns false once gone. */
  drawLift(p, now) {
    const ctx = this.ectx;
    const { grow } = this.config.lift;
    const t = (now - p.start) / p.duration;
    const { x, y } = this.origin(p.i);
    const { cw, ch } = this;
    if (t < 0) {
      this.piece(p.i, x, y, cw, ch); // waiting its turn, still in place
      return true;
    }
    if (t >= 1) return false;
    const e = easeOut(t);
    const scale = 1 + grow * Math.sin(Math.PI * Math.min(1, t * 1.4));
    const w = cw * scale, h = ch * scale;
    const cx = x + cw / 2 + p.drift * cw * e, cy = y + ch / 2 - p.rise * ch * e;
    const fade = 1 - t * t;
    // Glow behind, then the pixel itself, brightened at the start
    ctx.globalCompositeOperation = 'lighter';
    if (p.halo) {
      ctx.globalAlpha = fade * 0.85;
      const g = Math.max(cw, ch) * 3.2 * scale * p.halo;
      ctx.drawImage(this.glow, cx - g / 2, cy - g / 2, g, g);
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = fade;
    this.piece(p.i, cx - w / 2, cy - h / 2, w, h);
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = fade * 0.45 * (1 - e);
    ctx.fillStyle = this.config.lift.glow;
    ctx.fillRect(cx - w / 2, cy - h / 2, w, h);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    return true;
  }

  /** A sifted pixel: shrinks into a grain of its own color, then falls. Returns false once gone. */
  drawSand(p, now) {
    const ctx = this.ectx;
    const { duration, gravity, grain } = this.config.sift;
    const { cw, ch } = this;
    const { x, y } = this.origin(p.i);
    const t = (now - p.start) / duration;
    if (t < 0) {
      this.piece(p.i, x, y, cw, ch);
      return true;
    }
    if (t >= 1) return false;
    const shrink = Math.min(1, t / 0.18); // first the pixel shrinks into a grain…
    const size = 1 - (1 - grain) * easeOut(shrink);
    const fall = Math.max(0, t - 0.12) * (duration / 1000); // …then falls (seconds since it started falling)
    const g = gravity * this.height * this.dpr;
    const cx = x + cw / 2 + p.vx * cw * fall * 2 + Math.sin(fall * 18 + p.i) * cw * 0.12;
    const cy = y + ch / 2 + 0.5 * g * fall * fall;
    const w = cw * size, h = ch * size;
    ctx.globalAlpha = t > 0.7 ? (1 - t) / 0.3 : 1;
    if (shrink < 1) this.piece(p.i, cx - w / 2, cy - h / 2, w, h);
    else {
      ctx.fillStyle = this.colors[p.i];
      ctx.fillRect(cx - w / 2, cy - h / 2, w, h);
    }
    ctx.globalAlpha = 1;
    return true;
  }
}

/** Cluster size per tap: `first`, then a constant growth such that all `count` taps take `total`. */
function clusterSizes(total, first, count) {
  const sum = r => (first * (r ** count - 1)) / (r - 1);
  let lo = 1.0001, hi = 10;
  for (let k = 0; k < 60; k++) {
    const mid = (lo + hi) / 2;
    if (sum(mid) < total) lo = mid;
    else hi = mid;
  }
  return Array.from({ length: count }, (_, k) => Math.round(first * lo ** k));
}

/** Average color of each pixel of the grid, for the grains of sand. */
function averageColors(image, columns, rows) {
  const canvas = document.createElement('canvas');
  canvas.width = columns;
  canvas.height = rows;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(image, 0, 0, columns, rows);
  const data = ctx.getImageData(0, 0, columns, rows).data;
  return Array.from({ length: columns * rows }, (_, i) => `rgb(${data[i * 4]} ${data[i * 4 + 1]} ${data[i * 4 + 2]})`);
}

/** Soft round halo of a color, drawn once. */
function glowSprite(color) {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, color);
  g.addColorStop(0.35, `${color}99`);
  g.addColorStop(1, `${color}00`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return canvas;
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}
