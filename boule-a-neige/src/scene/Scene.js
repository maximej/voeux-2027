/**
 * The globe as one SVG: sky and ground clipped to the sphere, the 5 buildings, the glass,
 * the base with its message. Flat design: solid colors, no outlines.
 *
 * Buildings are SVG drawings in a 200 × 300 box, foot centered at the bottom (assets/buildings/),
 * each turned once into a <symbol>, then placed by slot with <use>.
 *
 * Depth (for the parallax, see Parallax.js), far to near: sky band, far snow, the 3 levels of
 * buildings (each building with a drift of snow at its foot, in its own level), near snow.
 * Snow bands reach well beyond the sphere, so a shift never uncovers their edges.
 */

const NS = 'http://www.w3.org/2000/svg';

function el(name, attrs = {}, parent) {
  const node = document.createElementNS(NS, name);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  parent?.append(node);
  return node;
}

export class Scene {
  /**
   * `drawings`: the SVG text of each building, in the order of `buildings`.
   * `onPick(place)`: a building was tapped or activated with the keyboard.
   */
  constructor(container, config, buildings, drawings, onPick) {
    this.config = config;
    this.buildings = buildings;
    this.onPick = onPick;
    this.svg = el('svg', { viewBox: '0 0 400 480', class: 'globe', role: 'img' }, container);
    this.build();
    this.addDrawings(drawings);
  }

  /** Each drawing becomes a <symbol id="building-<id>"> (its <title> is left out: the scene has its own label). */
  addDrawings(drawings) {
    const defs = this.svg.querySelector('defs');
    drawings.forEach((text, i) => {
      const source = new DOMParser().parseFromString(text, 'image/svg+xml').documentElement;
      const symbol = el('symbol', { id: `building-${this.buildings[i].id}`, viewBox: source.getAttribute('viewBox') || '0 0 200 300' }, defs);
      for (const node of [...source.children]) if (node.localName !== 'title') symbol.append(document.importNode(node, true));
    });
  }

  build() {
    const { sphere: s, groundY, colors, parallax } = this.config;
    const depths = parallax.depths;
    const svg = this.svg;
    const defs = el('defs', {}, svg);
    const clip = el('clipPath', { id: 'inside' }, defs);
    el('circle', { cx: s.cx, cy: s.cy, r: s.r }, clip);

    // Inside the sphere, far to near; each layer can shift (parallax)
    const inside = el('g', { 'clip-path': 'url(#inside)' }, svg);
    const sky = el('linearGradient', { id: 'sky', x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
    colors.sky.forEach((color, i) => el('stop', { offset: i / (colors.sky.length - 1), 'stop-color': color }, sky));
    el('rect', { x: -40, y: 0, width: 480, height: 480, fill: 'url(#sky)' }, inside);
    const layer = depth => {
      const g = el('g', {}, inside);
      this.layers.push({ element: g, depth });
      return g;
    };
    this.layers = [];
    el('circle', { cx: s.cx, cy: s.cy + 40, r: s.r * 0.78, fill: colors.skyBand }, layer(depths.skyBand)); // soft light behind the city
    el('path', { d: `M-40 ${groundY - 8} Q 100 ${groundY - 46} 200 ${groundY - 36} T 440 ${groundY - 10} V 480 H -40 Z`, fill: colors.groundShade }, layer(depths.farSnow));
    this.levels = depths.levels.map(depth => layer(depth));
    el('path', { d: `M-40 ${groundY + 38} Q 130 ${groundY + 6} 230 ${groundY + 26} T 440 ${groundY + 26} V 480 H -40 Z`, fill: colors.ground }, layer(depths.nearSnow));

    // Glass: thin rim and reflections, flat; the reflections are on the front of the glass and
    // slide a little the other way (parallax depth below 0)
    el('circle', { cx: s.cx, cy: s.cy, r: s.r - 2, fill: 'none', stroke: colors.glass, 'stroke-width': 4, opacity: 0.35 }, svg);
    const reflections = el('g', {}, svg);
    this.layers.push({ element: reflections, depth: depths.reflections });
    el('path', { d: `M ${s.cx - s.r * 0.72} ${s.cy - s.r * 0.2} A ${s.r * 0.78} ${s.r * 0.78} 0 0 1 ${s.cx - s.r * 0.15} ${s.cy - s.r * 0.75}`, fill: 'none', stroke: colors.glass, 'stroke-width': 10, 'stroke-linecap': 'round', opacity: 0.22 }, reflections);
    el('circle', { cx: s.cx + s.r * 0.5, cy: s.cy - s.r * 0.55, r: 7, fill: colors.glass, opacity: 0.3 }, reflections);
    el('path', { d: `M ${s.cx + s.r * 0.62} ${s.cy + s.r * 0.42} A ${s.r * 0.86} ${s.r * 0.86} 0 0 1 ${s.cx + s.r * 0.3} ${s.cy + s.r * 0.72}`, fill: 'none', stroke: colors.glass, 'stroke-width': 5, 'stroke-linecap': 'round', opacity: 0.16 }, reflections);

    // Base: a flat trapezoid with a plaque
    const top = s.cy + s.r - 26;
    el('path', { d: `M ${s.cx - 128} ${top} H ${s.cx + 128} L ${s.cx + 150} ${top + 92} H ${s.cx - 150} Z`, fill: colors.base }, svg);
    el('rect', { x: s.cx - 132, y: top - 6, width: 264, height: 16, rx: 3, fill: colors.baseTop }, svg);
    // Plaque with the greeting
    const plaque = el('g', { class: 'plaque' }, svg);
    el('rect', { x: s.cx - 112, y: top + 34, width: 224, height: 40, rx: 4, fill: colors.plaque }, plaque);
    this.messageText = el('text', { x: s.cx, y: top + 55, 'text-anchor': 'middle', 'dominant-baseline': 'central', fill: colors.plaqueText, 'font-size': 22, 'font-weight': 800, class: 'plaque-text' }, plaque);
    this.plaqueWidth = 204;
  }

  /** Message on the plaque: one line, shrunk to fit; a long message goes on two lines. */
  setMessage(text) {
    const t = this.messageText;
    const fit = size => {
      t.setAttribute('font-size', size);
      const width = t.getComputedTextLength();
      if (width > this.plaqueWidth) t.setAttribute('font-size', (size * this.plaqueWidth) / width);
      return Number(t.getAttribute('font-size'));
    };
    t.replaceChildren(text);
    if (fit(22) >= 15 || !text.includes(' ')) return;
    // Two lines, split at the space closest to the middle
    const spaces = [...text.matchAll(/ /g)].map(m => m.index);
    const cut = spaces.reduce((best, i) => (Math.abs(i - text.length / 2) < Math.abs(best - text.length / 2) ? i : best));
    const x = t.getAttribute('x');
    t.replaceChildren();
    for (const [line, dy] of [[text.slice(0, cut), '-0.55em'], [text.slice(cut + 1), '1.1em']]) {
      const span = el('tspan', { x, dy }, t);
      span.textContent = line;
    }
    fit(16);
  }

  /** `combination`: building index for places 1 to 5. */
  setCombination(combination) {
    this.combination = combination;
    this.levels.forEach(level => level.replaceChildren());
    const order = this.config.slots.map((slot, place) => ({ slot, place })).sort((a, b) => a.slot.y - b.slot.y);
    for (const { slot, place } of order) {
      const level = this.levels[slot.level - 1];
      const index = combination[place];
      const building = this.buildings[index];
      const scale = slot.width / 200;
      const g = el('g', {
        transform: `translate(${slot.x - slot.width / 2} ${slot.y - 300 * scale}) scale(${scale})`,
        class: 'building',
        'data-place': place + 1,
        tabindex: 0,
        role: 'button',
        'aria-label': `Emplacement ${place + 1} : ${building.name}, ${building.city}. Changer de bâtiment`,
      }, level);
      el('use', { href: `#building-${building.id}`, width: 200, height: 300 }, g);
      // Drift of snow at its foot, part of its level: the foot stays planted whatever the parallax
      el('ellipse', { cx: slot.x, cy: slot.y + 5, rx: slot.width * 0.5, ry: slot.width * 0.09, fill: this.config.colors.drift, class: 'drift' }, level);
      g.addEventListener('click', () => this.onPick?.(place));
      g.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.onPick?.(place);
        }
      });
    }
    this.svg.setAttribute('aria-label', `Boule à neige : ${combination.map(i => `${this.buildings[i].name} (${this.buildings[i].city})`).join(', ')}`);
  }
}
