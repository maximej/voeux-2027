import { geoDistance, geoGraticule10, geoOrthographic, geoOrthographicRaw, geoPath, geoProjection } from "d3-geo";
import { easeBackOut, easeCubicInOut } from "d3-ease";
import { feature } from "topojson-client";
import { interpolateRaw, planarRaw } from "./projection-math.js";
import { startSky } from "./sky.js";

const canvas = document.querySelector("#map");
const stage = document.querySelector("#stageShell");
const slider = document.querySelector("#morph");
const value = document.querySelector("#morphValue");
const wrapButton = document.querySelector("#wrap");
const postesButton = document.querySelector("#postes");
const legend = document.querySelector("#legend");
const label = document.querySelector("#posteLabel");
const context = canvas.getContext("2d");
const flatBuffer = document.createElement("canvas");
const globeBuffer = document.createElement("canvas");
const flatContext = flatBuffer.getContext("2d");
const globeContext = globeBuffer.getContext("2d");
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
const PAPER = "#f3efe5";

// Épingles des postes (ambassades et consulats), dessinées en pixels écran quelle que soit l'échelle
const PIN = {
  ambassade: { height: 14, fill: "#383f52", stroke: "#f4feee", dot: "#f4feee" },
  consulat: { height: 10.5, fill: "#f4feee", stroke: "#383f52", dot: "#6c60a9" }
};
const PIN_SWEEP = .55;      // part de l'animation pendant laquelle les départs s'échelonnent d'ouest en est
const PIN_DURATION = 1400;  // durée de l'apparition (ms)

let land;
let flatT = 0;
let wrapT = 0;
let centerT = 0;
let globe = false;
let transitionFrame;
let inertiaFrame;
let rotation = [-12, -18, 0];
let zoom = 1;
let dragging = false;
let lastPointer;
let lastPointerTime = 0;
let angularVelocity = [0, 0];
let postes = [];
let showPostes = false;
let pinsT = 0;
let pinsFrame;
let selected = null;                     // poste dont le nom est affiché (un seul à la fois)
const pinHits = { flat: [], globe: [] }; // épingles dessinées à la dernière image, pour le clic
let tapStart;

function resize() {
  const ratio = Math.min(devicePixelRatio || 1, 2);
  const rect = stage.getBoundingClientRect();
  canvas.width = Math.round(rect.width * ratio);
  canvas.height = Math.round(rect.height * ratio);
  flatBuffer.width = canvas.width;
  flatBuffer.height = canvas.height;
  globeBuffer.width = canvas.width;
  globeBuffer.height = canvas.height;
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  flatContext.setTransform(ratio, 0, 0, ratio, 0, 0);
  globeContext.setTransform(ratio, 0, 0, ratio, 0, 0);
  draw();
}

function smoothstep(edge0, edge1, value) {
  const t = Math.max(0, Math.min(1, (value - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

function projectionLayout() {
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  const planarWidth = 2 * Math.PI + (5.306001713 - 2 * Math.PI) * flatT;
  const planarHeight = 2 * Math.PI + (2.652999475 - 2 * Math.PI) * flatT;
  const planeScale = Math.min(width * .86 / planarWidth, height * .70 / planarHeight);
  const globeScale = Math.min(width, height) * .39 * zoom;
  const restingOffset = Math.min(28, height * .035);
  const poseT = easeCubicInOut(smoothstep(0, 1, wrapT));
  return {
    scale: planeScale + (globeScale - planeScale) * poseT,
    translate: [width / 2, height / 2 - restingOffset * (1 - centerT)],
    rotate: rotation.map(component => component * poseT)
  };
}

function currentProjection() {
  // Complete the surface curvature early. From 55% onward, this raw geometry
  // exactly matches the clipped frontal globe while its pose keeps moving.
  const shapeT = easeCubicInOut(smoothstep(0, .55, wrapT));
  const raw = interpolateRaw(planarRaw(flatT), geoOrthographicRaw, shapeT);
  const projection = geoProjection(raw).precision(.15);
  const layout = projectionLayout();

  projection
    .scale(layout.scale)
    .translate(layout.translate)
    .rotate(layout.rotate);

  return projection;
}

function globeProjection() {
  const layout = projectionLayout();
  return geoOrthographic()
    .precision(.15)
    .clipAngle(90)
    .scale(layout.scale)
    .translate(layout.translate)
    .rotate(layout.rotate);
}

function drawLayer(target, projection, alpha, outlineAlpha, paperAlpha = 1) {
  if (alpha <= 0) return;
  const path = geoPath(projection, target);
  target.save();
  target.globalAlpha = alpha;

  // Beige paper inside the map's outline only: the starry sky shows around it.
  // The outline of the interpolated projection folds while the map wraps, so
  // the flat map's paper fades out first and the globe's fades in with it.
  if (paperAlpha > 0) {
    target.globalAlpha = alpha * paperAlpha;
    target.beginPath();
    path({ type: "Sphere" });
    target.fillStyle = PAPER;
    target.fill();
    target.globalAlpha = alpha;
  }

  target.beginPath();
  path(geoGraticule10());
  target.strokeStyle = "rgba(48,57,76,.22)";
  target.lineWidth = .7;
  target.stroke();

  target.beginPath();
  path(land);
  target.fillStyle = "#4e88b7";
  target.fill();

  target.globalAlpha = outlineAlpha;
  target.beginPath();
  path({ type: "Sphere" });
  target.strokeStyle = "#30394c";
  target.lineWidth = 1.25;
  target.stroke();
  target.restore();

  drawPins(target, projection, target === globeContext);
}

/** Épingle en goutte : pointe sur le lieu, tête ronde au-dessus. */
function pinPath(target, height) {
  const r = height * .36, cy = -height + r;
  target.beginPath();
  target.moveTo(0, 0);
  target.bezierCurveTo(-r * .35, -height * .3, -r, cy + r * .55, -r, cy);
  target.arc(0, cy, r, Math.PI, 0);
  target.bezierCurveTo(r, cy + r * .55, r * .35, -height * .3, 0, 0);
  target.closePath();
  return { r, cy };
}

// Chaque type d'épingle est dessiné une seule fois dans une petite image, puis recopié
// (drawImage) : beaucoup plus rapide que de tracer 257 formes à chaque image.
const SPRITE_RES = 4; // pixels par pixel CSS : net jusqu'au rebond et sur écran Retina
const sprites = {};
function pinSprite(style) {
  if (sprites[style]) return sprites[style];
  const { height, fill, stroke, dot } = PIN[style];
  const width = height * .8 + 2, full = height + 2;
  const sprite = document.createElement("canvas");
  sprite.width = Math.ceil(width * SPRITE_RES);
  sprite.height = Math.ceil(full * SPRITE_RES);
  const g = sprite.getContext("2d");
  g.scale(SPRITE_RES, SPRITE_RES);
  g.translate(width / 2, height + 1);
  const { r, cy } = pinPath(g, height);
  g.fillStyle = fill;
  g.fill();
  g.lineWidth = 1.1;
  g.strokeStyle = stroke;
  g.stroke();
  g.beginPath();
  g.arc(0, cy, r * .42, 0, 2 * Math.PI);
  g.fillStyle = dot;
  g.fill();
  // Ancre de la pointe dans l'image, en pixels CSS
  return sprites[style] = { image: sprite, width, height: full, anchorX: width / 2, anchorY: height + 1 };
}

const shadowSprite = (() => {
  const sprite = document.createElement("canvas");
  sprite.width = 8 * SPRITE_RES;
  sprite.height = 3 * SPRITE_RES;
  const g = sprite.getContext("2d");
  g.scale(SPRITE_RES, SPRITE_RES);
  g.beginPath();
  g.ellipse(4, 1.5, 3.2, 1.3, 0, 0, 2 * Math.PI);
  g.fillStyle = "rgba(48,57,76,.28)";
  g.fill();
  return sprite;
})();

function drawPins(target, projection, frontOnly) {
  const hits = pinHits[frontOnly ? "globe" : "flat"] = [];
  if (pinsT <= 0 || !postes.length) return;
  const rotate = projection.rotate();
  const center = [-rotate[0], -rotate[1]];
  // Épingles plus petites sur petit écran (téléphone), où la carte l'est aussi
  const size = Math.max(.6, Math.min(1, Math.min(canvas.clientWidth, canvas.clientHeight) / 700));
  target.save();
  for (const poste of postes) {
    // Apparition échelonnée d'ouest en est ; à la disparition, le même balayage en sens inverse
    const local = Math.max(0, Math.min(1, (pinsT - poste.delay * PIN_SWEEP) / (1 - PIN_SWEEP)));
    if (local <= 0) continue;
    let foreshorten = 1;
    if (frontOnly) {
      const distance = geoDistance(poste.coordinates, center);
      if (distance > Math.PI / 2 - .02) continue;
      // Vers le bord du globe, l'épingle rapetisse comme la surface qu'elle marque
      foreshorten = Math.max(.35, Math.sqrt(Math.cos(distance)));
    }
    const point = projection(poste.coordinates);
    if (!point || !point.every(Number.isFinite)) continue;
    const sprite = pinSprite(poste.style);
    let grow = easeBackOut.overshoot(2.2)(local) * foreshorten * size;
    const fall = (1 - easeCubicInOut(local)) * 16 * size;
    const [x, y] = point;
    if (poste === selected) grow *= 1.3;

    target.globalAlpha = Math.min(1, local * 2.5);
    const shadow = foreshorten * size;
    target.drawImage(shadowSprite, x - 4 * shadow, y - 1.5 * shadow, 8 * shadow, 3 * shadow);
    if (grow > 0) target.drawImage(sprite.image,
      x - sprite.anchorX * grow, y - fall - sprite.anchorY * grow,
      sprite.width * grow, sprite.height * grow);
    hits.push({ poste, x, tip: y - fall, height: sprite.height * grow });
  }
  target.restore();
}

/** Épingles visibles à l'écran : celles du globe dès qu'il domine l'image, sinon celles de la carte plane. */
function visibleHits() {
  return smoothstep(.55, .70, wrapT) >= .5 ? pinHits.globe : pinHits.flat;
}

const TYPE_LABEL = {
  "ambassade": "Ambassade",
  "consulat": "Consulat général",
  "ambassade+consulat": "Ambassade et consulat général"
};

function selectPoste(poste) {
  selected = poste;
  if (poste) {
    label.querySelector(".label-name").textContent = poste.name;
    label.querySelector(".label-meta").textContent =
      `${TYPE_LABEL[poste.type]}${poste.country && poste.country !== poste.name ? ` · ${poste.country}` : ""}`;
  }
  draw();
}

/** Place l'étiquette au-dessus de l'épingle choisie ; la masque si l'épingle n'est pas visible (face cachée du globe). */
function placeLabel() {
  const hit = selected && pinsT >= 1 && visibleHits().find(h => h.poste === selected);
  label.hidden = !hit;
  if (!hit) return;
  const margin = 12, half = label.offsetWidth / 2;
  const x = Math.max(margin + half, Math.min(canvas.clientWidth - margin - half, hit.x));
  label.style.transform = `translate(${x}px, ${hit.tip - hit.height - 8}px) translate(-50%, -100%)`;
  label.style.setProperty("--arrow", `${hit.x - x}px`);
}

/** Épingle sous le pointeur : la plus proche de la tête, avec une marge plus large au doigt. */
function pinAt(clientX, clientY, pointerType) {
  const rect = canvas.getBoundingClientRect();
  const px = clientX - rect.left, py = clientY - rect.top;
  const reach = pointerType === "touch" ? 22 : 12;
  let best = null, bestDistance = Infinity;
  for (const hit of visibleHits()) {
    const distance = Math.hypot(px - hit.x, py - (hit.tip - hit.height * .6));
    if (distance < Math.max(reach, hit.height * .6) && distance < bestDistance) {
      best = hit.poste;
      bestDistance = distance;
    }
  }
  return best;
}

function animatePins(target) {
  cancelAnimationFrame(pinsFrame);
  const start = pinsT;
  const begin = performance.now();
  const duration = reducedMotion.matches ? 0 : PIN_DURATION * Math.abs(target - start) * (target ? 1 : .6);
  const frame = now => {
    const progress = duration ? Math.min(1, (now - begin) / duration) : 1;
    pinsT = start + (target - start) * progress;
    draw();
    if (progress < 1) pinsFrame = requestAnimationFrame(frame);
  };
  pinsFrame = requestAnimationFrame(frame);
}

function clearBuffer(target) {
  target.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
}

function draw() {
  if (!land) return;
  const flatOutline = 1 - smoothstep(0, .22, wrapT);
  const globeReveal = smoothstep(.55, .70, wrapT);
  const globeOutline = globeReveal;
  const flatPaper = 1 - smoothstep(.04, .3, wrapT);

  // Never apply a spherical clip to the interpolated raw projection: Chrome
  // and Firefox disagree on that invalid intermediate geometry. Instead,
  // crossfade two complete frames, opaque inside the same outline, only after
  // their front hemispheres are pixel-aligned. The dissolve then removes the
  // rear hemisphere instead of blending two visibly different maps.
  // Skip the buffer that is fully hidden (the flat map once the globe has
  // arrived, the globe while the map is still flat).
  const flatVisible = globeReveal < 1;
  if (flatVisible) {
    clearBuffer(flatContext);
    drawLayer(flatContext, currentProjection(), 1, flatOutline, flatPaper);
  }
  if (globeReveal > 0) {
    clearBuffer(globeContext);
    drawLayer(globeContext, globeProjection(), 1, globeOutline);
  }

  context.save();
  context.setTransform(1, 0, 0, 1, 0, 0);
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.globalAlpha = 1;
  if (flatVisible) context.drawImage(flatBuffer, 0, 0);
  if (globeReveal > 0) {
    context.globalAlpha = globeReveal;
    context.drawImage(globeBuffer, 0, 0);
  }
  context.restore();
  placeLabel();
}

// Pointer and wheel events can fire several times per displayed frame:
// coalesce them into a single redraw.
let drawPending = false;
function requestDraw() {
  if (drawPending) return;
  drawPending = true;
  requestAnimationFrame(() => {
    drawPending = false;
    draw();
  });
}

function stopInertia() {
  cancelAnimationFrame(inertiaFrame);
  inertiaFrame = undefined;
}

function startInertia() {
  stopInertia();
  if (reducedMotion.matches || Math.hypot(...angularVelocity) < .005) return;
  let previous = performance.now();
  const tick = now => {
    const elapsed = Math.min(32, now - previous);
    previous = now;
    rotation[0] += angularVelocity[0] * elapsed;
    rotation[1] += angularVelocity[1] * elapsed;
    const damping = Math.exp(-.0048 * elapsed);
    angularVelocity[0] *= damping;
    angularVelocity[1] *= damping;
    draw();
    if (globe && Math.hypot(...angularVelocity) > .001)
      inertiaFrame = requestAnimationFrame(tick);
  };
  inertiaFrame = requestAnimationFrame(tick);
}

function animateWrap(target) {
  cancelAnimationFrame(transitionFrame);
  stopInertia();
  const startWrap = wrapT;
  const startCenter = centerT;
  const begin = performance.now();
  const duration = reducedMotion.matches ? 0 : 1650;

  const frame = now => {
    const progress = duration ? Math.min(1, (now - begin) / duration) : 1;
    if (target === 1) {
      // Recenter first, then continuously bend the full map into a globe.
      centerT = startCenter + (1 - startCenter) * easeCubicInOut(Math.min(1, progress / .2));
      const fold = Math.max(0, (progress - .12) / .88);
      wrapT = startWrap + (1 - startWrap) * easeCubicInOut(fold);
    } else {
      // Reveal the rear hemisphere while flattening, then restore the resting
      // offset after the map is fully unfolded.
      wrapT = startWrap * (1 - easeCubicInOut(Math.min(1, progress / .9)));
      const settle = Math.max(0, (progress - .84) / .16);
      centerT = startCenter * (1 - easeCubicInOut(settle));
    }
    draw();
    if (progress < 1) transitionFrame = requestAnimationFrame(frame);
  };
  transitionFrame = requestAnimationFrame(frame);
}

slider.addEventListener("input", () => {
  flatT = Number(slider.value) / 100;
  value.value = `${slider.value} %`;
  if (globe) {
    globe = false;
    stage.classList.remove("globe");
    wrapButton.setAttribute("aria-pressed", "false");
    wrapButton.querySelector(".button-label").textContent = "enrouler le globe";
    animateWrap(0);
  } else draw();
});

wrapButton.addEventListener("click", () => {
  globe = !globe;
  stage.classList.toggle("globe", globe);
  wrapButton.setAttribute("aria-pressed", String(globe));
  wrapButton.querySelector(".button-label").textContent = globe ? "dérouler la carte" : "enrouler le globe";
  animateWrap(globe ? 1 : 0);
});

postesButton.addEventListener("click", () => {
  showPostes = !showPostes;
  postesButton.setAttribute("aria-pressed", String(showPostes));
  postesButton.querySelector(".button-label").textContent = showPostes ? "cacher les postes" : "afficher les postes";
  legend.hidden = !showPostes;
  if (!showPostes) selected = null;
  animatePins(showPostes ? 1 : 0);
});

canvas.addEventListener("pointerdown", event => {
  // Un clic (sans glisser) affiche le nom du poste touché, ou referme l'étiquette ouverte
  tapStart = { x: event.clientX, y: event.clientY, time: performance.now() };
  if (!globe) return;
  stopInertia();
  dragging = true;
  lastPointer = [event.clientX, event.clientY];
  lastPointerTime = performance.now();
  angularVelocity = [0, 0];
  canvas.setPointerCapture(event.pointerId);
});

canvas.addEventListener("pointermove", event => {
  if (!dragging || !globe) return;
  const next = [event.clientX, event.clientY];
  const now = performance.now();
  const elapsed = Math.max(8, now - lastPointerTime);
  const delta = [(next[0] - lastPointer[0]) * .34, -(next[1] - lastPointer[1]) * .34];
  rotation[0] += delta[0];
  rotation[1] += delta[1];
  angularVelocity = [delta[0] / elapsed, delta[1] / elapsed];
  lastPointer = next;
  lastPointerTime = now;
  requestDraw();
});

function releaseGlobe() {
  if (!dragging) return;
  dragging = false;
  startInertia();
}
canvas.addEventListener("pointerup", event => {
  releaseGlobe();
  const tap = tapStart;
  tapStart = undefined;
  if (!tap || !showPostes || pinsT < 1) return;
  if (Math.hypot(event.clientX - tap.x, event.clientY - tap.y) > 6 || performance.now() - tap.time > 600) return;
  angularVelocity = [0, 0];
  stopInertia();
  // Recliquer l'épingle déjà ouverte referme son étiquette
  const poste = pinAt(event.clientX, event.clientY, event.pointerType);
  selectPoste(poste === selected ? null : poste);
});
canvas.addEventListener("pointermove", event => {
  // Curseur main au-dessus d'une épingle (souris)
  if (dragging || event.pointerType !== "mouse" || !showPostes) return;
  canvas.classList.toggle("over-pin", Boolean(pinAt(event.clientX, event.clientY, "mouse")));
});
canvas.addEventListener("pointercancel", releaseGlobe);

canvas.addEventListener("wheel", event => {
  if (!globe) return;
  event.preventDefault();
  zoom = Math.max(.65, Math.min(1.4, zoom * Math.exp(-event.deltaY * .001)));
  requestDraw();
}, { passive: false });

fetch("assets/world-lowres.json")
  .then(response => {
    if (!response.ok) throw new Error("world data unavailable");
    return response.json();
  })
  .then(world => {
    land = feature(world, world.objects.countries);
    resize();
  })
  .catch(() => document.querySelector(".message").textContent = "carte indisponible");

// Postes du réseau diplomatique et consulaire (généré au build depuis dataSource/)
fetch("assets/postes.json")
  .then(response => {
    if (!response.ok) throw new Error("postes unavailable");
    return response.json();
  })
  .then(list => {
    const west = Math.min(...list.map(p => p.coordinates[0]));
    const east = Math.max(...list.map(p => p.coordinates[0]));
    postes = list
      .map(p => ({
        ...p,
        style: p.type === "consulat" ? "consulat" : "ambassade",
        delay: (p.coordinates[0] - west) / (east - west || 1)
      }))
      // Consulats sous les ambassades, et du nord au sud pour que les épingles du bas recouvrent celles du haut
      .sort((a, b) => (a.style === b.style ? 0 : a.style === "consulat" ? -1 : 1) || b.coordinates[1] - a.coordinates[1]);
    const embassies = list.filter(p => p.type !== "consulat").length;
    const consulates = list.filter(p => p.type !== "ambassade").length;
    document.querySelector("#countAmbassade").textContent = embassies;
    document.querySelector("#countConsulat").textContent = consulates;
    postesButton.disabled = false;
  })
  .catch(() => postesButton.remove());

new ResizeObserver(resize).observe(stage);
startSky(document.querySelector("#sky"));
