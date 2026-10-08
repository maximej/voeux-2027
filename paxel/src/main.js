/**
 * PAXEL: scratch the covering layer to discover the image underneath, cell by cell.
 */

import { CONFIG } from './config.js';
import { loadImage } from './image/ImageLoader.js';
import { ScratchEngine } from './scratch/ScratchEngine.js';
import { attachPointerInput } from './input/PointerInput.js';
import { Interface } from './ui/Interface.js';

const stage = document.querySelector('#stage');
const surface = document.querySelector('#surface');
const effects = document.querySelector('#effects');
const ui = new Interface(CONFIG.progress);

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

const engine = new ScratchEngine(surface, effects, image, CONFIG, {
  onProgress: ratio => ui.progress(ratio),
  onComplete: () => ui.complete(),
  onRevealed: () => ui.revealed(),
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
