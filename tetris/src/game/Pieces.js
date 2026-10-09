/**
 * The 7 pieces with the NES rotation system: cells relative to a fixed pivot, no wall kicks.
 * x to the right, y down. State 0 is the spawn orientation.
 * T, J and L have 4 states (quarter turns around the pivot); S, Z and I alternate between
 * 2 states, O has 1, as on the NES.
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

/** Cells of a piece { kind, rot, x, y } on the board. */
export function cellsOf({ kind, rot, x, y }) {
  return PIECES[kind][rot].map(([dx, dy]) => [x + dx, y + dy]);
}

export function rotated(piece, direction) {
  const n = PIECES[piece.kind].length;
  return { ...piece, rot: (piece.rot + direction + n) % n };
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
