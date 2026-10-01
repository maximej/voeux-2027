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

startNeonBackground(document.querySelector('#neon'), { colors: COLORS });

const game = new DotToDot(document.querySelector('#board'), {
  dots: Number(params.get('n')) || 50,
  fontSize: 13,
  glow: 3,
  lineColors: COLORS,
  onComplete: () => setTimeout(() => show(message || DEFAULT_MESSAGE), 1300),
});

try {
  const [svg, list] = await Promise.all([
    fetch(`drawings/${name}.svg`).then(r => {
      if (!r.ok) throw new Error(`Dessin « ${name} » introuvable.`);
      return r.text();
    }),
    fetch('drawings/index.json').then(r => r.json()).catch(() => []),
  ]);
  const meta = game.load(svg);
  message ||= list.find(e => e.file === `${name}.svg`)?.message || meta.message;
} catch (err) {
  show(err.message, true);
}
