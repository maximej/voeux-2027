/**
 * Snowflakes in the globe, drawn on a canvas over the scene and clipped to the sphere.
 * Positions are in scene units (viewBox 400 × 480); the canvas is scaled to match.
 *
 * `shake(strength)` stirs every flake (settled ones included, as in a real globe). Then each
 * flake slows down as in water, falls at a speed that grows with its size, drifts sideways,
 * lands on the ground at its own depth, stays a moment and fades. The loop stops once all
 * flakes have faded, so the globe costs nothing when it is still.
 */

const rand = (a, b) => a + Math.random() * (b - a);

export class Snow {
  constructor(canvas, { sphere, groundY, snow }) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.sphere = sphere;
    this.groundY = groundY;
    this.o = snow;
    this.flakes = [];
    this.raf = 0;
    this.frame = this.frame.bind(this);
  }

  resize(width, height, dpr) {
    this.canvas.width = Math.round(width * dpr);
    this.canvas.height = Math.round(height * dpr);
    this.scale = this.canvas.width / 400;
    this.draw();
  }

  /** A random point inside the sphere, above the ground. */
  randomInside() {
    const { cx, cy, r } = this.sphere;
    for (;;) {
      const x = rand(cx - r, cx + r), y = rand(cy - r, this.groundY);
      if (Math.hypot(x - cx, y - cy) < r - 6) return { x, y };
    }
  }

  newFlake() {
    const size = rand(...this.o.size);
    return { ...this.randomInside(), vx: 0, vy: 0, size, depth: Math.random(), phase: rand(0, Math.PI * 2), settled: false, age: 0 };
  }

  /**
   * Stirs the snow: `strength` 0–1 (a light shake to a full turn). Flakes keep their place and
   * get a push: those on the ground are lifted from where they lie, those still moving get an
   * extra push, so repeated shakes swirl the snow instead of making it jump.
   */
  shake(strength = 1) {
    while (this.flakes.length < this.o.count) this.flakes.push(this.newFlake()); // first time: spread everywhere
    const speed = this.o.stir * (0.4 + 0.6 * strength);
    for (const f of this.flakes) {
      const a = rand(0, Math.PI * 2), v = speed * rand(0.3, 1);
      if (f.settled || f.age === 0) {
        f.vx = Math.cos(a) * v;
        f.vy = Math.sin(a) * v - speed * (f.settled ? 0.8 : 0.3); // lifted off the ground
      } else {
        f.vx += Math.cos(a) * v * 0.6;
        f.vy += Math.sin(a) * v * 0.6 - speed * 0.2;
      }
      f.settled = false;
      f.age = 0.001;
    }
    this.last = 0;
    if (!this.raf) this.raf = requestAnimationFrame(this.frame);
  }

  frame(now) {
    const dt = Math.min(0.05, this.last ? (now - this.last) / 1000 : 0.016);
    this.last = now;
    const alive = this.step(dt, now / 1000);
    this.draw();
    this.raf = alive ? requestAnimationFrame(this.frame) : 0;
  }

  /** Advances the flakes; returns false once all have settled and faded. */
  step(dt, t) {
    const { gravity, drag, drift, settle } = this.o;
    const { cx, cy, r } = this.sphere;
    const damping = Math.exp(-drag * dt);
    let alive = false;
    for (const f of this.flakes) {
      f.age += dt;
      if (f.settled) {
        if (f.age < settle.stay + settle.fade) alive = true;
        continue;
      }
      alive = true;
      const weight = 0.6 + 0.4 * (f.size / this.o.size[1]); // big flakes fall a bit faster
      f.vy += gravity * weight * dt;
      f.vx += Math.sin(t * 1.3 + f.phase) * drift * dt;
      f.vx *= damping;
      f.vy *= damping;
      f.x += f.vx * dt;
      f.y += f.vy * dt;

      // Glass wall: back inside, losing most of the speed
      const dx = f.x - cx, dy = f.y - cy, d = Math.hypot(dx, dy), max = r - 4;
      if (d > max) {
        f.x = cx + (dx / d) * max;
        f.y = cy + (dy / d) * max;
        f.vx *= -0.3;
        f.vy *= -0.3;
      }

      // Ground: each flake lands at its own depth in the snow; near the edge, where the glass
      // curves up above that depth, it lands against the glass instead of bouncing forever
      const glassBottom = cy + Math.sqrt(Math.max(0, max * max - dx * dx)) - 1;
      const land = Math.min(this.groundY - 26 + f.depth * 56, glassBottom); // from the far snow to the near snow
      if (f.vy > 0 && f.y >= land) {
        f.y = land;
        f.settled = true;
        f.age = 0;
      }
    }
    return alive;
  }

  draw() {
    const { ctx, scale } = this;
    if (!scale) return;
    const { cx, cy, r } = this.sphere;
    const { stay, fade } = this.o.settle;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r - 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = this.o.color;
    for (const f of this.flakes) {
      let alpha = 0.55 + 0.45 * f.depth; // nearer flakes are brighter
      if (f.settled) alpha *= Math.max(0, 1 - Math.max(0, f.age - stay) / fade);
      if (alpha <= 0) continue;
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.size * (0.7 + 0.5 * f.depth), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    ctx.globalAlpha = 1;
  }
}
