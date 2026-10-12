/**
 * Turning the globe over from the computer (and by tapping, on any device).
 *
 *   ↑ or ↓            turn the globe over
 *   ← or →            shake it sideways
 *   click / tap       on the globe, outside the buildings: turn it over
 *                     (a building opens its picker instead, see Scene.js)
 *
 * Nothing happens while the building picker is open.
 */

export function attachControls(stage, motion) {
  const pickerOpen = () => document.querySelector('dialog[open]');

  addEventListener('keydown', e => {
    if (e.repeat || e.metaKey || e.ctrlKey || e.altKey || pickerOpen()) return;
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') motion.flip();
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') motion.wobble(e.key === 'ArrowLeft' ? -1 : 1);
    else return;
    e.preventDefault();
  });

  stage.addEventListener('click', e => {
    if (e.target.closest('.building') || pickerOpen()) return;
    motion.flip();
  });
}
