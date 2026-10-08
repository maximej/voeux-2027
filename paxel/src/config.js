/**
 * Central configuration: every value worth tuning lives here.
 */

export const CONFIG = {
  image: 'assets/paix.webp', // 1254 × 1254, WebP quality 90 from drawings/Paix2.png (372 KB instead of 2 MB)

  // Covering layer: dark tiles, one per cell, separated by a fine gap
  surface: {
    colors: ['#171b45', '#1b2050', '#141840', '#1e2457'], // picked per cell, so the tiles vary slightly
    gap: '#0b0d26', // line between tiles (about 1 CSS px)
    slot: '#000000', // what shows behind a cell while it flips
  },

  // The surface is a grid of square cells ("pixels") laid over the image, independent of the screen
  grid: {
    columns: 66, // 1254 / 66 = 19 image px per cell
  },

  brush: {
    radius: 0.045, // fraction of the image's shorter displayed side, so it scales with the image
    minRadius: 14, // CSS px floor: a finger always removes a visible amount on small screens
    spacing: 0.25, // distance between brush stamps along a stroke, as a fraction of the radius
  },

  reveal: {
    flipMs: 260, // a cell turning over, from the surface to its part of the image
    lift: 0.25, // how much a cell grows halfway through the flip
    ripple: 90, // ms: cells at the edge of the brush flip this much later than at its centre
  },

  // Before the first scratch, a glint sweeps across the tiles to invite touching them
  invite: {
    delay: 700, // ms after loading
    every: 5000, // ms between sweeps
    duration: 1100, // ms for one sweep
    strength: 0.16, // highlight opacity at the crest
  },

  completion: {
    threshold: 0.9, // share of the surface revealed by scratching before the rest flips by itself
    duration: 1400, // ms for the wave of remaining cells to spread across the image
    jitter: 120, // ms of random delay per cell, so the wave looks organic
  },

  progress: {
    blocks: 20, // pixel blocks in the progress bar
  },

  layout: {
    maxDpr: 2, // canvas density cap: the tiles stay sharp, phones save memory
  },
};
