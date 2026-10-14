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
  // its width (building box: 200 × 300, foot centered at the bottom) and its depth level, 1 (far)
  // to 3 (near). The back row (1, 4, 5) is larger and stands higher; the front row (2, 3) is
  // smaller and lower. Levels are drawn far to near; each building has its own drift of snow at
  // its foot, in its level, so it stays planted whatever the parallax.
  slots: [
    { x: 108, y: 262, width: 96, level: 2 }, // 1, back left
    { x: 145, y: 306, width: 74, level: 3 }, // 2, front left
    { x: 255, y: 306, width: 74, level: 3 }, // 3, front right
    { x: 200, y: 268, width: 96, level: 1 }, // 4, back center
    { x: 292, y: 270, width: 96, level: 2 }, // 5, back right
  ],

  defaultCombination: [0, 1, 2, 3, 4], // building index for places 1 to 5

  // Flat colors of the globe
  colors: {
    sky: '#1d3557',
    skyBand: '#24406a',
    ground: '#eef3f8', // near snow, in front of everything
    groundShade: '#c7d4e3', // far snow
    drift: '#c7d4e3', // snow at the foot of the buildings: the far snow's color, so only the sunk foot shows
    glass: '#ffffff',
    base: '#2b2b35',
    baseTop: '#3a3a47',
    plaque: '#ff8a1f',
    plaqueText: '#fffaf4',
  },

  message: 'Bonne Année 2027', // on the base; ?msg=… replaces it, and a click on the plaque edits it
  messageMaxLength: 48,

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

  // Parallax inside the globe (not the snow, the glass or the base). Input: the mouse position on a
  // computer, the phone's tilt on a phone (maxAngle degrees either way = the full shift).
  parallax: {
    maxAngle: 15,
    recenter: 0.004, // per reading: the rest position slowly follows how the phone is held
    shift: { x: 12, y: 5 }, // scene units for the nearest layer (depth 1)
    easing: 140, // ms: time to cover about 63 % of the remaining distance (same on every screen rate)
    depths: { skyBand: 0.1, farSnow: 0.3, levels: [0.45, 0.65, 0.85], nearSnow: 1 },
  },

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
