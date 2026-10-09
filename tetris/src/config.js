/**
 * Central configuration: every value worth tuning lives here.
 * Timings are in frames at the NES rate (60.0988 frames per second).
 */

export const CONFIG = {
  level: 'levels/paix.json', // grid placed at the bottom of the board at the start
  rows: 20, // board height; the width is the level's (15 for PAIX)

  fps: 60.0988,
  startLevel: 3,
  linesPerLevel: 10,
  // NES gravity: frames per cell, by level (29 and above: 1)
  gravity: [48, 43, 38, 33, 28, 23, 18, 13, 8, 6, 5, 5, 5, 4, 4, 4, 3, 3, 3, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1],
  das: { initial: 16, repeat: 6 }, // keyboard auto-repeat (NES "DAS")
  softDrop: 2, // frames per cell while holding down
  entryDelay: 10, // frames before the next piece appears
  clearFrames: 20, // line clear animation
  scores: [0, 40, 100, 300, 1200], // × (level + 1), for 1 to 4 lines

  colors: {
    piece: '#fffaf4', // the player's pieces: white neon with an orange halo
    glow: '#ff8a1f',
    grid: '#16161c', // empty cells
  },

  // Shown once PAIX is cleared (?msg=… in the URL replaces it), as on the other games
  message: 'Bonne année 2027 !',

  // Android only (iPhone Safari does not vibrate)
  vibration: {
    clear: 25, // a line cleared
    win: [40, 60, 40, 60, 160], // same pattern as the other games
    lose: [90],
  },

  layout: {
    maxDpr: 2,
  },
};
