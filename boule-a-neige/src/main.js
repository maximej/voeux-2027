/**
 * Boule à neige: a snow globe with 5 buildings, to turn over so it snows.
 * Compose the globe (the combination is in the URL, ?b=27049, so it can be shared) and turn it
 * over to make it snow.
 */

import { CONFIG } from './config.js';
import { Scene } from './scene/Scene.js';
import { Picker } from './ui/Picker.js';
import * as Combination from './share/Combination.js';
import { Snow } from './snow/Snow.js';
import { Motion } from './scene/Motion.js';
import { attachControls } from './input/Controls.js';
import { ShakeSensor } from './input/ShakeSensor.js';
import { share } from './share/Share.js';

const params = new URLSearchParams(location.search);
const buildings = await fetch(CONFIG.buildings).then(r => r.json());
const drawings = await Promise.all(buildings.map(b => fetch(`${CONFIG.drawings}/${b.id}.svg`).then(r => r.text())));
const places = CONFIG.slots.length;

// Combination from the URL, or a random one (an invalid URL also gets a random one)
let combination = Combination.parse(params.get('b'), buildings.length, places) || Combination.random(buildings.length, places);

const picker = new Picker(document.querySelector('#picker'), buildings, (place, building) => {
  show(Combination.choose(combination, place, building));
  document.querySelector(`.building[data-place="${place + 1}"]`)?.focus(); // keyboard users keep their place
});
const scene = new Scene(document.querySelector('#stage'), CONFIG, buildings, drawings, place => picker.open(place, combination));
scene.setMessage(params.get('msg') || CONFIG.message);

/** Shows a combination and writes it in the URL (without reloading), so the address can be shared. */
// Snow, over the scene (taps go through to the buildings)
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const canvas = document.createElement('canvas');
canvas.className = 'snow';
document.querySelector('#stage').append(canvas);
const snow = new Snow(canvas, { ...CONFIG, snow: { ...CONFIG.snow, ...(reduced ? CONFIG.reducedMotion : {}) } });
new ResizeObserver(([entry]) => {
  const { width, height } = entry.contentRect;
  snow.resize(width, height, Math.min(CONFIG.layout.maxDpr, devicePixelRatio || 1));
}).observe(document.querySelector('#stage'));

// Turning the globe over stirs the snow
const vibrate = ms => navigator.vibrate?.(ms);
const motion = new Motion(document.querySelector('#stage'), CONFIG, strength => {
  snow.shake(strength);
  vibrate(strength >= 1 ? CONFIG.vibration.flip : CONFIG.vibration.wobble);
});
attachControls(document.querySelector('#stage'), motion);

// Phone: shaking it turns the globe over (strong shake) or sways it, the snow swirling more as the
// shake gets stronger. iPhone: a button asks the permission first. Without sensors, or if refused,
// tapping the globe still turns it over.
const hint = document.querySelector('#hint');
const HINTS = {
  touch: 'Touchez la boule pour la retourner · un bâtiment pour le changer',
  shake: 'Secouez le téléphone pour faire neiger · touchez un bâtiment pour le changer',
  computer: 'Cliquez la boule ou ↑ pour la retourner · cliquez un bâtiment pour le changer',
};
hint.textContent = matchMedia('(pointer: coarse)').matches ? HINTS.touch : HINTS.computer;

if (ShakeSensor.available) {
  const sensor = new ShakeSensor(CONFIG.shake, (intensity, direction, strong) => {
    if (strong) motion.flip() || motion.wobble(direction, 1);
    else motion.wobble(direction, 0.3 + 0.7 * intensity);
  });
  // Listen at once: where readings arrive without asking (Android), no button is needed. Where none
  // arrive and the browser asks for a permission (iPhone), the button appears.
  const confirm = () => setTimeout(() => sensor.receiving && (hint.textContent = HINTS.shake), 1000);
  sensor.start();
  confirm();
  setTimeout(() => {
    if (sensor.receiving || !ShakeSensor.needsPermission) return;
    const button = document.querySelector('#motion');
    button.hidden = false;
    button.addEventListener('click', async () => {
      button.hidden = true;
      if (await sensor.enable()) confirm();
    });
  }, 1000);
}

function show(next) {
  combination = next;
  scene.setCombination(combination);
  params.set('b', Combination.format(combination));
  history.replaceState(null, '', `?${params}`);
}

// Share the current address (it carries the combination and any ?msg=)
const shareButton = document.querySelector('#share');
shareButton.addEventListener('click', async () => {
  const result = await share({ ...CONFIG.share, url: location.href });
  if (result !== 'copied') return;
  shareButton.textContent = 'Lien copié';
  setTimeout(() => (shareButton.textContent = 'Partager'), 2000);
});

document.querySelector('#random').addEventListener('click', () => {
  // Never the same combination twice in a row
  let next;
  do next = Combination.random(buildings.length, places);
  while (Combination.format(next) === Combination.format(combination));
  show(next);
});

show(combination);

// Arrival: the globe fades in; it only snows once the globe is turned over
if (!reduced) {
  document.querySelector('#stage').animate(
    [{ opacity: 0, transform: 'scale(0.94)' }, { opacity: 1, transform: 'none' }],
    { duration: CONFIG.intro.duration, easing: 'cubic-bezier(0.2, 0.8, 0.3, 1)' },
  );
}
document.body.classList.remove('is-loading');
