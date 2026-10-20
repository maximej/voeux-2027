/**
 * Keyboard and touch, translated into game input.
 *
 * Keyboard: ← → move (held: NES auto-repeat), ↓ soft drop, ↑ or X rotate clockwise,
 *           Z rotate counterclockwise, P pause.
 * Touch / mouse on the board: drag sideways to move one column per cell dragged, drag down to
 *           drop one row per cell dragged, tap to rotate clockwise.
 * Any input first starts the game (`onStart`, which returns true when it did).
 */

const KEYS = {
  ArrowLeft: 'left',
  ArrowRight: 'right',
  ArrowDown: 'down',
};
const ROTATE = { ArrowUp: 'cw', KeyX: 'cw', KeyZ: 'ccw', KeyW: 'ccw' };

export function attachInput(game, board, { cellSize, onStart, onPause }) {
  addEventListener('keydown', e => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.code === 'KeyP') return onPause();
    const key = KEYS[e.key], rotate = ROTATE[e.code] || ROTATE[e.key];
    if (!key && !rotate) return;
    e.preventDefault();
    if (onStart() || e.repeat) return; // the key that starts the game does nothing else; auto-repeat is the game's own (DAS)
    if (key) game.press(key);
    else game.act(rotate);
  });
  addEventListener('keyup', e => {
    const key = KEYS[e.key];
    if (key) game.release(key);
  });
  addEventListener('blur', () => ['left', 'right', 'down'].forEach(k => game.release(k)));

  let drag = null;
  board.addEventListener('pointerdown', e => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.preventDefault();
    board.setPointerCapture(e.pointerId);
    const starting = onStart(); // the tap that starts the game does not also rotate
    drag = { x: e.clientX, y: e.clientY, startX: e.clientX, startY: e.clientY, time: performance.now(), moved: starting };
  });
  board.addEventListener('pointermove', e => {
    if (!drag || !board.hasPointerCapture(e.pointerId)) return;
    const step = cellSize();
    while (e.clientX - drag.x >= step) (drag.x += step), game.act('right'), (drag.moved = true);
    while (drag.x - e.clientX >= step) (drag.x -= step), game.act('left'), (drag.moved = true);
    while (e.clientY - drag.y >= step) (drag.y += step), game.act('down'), (drag.moved = true);
    if (e.clientY < drag.y) drag.y = e.clientY; // moving back up does nothing
  });
  const end = e => {
    if (!drag) return;
    const still = Math.hypot(e.clientX - drag.startX, e.clientY - drag.startY) < 12;
    if (!drag.moved && still && performance.now() - drag.time < 350) game.act('cw');
    drag = null;
  };
  board.addEventListener('pointerup', end);
  board.addEventListener('pointercancel', () => (drag = null));
  board.addEventListener('contextmenu', e => e.preventDefault());
}
