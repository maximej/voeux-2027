import { DotToDot } from './dotdot.js';
import { startNeonBackground } from './neon-bg.js';

const COLORS = ['#1de3ff', '#ff2fbc'];
const DEFAULT_MESSAGE = 'Bonne année 2027 !';

const params = new URLSearchParams(location.search);
const name = /^[\w-]+$/.test(params.get('d') || '') ? params.get('d') : '2027';
const $message = document.querySelector('#message');
let message = params.get('msg') || '';

function show(text, isError = false) {
  $message.textContent = text;
  $message.classList.toggle('error', isError);
  $message.hidden = false;
}

// Vibration du téléphone (Android ; non prise en charge par Safari sur iPhone)
const vibrate = pattern => navigator.vibrate?.(pattern);

startNeonBackground(document.querySelector('#neon'), { colors: COLORS });

const game = new DotToDot(document.querySelector('#board'), {
  dots: Number(params.get('n')) || 50,
  fontSize: 13,
  glow: 3,
  lineColors: COLORS,
  onConnect: (i, auto) => auto || vibrate(20),
  onMiss: () => vibrate([30, 50, 30]),
  onComplete: () => {
    vibrate([40, 60, 40, 60, 160]);
    setTimeout(() => show(message || DEFAULT_MESSAGE), 1300);
  },
});

try {
  const list = await fetch('drawings/index.json').then(r => r.json()).catch(() => []);
  const entry = list.find(e => e.file === `${name}.svg`);
  // Écran en hauteur (téléphone) : variante « portrait » du dessin si elle existe
  const file = (innerHeight > innerWidth && entry?.portrait) || `${name}.svg`;
  const res = await fetch(`drawings/${file}`);
  if (!res.ok) throw new Error(`Dessin « ${name} » introuvable.`);
  const meta = game.load(await res.text());
  message ||= entry?.message || meta.message;
} catch (err) {
  show(err.message, true);
}
