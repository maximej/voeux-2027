/**
 * Phone shakes, from the motion sensors (`devicemotion`).
 *
 * The strength of a movement is the acceleration without gravity when the phone gives it,
 * otherwise the change of the acceleration with gravity between two readings. Above `threshold`
 * it is a shake: `onShake(intensity 0–1, direction -1|1, strong)` is called, at most every
 * `interval` ms; `strong` is true above `strong`.
 *
 * iPhone (Safari): the sensors need a permission, which can only be asked after a tap
 * (`enable()` from a button). Every browser: the page must be served over HTTPS.
 * The readings never leave the browser.
 */

export class ShakeSensor {
  constructor({ threshold, strong, interval }, onShake) {
    this.threshold = threshold;
    this.strong = strong;
    this.interval = interval;
    this.onShake = onShake;
    this.last = 0;
    this.previous = null;
    this.receiving = false;
    this.handle = this.handle.bind(this);
  }

  /** Motion sensors probably exist: a touch device whose browser knows the event. */
  static get available() {
    return 'DeviceMotionEvent' in window && matchMedia('(pointer: coarse)').matches;
  }

  /** iPhone: a permission must be asked from a tap first. */
  static get needsPermission() {
    return typeof DeviceMotionEvent?.requestPermission === 'function';
  }

  /** Asks the permission (iPhone) and starts; resolves to true if the sensors may be used. */
  async enable() {
    if (ShakeSensor.needsPermission) {
      try {
        if ((await DeviceMotionEvent.requestPermission()) !== 'granted') return false;
      } catch {
        return false;
      }
    }
    this.start();
    return true;
  }

  start() {
    removeEventListener('devicemotion', this.handle); // started twice (before and after the permission): one listener
    addEventListener('devicemotion', this.handle);
  }

  handle(e) {
    let strength, dx;
    const a = e.acceleration;
    if (a && a.x != null) {
      this.receiving = true;
      strength = Math.hypot(a.x, a.y, a.z);
      dx = a.x;
    } else {
      const g = e.accelerationIncludingGravity;
      if (!g || g.x == null) return; // empty readings (some browsers send them without sensors)
      this.receiving = true;
      const p = this.previous;
      this.previous = { x: g.x, y: g.y, z: g.z };
      if (!p) return;
      strength = Math.hypot(g.x - p.x, g.y - p.y, g.z - p.z);
      dx = g.x - p.x;
    }
    if (strength < this.threshold) return;
    const now = performance.now();
    if (now - this.last < this.interval) return;
    this.last = now;
    const intensity = Math.min(1, (strength - this.threshold) / (this.strong - this.threshold));
    this.onShake(intensity, dx < 0 ? -1 : 1, strength >= this.strong);
  }
}
