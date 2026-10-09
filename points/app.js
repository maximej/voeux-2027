import { DotToDot } from './dotdot.js';

const $ = s => document.querySelector(s);
const params = new URLSearchParams(location.search);
const DEFAULT_MESSAGE = 'Bonne année 2027 !';

const state = {
  list: [],        // entrées de drawings/index.json
  index: -1,       // -1 : SVG importé
  current: null,   // { title, message, svg }
  dots: Number(params.get('n')) || 50,
};

const game = new DotToDot($('#board'), {
  dots: state.dots,
  fontSize: 13,
  glow: 3,
  lineColors: ['#1de3ff', '#8b4dff', '#ff2fbc', '#ff7a1a', '#f4f749', '#70ff36'],
  onProgress(n, total) {
    $('#progress').textContent = `${n} / ${total}`;
    $('#undo').disabled = n === 0;
  },
  onConnect: (i, auto) => {
    state.solved = auto;
    if (!auto) navigator.vibrate?.(20);
  },
  onMiss: () => navigator.vibrate?.([30, 50, 30]),
  onComplete: () => {
    if (!state.solved) navigator.vibrate?.([40, 60, 40, 60, 160]);
    setTimeout(showDone, 1300);
  },
});

function showError(msg) {
  $('#error').textContent = msg;
  $('#error').hidden = false;
}

function showDone() {
  if (!game.done) return;
  const c = state.current;
  $('#done-title').textContent = c.title || '';
  $('#done-message').textContent = params.get('msg') || c.message || DEFAULT_MESSAGE;
  $('#next').hidden = state.index < 0 || state.list.length < 2;
  $('#done').hidden = false;
}

function play(drawing) {
  state.current = drawing;
  $('#done').hidden = true;
  $('#error').hidden = true;
  try {
    const meta = game.load(drawing.svg);
    drawing.title ||= meta.title;
    drawing.message ||= meta.message;
  } catch (err) {
    showError(err.message);
  }
  document.querySelectorAll('#gallery button').forEach((b, i) => b.classList.toggle('active', i === state.index));
}

async function openEntry(i) {
  const entry = state.list[i];
  try {
    if (!entry.svg) {
      const res = await fetch(`drawings/${entry.file}`);
      if (!res.ok) throw new Error(`${entry.file} introuvable (${res.status})`);
      entry.svg = await res.text();
    }
  } catch (err) {
    return showError(`Impossible de charger le dessin : ${err.message}`);
  }
  state.index = i;
  play(entry);
  params.set('d', entry.file.replace(/\.svg$/i, ''));
  history.replaceState(null, '', `?${params}`);
}

async function importFile(file) {
  if (!file || !/svg/i.test(file.type || file.name)) return showError('Choisissez un fichier .svg');
  state.index = -1;
  play({ title: file.name.replace(/\.svg$/i, ''), svg: await file.text() });
}

function setLevel(n) {
  state.dots = game.opts.dots = n;
  document.querySelectorAll('#level button').forEach(b => {
    b.setAttribute('aria-pressed', Number(b.dataset.dots) === n);
  });
  if (state.current) play(state.current);
}

// --- Commandes ---------------------------------------------------------------

$('#undo').onclick = () => game.undo();
$('#restart').onclick = () => { $('#done').hidden = true; game.reset(); };
$('#solve').onclick = () => game.solve();
$('#replay').onclick = () => { $('#done').hidden = true; game.reset(); };
$('#next').onclick = () => openEntry((state.index + 1) % state.list.length);
$('#file').onchange = e => { importFile(e.target.files[0]); e.target.value = ''; };
document.querySelectorAll('#level button').forEach(b => {
  b.onclick = () => setLevel(Number(b.dataset.dots));
});

document.addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); game.undo(); }
});
document.addEventListener('dragover', e => e.preventDefault());
document.addEventListener('drop', e => {
  e.preventDefault();
  importFile(e.dataTransfer.files[0]);
});

// --- Démarrage ---------------------------------------------------------------

setLevel(state.dots);
try {
  state.list = await fetch('drawings/index.json').then(r => r.json());
} catch {
  showError('Impossible de lire drawings/index.json : ouvrez la page via un serveur local (voir README).');
}
const gallery = $('#gallery');
state.list.forEach((entry, i) => {
  const b = document.createElement('button');
  b.type = 'button';
  b.textContent = entry.title || entry.file;
  b.onclick = () => openEntry(i);
  gallery.append(b);
});
if (state.list.length) {
  const wanted = state.list.findIndex(e => e.file.replace(/\.svg$/i, '') === params.get('d'));
  openEntry(Math.max(0, wanted));
}
