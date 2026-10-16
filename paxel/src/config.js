/**
 * Central configuration: every value worth tuning lives here.
 */

export const CONFIG = {
  images: {
    top: 'assets/chaos.webp', // 1200 × 1200, from IMG/ref/Paxel2/cahos.jpg: the chaos, cut into pixels
    under: 'assets/ordre.webp', // 1200 × 1200, from IMG/ref/Paxel2/ordre.jpg: the order, revealed underneath
  },

  grid: {
    columns: 100, // the top image is a grid of square pixels: 100 × 100 = 10 000 (12 image px each)
    line: 'rgb(8 8 20 / 0.1)', // faint lines between the pixels, so the grid shows
  },

  // Each tap lifts a cluster of pixels around it, more and more: `first` at the first tap, then
  // a constant growth chosen so that the last tap (`taps`) takes every pixel left
  taps: {
    count: 10,
    first: 10,
    jitter: 0.35, // irregular cluster outline: noise on the distance to the tapped pixel
  },

  // A lifted pixel floats away like a feather: it rises slowly, sways, gets smaller and fainter
  lift: {
    duration: 1700, // ms for one pixel (± 15 %)
    ripple: 700, // ms: the pixels peel off over this time, the cluster's centre first (with some randomness)
    rise: [3, 8], // in pixels (cells), random per pixel
    drift: 1.5, // sideways, in cells
    sway: 0.8, // sideways swaying, in cells
    shrink: 0.45, // the pixel is this much smaller when it vanishes
    glow: '#f9f99a', // lantern yellow halo (Monument Valley palette)
    halo: 0.3, // halo opacity: a soft glow, not a flash
    flash: 0.12, // the pixel faintly lit when it leaves
    halos: 500, // at most this many halos per cluster (larger ones, spread out), so phones keep up
    // The last tap: every pixel left floats away, higher and longer, from the tapped one outwards
    final: { duration: 2600, ripple: 2000, rise: [10, 26], drift: 3 },
  },

  // From the `from`-th tap on, the image trembles more and more; on a phone, shaking it then
  // sifts the pixels like sand: they shrink into grains and fall through (the last tap, though,
  // sends them flying, see lift.final)
  tremble: {
    from: 5,
    amplitude: 0.9, // CSS px per tap past `from - 1`
    max: 4.5, // CSS px
  },
  sift: {
    perShake: [0.06, 0.22], // share of all the pixels sifted by one shake, gentle → strong
    duration: 1300, // ms for a grain to fall
    delay: 450, // ms of random delay per grain, so they pour rather than drop at once
    gravity: 2.4, // in stage heights per second²
    grain: 0.6, // size of a grain, in cells
  },
  shake: { threshold: 9, strong: 22, interval: 200 }, // m/s², see ShakeSensor

  // Once every pixel is gone, the image of order glows, its brightness slowly oscillating (CSS)
  message: 'Bonne année 2027 !', // ?msg=… in the URL replaces it, as on the greeting card

  // Android only (iPhone Safari does not vibrate)
  vibration: {
    tap: 15,
    sift: 12,
    complete: [40, 60, 40, 60, 160], // same pattern as the other games
  },

  progress: {
    blocks: 10, // one block per tap
  },

  layout: {
    maxDpr: 2,
    overflow: 0.18, // the effects layer goes beyond the image by this share of its size, for the falling sand
  },
};
