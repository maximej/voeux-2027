/**
 * Canvas rendering of the board and the next piece.
 * Each cell color is pre-rendered once per size as a glowing sprite (neon), then simply drawn:
 * no blur is computed while playing.
 */

import { cellsOf, PIECES } from '../game/Pieces.js';
import { PIECE_CELL } from '../game/Board.js';

export class Renderer {
  constructor(canvas, nextCanvas, { colors }, levelColors) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.nextCanvas = nextCanvas;
    this.nextCtx = nextCanvas.getContext('2d');
    this.colors = colors;
    this.palette = { [PIECE_CELL]: colors.piece, ...levelColors };
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

  /** Glowing square for a color at a size (device px), cached. */
  sprite(color, size) {
    const key = `${color}:${size}`;
    let sprite = this.sprites.get(key);
    if (sprite) return sprite;
    const pad = Math.ceil(size * 0.45);
    sprite = document.createElement('canvas');
    sprite.width = sprite.height = size + pad * 2;
    const ctx = sprite.getContext('2d');
    const inset = Math.max(1, size * 0.08);
    const glow = color === this.colors.piece ? this.colors.glow : color;
    ctx.shadowColor = glow;
    ctx.shadowBlur = size * 0.4;
    ctx.fillStyle = color;
    ctx.fillRect(pad + inset, pad + inset, size - inset * 2, size - inset * 2);
    ctx.shadowBlur = 0;
    ctx.fillRect(pad + inset, pad + inset, size - inset * 2, size - inset * 2); // solid core over the glow
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

    // Falling piece
    if (game.piece && game.state === 'playing') {
      for (const [x, y] of cellsOf(game.piece)) {
        if (y >= 0) this.drawCell(ctx, this.colors.piece, x * cell, y * cell, cell);
      }
    }

    this.drawNext(game.next);
  }

  drawNext(kind) {
    if (kind === this.nextDrawn) return;
    this.nextDrawn = kind;
    const ctx = this.nextCtx, { width, height } = this.nextCanvas;
    ctx.clearRect(0, 0, width, height);
    if (!kind) return;
    const cells = PIECES[kind][0];
    const xs = cells.map(([x]) => x), ys = cells.map(([, y]) => y);
    const w = Math.max(...xs) - Math.min(...xs) + 1, h = Math.max(...ys) - Math.min(...ys) + 1;
    const size = Math.floor(Math.min(width / 5, height / 3));
    if (size < 1) return;
    const ox = (width - w * size) / 2 - Math.min(...xs) * size, oy = (height - h * size) / 2 - Math.min(...ys) * size;
    for (const [x, y] of cells) this.drawCell(ctx, this.colors.piece, ox + x * size, oy + y * size, size);
  }
}
