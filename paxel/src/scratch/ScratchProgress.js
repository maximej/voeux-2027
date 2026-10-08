/**
 * Revealed share of the surface. The mask is a grid of cells, so the count is exact
 * and costs nothing to keep up to date.
 */

export class ScratchProgress {
  constructor(mask, threshold) {
    this.mask = mask;
    this.threshold = threshold;
  }

  /** 0–1 */
  get ratio() {
    return this.mask.revealedCount / this.mask.revealed.length;
  }

  get reachedThreshold() {
    return this.ratio >= this.threshold;
  }
}
