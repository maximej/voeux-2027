/**
 * The scratched state: a grid of cells over the image, each covered or revealed.
 * Independent of the screen, so it survives resizes and orientation changes.
 */

export class ScratchMask {
  constructor(columns, aspect) {
    this.columns = columns;
    this.rows = Math.max(1, Math.round(columns / aspect));
    this.revealed = new Uint8Array(this.columns * this.rows);
    this.revealedCount = 0;
  }

  isRevealed(cell) {
    return this.revealed[cell] === 1;
  }

  reveal(cell) {
    if (this.revealed[cell]) return;
    this.revealed[cell] = 1;
    this.revealedCount++;
  }
}
