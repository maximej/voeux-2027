/**
 * Where the viewer looks from, as two values -1 … 1 (`onTilt(nx, ny)`):
 *
 *   computer   the mouse position in the page (center = 0, edges = ±1)
 *   phone      the tilt measured by the gyroscope (`deviceorientation`), relative to how the phone
 *              is held: `maxAngle` degrees either way gives ±1, beyond it the value stays at ±1.
 *              The rest position follows slowly how the phone is held, so a new posture does not
 *              leave the scene stuck on one side.
 *
 * iPhone (Safari): the gyroscope needs a permission, asked after a tap (`enable()`). HTTPS only.
 * The readings never leave the browser.
 */

export class TiltInput {
  constructor({ maxAngle, recenter }, onTilt) {
    this.maxAngle = maxAngle;
    this.recenter = recenter;
    this.onTilt = onTilt;
    this.rest = null;
    this.receiving = false;
    this.handle = this.handle.bind(this);
  }

  static get needsPermission() {
    return typeof window.DeviceOrientationEvent?.requestPermission === 'function';
  }

  /** Mouse (computers) or gyroscope (touch devices). */
  start() {
    if (matchMedia('(pointer: fine)').matches) {
      addEventListener('pointermove', e => {
        if (e.pointerType === 'mouse') this.onTilt((e.clientX / innerWidth) * 2 - 1, (e.clientY / innerHeight) * 2 - 1);
      });
      document.documentElement.addEventListener('pointerleave', () => this.onTilt(0, 0));
    } else if ('DeviceOrientationEvent' in window) {
      removeEventListener('deviceorientation', this.handle);
      addEventListener('deviceorientation', this.handle);
    }
  }

  /** iPhone: asks the permission (from a tap), then listens. Resolves to true if allowed. */
  async enable() {
    if (TiltInput.needsPermission) {
      try {
        if ((await DeviceOrientationEvent.requestPermission()) !== 'granted') return false;
      } catch {
        return false;
      }
    }
    this.start();
    return true;
  }

  handle(e) {
    if (e.beta == null || e.gamma == null) return;
    this.receiving = true;
    // Tilt in the screen's own axes (the phone may be held sideways)
    const angle = screen.orientation?.angle ?? window.orientation ?? 0;
    let x = e.gamma, y = e.beta;
    if (angle === 90) [x, y] = [e.beta, -e.gamma];
    else if (angle === -90 || angle === 270) [x, y] = [-e.beta, e.gamma];
    else if (angle === 180) [x, y] = [-e.gamma, -e.beta];
    if (!this.rest) this.rest = { x, y };
    this.rest.x += (x - this.rest.x) * this.recenter;
    this.rest.y += (y - this.rest.y) * this.recenter;
    this.onTilt((x - this.rest.x) / this.maxAngle, (y - this.rest.y) / this.maxAngle);
  }
}
