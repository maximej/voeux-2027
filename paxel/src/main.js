/**
 * PAXEL: from chaos to order. Each tap lifts more pixels of the chaotic image, until it trembles;
 * shaking the phone (or tapping on) sifts the rest like sand, and the image of order appears.
 */

import { CONFIG } from './config.js';
import { loadImage } from './image/ImageLoader.js';
import { Sieve } from './sieve/Sieve.js';
import { ShakeSensor } from './input/ShakeSensor.js';
import { Interface } from './ui/Interface.js';

const stage = document.querySelector('#stage');
const surface = document.querySelector('#surface');
const effects = document.querySelector('#effects');
const params = new URLSearchParams(location.search);
const ui = new Interface(CONFIG.progress, params.get('msg') || CONFIG.message);

// Vibration (Android; iPhone Safari does not support it)
const vibrate = pattern => navigator.vibrate?.(pattern);

let top, under;
try {
  [top, under] = await Promise.all([loadImage(CONFIG.images.top), loadImage(CONFIG.images.under)]);
} catch (err) {
  ui.failed();
  throw err;
}
under.className = 'under';
under.alt = '';
under.draggable = false;
stage.prepend(under);
stage.style.setProperty('--aspect', top.naturalWidth / top.naturalHeight);

const sensor = new ShakeSensor(CONFIG.shake, intensity => {
  if (sieve.sift(intensity)) vibrate(CONFIG.vibration.sift);
});
let canShake = ShakeSensor.available && !ShakeSensor.needsPermission;
if (canShake) sensor.start();

const sieve = new Sieve(surface, effects, top, CONFIG, {
  progress: s => ui.update(s, canShake),
  complete: () => {
    vibrate(CONFIG.vibration.complete);
    ui.revealed();
  },
});

/** A tap on the image; the first one also asks for the motion sensors on iPhone. */
function tap(x, y) {
  if (ShakeSensor.available && ShakeSensor.needsPermission && !sensor.asked) {
    sensor.asked = true;
    sensor.enable().then(granted => {
      canShake = granted;
      ui.update(sieve, canShake);
    });
  }
  if (sieve.tap(x, y)) vibrate(CONFIG.vibration.tap);
}

// A click is a tap (and on iPhone, a click is what may ask for the motion permission)
stage.addEventListener('click', e => {
  if (sieve.done) return;
  const rect = surface.getBoundingClientRect();
  tap(e.clientX - rect.left, e.clientY - rect.top);
});
// Keyboard: Enter or Space taps a random pixel still in place
stage.addEventListener('keydown', e => {
  if ((e.key !== 'Enter' && e.key !== ' ') || sieve.done) return;
  e.preventDefault();
  const left = [...sieve.alive.keys()].filter(i => sieve.alive[i]);
  const i = left[Math.floor(Math.random() * left.length)];
  tap(((i % sieve.columns) + 0.5) * (sieve.width / sieve.columns), (Math.floor(i / sieve.columns) + 0.5) * (sieve.height / sieve.rows));
});

document.querySelector('#restart').addEventListener('click', () => {
  ui.reset();
  sieve.reset();
});

// iOS Safari: pinch zoom on the image (touch-action alone does not always prevent it)
stage.addEventListener('gesturestart', e => e.preventDefault());

new ResizeObserver(([entry]) => {
  const { width, height } = entry.contentRect;
  sieve.resize(width, height, Math.min(CONFIG.layout.maxDpr, devicePixelRatio || 1));
  ui.ready(); // the image underneath is never shown before the surface covers it
}).observe(stage);
