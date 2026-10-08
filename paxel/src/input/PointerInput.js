/**
 * Unified mouse / touch / stylus input (Pointer Events), as positions in CSS px
 * relative to the element's top-left corner. One stroke per pointer.
 */

export function attachPointerInput(element, { start, move, end }) {
  let rect = null;
  const local = e => ({ x: e.clientX - rect.left, y: e.clientY - rect.top });

  element.addEventListener('pointerdown', e => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.preventDefault();
    element.setPointerCapture(e.pointerId);
    rect = element.getBoundingClientRect();
    const p = local(e);
    start(e.pointerId, p.x, p.y);
  });

  element.addEventListener('pointermove', e => {
    if (!element.hasPointerCapture(e.pointerId)) return;
    // Coalesced events: every position the pointer went through since the last frame
    const events = e.getCoalescedEvents?.() || [];
    for (const event of events.length ? events : [e]) {
      const p = local(event);
      move(e.pointerId, p.x, p.y);
    }
  });

  // Long press menu (mobile) and image callout
  element.addEventListener('contextmenu', e => e.preventDefault());

  const stop = e => end(e.pointerId);
  element.addEventListener('pointerup', stop);
  element.addEventListener('pointercancel', stop);
  element.addEventListener('lostpointercapture', stop);
}
