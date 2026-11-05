/**
 * Generative night sky behind the map, after IMG/Sky constellations/ISS_Constellations_Sky_PolarStar_centered.pdf:
 * night gradient (CSS, .sky), stars scattered at random and in small groups, four-pointed flares on
 * the brightest, a few of which twinkle, and the whole sky slowly turning around the centre of the screen.
 *
 * The stars are drawn once into a square canvas covering the screen's diagonal; the rotation and the
 * twinkling are CSS animations (compositor only), so the sky costs nothing per frame.
 */

const STAR_SPACING = 4200;  // px² of sky per star
const TWINKLERS = 18;       // brightest stars that twinkle (separate small canvases)
const MAX_RATIO = 1.5;

/** Small seeded generator: the same sky after every resize. */
function random(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Stars in a unit disc ([-1, 1]), brightness m in [0, 1], most of them faint. */
function makeStars(count) {
  const rand = random(2027);
  const gauss = () => Math.sqrt(-2 * Math.log(rand() || 1e-9)) * Math.cos(2 * Math.PI * rand());
  const groups = Array.from({ length: 14 }, () => {
    const r = Math.sqrt(rand()) * .95, a = rand() * 2 * Math.PI;
    return [r * Math.cos(a), r * Math.sin(a)];
  });
  const stars = [];
  while (stars.length < count) {
    let x, y;
    if (rand() < .3) {
      const [gx, gy] = groups[Math.floor(rand() * groups.length)];
      x = gx + gauss() * .045; y = gy + gauss() * .045;
    } else {
      x = rand() * 2 - 1; y = rand() * 2 - 1;
    }
    if (x * x + y * y > 1) continue;
    stars.push({ x, y, m: rand() ** 3.2 });
  }
  return stars.sort((a, b) => a.m - b.m);
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

export function startSky(sky) {
  const turn = document.createElement("div");
  turn.className = "sky-turn";
  const field = document.createElement("canvas");
  turn.append(field);
  sky.append(turn);
  let size = 0, twinklers = [];

  function render() {
    const { width, height } = sky.getBoundingClientRect();
    const next = Math.ceil(Math.hypot(width, height)) + 8;
    // A smaller screen keeps the sky already drawn (no flicker when the phone's address bar moves)
    if (next <= size && next > size * .8) return;
    size = next;
    const ratio = Math.min(devicePixelRatio || 1, MAX_RATIO);
    turn.style.width = turn.style.height = `${size}px`;
    field.width = field.height = Math.round(size * ratio);
    const g = field.getContext("2d");
    g.setTransform(ratio, 0, 0, ratio, 0, 0);
    g.globalCompositeOperation = "lighter";
    const radius = size / 2;
    const stars = makeStars(Math.round(Math.PI * radius * radius / STAR_SPACING));
    const bright = stars.slice(-TWINKLERS);
    stars.slice(0, -TWINKLERS).forEach(s => drawStar(g, radius + s.x * radius, radius + s.y * radius, s.m, 1));

    twinklers.forEach(c => c.remove());
    const rand = random(1);
    twinklers = bright.map(s => {
      const box = Math.ceil((5 + 26 * Math.max(0, s.m - .45) ** 1.3) * 2.2 + 12);
      const c = document.createElement("canvas");
      c.className = "twinkle";
      c.width = c.height = Math.round(box * ratio);
      Object.assign(c.style, {
        width: `${box}px`, height: `${box}px`,
        left: `${radius + s.x * radius - box / 2}px`, top: `${radius + s.y * radius - box / 2}px`,
        animationDuration: `${(2.4 + rand() * 4).toFixed(2)}s`,
        animationDelay: `${(-rand() * 6).toFixed(2)}s`
      });
      const cg = c.getContext("2d");
      cg.setTransform(ratio, 0, 0, ratio, 0, 0);
      cg.globalCompositeOperation = "lighter";
      drawStar(cg, box / 2, box / 2, Math.max(s.m, .75), 1);
      turn.append(c);
      return c;
    });
  }

  new ResizeObserver(render).observe(sky);
  render();
}
