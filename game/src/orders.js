// Sizzle & Serve — orders. One job: spawn tickets, drain their patience,
// score a served plate, and run the rush that tightens the shift.
import { MAX_ORDERS, ORDER_PATIENCE, ORDER_SPAWN_START, ORDER_SPAWN_MIN } from './config.js';
import { pickRecipe, plateMatches } from './recipes.js';
import { addFloater, say } from './state.js';

/** Spawn one ticket on the board when there is room. */
export function spawnOrder(game) {
  if (game.orders.length >= MAX_ORDERS) return false;
  const recipe = pickRecipe(game.rng);
  game.orderSeq += 1;
  game.orders.push({
    id: game.orderSeq,
    recipe,
    patience: ORDER_PATIENCE,
    maxPatience: ORDER_PATIENCE,
    born: game.time,
  });
  return true;
}

/** Order spawn gap: shrinks as the shift runs on, faster again in the rush. */
export function spawnGap(game) {
  const elapsed = game.time;
  const gap = ORDER_SPAWN_START - Math.min(6, elapsed / 30);
  return Math.max(ORDER_SPAWN_MIN, game.rush ? gap - 2 : gap);
}

/** Tick patience and spawns. Returns 'missed' when a ticket expired. */
export function tickOrders(game, dt) {
  game.nextOrderIn -= dt;
  if (game.nextOrderIn <= 0) {
    if (spawnOrder(game)) game.nextOrderIn = spawnGap(game);
    else game.nextOrderIn = 2;
  }
  for (const order of game.orders) order.patience -= dt;
  const dead = game.orders.find((o) => o.patience <= 0);
  if (dead) {
    game.orders = game.orders.filter((o) => o !== dead);
    game.missed += 1;
    game.combo = 0;
    game.hearts -= 1;
    addFloater(game, 640, 120, 'ORDER WALKED OUT!', '#d64541');
    say(game, `Ticket #${dead.id} walked out — a customer left hungry.`);
    if (game.hearts <= 0) game.screen = 'over';
    return 'missed';
  }
  // Last 45 seconds: the dinner rush — tickets arrive faster, patience feels it.
  game.rush = game.shiftLeft <= 45;
  return null;
}

/** Rush tickets lose patience a little faster: the board feels the pressure. */
export function rushDrain(game, dt) {
  if (!game.rush) return;
  for (const order of game.orders) order.patience -= dt * 0.25;
}

/**
 * Serve the plate in the chef's hand at the window. Exact recipe match pays
 * full price plus a patience tip; a wrong plate still sells for half.
 */
export function servePlate(game, plate) {
  if (!plate || plate.length === 0) return null;
  let best = null;
  for (const order of game.orders) {
    if (plateMatches(plate, order.recipe)) {
      best = order;
      break;
    }
  }
  const earned = { coins: 0, tip: 0, matched: false, recipeName: '' };
  if (best) {
    const frac = Math.max(0, best.patience / best.maxPatience);
    earned.tip = Math.round(best.recipe.price * 0.4 * frac);
    earned.coins = best.recipe.price + earned.tip;
    earned.matched = true;
    earned.recipeName = best.recipe.name;
    game.orders = game.orders.filter((o) => o !== best);
  } else {
    earned.coins = Math.max(2, Math.floor(plate.length * 2));
    earned.recipeName = 'Mystery plate';
  }
  const comboMult = 1 + Math.min(2, game.combo) * 0.25;
  earned.coins = Math.round(earned.coins * comboMult);
  game.coins += earned.coins;
  game.tips += earned.tip;
  game.bestTip = Math.max(game.bestTip, earned.tip);
  game.score += earned.coins * 10;
  game.served += 1;
  game.combo += 1;
  game.bestCombo = Math.max(game.bestCombo, game.combo);
  addFloater(game, 1080, 200, `+$${earned.coins}`, '#f5b942');
  if (earned.matched) {
    say(game, `${earned.recipeName} served! Tip $${earned.tip} — combo x${game.combo}.`);
  } else {
    say(game, 'No ticket matched — sold as a mystery plate for half price.');
  }
  return earned;
}
