/**
 * Arrière-plan animé : des néons se tracent au hasard, en angles droits sur une grille invisible,
 * avec une tête lumineuse, puis s'effacent et repartent ailleurs.
 */

const rand = (a, b) => a + Math.random() * (b - a);
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

export function startNeonBackground(canvas, options = {}) {
  const opts = {
    colors: ['#1de3ff', '#ff2fbc'],
    cell: 44,          // pas de la grille (px)
    speed: 120,        // vitesse de tracé (px/s)
    turnChance: 0.35,  // probabilité de tourner à chaque nœud
    density: 1 / 60000, // nombre de néons par px² d'écran
    ...options,
  };
  const ctx = canvas.getContext('2d');
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let w = 0, h = 0, tracers = [], last = 0;

  function resize() {
    const dpr = Math.min(2, devicePixelRatio || 1);
    w = canvas.clientWidth;
    h = canvas.clientHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const count = Math.max(3, Math.min(12, Math.round(w * h * opts.density)));
    while (tracers.length < count) tracers.push(spawn(rand(0, 3)));
    tracers.length = count;
    if (still) drawStill();
  }

  function spawn(delay = rand(0.3, 2)) {
    const { cell } = opts;
    const cols = Math.max(1, Math.floor(w / cell)), rows = Math.max(1, Math.floor(h / cell));
    const start = { x: Math.round(rand(0, cols)) * cell, y: Math.round(rand(0, rows)) * cell };
    return {
      pts: [start],
      dir: pick(DIRS),
      progress: 0,
      length: 0,
      maxLength: rand(6, 22) * cell,
      color: pick(opts.colors),
      alpha: 1,
      state: 'grow',
      delay,
    };
  }

  function step(t, dt) {
    if (t.delay > 0) { t.delay -= dt; return; }
    if (t.state === 'fade') {
      t.alpha -= dt / 1.6;
      if (t.alpha <= 0) Object.assign(t, spawn());
      return;
    }
    t.progress += opts.speed * dt;
    while (t.progress >= opts.cell && t.state === 'grow') {
      t.progress -= opts.cell;
      const p = t.pts.at(-1);
      const node = { x: p.x + t.dir[0] * opts.cell, y: p.y + t.dir[1] * opts.cell };
      t.pts.push(node);
      t.length += opts.cell;
      const out = node.x < -opts.cell || node.y < -opts.cell || node.x > w + opts.cell || node.y > h + opts.cell;
      if (out || t.length >= t.maxLength) {
        t.state = 'hold';
        t.progress = 0;
        setTimeout(() => { t.state = 'fade'; }, rand(800, 2500));
      } else if (Math.random() < opts.turnChance) {
        const [dx, dy] = t.dir;
        t.dir = Math.random() < 0.5 ? [dy, -dx] : [-dy, dx];
      }
    }
  }

  function head(t) {
    const p = t.pts.at(-1);
    return t.state === 'grow' ? { x: p.x + t.dir[0] * t.progress, y: p.y + t.dir[1] * t.progress } : p;
  }

  function drawTracer(t) {
    if (t.delay > 0) return;
    const hd = head(t);
    ctx.beginPath();
    ctx.moveTo(t.pts[0].x, t.pts[0].y);
    for (const p of t.pts.slice(1)) ctx.lineTo(p.x, p.y);
    ctx.lineTo(hd.x, hd.y);
    ctx.strokeStyle = t.color;
    // Halo large et diffus, puis tube fin
    ctx.globalAlpha = 0.14 * t.alpha;
    ctx.lineWidth = 9;
    ctx.stroke();
    ctx.globalAlpha = 0.75 * t.alpha;
    ctx.lineWidth = 2.5;
    ctx.stroke();
    // Tête lumineuse
    const g = ctx.createRadialGradient(hd.x, hd.y, 0, hd.x, hd.y, 14);
    g.addColorStop(0, '#fff');
    g.addColorStop(0.25, t.color);
    g.addColorStop(1, 'transparent');
    ctx.globalAlpha = t.alpha;
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(hd.x, hd.y, 14, 0, Math.PI * 2);
    ctx.fill();
  }

  function draw() {
    ctx.clearRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineJoin = 'miter';
    ctx.lineCap = 'round';
    tracers.forEach(drawTracer);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }

  /** Mouvement réduit : quelques néons complets, sans animation. */
  function drawStill() {
    tracers = tracers.map(() => {
      const t = spawn(0);
      for (let i = 0; i < 400 && t.state === 'grow'; i++) step(t, 0.1);
      t.state = 'hold';
      return t;
    });
    draw();
  }

  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000 || 0);
    last = now;
    tracers.forEach(t => step(t, dt));
    draw();
    requestAnimationFrame(frame);
  }

  new ResizeObserver(resize).observe(canvas);
  resize();
  if (!still) requestAnimationFrame(frame);
}
