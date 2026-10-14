/**
 * Light parallax inside the globe: each layer shifts in proportion to its depth (0 far … 1 near),
 * following the input (`set(nx, ny)`, each -1 … 1). The movement is eased over time (the same on
 * a 60 or 120 Hz screen), and runs only while the layers are not yet where they should be.
 * The snow, the glass and the base do not move.
 */

export class Parallax {
  /** `layers`: [{ element, depth }]. */
  constructor(layers, { shift, easing }) {
    this.layers = layers;
    this.shift = shift;
    this.easing = easing;
    this.target = { x: 0, y: 0 };
    this.current = { x: 0, y: 0 };
    this.raf = 0;
    this.frame = this.frame.bind(this);
  }

  set(nx, ny) {
    const clamp = v => Math.max(-1, Math.min(1, v || 0));
    this.target = { x: clamp(nx), y: clamp(ny) };
    if (!this.raf) {
      this.last = 0;
      this.raf = requestAnimationFrame(this.frame);
    }
  }

  frame(now) {
    const { target: t, current: c } = this;
    const dt = this.last ? Math.min(100, now - this.last) : 16;
    this.last = now;
    const k = 1 - Math.exp(-dt / this.easing);
    c.x += (t.x - c.x) * k;
    c.y += (t.y - c.y) * k;
    const settled = Math.abs(t.x - c.x) < 0.002 && Math.abs(t.y - c.y) < 0.002;
    if (settled) Object.assign(c, t);
    for (const { element, depth } of this.layers) {
      // Looking from the right, near layers slide left: the opposite of the input
      element.setAttribute('transform', `translate(${(-c.x * this.shift.x * depth).toFixed(2)} ${(-c.y * this.shift.y * depth).toFixed(2)})`);
    }
    this.raf = settled ? 0 : requestAnimationFrame(this.frame);
  }
}
