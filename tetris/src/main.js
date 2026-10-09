/**
 * Block game with the PAIX level: clear the PAIX letters by completing lines.
 */

import { CONFIG } from './config.js';
import { Game } from './game/Game.js';
import { Renderer } from './render/Renderer.js';
import { attachInput } from './input/Input.js';
import { Interface } from './ui/Interface.js';

const frame = document.querySelector('.frame');
const stage = document.querySelector('#stage');
const boardCanvas = document.querySelector('#board');
const nextCanvas = document.querySelector('#next');

const level = await fetch(CONFIG.level).then(r => r.json());
const params = new URLSearchParams(location.search);
const vibrate = pattern => navigator.vibrate?.(pattern);

const ui = new Interface(params.get('msg') || CONFIG.message, level.rows.join('').replace(/\./g, '').length);
const game = new Game(CONFIG, level, {
  change: g => ui.update(g),
  clear: () => vibrate(CONFIG.vibration.clear),
  win: () => {
    vibrate(CONFIG.vibration.win);
    ui.won();
  },
  lose: () => {
    vibrate(CONFIG.vibration.lose);
    ui.show('lost');
  },
});
const renderer = new Renderer(boardCanvas, nextCanvas, CONFIG, level.colors);

stage.style.setProperty('--columns', level.width);
stage.style.setProperty('--rows', CONFIG.rows);
new ResizeObserver(([entry]) => {
  const { width, height } = entry.contentRect;
  renderer.resize(width, height, Math.min(CONFIG.layout.maxDpr, devicePixelRatio || 1), level.width, CONFIG.rows);
  renderer.nextDrawn = undefined;
  renderer.draw(game, performance.now());
  document.body.classList.remove('is-loading');
}).observe(stage);

// --- Loop: fixed NES frame rate, whatever the screen's refresh rate --------------------------

let paused = false;
let last = 0, lag = 0;
const FRAME = 1000 / CONFIG.fps;

function loop(now) {
  requestAnimationFrame(loop);
  lag = Math.min(lag + (now - (last || now)), FRAME * 5); // after a stall, do not race to catch up
  last = now;
  if (!paused) {
    while (lag >= FRAME) {
      game.step();
      lag -= FRAME;
    }
  } else lag = 0;
  renderer.draw(game, now);
}
requestAnimationFrame(loop);

function start() {
  if (game.state !== 'ready') return false;
  game.start();
  ui.show('playing');
  return true;
}

function setPaused(value) {
  if (!['playing', 'clearing', 'entry'].includes(game.state) || paused === value) return;
  paused = value;
  ui.show(paused ? 'paused' : 'playing');
}

attachInput(game, boardCanvas, {
  cellSize: () => boardCanvas.getBoundingClientRect().width / level.width,
  onStart: () => {
    if (paused) setPaused(false);
    return start();
  },
  onPause: () => setPaused(!paused),
});
document.addEventListener('visibilitychange', () => document.hidden && setPaused(true));

document.querySelector('#replay').addEventListener('click', () => {
  paused = false;
  game.reset();
  ui.show('ready');
});

ui.update(game);
ui.show('ready');
