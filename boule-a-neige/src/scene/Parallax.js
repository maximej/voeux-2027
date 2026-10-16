/**
 * Parallax of the globe: each layer inside shifts in proportion to its depth (0 far … 1 near;
 * below 0, the reflections on the front of the glass, which slide the other way), and the whole
 * globe (sphere, base, snow) turns a little in 3D. Input: `set(nx, ny)`, each -1 … 1. The movement
 * is eased over time (the same on a 60 or 120 Hz screen), and runs only while it is not yet where
 * it should be.
 */

export class Parallax {
  /**
   * `layers`: [{ element, depth }]; `globe`: the element that turns as a whole (CSS `rotate`, so it
   * adds to the `transform` animated when the globe is flipped).
   */
  constructor(layers, { shift, easing, tilt }, globe) {
    this.layers = layers;
    this.globe = globe;
    this.tilt = tilt;
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
    // Seen from the right, the globe's right side comes nearer: a turn around the axis (y, -x)
    const angle = Math.hypot(c.x, c.y) * this.tilt;
    if (this.globe) this.globe.style.rotate = angle ? `${c.y.toFixed(4)} ${(-c.x).toFixed(4)} 0 ${angle.toFixed(2)}deg` : '';
    this.raf = settled ? 0 : requestAnimationFrame(this.frame);
  }
}
