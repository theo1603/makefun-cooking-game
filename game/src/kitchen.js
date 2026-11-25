// Sizzle & Serve — kitchen stations. One job: what happens when the chef
// uses a station (pantry, grill, chopping board, assembly counter, window,
// bin) and what prompt each station shows.
import { STATIONS, GRILL_SLOTS, PAT_COOK_SECONDS, PAT_BURN_SECONDS, CHOP_SECONDS, INTERACT_RANGE, clamp } from './config.js';
import { INGREDIENTS, PANTRY_ORDER } from './recipes.js';
import { servePlate } from './orders.js';
import { addFloater, say } from './state.js';

/** Which pantry bin the point (x, y) is over, or null. */
export function pantryBinAt(x, y) {
  const b = STATIONS.bins;
  if (x < b.x || x > b.x + b.w || y < b.y || y > b.y + b.h) return null;
  const cols = 2;
  const rows = 3;
  const cw = b.w / cols;
  const ch = (b.h - 28) / rows;
  const col = Math.floor((x - b.x) / cw);
  const row = Math.floor((y - b.y - 28) / ch);
  const idx = row * cols + col;
  return PANTRY_ORDER[idx] || null;
}

/** The station rect the chef stands nearest, within reach, or null. */
export function nearestStation(game) {
  const { x, y } = game.chef;
  // Carrying a finished plate, the serving window wins over the bin below it.
  if (game.chef.hand && game.chef.hand.plate) {
    const w = STATIONS.window;
    const cx = clamp(x, w.x, w.x + w.w);
    const cy = clamp(y, w.y, w.y + w.h);
    if (Math.hypot(x - cx, y - cy) < 220) return 'window';
  }
  let best = null;
  let bestD = INTERACT_RANGE;
  for (const [name, r] of Object.entries(STATIONS)) {
    const cx = clamp(x, r.x, r.x + r.w);
    const cy = clamp(y, r.y, r.y + r.h);
    const d = Math.hypot(x - cx, y - cy);
    if (d < bestD) {
      bestD = d;
      best = name;
    }
  }
  return best;
}

/** The one-line prompt for the nearest station, or ''. */
export function stationPrompt(game) {
  const station = nearestStation(game);
  const hand = game.chef.hand;
  if (!station) return '';
  if (station === 'bins') {
    if (hand) return 'Hands full — chop, grill or plate it first';
    return 'E: grab an ingredient';
  }
  if (station === 'grill') {
    if (hand && hand.kind === 'patty' && !hand.prepared) return 'E: put patty on the grill';
    const ready = game.grill.findIndex((s) => s && s.cooked >= PAT_COOK_SECONDS);
    if (ready >= 0 && !hand) return 'E: take the cooked patty';
    if (hand) return 'The grill only takes raw patties';
    return 'Patties sizzle here — 6s to cook, don\'t burn them';
  }
  if (station === 'board') {
    if (game.board) {
      if (game.board.progress >= 1) return !hand ? 'E: take the chopped ' + game.board.kind : 'Hands full';
      return 'Hold E: chop chop chop!';
    }
    if (hand && INGREDIENTS[hand.kind].needs === 'chop' && !hand.prepared) return 'E: put it on the board';
    return 'Chop lettuce & tomato here';
  }
  if (station === 'assembly') {
    if (hand && hand.plate) return 'E: put the plate down';
    if (hand && hand.prepared) return `E: add ${INGREDIENTS[hand.kind].name} to the plate`;
    if (hand) return 'That needs prep first — grill or chop it';
    if (game.plate.length > 0) return 'E: pick up the plate';
    return 'Build burgers here, bun first';
  }
  if (station === 'window') {
    if (hand && hand.plate) return 'E: SERVE the plate!';
    return 'Serve finished plates here';
  }
  if (station === 'trash') {
    if (hand) return 'E: throw it away';
    return 'Bin — dump burnt food here';
  }
  return '';
}

/**
 * Use the nearest station. Returns a sound key ('pickup' | 'chop' | 'sizzle'
 * | 'serve' | 'error' | 'ding' | null) for the audio module.
 */
export function useStation(game) {
  const station = nearestStation(game);
  if (!station) return null;
  const hand = game.chef.hand;

  if (station === 'bins') {
    if (hand) return 'error';
    const kind = pantryBinAt(game.chef.x, game.chef.y) || 'bun';
    // Bins: pick the bin nearest the chef's position inside the pantry.
    game.chef.hand = { kind, prepared: INGREDIENTS[kind].needs === 'none' };
    say(game, `Grabbed ${INGREDIENTS[kind].name}.`);
    return 'pickup';
  }

  if (station === 'grill') {
    if (hand && hand.kind === 'patty' && !hand.prepared) {
      const slot = game.grill.findIndex((s) => s === null);
      if (slot < 0) {
        say(game, 'Grill is full!');
        return 'error';
      }
      game.grill[slot] = { kind: 'patty', cooked: 0 };
      game.chef.hand = null;
      return 'sizzle';
    }
    if (!hand) {
      const ready = game.grill.findIndex((s) => s && s.cooked >= PAT_COOK_SECONDS);
      if (ready >= 0) {
        const slot = game.grill[ready];
        const burnt = slot.cooked >= PAT_BURN_SECONDS;
        game.grill[ready] = null;
        game.chef.hand = { kind: 'patty', prepared: !burnt, burnt };
        if (burnt) say(game, 'Burnt! Toss it in the bin.');
        return 'pickup';
      }
    }
    return 'error';
  }

  if (station === 'board') {
    if (game.board && game.board.progress < 1) {
      // Holding E chops: pressing E again is not an error, it just keeps chopping.
      return null;
    }
    if (game.board && game.board.progress >= 1 && !hand) {
      game.chef.hand = { kind: game.board.kind, prepared: true };
      game.board = null;
      return 'pickup';
    }
    if (!game.board && hand && INGREDIENTS[hand.kind].needs === 'chop' && !hand.prepared) {
      game.board = { kind: hand.kind, progress: 0 };
      game.chef.hand = null;
      return 'chop';
    }
    return 'error';
  }

  if (station === 'assembly') {
    if (hand && hand.plate) {
      game.plate = hand.plateItems;
      game.plateOnCounter = true;
      game.chef.hand = null;
      return 'ding';
    }
    if (hand && hand.prepared) {
      if (game.plate.length === 0 && hand.kind !== 'bun') {
        say(game, 'Start every burger with a bun!');
        return 'error';
      }
      game.plate.push(hand.kind);
      game.chef.hand = null;
      addFloater(game, 755, 300, INGREDIENTS[hand.kind].name, '#5da24a');
      return 'ding';
    }
    if (!hand && game.plate.length > 0) {
      game.chef.hand = { plate: true, plateItems: [...game.plate] };
      game.plate = [];
      game.plateOnCounter = false;
      return 'pickup';
    }
    return 'error';
  }

  if (station === 'window') {
    if (hand && hand.plate) {
      const result = servePlate(game, hand.plateItems);
      if (result) {
        game.chef.hand = null;
        return 'serve';
      }
    }
    return 'error';
  }

  if (station === 'trash') {
    if (hand) {
      game.chef.hand = null;
      say(game, 'Tossed it. Fresh start!');
      return 'ding';
    }
    return 'error';
  }
  return null;
}

/** Advance grill cooking and chopping. `chopping` = chef is holding E at board. */
export function tickKitchen(game, dt, chopping) {
  for (const slot of game.grill) if (slot) slot.cooked += dt;
  if (game.board && game.board.progress < 1 && chopping) {
    game.board.progress = Math.min(1, game.board.progress + dt / CHOP_SECONDS);
    game.chef.chopAnim += dt;
    if (game.board.progress >= 1) say(game, `${INGREDIENTS[game.board.kind].name} chopped — grab it!`);
  }
  game.sizzle = game.grill.some((s) => s) ? Math.min(1, game.sizzle + dt) : 0;
}

/** Free grill slots count (for the HUD). */
export function grillFree(game) {
  return GRILL_SLOTS - game.grill.filter(Boolean).length;
}
