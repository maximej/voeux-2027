/**
 * Coordinates the experience over the image:
 *   surface canvas   the covering layer: one tile per covered cell, revealed cells transparent
 *   effects canvas   cells flipping over and the invitation glint (on top, receives the input)
 *
 * Strokes are incremental: each brush stamp starts flips for the covered cells it touches.
 * A cell's slot shows while it turns, then it becomes transparent and the image shows through.
 * Only a resize redraws the whole surface, from the mask.
 *
 * Completion: once the revealed share reaches the threshold, scratching stops and every
 * remaining cell flips in a wave spreading from the last brush position. `onRevealed` is
 * called when the last flip is done.
 */

import { ScratchBrush } from './ScratchBrush.js';
import { ScratchMask } from './ScratchMask.js';
import { RevealAnimation } from './RevealAnimation.js';
import { ScratchProgress } from './ScratchProgress.js';

/** Stable pseudo-random number per cell, so each tile keeps its shade across redraws. */
const hash = n => {
  n = Math.imul(n ^ (n >>> 16), 0x45d9f3b);
  n = Math.imul(n ^ (n >>> 16), 0x45d9f3b);
  return (n ^ (n >>> 16)) >>> 0;
};

export class ScratchEngine {
  constructor(surfaceCanvas, effectsCanvas, image, config, { onProgress, onComplete, onRevealed } = {}) {
    const { surface, grid, brush, reveal, invite, completion } = config;
    this.surfaceCtx = surfaceCanvas.getContext('2d');
    this.effectsCtx = effectsCanvas.getContext('2d');
    this.image = image;
    this.surface = surface;
    this.brushConfig = brush;
    this.reveal = reveal;
    this.invite = invite;
    this.completion = completion;
    this.brush = new ScratchBrush();
    this.mask = new ScratchMask(grid.columns, image.naturalWidth / image.naturalHeight);
    this.animation = new RevealAnimation(reveal);
    this.progress = new ScratchProgress(this.mask, completion.threshold);
    this.onProgress = onProgress;
    this.onComplete = onComplete;
    this.onRevealed = onRevealed;
    this.revealedNotified = false;
    this.strokes = new Map(); // pointer id → last stamp position (CSS px)
    this.width = this.height = this.dpr = 0;
    this.touched = false; // the invitation stops at the first scratch
    this.completed = false;
    this.inviteStart = performance.now() + invite.delay;
    this.inviteTimer = 0;
    this.raf = 0;
    this.frame = this.frame.bind(this);
  }

  /** Matches the canvases to their displayed size and rebuilds the surface from the mask. */
  resize(width, height, dpr) {
    this.width = width;
    this.height = height;
    this.dpr = dpr;
    for (const ctx of [this.surfaceCtx, this.effectsCtx]) {
      ctx.canvas.width = Math.round(width * dpr);
      ctx.canvas.height = Math.round(height * dpr);
    }
    for (let cell = 0; cell < this.mask.revealed.length; cell++) {
      if (!this.mask.isRevealed(cell)) this.drawTile(cell);
    }
    this.request();
  }

  /** A cell's rectangle in device px, snapped to whole pixels so neighbouring cells leave no seams. */
  cellRect(cell) {
    const { columns, rows } = this.mask;
    const W = this.surfaceCtx.canvas.width, H = this.surfaceCtx.canvas.height;
    const col = cell % columns, row = (cell - col) / columns;
    const x = Math.round((col * W) / columns), y = Math.round((row * H) / rows);
    return { x, y, w: Math.round(((col + 1) * W) / columns) - x, h: Math.round(((row + 1) * H) / rows) - y };
  }

  /** A cell's rectangle in the image. */
  cellSource(cell) {
    const { columns, rows } = this.mask;
    const W = this.image.naturalWidth, H = this.image.naturalHeight;
    const col = cell % columns, row = (cell - col) / columns;
    return { x: (col * W) / columns, y: (row * H) / rows, w: W / columns, h: H / rows };
  }

  tileColor(cell) {
    const { colors } = this.surface;
    return colors[hash(cell) % colors.length];
  }

  /** Width of the line between tiles, in device px. */
  get gap() {
    return Math.max(1, Math.round(this.dpr * 0.75));
  }

  /** A covered cell: its tile inside a fine gap. */
  drawTile(cell) {
    const ctx = this.surfaceCtx;
    const { x, y, w, h } = this.cellRect(cell);
    ctx.fillStyle = this.surface.gap;
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = this.tileColor(cell);
    ctx.fillRect(x, y, w - this.gap, h - this.gap);
  }

  /** Brush radius in CSS px for the current display size. */
  get radius() {
    const { radius, minRadius } = this.brushConfig;
    return Math.max(minRadius, radius * Math.min(this.width, this.height));
  }

  /** Starts flips for the covered cells under the brush at (x, y), CSS px. */
  stamp(x, y) {
    if (this.completed) return;
    this.touched = true;
    const now = performance.now();
    for (const { cell, distance } of this.brush.covered(this.mask, x, y, this.radius, this.width, this.height)) {
      this.mask.reveal(cell);
      this.animation.add(cell, now + distance * this.reveal.ripple);
    }
    this.request();
    this.onProgress?.(this.progress.ratio);
    if (this.progress.reachedThreshold) this.complete(x, y);
  }

  /** Flips every remaining cell, in a wave from (x, y) in CSS px. */
  complete(x, y) {
    if (this.completed) return;
    this.completed = true;
    this.strokes.clear();
    const { columns, rows } = this.mask;
    const cw = this.width / columns, ch = this.height / rows;
    const remaining = [];
    let reach = 1;
    for (let cell = 0; cell < this.mask.revealed.length; cell++) {
      if (this.mask.isRevealed(cell)) continue;
      const col = cell % columns, row = (cell - col) / columns;
      const d = Math.hypot((col + 0.5) * cw - x, (row + 0.5) * ch - y);
      remaining.push({ cell, d });
      reach = Math.max(reach, d);
    }
    const { duration, jitter } = this.completion;
    const now = performance.now() + this.reveal.ripple; // after the current stroke's flips
    for (const { cell, d } of remaining) {
      this.mask.reveal(cell);
      this.animation.add(cell, now + (d / reach) * duration + Math.random() * jitter);
    }
    this.request();
    this.onProgress?.(1);
    this.onComplete?.();
  }

  start(id, x, y) {
    if (this.completed) return;
    this.strokes.set(id, { x, y });
    this.stamp(x, y);
  }

  /** Continues a stroke: stamps at regular intervals so fast movements leave no gaps. */
  move(id, x, y) {
    const last = this.strokes.get(id);
    if (!last) return;
    const step = Math.max(1, this.radius * this.brushConfig.spacing);
    let dx = x - last.x, dy = y - last.y;
    let distance = Math.hypot(dx, dy);
    if (distance < step) return;
    dx /= distance;
    dy /= distance;
    while (distance >= step) {
      last.x += dx * step;
      last.y += dy * step;
      distance -= step;
      this.stamp(last.x, last.y);
    }
  }

  end(id) {
    this.strokes.delete(id);
  }

  request() {
    if (!this.raf) this.raf = requestAnimationFrame(this.frame);
  }

  frame(now) {
    this.raf = 0;
    const ctx = this.effectsCtx;
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    this.animation.draw(ctx, now, this.image, {
      rect: cell => this.cellRect(cell),
      source: cell => this.cellSource(cell),
      front: cell => this.tileColor(cell),
      onStart: cell => {
        const { x, y, w, h } = this.cellRect(cell);
        this.surfaceCtx.fillStyle = this.surface.slot;
        this.surfaceCtx.fillRect(x, y, w, h);
      },
      onEnd: cell => {
        const { x, y, w, h } = this.cellRect(cell);
        this.surfaceCtx.clearRect(x, y, w, h);
      },
    });
    const inviting = this.drawInvite(ctx, now);
    if (this.animation.active || inviting) this.request();
    else if (this.completed && !this.revealedNotified) {
      this.revealedNotified = true;
      this.onRevealed?.();
    }
  }

  /**
   * Invitation glint: a diagonal band of light sweeping across the covered tiles,
   * repeated until the first scratch. Returns true while a sweep is running.
   */
  drawInvite(ctx, now) {
    if (this.touched) return false;
    const { every, duration, strength } = this.invite;
    const elapsed = now - this.inviteStart;
    const phase = elapsed < 0 ? elapsed : elapsed % every;
    if (phase < 0 || phase > duration) {
      // Idle between sweeps: wake up for the next one
      clearTimeout(this.inviteTimer);
      this.inviteTimer = setTimeout(() => this.request(), phase < 0 ? -phase : every - phase);
      return false;
    }
    const { columns, rows } = this.mask;
    const band = 6; // half width, in cells
    const span = columns + rows - 2; // largest col + row
    const crest = -band + (phase / duration) * (span + 2 * band); // col + row at the band's centre
    for (let d = Math.max(0, Math.ceil(crest - band)); d <= Math.min(span, crest + band); d++) {
      ctx.fillStyle = `rgb(255 255 255 / ${strength * (1 - Math.abs(d - crest) / band)})`;
      for (let col = Math.max(0, d - rows + 1); col <= Math.min(columns - 1, d); col++) {
        const cell = (d - col) * columns + col;
        if (this.mask.isRevealed(cell)) continue;
        const { x, y, w, h } = this.cellRect(cell);
        ctx.fillRect(x, y, w - this.gap, h - this.gap);
      }
    }
    return true;
  }
}
