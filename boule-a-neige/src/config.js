/**
 * Central configuration: every value worth tuning lives here.
 * Scene coordinates are in the scene's SVG units (viewBox 0 0 400 480).
 */

export const CONFIG = {
  buildings: 'assets/buildings.json',
  drawings: 'assets/buildings', // one SVG per building: <id>.svg, 200 × 300, foot centered at the bottom

  // Glass sphere
  sphere: { cx: 200, cy: 200, r: 170 },
  groundY: 292, // top of the snowy ground inside the sphere

  // The 5 fixed places, numbered as in the roadmap (and in the URL): bottom center of the building,
  // its width (building box: 200 × 300, foot centered at the bottom) and its row. The back row
  // (1, 4, 5) is larger and stands higher in the scene; the front row (2, 3) is smaller and lower.
  // The back row is drawn first, so the front row passes in front of it.
  slots: [
    { x: 108, y: 262, width: 96, row: 'back' }, // 1, back left
    { x: 145, y: 306, width: 74, row: 'front' }, // 2, front left
    { x: 255, y: 306, width: 74, row: 'front' }, // 3, front right
    { x: 200, y: 268, width: 96, row: 'back' }, // 4, back center
    { x: 292, y: 270, width: 96, row: 'back' }, // 5, back right
  ],

  defaultCombination: [0, 1, 2, 3, 4], // building index for places 1 to 5

  // Flat colors of the globe
  colors: {
    sky: '#1d3557',
    skyBand: '#24406a',
    ground: '#eef3f8',
    groundShade: '#d6e2ee',
    glass: '#ffffff',
    base: '#2b2b35',
    baseTop: '#3a3a47',
    plaque: '#ff8a1f',
    plaqueText: '#fffaf4',
  },

  message: 'Bonne Année 2027', // on the base; ?msg=… replaces it

  // Sharing (the link itself carries the globe: ?b=…)
  share: {
    title: 'Boule à neige · Bonne Année 2027',
    text: 'Voici ma boule à neige pour 2027 : retournez-la pour faire neiger !',
  },

  // Snow (scene units per second)
  snow: {
    count: 320,
    size: [0.9, 2.6], // flake radius
    stir: 170, // speed given by a full shake
    gravity: 70,
    drag: 1.6, // per second: the water slows the flakes down (falling speed ≈ gravity / drag)
    drift: 30, // sideways sway
    settle: { stay: 3, fade: 2 }, // seconds on the ground, then fading
    color: '#ffffff',
  },
  reducedMotion: { count: 140, stir: 70 }, // replaces the values above when the system asks for less motion

  // Arrival: the globe fades in (not with reduced motion)
  intro: { duration: 700 },

  // Moving the globe
  flip: { duration: 1100, scale: 0.82 }, // turned over and back (ms); smaller halfway, to stay on screen
  wobble: { duration: 520, angle: 7, strength: 0.45 }, // sideways shake: degrees, share of a full stir

  // Phone shakes (acceleration in m/s²; gravity is about 9.8)
  shake: {
    threshold: 9, // a light shake: the snow swirls, the globe sways
    strong: 22, // a strong shake turns the globe over
    interval: 250, // ms between two reactions
  },

  // Android only (iPhone Safari does not vibrate)
  vibration: { flip: 30, wobble: 15 },

  layout: { maxDpr: 2 },
};
