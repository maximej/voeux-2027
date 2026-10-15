/**
 * Canvas rendering of the board and the next piece. The word to build always shows,
 * semi-transparent, over the empty cells and the locked blocks alike.
 * Each cell color is pre-rendered once per size as a glowing sprite (neon), then simply drawn:
 * no blur is computed while playing.
 */

import { cellsOf, GREY } from '../game/Pieces.js';

export class Renderer {
  constructor(canvas, nextCanvas, { colors, ghostOpacity }, level) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.nextCanvas = nextCanvas;
    this.nextCtx = nextCanvas.getContext('2d');
    this.colors = colors;
    this.palette = { [GREY]: colors.grey, ...level.colors };
    this.ghostOpacity = ghostOpacity;
    // The word, by board row counted from the bottom
    this.word = level.rows;
    this.sprites = new Map();
  }

  resize(width, height, dpr, columns, rows) {
    this.dpr = dpr;
    this.canvas.width = Math.round(width * dpr);
    this.canvas.height = Math.round(height * dpr);
    this.cell = this.canvas.width / columns;
    this.columns = columns;
    this.rows = rows;
    this.sprites.clear();
    const box = this.nextCanvas.getBoundingClientRect();
    this.nextCanvas.width = Math.round(box.width * dpr);
    this.nextCanvas.height = Math.round(box.height * dpr);
  }

  /**
   * A block for a color at a size (device px), cached: a flat face with bevelled edges, light from
   * the top left as on the Monument Valley blocks, and a soft halo of its own color.
   */
  sprite(color, size) {
    const key = `${color}:${size}`;
    let sprite = this.sprites.get(key);
    if (sprite) return sprite;
    const pad = Math.ceil(size * 0.45);
    sprite = document.createElement('canvas');
    sprite.width = sprite.height = size + pad * 2;
    const ctx = sprite.getContext('2d');
    const inset = Math.max(1, size * 0.06);
    const x0 = pad + inset, y0 = pad + inset, w = size - inset * 2, x1 = x0 + w, y1 = y0 + w, bevel = w * 0.18;
    const glow = color === this.colors.piece ? this.colors.glow : color;
    ctx.shadowColor = color === this.colors.grey ? 'transparent' : mix(glow, '#ffffff', 0.1, 0.7);
    ctx.shadowBlur = size * 0.45;
    ctx.fillStyle = color;
    ctx.fillRect(x0, y0, w, w);
    ctx.shadowBlur = 0;
    ctx.fillRect(x0, y0, w, w); // solid face over the halo
    const facet = (shade, points) => {
      ctx.fillStyle = shade;
      ctx.beginPath();
      points.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.fill();
    };
    facet(mix(color, '#ffffff', 0.38), [[x0, y0], [x1, y0], [x1 - bevel, y0 + bevel], [x0 + bevel, y0 + bevel]]); // top, lit
    facet(mix(color, '#ffffff', 0.16), [[x0, y0], [x0 + bevel, y0 + bevel], [x0 + bevel, y1 - bevel], [x0, y1]]); // left
    facet(mix(color, this.colors.shade, 0.22), [[x1, y0], [x1, y1], [x1 - bevel, y1 - bevel], [x1 - bevel, y0 + bevel]]); // right
    facet(mix(color, this.colors.shade, 0.38), [[x0, y1], [x1, y1], [x1 - bevel, y1 - bevel], [x0 + bevel, y1 - bevel]]); // bottom, in shadow
    sprite.pad = pad;
    this.sprites.set(key, sprite);
    return sprite;
  }

  drawCell(ctx, color, x, y, size) {
    const sprite = this.sprite(color, Math.round(size));
    ctx.drawImage(sprite, x - sprite.pad, y - sprite.pad);
  }

  draw(game, now) {
    const { ctx, cell } = this;
    if (!cell) return; // not sized yet
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Empty grid
    ctx.fillStyle = this.colors.grid;
    const inset = Math.max(1, cell * 0.08);
    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.columns; x++) ctx.fillRect(x * cell + inset, y * cell + inset, cell - inset * 2, cell - inset * 2);
    }

    // Settled cells; rows being cleared blink
    const blink = game.state === 'clearing' && Math.floor(now / 70) % 2 === 0;
    game.board.rows.forEach((row, y) => {
      const clearing = game.clearing.includes(y);
      row.forEach((value, x) => {
        if (!value) return;
        this.drawCell(ctx, clearing && blink ? this.colors.piece : this.palette[value], x * cell, y * cell, cell);
      });
    });

    // The word to build, semi-transparent, always visible: over the locked blocks too
    ctx.globalAlpha = this.ghostOpacity;
    const top = this.rows - this.word.length;
    this.word.forEach((line, r) => {
      [...line].forEach((letter, x) => {
        if (letter !== '.') this.drawCell(ctx, this.palette[letter], x * cell, (top + r) * cell, cell);
      });
    });
    ctx.globalAlpha = 1;

    // Falling piece
    if (game.piece && game.state === 'playing') {
      cellsOf(game.piece).forEach(([x, y], i) => {
        if (y >= 0) this.drawCell(ctx, this.palette[game.piece.colors[i]], x * cell, y * cell, cell);
      });
    }

    this.drawNext(game.next);
  }

  drawNext(piece) {
    if (piece === this.nextDrawn) return;
    this.nextDrawn = piece;
    const ctx = this.nextCtx, { width, height } = this.nextCanvas;
    ctx.clearRect(0, 0, width, height);
    if (!piece) return;
    const cells = piece.states[0];
    const xs = cells.map(([x]) => x), ys = cells.map(([, y]) => y);
    const w = Math.max(...xs) - Math.min(...xs) + 1, h = Math.max(...ys) - Math.min(...ys) + 1;
    const size = Math.floor(Math.min(width / Math.max(5, w + 1), height / Math.max(3, h + 1)));
    if (size < 1) return;
    const ox = (width - w * size) / 2 - Math.min(...xs) * size, oy = (height - h * size) / 2 - Math.min(...ys) * size;
    cells.forEach(([x, y], i) => this.drawCell(ctx, this.palette[piece.colors[i]], ox + x * size, oy + y * size, size));
  }
}

/** `a` mixed with `b` (hex colors) by `t` (0: a, 1: b), with an optional alpha. */
function mix(a, b, t, alpha = 1) {
  const rgb = hex => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
  const [ca, cb] = [rgb(a), rgb(b)];
  return `rgb(${ca.map((v, i) => Math.round(v + (cb[i] - v) * t)).join(' ')} / ${alpha})`;
}
