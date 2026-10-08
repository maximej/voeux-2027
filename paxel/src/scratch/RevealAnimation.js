/**
 * Cell flip: a card turning around its vertical axis, front = its tile, back = its part
 * of the image, slightly lifted halfway. Drawn on the effects canvas, one frame at a time.
 */

export class RevealAnimation {
  constructor({ flipMs, lift }) {
    this.flipMs = flipMs;
    this.lift = lift;
    this.flips = [];
  }

  get active() {
    return this.flips.length > 0;
  }

  add(cell, start) {
    this.flips.push({ cell, start, started: false });
  }

  /**
   * Draws the current frame. `rect(cell)` gives a cell's device px rectangle, `source(cell)`
   * its rectangle in the image and `front(cell)` its tile color. Calls `onStart(cell)` when
   * a flip begins and `onEnd(cell)` when it is done.
   */
  draw(ctx, now, image, { rect, source, front, onStart, onEnd }) {
    this.flips = this.flips.filter(f => {
      const t = (now - f.start) / this.flipMs;
      if (t < 0) return true;
      if (!f.started) {
        f.started = true;
        onStart(f.cell);
      }
      if (t >= 1) {
        onEnd(f.cell);
        return false;
      }
      const { x, y, w, h } = rect(f.cell);
      const lift = 1 + this.lift * Math.sin(Math.PI * t);
      const fw = w * lift * Math.abs(Math.cos(Math.PI * t));
      const fh = h * lift;
      const fx = x + (w - fw) / 2, fy = y + (h - fh) / 2;
      if (t < 0.5) {
        ctx.fillStyle = front(f.cell);
        ctx.fillRect(fx, fy, fw, fh);
      } else {
        const s = source(f.cell);
        ctx.drawImage(image, s.x, s.y, s.w, s.h, fx, fy, fw, fh);
      }
      return true;
    });
  }
}
