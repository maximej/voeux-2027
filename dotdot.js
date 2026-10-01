/**
 * Moteur « relier les points » : transforme un dessin SVG en jeu de points numérotés.
 *
 * Les points sont générés le long des tracés du SVG (path, polygon, rect, circle…).
 * Le joueur les relie dans l'ordre (clic, toucher ou glisser), puis le dessin
 * original est révélé.
 *
 * Conventions dans le SVG source :
 *   data-dots="auto"     sur un élément ou un groupe : seuls ces tracés deviennent des points
 *                        (sinon, tous les tracés sont utilisés)
 *   data-dots="0"        élément décoratif : jamais de points, seulement révélé à la fin
 *   data-dots="12"       force le nombre de points de cet élément
 *   data-order="2"       ordre de tracé (par défaut : ordre du document)
 *   data-title, data-message  sur la racine <svg> : titre et message affichés à la fin
 */

const SVG_NS = 'http://www.w3.org/2000/svg';
const GEOMETRY = 'path, polyline, polygon, line, rect, circle, ellipse';
const NON_RENDERED = 'defs, clipPath, mask, pattern, symbol, marker';

const make = (tag, attrs = {}, parent) => {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  if (parent) parent.append(node);
  return node;
};

const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

let glowId = 0;

/** Couleur à la position t ∈ [0, 1] d'un dégradé de couleurs hexadécimales. */
function gradientAt(colors, t) {
  if (colors.length === 1) return colors[0];
  const pos = Math.max(0, Math.min(1, t)) * (colors.length - 1);
  const k = Math.min(colors.length - 2, Math.floor(pos));
  const rgb = c => [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16));
  const a = rgb(colors[k]), b = rgb(colors[k + 1]);
  return `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * (pos - k))).join(' ')})`;
}

function distToSegment(p, a, b) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  const t = len2 ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2)) : 0;
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

/** Ramer–Douglas–Peucker : indices des points qui portent la forme (angles, courbures). */
function rdp(pts, eps) {
  const keep = new Uint8Array(pts.length);
  keep[0] = keep[pts.length - 1] = 1;
  const stack = [[0, pts.length - 1]];
  while (stack.length) {
    const [s, e] = stack.pop();
    let max = 0, idx = -1;
    for (let i = s + 1; i < e; i++) {
      const d = distToSegment(pts[i], pts[s], pts[e]);
      if (d > max) { max = d; idx = i; }
    }
    if (max > eps) {
      keep[idx] = 1;
      stack.push([s, idx], [idx, e]);
    }
  }
  return [...keep.keys()].filter(i => keep[i]);
}

/** Convertit une forme de base en données de chemin (départ en haut pour les cercles). */
function shapeToPath(node) {
  const n = a => parseFloat(node.getAttribute(a)) || 0;
  switch (node.localName) {
    case 'rect': {
      const x = n('x'), y = n('y'), w = n('width'), h = n('height');
      return `M${x} ${y}H${x + w}V${y + h}H${x}Z`;
    }
    case 'circle':
    case 'ellipse': {
      const cx = n('cx'), cy = n('cy');
      const rx = node.localName === 'circle' ? n('r') : n('rx');
      const ry = node.localName === 'circle' ? n('r') : n('ry');
      return `M${cx} ${cy - ry}A${rx} ${ry} 0 1 1 ${cx} ${cy + ry}A${rx} ${ry} 0 1 1 ${cx} ${cy - ry}Z`;
    }
    case 'line':
      return `M${n('x1')} ${n('y1')}L${n('x2')} ${n('y2')}`;
    case 'polyline':
    case 'polygon': {
      const v = (node.getAttribute('points') || '').trim().split(/[\s,]+/).map(Number);
      let d = '';
      for (let i = 0; i + 1 < v.length; i += 2) d += `${i ? 'L' : 'M'}${v[i]} ${v[i + 1]}`;
      return node.localName === 'polygon' ? `${d}Z` : d;
    }
  }
  return node.getAttribute('d') || '';
}

function parseViewBox(svg) {
  const vb = (svg.getAttribute('viewBox') || '').trim().split(/[\s,]+/).map(Number);
  if (vb.length === 4 && vb.every(Number.isFinite) && vb[2] > 0 && vb[3] > 0) return vb;
  const w = parseFloat(svg.getAttribute('width')), h = parseFloat(svg.getAttribute('height'));
  return w > 0 && h > 0 ? [0, 0, w, h] : null;
}

export class DotToDot {
  constructor(container, options = {}) {
    this.container = container;
    this.opts = {
      dots: 50,        // nombre de points visé pour tout le dessin
      dotRadius: 6,    // px à l'écran
      fontSize: 12,    // px à l'écran
      hitRadius: 24,   // px à l'écran : tolérance du doigt
      lineColors: null, // ex. ['#1de3ff', '#ff2fbc'] : dégradé des traits du premier au dernier point
      glow: 0,         // px à l'écran : halo lumineux autour des traits et des points (0 = aucun)
      onProgress: () => {},
      onComplete: () => {},
      ...options,
    };
    this.dots = [];
    this.count = 0;
    this._ro = new ResizeObserver(() => this._layout());
    this._ro.observe(container);
  }

  get total() { return this.dots.length; }

  /** Charge un SVG (texte) et prépare la partie. Renvoie { title, message } lus dans le SVG. */
  load(svgText) {
    this._stop();
    const doc = new DOMParser().parseFromString(svgText, 'image/svg+xml');
    const src = doc.documentElement;
    const parseError = doc.getElementsByTagName('parsererror')[0];
    if (src.localName !== 'svg' || parseError) {
      const detail = parseError?.textContent.match(/error on line.*?:[^\n]*/i)?.[0];
      throw new Error(`Fichier SVG invalide${detail ? ` (${detail.trim()})` : ''}.`);
    }
    const meta = {
      title: src.getAttribute('data-title') || src.querySelector(':scope > title')?.textContent.trim() || '',
      message: src.getAttribute('data-message') || '',
    };

    const svg = make('svg', { class: 'dtd' });
    this.container.replaceChildren(svg);
    const wrap = make('g', { class: 'dtd-art' }, svg);
    const art = document.importNode(src, true);
    for (const a of ['width', 'height', 'x', 'y']) art.removeAttribute(a);
    wrap.append(art);

    let vb = parseViewBox(src);
    if (!vb) {
      const b = art.getBBox();
      const pad = Math.max(b.width, b.height) * 0.05 || 10;
      vb = [b.x - pad, b.y - pad, b.width + 2 * pad, b.height + 2 * pad];
    }
    const [x, y, w, h] = vb;
    const margin = Math.max(w, h) * 0.06; // place pour les numéros en bordure
    svg.setAttribute('viewBox', [x - margin, y - margin, w + 2 * margin, h + 2 * margin].join(' '));
    Object.entries({ x, y, width: w, height: h, viewBox: vb.join(' '), overflow: 'visible' })
      .forEach(([k, v]) => art.setAttribute(k, v));

    this.svg = svg;
    this.diag = Math.hypot(w, h);
    this.gLines = make('g', { class: 'dtd-lines' }, svg);
    this.rubber = make('line', { class: 'dtd-rubber', visibility: 'hidden' }, svg);
    this.gDots = make('g', { class: 'dtd-dots' }, svg);
    if (this.opts.glow) {
      const id = `dtd-glow-${++glowId}`;
      const filter = make('filter', { id, x: '-50%', y: '-50%', width: '200%', height: '200%' },
        make('defs', {}, svg));
      this.glowBlur = make('feGaussianBlur', { in: 'SourceGraphic', result: 'blur' }, filter);
      const merge = make('feMerge', {}, filter);
      ['blur', 'SourceGraphic'].forEach(n => make('feMergeNode', { in: n }, merge));
      for (const g of [this.gLines, this.gDots]) g.setAttribute('filter', `url(#${id})`);
    }

    this.dots = this._extractDots(art);
    if (!this.dots.length) throw new Error('Aucun tracé exploitable dans ce SVG (le texte doit être converti en tracés).');

    this._render();
    this._bind(svg);
    this.reset();
    return meta;
  }

  reset() {
    this._stop();
    this.count = 0;
    this.done = false;
    this.lines = [];
    this.gLines.replaceChildren();
    this.dots.forEach(d => d.el.classList.remove('done'));
    this.svg.classList.remove('complete');
    this._updateNext();
    this.opts.onProgress(0, this.total);
  }

  undo() {
    if (this.done || this.autoplay || !this.count) return;
    this.count--;
    this.lines[this.count].forEach(l => l.remove());
    this.dots[this.count].el.classList.remove('done');
    this._updateNext();
    this.opts.onProgress(this.count, this.total);
  }

  /** Relie automatiquement les points restants. */
  solve(interval = 50) {
    if (this.done || this.autoplay) return;
    this.autoplay = setInterval(() => this._connect(), interval);
  }

  destroy() {
    this._stop();
    this._ro.disconnect();
    this.container.replaceChildren();
  }

  // --- Génération des points -------------------------------------------------

  _extractDots(art) {
    const toRoot = this.svg.getScreenCTM().inverse();
    const all = [...art.querySelectorAll(GEOMETRY)].filter(n => !n.closest(NON_RENDERED));
    const flag = n => n.closest('[data-dots]')?.getAttribute('data-dots');
    const explicit = all.some(n => flag(n) != null && flag(n) !== '0');
    const traced = all.filter(n => {
      const v = flag(n);
      return v === '0' ? false : explicit ? v != null : true;
    });
    const order = n => parseFloat(n.closest('[data-order]')?.getAttribute('data-order')) || 0;
    traced.sort((a, b) => order(a) - order(b));

    // 1re passe : échantillonnage fin de chaque tracé, découpé en sous-tracés.
    const items = [];
    const temps = [];
    let totalLen = 0;
    for (const node of traced) {
      let path = node;
      if (node.localName !== 'path') {
        path = make('path', { d: shapeToPath(node) });
        if (node.hasAttribute('transform')) path.setAttribute('transform', node.getAttribute('transform'));
        node.after(path);
        temps.push(path);
      }
      let len = 0;
      try { len = path.getTotalLength(); } catch { /* tracé vide */ }
      if (!(len > 0)) continue;
      const M = toRoot.multiply(path.getScreenCTM());
      const runs = this._denseRuns(path, len, M);
      const elLen = runs.reduce((s, r) => s + r.len, 0);
      const forced = parseInt(node.getAttribute('data-dots'), 10) || 0;
      for (const run of runs) items.push({ path, M, run, spacing: forced > 0 ? elLen / forced : 0 });
      totalLen += elLen;
    }

    // 2e passe : placement des points avec un espacement commun.
    this.spacing = totalLen / Math.max(3, this.opts.dots);
    const dots = [];
    let group = 0;
    for (const item of items) {
      const res = this._runDots(item, item.spacing || this.spacing);
      if (!res) continue;
      const start = dots.length;
      res.pts.forEach((p, i) => dots.push({
        x: p.x, y: p.y, group, start, closed: res.closed, last: i === res.pts.length - 1,
      }));
      group++;
    }
    temps.forEach(t => t.remove());
    this._computeLabelSides(dots);
    return dots;
  }

  /** Échantillonne un tracé ; un saut de position signale un nouveau sous-tracé (commande M). */
  _denseRuns(path, len, M) {
    const n = Math.min(4000, Math.max(80, Math.ceil(len / (this.diag * 0.0015))));
    const step = len / n;
    const runs = [];
    let run = null, prev = null;
    for (let i = 0; i <= n; i++) {
      const l = i * step;
      const q = path.getPointAtLength(l);
      if (!run || dist(q, prev) > step * 1.05) {
        run = { pts: [], len: 0 };
        runs.push(run);
      }
      const p = new DOMPoint(q.x, q.y).matrixTransform(M);
      const pt = { x: p.x, y: p.y, l, rl: 0 };
      const last = run.pts.at(-1);
      if (last) pt.rl = run.len += dist(last, pt);
      run.pts.push(pt);
      prev = q;
    }
    return runs.filter(r => r.pts.length > 1 && r.len > this.diag * 0.004);
  }

  _runDots({ path, M, run }, spacing) {
    const pts = run.pts;
    const closed = dist(pts[0], pts.at(-1)) < this.diag * 0.004;
    const sp = Math.min(spacing, run.len / (closed ? 3 : 1));
    const at = l => {
      const q = path.getPointAtLength(l);
      const p = new DOMPoint(q.x, q.y).matrixTransform(M);
      return { x: p.x, y: p.y };
    };

    // Les angles et points de forte courbure sont conservés, les intervalles remplis régulièrement.
    const keep = rdp(pts, Math.max(this.diag * 0.003, sp * 0.08));
    const raw = [];
    for (let k = 0; k < keep.length - 1; k++) {
      const a = pts[keep[k]], b = pts[keep[k + 1]];
      const m = Math.max(1, Math.round((b.rl - a.rl) / sp));
      raw.push({ x: a.x, y: a.y, corner: true });
      for (let j = 1; j < m; j++) raw.push({ ...at(a.l + (b.l - a.l) * j / m), corner: false });
    }
    if (!closed) raw.push({ x: pts.at(-1).x, y: pts.at(-1).y, corner: true, end: true });

    // Suppression des points trop serrés, en privilégiant les angles et l'extrémité.
    const minD = sp * 0.45;
    const out = [raw[0]];
    for (const p of raw.slice(1)) {
      const prev = out.at(-1);
      if (dist(p, prev) >= minD) out.push(p);
      else if (out.length > 1 && (p.end || (p.corner && !prev.corner))) out[out.length - 1] = p;
    }
    if (closed) while (out.length > 3 && dist(out.at(-1), out[0]) < minD) out.pop();
    return out.length >= (closed ? 3 : 2) ? { pts: out, closed } : null;
  }

  /** Place chaque numéro dans la direction la plus dégagée (points et numéros déjà placés). */
  _computeLabelSides(dots) {
    const off = this.spacing * 0.5;
    const placed = [];
    for (const [i, d] of dots.entries()) {
      const end = dots.findIndex((o, j) => j > i && o.group !== d.group);
      const last = (end === -1 ? dots.length : end) - 1;
      const prev = i > d.start ? dots[i - 1] : d.closed ? dots[last] : d;
      const next = i < last ? dots[i + 1] : d.closed ? dots[d.start] : d;
      let tx = next.x - prev.x, ty = next.y - prev.y;
      const len = Math.hypot(tx, ty) || 1;
      tx /= len; ty /= len;
      // Perpendiculaires au tracé (préférées), puis diagonales.
      const s = Math.SQRT1_2;
      const candidates = [
        [-ty, tx, 1.1], [ty, -tx, 1.1],
        [(-ty + tx) * s, (tx + ty) * s, 1], [(-ty - tx) * s, (tx - ty) * s, 1],
        [(ty + tx) * s, (-tx + ty) * s, 1], [(ty - tx) * s, (-tx - ty) * s, 1],
      ];
      let best = null, bestScore = -1;
      for (const [nx, ny, bonus] of candidates) {
        const p = { x: d.x + nx * off, y: d.y + ny * off };
        let clear = Infinity;
        for (const o of dots) if (o !== d) clear = Math.min(clear, dist(o, p));
        for (const q of placed) clear = Math.min(clear, dist(q, p) * 0.8);
        if (clear * bonus > bestScore) { bestScore = clear * bonus; best = { nx, ny, p }; }
      }
      d.nx = best.nx;
      d.ny = best.ny;
      placed.push(best.p);
    }
  }

  // --- Rendu -------------------------------------------------------------------

  _render() {
    const colors = this.opts.lineColors;
    for (const [i, d] of this.dots.entries()) {
      d.el = make('g', { class: 'dtd-dot' }, this.gDots);
      if (colors?.length) {
        d.color = gradientAt(colors, i / Math.max(1, this.total - 1));
        d.el.style.setProperty('--c', d.color); // utilisable en CSS : var(--c)
      }
      d.circle = make('circle', { cx: d.x, cy: d.y }, d.el);
      d.label = make('text', {}, d.el);
      d.label.textContent = i + 1;
    }
    this._layout();
  }

  /** Tailles exprimées en pixels écran, recalculées quand le plateau change de taille. */
  _layout() {
    const ctm = this.svg?.isConnected && this.svg.getScreenCTM();
    if (!ctm || !ctm.a) return;
    const k = this.k = 1 / ctm.a;
    const r = Math.min(this.opts.dotRadius * k, this.spacing * 0.3);
    const f = Math.min(this.opts.fontSize * k, Math.max(this.spacing * 0.7, 9 * k));
    this.gLines.setAttribute('stroke-width', 2.5 * k);
    this.rubber.setAttribute('stroke-width', 2 * k);
    this.gDots.setAttribute('stroke-width', r * 0.9); // contour éventuel des points (CSS)
    this.glowBlur?.setAttribute('stdDeviation', this.opts.glow * k);
    for (const d of this.dots) {
      const o = r + f * 0.8;
      d.circle.setAttribute('r', r);
      d.label.setAttribute('x', d.x + d.nx * o);
      d.label.setAttribute('y', d.y + d.ny * o);
      d.label.setAttribute('font-size', f);
    }
  }

  _line(a, b, color) {
    const line = make('path', { class: 'dtd-line', d: `M${a.x} ${a.y}L${b.x} ${b.y}`, pathLength: 1 }, this.gLines);
    if (color) line.style.setProperty('--c', color);
    return line;
  }

  _updateNext() {
    this.gDots.querySelector('.next')?.classList.remove('next');
    const next = this.dots[this.count];
    if (next) {
      next.el.classList.add('next');
      this.gDots.append(next.el); // au premier plan
    }
  }

  _connect() {
    if (this.count >= this.total) return this._stop();
    const i = this.count, d = this.dots[i];
    const lines = [];
    if (i > 0 && this.dots[i - 1].group === d.group) lines.push(this._line(this.dots[i - 1], d, d.color));
    if (d.closed && d.last) lines.push(this._line(d, this.dots[d.start], d.color));
    this.lines[i] = lines;
    d.el.classList.add('done');
    this.count++;
    this._updateNext();
    this.opts.onProgress(this.count, this.total);
    if (this.count === this.total) this._finish();
  }

  _finish() {
    this._stop();
    this.done = true;
    this.dragging = false;
    this.rubber.setAttribute('visibility', 'hidden');
    this.svg.classList.add('complete');
    this.opts.onComplete();
  }

  _stop() {
    clearInterval(this.autoplay);
    this.autoplay = null;
  }

  // --- Interaction ---------------------------------------------------------------

  _bind(svg) {
    svg.addEventListener('pointerdown', e => this._down(e));
    svg.addEventListener('pointermove', e => this._move(e));
    for (const t of ['pointerup', 'pointercancel', 'lostpointercapture']) {
      svg.addEventListener(t, () => this._up());
    }
  }

  _toSvg(e) {
    return new DOMPoint(e.clientX, e.clientY).matrixTransform(this.svg.getScreenCTM().inverse());
  }

  _hitRadius(i) {
    const d = this.dots[i], prev = this.dots[i - 1];
    let r = this.opts.hitRadius * this.k;
    if (prev && prev.group === d.group) r = Math.min(r, dist(d, prev) * 0.5);
    return Math.max(r, this.opts.dotRadius * this.k * 1.2);
  }

  /** Relie le(s) point(s) suivant(s) situés sur le trajet a → b du pointeur. */
  _reach(a, b, max = Infinity) {
    let n = 0;
    while (n < max && this.count < this.total) {
      const i = this.count;
      if (distToSegment(this.dots[i], a, b) > this._hitRadius(i)) break;
      this._connect();
      n++;
    }
    return n > 0;
  }

  _down(e) {
    if (this.done || this.autoplay || e.button > 0) return;
    e.preventDefault();
    this.svg.setPointerCapture(e.pointerId);
    this.dragging = true;
    const p = this._toSvg(e);
    this.lastPt = p;
    if (!this._reach(p, p, 1)) this._miss(p);
    this._drawRubber(p);
  }

  _move(e) {
    if (!this.dragging) return;
    const p = this._toSvg(e);
    this._reach(this.lastPt, p);
    this.lastPt = p;
    this._drawRubber(p);
  }

  _up() {
    this.dragging = false;
    this.rubber?.setAttribute('visibility', 'hidden');
  }

  _drawRubber(p) {
    const i = this.count, from = this.dots[i - 1];
    const show = this.dragging && !this.done && from && this.dots[i].group === from.group;
    this.rubber.setAttribute('visibility', show ? 'visible' : 'hidden');
    if (show) {
      if (this.dots[i].color) this.rubber.style.setProperty('--c', this.dots[i].color);
      Object.entries({ x1: from.x, y1: from.y, x2: p.x, y2: p.y })
        .forEach(([k, v]) => this.rubber.setAttribute(k, v));
    }
  }

  /** Mauvais point touché : il tremble, et le bon point est signalé. */
  _miss(p) {
    const reach = this.opts.dotRadius * this.k * 3;
    const wrong = this.dots.find((d, i) => i > this.count && dist(d, p) < reach);
    if (!wrong) return;
    for (const el of [wrong.el, this.dots[this.count].el]) {
      el.classList.remove(el === wrong.el ? 'wrong' : 'hint');
      void el.getBBox();
      el.classList.add(el === wrong.el ? 'wrong' : 'hint');
      setTimeout(() => el.classList.remove('wrong', 'hint'), 600);
    }
  }
}
