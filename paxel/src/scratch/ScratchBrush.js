/**
 * Circular brush: decides which cells a stamp removes.
 */

export class ScratchBrush {
  /**
   * Covered cells whose centre lies within `r` of (x, y), with their distance as a fraction
   * of the radius. Positions in CSS px on a surface of `width` × `height`.
   */
  covered(mask, x, y, r, width, height) {
    const cw = width / mask.columns, ch = height / mask.rows;
    const c0 = Math.max(0, Math.floor((x - r) / cw)), c1 = Math.min(mask.columns - 1, Math.floor((x + r) / cw));
    const r0 = Math.max(0, Math.floor((y - r) / ch)), r1 = Math.min(mask.rows - 1, Math.floor((y + r) / ch));
    const cells = [];
    for (let row = r0; row <= r1; row++) {
      for (let col = c0; col <= c1; col++) {
        const cell = row * mask.columns + col;
        if (mask.isRevealed(cell)) continue;
        const d = Math.hypot((col + 0.5) * cw - x, (row + 0.5) * ch - y);
        if (d <= r) cells.push({ cell, distance: d / r });
      }
    }
    return cells;
  }
}
