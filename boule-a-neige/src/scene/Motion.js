/**
 * Moving the whole globe (sphere and base): turning it over and back, or a sideways shake.
 * The snow is stirred at the right moment through `onStir(strength)`.
 * With reduced motion, the globe does not move: only the snow is stirred.
 */

export class Motion {
  constructor(element, { flip, wobble }, onStir) {
    this.element = element;
    this.flipConfig = flip;
    this.wobbleConfig = wobble;
    this.onStir = onStir;
    this.reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.busy = false;
  }

  /** Turns the globe upside down and back; the snow is stirred while it is upside down. */
  flip() {
    if (this.busy) return false;
    if (this.reduced) return this.onStir(1), true;
    const { duration, scale } = this.flipConfig;
    this.busy = true;
    const upside = `rotate(180deg) scale(${scale})`;
    const animation = this.element.animate(
      [
        { transform: 'none' },
        { transform: upside, offset: 0.42 },
        { transform: upside, offset: 0.58 },
        { transform: 'none' },
      ],
      { duration, easing: 'ease-in-out' },
    );
    setTimeout(() => this.onStir(1), duration * 0.5);
    animation.finished.then(() => (this.busy = false), () => (this.busy = false));
    return true;
  }

  /**
   * A sideways shake, `direction` -1 (left) or 1 (right): a lighter stir (`strength`, by default
   * the configured one). While the globe is already moving, only the snow is stirred.
   */
  wobble(direction = 1, strength = this.wobbleConfig.strength) {
    if (this.busy) return this.onStir(strength * 0.6), false;
    const { duration, angle } = this.wobbleConfig;
    this.onStir(strength);
    if (this.reduced) return true;
    this.busy = true;
    const a = angle * direction;
    const animation = this.element.animate(
      [0, a, -a * 0.7, a * 0.4, 0].map(deg => ({ transform: `rotate(${deg}deg)` })),
      { duration, easing: 'ease-out' },
    );
    animation.finished.then(() => (this.busy = false), () => (this.busy = false));
    return true;
  }
}
