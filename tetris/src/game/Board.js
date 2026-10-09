/**
 * The playfield: rows of cells, each empty (null), a level cell (its letter, e.g. "B" for the
 * blue P of PAIX) or a cell of a locked piece ("*").
 */

import { cellsOf } from './Pieces.js';

export const PIECE_CELL = '*';

export class Board {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.rows = Array.from({ length: height }, () => this.emptyRow());
  }

  emptyRow() {
    return Array(this.width).fill(null);
  }

  /** Places the level grid at the bottom, centered ("." = empty). */
  load(levelRows) {
    this.rows = Array.from({ length: this.height }, () => this.emptyRow());
    const top = this.height - levelRows.length;
    levelRows.forEach((line, r) => {
      const left = Math.floor((this.width - line.length) / 2);
      [...line].forEach((ch, c) => {
        if (ch !== '.') this.rows[top + r][left + c] = ch;
      });
    });
  }

  /** True if the piece is inside the board (above the top is allowed) and overlaps nothing. */
  fits(piece) {
    return cellsOf(piece).every(([x, y]) => x >= 0 && x < this.width && y < this.height && (y < 0 || !this.rows[y][x]));
  }

  lock(piece) {
    for (const [x, y] of cellsOf(piece)) if (y >= 0) this.rows[y][x] = PIECE_CELL;
  }

  fullRows() {
    return this.rows.flatMap((row, y) => (row.every(Boolean) ? [y] : []));
  }

  /** Removes the rows and drops everything above. */
  clear(rows) {
    const keep = this.rows.filter((_, y) => !rows.includes(y));
    this.rows = [...rows.map(() => this.emptyRow()), ...keep];
  }

  /** Level cells still on the board. */
  get levelCells() {
    return this.rows.reduce((n, row) => n + row.filter(cell => cell && cell !== PIECE_CELL).length, 0);
  }
}
