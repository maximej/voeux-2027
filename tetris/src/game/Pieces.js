/**
 * Two kinds of pieces, both described by their rotation states (cells relative to a pivot,
 * x to the right, y down; state 0 is the spawn orientation):
 *
 *   grey pieces   the 7 NES pieces with the NES rotation system (no wall kicks): T, J and L
 *                 have 4 states, S, Z and I alternate between 2, O has 1
 *   word parts    the pieces cut from the PAIX drawing (`parts` in the level), in their letter's
 *                 color, some with grey cells; they spawn in the orientation they have in the word
 *
 * A piece on the board: { kind, colors, states, rot, x, y }, `colors` giving each cell's color
 * in the order of the cells of every state.
 */

/** Quarter turn clockwise on screen (y down): right becomes down. */
const turn = cells => cells.map(([x, y]) => [-y, x]);
const fourStates = spawn => [spawn, turn(spawn), turn(turn(spawn)), turn(turn(turn(spawn)))];

export const PIECES = {
  T: fourStates([[-1, 0], [0, 0], [1, 0], [0, 1]]),
  J: fourStates([[-1, 0], [0, 0], [1, 0], [1, 1]]),
  Z: [[[-1, 0], [0, 0], [0, 1], [1, 1]], [[1, -1], [0, 0], [1, 0], [0, 1]]],
  O: [[[-1, 0], [0, 0], [-1, 1], [0, 1]]],
  S: [[[0, 0], [1, 0], [-1, 1], [0, 1]], [[0, -1], [0, 0], [1, 0], [1, 1]]],
  L: fourStates([[-1, 0], [0, 0], [1, 0], [-1, 1]]),
  I: [[[-2, 0], [-1, 0], [0, 0], [1, 0]], [[0, -2], [0, -1], [0, 0], [0, 1]]],
};

export const KINDS = Object.keys(PIECES); // NES order: T J Z O S L I

export const GREY = '*'; // board value of a grey piece's cell

/** Cells of a piece on the board. */
export function cellsOf({ states, rot, x, y }) {
  return states[rot].map(([dx, dy]) => [x + dx, y + dy]);
}

export function rotated(piece, direction) {
  const n = piece.states.length;
  return { ...piece, rot: (piece.rot + direction + n) % n };
}

export function greyPiece(kind) {
  return { kind, colors: PIECES[kind][0].map(() => GREY), states: PIECES[kind] };
}

/**
 * The word parts of a level: one per letter of `level.parts` (a grid the size of `level.rows`,
 * each letter naming a part). Each part knows its target cells, their colors (the letter of
 * `rows` under each cell, grey where `rows` is empty) and its rotation states around the cell
 * nearest its middle.
 */
export function wordParts(level) {
  const top = -level.rows.length; // rows counted from the bottom of the board: -5 … -1
  const parts = new Map();
  level.parts.forEach((line, r) => {
    [...line].forEach((id, c) => {
      if (id === '.') return;
      if (!parts.has(id)) parts.set(id, { id, colors: [], target: [] });
      const letter = level.rows[r][c];
      parts.get(id).colors.push(letter === '.' ? GREY : letter);
      parts.get(id).target.push([c, top + r]);
    });
  });
  return [...parts.values()].map(part => {
    const xs = part.target.map(([x]) => x), ys = part.target.map(([, y]) => y);
    const mx = (Math.min(...xs) + Math.max(...xs)) / 2, my = (Math.min(...ys) + Math.max(...ys)) / 2;
    const [px, py] = part.target.reduce((best, cell) =>
      Math.hypot(cell[0] - mx, cell[1] - my) < Math.hypot(best[0] - mx, best[1] - my) ? cell : best);
    return { ...part, kind: part.id, states: fourStates(part.target.map(([x, y]) => [x - px, y - py])) };
  });
}

/**
 * A random order of parts in which each part comes after every part with a cell lower in one of
 * its columns: that part has to be in place first (a piece cannot fall through it), and it is
 * what the upper part rests on.
 */
export function buildOrder(parts, random = Math.random) {
  const below = (a, b) => b.target.some(([bx, by]) => a.target.some(([ax, ay]) => ax === bx && by > ay));
  const left = [...parts], order = [];
  while (left.length) {
    const ready = left.filter(p => !left.some(q => q !== p && below(p, q)));
    const pick = (ready.length ? ready : left)[Math.floor(random() * (ready.length || left.length))];
    order.push(pick);
    left.splice(left.indexOf(pick), 1);
  }
  return order;
}

/**
 * NES randomizer: draw among 8 (7 pieces + "reroll"); on "reroll" or a repeat of the previous
 * piece, draw once more among the 7. Repeats stay possible but rarer.
 */
export function nextKind(previous, random = Math.random) {
  const first = Math.floor(random() * 8);
  if (first < 7 && KINDS[first] !== previous) return KINDS[first];
  return KINDS[Math.floor(random() * 7)];
}
