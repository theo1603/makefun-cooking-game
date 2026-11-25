// Sizzle & Serve — game state. One job: build a fresh shift and hold every
// mutable fact about it (orders, grill, board, plate, chef, score, timers).
import { SHIFT_SECONDS, MAX_HEARTS, STATIONS } from './config.js';
import { mulberry32 } from './config.js';

/** A brand-new shift. `seed` drives order picks so screenshots repeat. */
export function createGame(seed = 20261125) {
  return {
    seed,
    rng: mulberry32(seed),
    screen: 'title', // title | play | over
    time: 0,
    shiftLeft: SHIFT_SECONDS,
    coins: 0,
    score: 0,
    tips: 0,
    bestTip: 0,
    served: 0,
    missed: 0,
    combo: 0,
    bestCombo: 0,
    hearts: MAX_HEARTS,
    orders: [],
    nextOrderIn: 2,
    orderSeq: 0,
    grill: [null, null, null], // { kind:'patty', cooked: seconds } | null
    board: null, // { kind, progress } | null
    plate: [], // prepared ingredient ids stacked on the assembly counter
    plateOnCounter: true,
    chef: {
      x: 640,
      y: 640,
      dir: 1,
      speed: 250,
      hand: null, // { kind, prepared } | { plate:true } | null
      moving: false,
      chopAnim: 0,
    },
    floaters: [], // { x, y, text, color, life }
    sizzle: 0,
    muted: false,
    rush: false,
    message: '',
    messageLife: 0,
  };
}

/** The chef's home spot, centre floor below the counters. */
export function chefHome() {
  return { x: STATIONS.assembly.x + 140, y: 660 };
}

/** Add a floating "+$14" style popup above a point. */
export function addFloater(game, x, y, text, color) {
  game.floaters.push({ x, y, text, color, life: 1.4 });
  if (game.floaters.length > 12) game.floaters.shift();
}

/** Show a short hint line under the order board. */
export function say(game, text) {
  game.message = text;
  game.messageLife = 3;
}
