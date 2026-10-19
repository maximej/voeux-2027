/**
 * Arrière-plan animé : des néons parcourent les côtes d'une carte du monde simplifiée
 * (assets/world.json, généré par tools/simplify-map.py depuis IMG/ref/EckertIV.svg).
 * Chaque néon part d'un point du littoral, se trace avec une tête lumineuse, glisse le long de la côte,
 * s'efface sans s'arrêter et repart ailleurs. La carte entière reste en filigrane.
 */

const rand = (a, b) => a + Math.random() * (b - a);
const pick = arr => arr[Math.floor(Math.random() * arr.length)];

export function startNeonBackground(canvas, options = {}) {
  const opts = {
    colors: ['#1de3ff', '#ff2fbc'],
    map: new URL('assets/world.json', import.meta.url),
    speed: 70,          // vitesse de tracé (px/s)
    length: [120, 420], // longueur d'un néon (px)
    ghost: 0.18,        // opacité de la carte en filigrane
    density: 1 / 70000, // nombre de néons par px² d'écran
    fps: 30,            // cadence maximale (économise la batterie et le processeur du téléphone)
    ...options,
  };
  const ctx = canvas.getContext('2d');
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ghost = document.createElement('canvas');
  let w = 0, h = 0, dpr = 1, map = null, rings = [], total = 0, tracers = [], last = 0, lastDraw = 0;

  // Têtes lumineuses pré-dessinées une fois par couleur (au lieu d'un dégradé recréé à chaque image)
  const HEAD = 12;
  const heads = Object.fromEntries(opts.colors.map(color => {
    const c = document.createElement('canvas');
    c.width = c.height = HEAD * 4;
    const g2 = c.getContext('2d');
    const g = g2.createRadialGradient(HEAD * 2, HEAD * 2, 0, HEAD * 2, HEAD * 2, HEAD * 2);
    g.addColorStop(0, '#f4feee');
    g.addColorStop(0.25, color);
    g.addColorStop(1, 'transparent');
    g2.fillStyle = g;
    g2.fillRect(0, 0, c.width, c.height);
    return [color, c];
  }));

  /** Place la carte : entière sur écran large ; sur écran en hauteur, agrandie et centrée sur l'Europe et l'Afrique. */
  function project() {
    const scale = Math.max(Math.min(w / map.w, h / map.h) * 0.94, h * 0.5 / map.h);
    const mapW = map.w * scale, mapH = map.h * scale;
    const ox = mapW <= w ? (w - mapW) / 2 : Math.min(0, Math.max(w - mapW, w / 2 - map.w * 0.56 * scale));
    const oy = (h - mapH) / 2;
    rings = map.rings.map(flat => {
      const pts = [];
      for (let i = 0; i < flat.length; i += 2) pts.push({ x: ox + flat[i] * scale, y: oy + flat[i + 1] * scale });
      pts.push(pts[0]);
      // Distances cumulées le long du contour
      const dist = [0];
      for (let i = 1; i < pts.length; i++) dist.push(dist[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y));
      return { pts, dist, len: dist.at(-1) };
    });
    total = rings.reduce((s, r) => s + r.len, 0);
  }

  /** Point du contour à la distance d (en tournant dans un sens ou dans l'autre). */
  function at(ring, d) {
    d = ((d % ring.len) + ring.len) % ring.len;
    let lo = 0, hi = ring.dist.length - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (ring.dist[mid] <= d) lo = mid; else hi = mid;
    }
    const a = ring.pts[lo], b = ring.pts[hi], f = (d - ring.dist[lo]) / ((ring.dist[hi] - ring.dist[lo]) || 1);
    return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f, i: lo };
  }

  /** Tracé de start à start + dir * len, en suivant les sommets du contour. */
  function trace(ring, start, dir, len) {
    const first = at(ring, start), end = at(ring, start + dir * len);
    ctx.moveTo(first.x, first.y);
    const n = ring.pts.length - 1;
    // Sommets franchis entre le début et la fin (le contour est fermé : on peut faire le tour)
    let i = dir > 0 ? first.i + 1 : first.i, covered = 0;
    let prev = first;
    while (true) {
      const p = ring.pts[((i % n) + n) % n];
      const step = Math.hypot(p.x - prev.x, p.y - prev.y);
      if (covered + step >= len) break;
      covered += step;
      ctx.lineTo(p.x, p.y);
      prev = p;
      i += dir;
    }
    ctx.lineTo(end.x, end.y);
    return end;
  }

  function spawn(delay = rand(0.3, 2.5)) {
    // Point de départ tiré au hasard sur l'ensemble des côtes (les grands continents sont plus souvent choisis)
    let d = rand(0, total), ring = rings[0];
    for (const r of rings) { if (d < r.len) { ring = r; break; } d -= r.len; }
    return {
      ring,
      start: d,
      dir: Math.random() < 0.5 ? 1 : -1,
      length: 0,
      maxLength: Math.min(ring.len * 0.9, rand(...opts.length)),
      color: pick(opts.colors),
      alpha: 1,
      state: 'grow',
      hold: rand(0.8, 2.5),
      delay,
    };
  }

  function step(t, dt) {
    if (t.delay > 0) { t.delay -= dt; return; }
    // La tête avance toujours, même pendant l'effacement ; une fois le néon à sa longueur,
    // la queue suit la tête et le néon glisse le long de la côte
    t.length += opts.speed * dt;
    if (t.length > t.maxLength) {
      t.start += t.dir * (t.length - t.maxLength);
      t.length = t.maxLength;
    }
    if (t.state === 'grow') {
      if (t.length >= t.maxLength) t.state = 'hold';
    } else if (t.state === 'hold') {
      t.hold -= dt;
      if (t.hold <= 0) t.state = 'fade';
    } else {
      t.alpha -= dt / 1.6;
      if (t.alpha <= 0) Object.assign(t, spawn());
    }
  }

  function drawTracer(t) {
    if (t.delay > 0 || t.length <= 0) return;
    ctx.beginPath();
    const hd = trace(t.ring, t.start, t.dir, t.length);
    ctx.strokeStyle = t.color;
    // Halo large et diffus, puis tube fin
    ctx.globalAlpha = 0.14 * t.alpha;
    ctx.lineWidth = 9;
    ctx.stroke();
    ctx.globalAlpha = 0.75 * t.alpha;
    ctx.lineWidth = 2.5;
    ctx.stroke();
    // Tête lumineuse
    ctx.globalAlpha = t.alpha;
    ctx.drawImage(heads[t.color], hd.x - HEAD, hd.y - HEAD, HEAD * 2, HEAD * 2);
  }

  /** La carte complète en filigrane, dessinée une fois par redimensionnement. */
  function drawGhost() {
    ghost.width = canvas.width;
    ghost.height = canvas.height;
    const g = ghost.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.lineJoin = 'round';
    g.strokeStyle = opts.colors[0];
    g.globalAlpha = still ? 0.6 : opts.ghost;
    g.lineWidth = 1.2;
    g.beginPath();
    for (const { pts } of rings) {
      g.moveTo(pts[0].x, pts[0].y);
      for (const p of pts.slice(1)) g.lineTo(p.x, p.y);
    }
    g.stroke();
  }

  function draw() {
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(ghost, 0, 0, w, h);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    tracers.forEach(drawTracer);
    ctx.globalAlpha = 1;
  }

  function resize() {
    dpr = Math.min(1.5, devicePixelRatio || 1);
    w = canvas.clientWidth;
    h = canvas.clientHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (!map) return;
    project();
    drawGhost();
    const count = Math.max(4, Math.min(14, Math.round(w * h * opts.density)));
    tracers = Array.from({ length: count }, () => spawn(rand(0, 3)));
    draw();
  }

  function frame(now) {
    requestAnimationFrame(frame);
    if (now - lastDraw < 1000 / opts.fps - 2) return;
    lastDraw = now;
    const dt = Math.min(0.1, (now - last) / 1000 || 0);
    last = now;
    tracers.forEach(t => step(t, dt));
    draw();
  }

  fetch(opts.map).then(r => r.json()).then(data => {
    map = data;
    new ResizeObserver(resize).observe(canvas);
    resize();
    if (!still) requestAnimationFrame(frame);
  }).catch(() => {});
}
