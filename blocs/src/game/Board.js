/**
 * The playfield: rows of cells, each empty (null) or the color of a locked cell: a letter of the
 * word (e.g. "B" for the blue P of PAIX) or a grey piece ("*").
 */

import { cellsOf } from './Pieces.js';

export class Board {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.empty();
  }

  emptyRow() {
    return Array(this.width).fill(null);
  }

  empty() {
    this.rows = Array.from({ length: this.height }, () => this.emptyRow());
  }

  /** True if the piece is inside the board (above the top is allowed) and overlaps nothing. */
  fits(piece) {
    return cellsOf(piece).every(([x, y]) => x >= 0 && x < this.width && y < this.height && (y < 0 || !this.rows[y][x]));
  }

  lock(piece) {
    cellsOf(piece).forEach(([x, y], i) => {
      if (y >= 0) this.rows[y][x] = piece.colors[i];
    });
  }

  fullRows() {
    return this.rows.flatMap((row, y) => (row.every(Boolean) ? [y] : []));
  }

  /** Removes the rows and drops everything above. */
  clear(rows) {
    const keep = this.rows.filter((_, y) => !rows.includes(y));
    this.rows = [...rows.map(() => this.emptyRow()), ...keep];
  }

  /** True if the cell [x, y] holds the color; y below 0 counts from the bottom (-1: last row). */
  has([x, y], color) {
    return this.rows[y < 0 ? this.height + y : y]?.[x] === color;
  }
}
