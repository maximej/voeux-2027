/**
 * Stars of the celestial sphere drawn behind the map (app.js, drawSky), after
 * IMG/Sky constellations/ISS_Constellations_Sky_PolarStar_centered.pdf: most of them faint, soft
 * halos, four-pointed flares on the brightest.
 */

/** Small seeded generator: the same sky after every resize. */
function random(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** One star: soft halo, white core, and for the bright ones a four-pointed flare. */
function drawStar(g, x, y, m, scale) {
  const core = (.45 + 1.3 * m) * scale;
  const halo = core * (2.5 + 3 * m);
  const glow = g.createRadialGradient(x, y, 0, x, y, halo);
  glow.addColorStop(0, `rgba(255,255,255,${.35 + .65 * m})`);
  glow.addColorStop(.25, `rgba(214,226,255,${.18 + .3 * m})`);
  glow.addColorStop(1, "rgba(214,226,255,0)");
  g.fillStyle = glow;
  g.fillRect(x - halo, y - halo, halo * 2, halo * 2);
  if (m < .45) return;
  const spike = (5 + 26 * (m - .45) ** 1.3) * scale;
  for (const [dx, dy, length] of [[1, 0, 1], [0, 1, 1], [.7071, .7071, .38], [.7071, -.7071, .38]]) {
    const l = spike * length;
    const ray = g.createLinearGradient(x - dx * l, y - dy * l, x + dx * l, y + dy * l);
    ray.addColorStop(0, "rgba(230,236,255,0)");
    ray.addColorStop(.5, `rgba(255,255,255,${.5 + .5 * m})`);
    ray.addColorStop(1, "rgba(230,236,255,0)");
    g.strokeStyle = ray;
    g.lineWidth = Math.max(.6, core * .55);
    g.beginPath();
    g.moveTo(x - dx * l, y - dy * l);
    g.lineTo(x + dx * l, y + dy * l);
    g.stroke();
  }
}

/**
 * Celestial sphere around the globe: stars spread evenly over the sphere ([lon, lat] in degrees), and
 * pre-drawn sprites by brightness, so the globe can project and copy them at every frame.
 */
export function celestialStars(count = 900) {
  const rand = random(1789);
  return Array.from({ length: count }, () => ({
    coordinates: [rand() * 360 - 180, Math.asin(rand() * 2 - 1) * 180 / Math.PI],
    m: rand() ** 3.2
  }));
}

export const STAR_LEVELS = 8;

export function starSprites(ratio, scale = 1) {
  return Array.from({ length: STAR_LEVELS }, (_, i) => {
    const m = (i + .5) / STAR_LEVELS;
    const box = Math.ceil(((5 + 26 * Math.max(0, m - .45) ** 1.3) * 2.2 + 12) * scale);
    const c = document.createElement("canvas");
    c.width = c.height = Math.round(box * ratio);
    const g = c.getContext("2d");
    g.setTransform(ratio, 0, 0, ratio, 0, 0);
    g.globalCompositeOperation = "lighter";
    drawStar(g, box / 2, box / 2, m, scale);
    return { canvas: c, box };
  });
}
