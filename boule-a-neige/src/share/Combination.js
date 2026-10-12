/**
 * A combination: the building index (0–9) of each of the 5 places, never twice the same.
 * In the URL it is written as 5 digits, places 1 to 5 in order: ?b=27049
 */

/** Combination from its URL form, or null if invalid (wrong length, unknown digit, repeat). */
export function parse(text, buildings, places) {
  if (!new RegExp(`^\\d{${places}}$`).test(text || '')) return null;
  const combination = [...text].map(Number);
  const valid = combination.every(i => i < buildings) && new Set(combination).size === places;
  return valid ? combination : null;
}

export const format = combination => combination.join('');

/** Random combination without repeats. */
export function random(buildings, places, rand = Math.random) {
  const pool = Array.from({ length: buildings }, (_, i) => i);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, places);
}

/**
 * Puts `building` at `place`. If it was already elsewhere, the two places swap their buildings,
 * so the combination never contains a repeat.
 */
export function choose(combination, place, building) {
  const next = [...combination];
  const other = next.indexOf(building);
  if (other !== -1) next[other] = next[place];
  next[place] = building;
  return next;
}
