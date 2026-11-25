// Sizzle & Serve — shared constants: canvas size, palette, station layout,
// timing. One job: every magic number the kitchen, chef and renderer agree on.
export const VIEW = { width: 1280, height: 800 };
export const SHIFT_SECONDS = 180;
export const MAX_ORDERS = 4;
export const MAX_HEARTS = 3;

export const COLORS = {
  floor: '#a9713f',
  floorDark: '#9a6335',
  wall: '#f3e3c2',
  wallTrim: '#c98f4e',
  counterTop: '#e8e2d6',
  counterSide: '#8d99a5',
  steel: '#b9c4cc',
  steelDark: '#8b98a3',
  board: '#d9a066',
  grill: '#3a3f45',
  grillHot: '#e0653a',
  ticket: '#fffdf5',
  ticketEdge: '#d8c9a3',
  ink: '#2b2118',
  muted: '#6b5a44',
  gold: '#f5b942',
  green: '#5da24a',
  red: '#d64541',
  cream: '#fdf6e3',
  window: '#7ec8e3',
};

// Station rectangles in canvas space. The kitchen reads top to bottom:
// order board (top), ingredient bins (left), grill + chopping board (middle),
// assembly counter and serving window (right).
export const STATIONS = {
  bins: { x: 24, y: 210, w: 190, h: 330, label: 'Pantry' },
  grill: { x: 250, y: 210, w: 300, h: 150, label: 'Grill' },
  board: { x: 250, y: 390, w: 300, h: 150, label: 'Chopping board' },
  assembly: { x: 590, y: 210, w: 330, h: 330, label: 'Assembly counter' },
  window: { x: 960, y: 210, w: 296, h: 180, label: 'Serving window' },
  trash: { x: 960, y: 420, w: 296, h: 120, label: 'Bin' },
};

export const GRILL_SLOTS = 3;
export const PAT_COOK_SECONDS = 6;
export const PAT_BURN_SECONDS = 14;
export const CHOP_SECONDS = 2.4;
export const ORDER_PATIENCE = 55;
export const ORDER_SPAWN_START = 14;
export const ORDER_SPAWN_MIN = 7;
/** How close the chef must stand to use a station. */
export const INTERACT_RANGE = 110;

/** Deterministic RNG (mulberry32) so staged screenshots repeat exactly. */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Clamp a number into [lo, hi]. */
export function clamp(value, lo, hi) {
  return value < lo ? lo : value > hi ? hi : value;
}

/** Seconds left on the shift clock, formatted m:ss. */
export function formatClock(seconds) {
  const s = Math.max(0, Math.ceil(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
