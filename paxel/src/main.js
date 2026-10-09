/**
 * PAXEL: scratch the covering layer to discover the image underneath, cell by cell.
 */

import { CONFIG } from './config.js';
import { loadImage } from './image/ImageLoader.js';
import { ScratchEngine } from './scratch/ScratchEngine.js';
import { attachPointerInput } from './input/PointerInput.js';
import { Interface } from './ui/Interface.js';
import { EndVideo } from './ui/EndVideo.js';

const stage = document.querySelector('#stage');
const surface = document.querySelector('#surface');
const effects = document.querySelector('#effects');
const params = new URLSearchParams(location.search);
const ui = new Interface(CONFIG.progress, params.get('msg') || CONFIG.message);

// Vibration (Android; iPhone Safari does not support it)
const vibrate = pattern => navigator.vibrate?.(pattern);
let lastVibration = 0;

let image;
try {
  image = await loadImage(CONFIG.image);
} catch (err) {
  ui.failed();
  throw err;
}
image.className = 'hidden-image';
image.alt = '';
image.draggable = false;
stage.prepend(image);
stage.style.setProperty('--aspect', image.naturalWidth / image.naturalHeight);

const ending = new EndVideo(document.querySelector('#anim'), CONFIG.ending, () => ui.showRestart());

const engine = new ScratchEngine(surface, effects, image, CONFIG, {
  onProgress: ratio => {
    ui.progress(ratio);
    if (ratio > 0) ending.warm();
  },
  onScratch: () => {
    const now = performance.now();
    if (now - lastVibration < CONFIG.vibration.every) return;
    lastVibration = now;
    vibrate(CONFIG.vibration.scratch);
  },
  onComplete: () => {
    ui.complete();
    vibrate(CONFIG.vibration.complete);
  },
  onRevealed: () => {
    ui.revealed();
    ending.play();
  },
});

document.querySelector('#restart').addEventListener('click', () => {
  ending.reset();
  ui.reset();
  engine.reset();
});

// iOS Safari: pinch zoom on the image (touch-action alone does not always prevent it)
stage.addEventListener('gesturestart', e => e.preventDefault());

// The surface follows the stage's displayed size (window resize, orientation, browser zoom)
new ResizeObserver(([entry]) => {
  const { width, height } = entry.contentRect;
  engine.resize(width, height, Math.min(CONFIG.layout.maxDpr, devicePixelRatio || 1));
  ui.ready(); // the image is never shown before the surface covers it
}).observe(stage);

attachPointerInput(effects, {
  start: (id, x, y) => engine.start(id, x, y),
  move: (id, x, y) => engine.move(id, x, y),
  end: id => engine.end(id),
});

// Brush ring for the mouse: shows the brush size before and while scratching
effects.addEventListener('pointermove', e => {
  if (e.pointerType !== 'mouse') return;
  const rect = effects.getBoundingClientRect();
  ui.brush(e.clientX - rect.left, e.clientY - rect.top, engine.radius);
});
effects.addEventListener('pointerleave', () => ui.brush(null));
