// Sizzle & Serve — staged screenshot scenes. One job: drive the real game
// into a photogenic state for each ?shot= scene, using only the game's own
// rules (spawnOrder, the grill, the board, the plate), so every screenshot is
// a genuine render of the game's code, repeatable from a fixed seed.
import { createGame } from './state.js';
import { spawnOrder } from './orders.js';
import { RECIPES } from './recipes.js';

function orderWith(game, recipeId, patienceFrac) {
  const recipe = RECIPES.find((r) => r.id === recipeId);
  game.orderSeq += 1;
  game.orders.push({
    id: game.orderSeq,
    recipe,
    patience: 55 * patienceFrac,
    maxPatience: 55,
    born: game.time,
  });
}

/** Build the game state for a named shot. Returns a playing game. */
export function stageShot(name, seed = 7) {
  const game = createGame(seed);
  game.screen = 'play';
  game.time = 42;
  game.shiftLeft = 138;
  game.coins = 46;
  game.score = 1250;
  game.served = 4;
  game.combo = 2;
  game.bestCombo = 3;
  game.chef.x = 470;
  game.chef.y = 640;
  game.chef.dir = 1;

  if (name === 'cover') {
    // The full story in one frame: busy board, dish mid-assembly, a plate
    // ready to serve, the timer running, the grill going.
    orderWith(game, 'deluxe', 0.72);
    orderWith(game, 'classic', 0.45);
    orderWith(game, 'cheesy', 0.85);
    game.grill[0] = { kind: 'patty', cooked: 7.5 };
    game.grill[1] = { kind: 'patty', cooked: 3.2 };
    game.board = { kind: 'tomato', progress: 0.6 };
    game.plate = ['bun', 'patty', 'lettuce'];
    game.chef.hand = { kind: 'tomato', prepared: true };
    game.chef.x = 430;
    game.chef.y = 620;
    game.message = 'Deluxe Rush is 3/5 — add tomato, then sauce, and serve!';
    game.messageLife = 3;
    game.floaters.push({ x: 1080, y: 200, text: '+$18', color: '#f5b942', life: 1.2 });
  } else if (name === 'chop') {
    // Hands-on prep: chopping in progress, a patty on the grill, one ticket.
    orderWith(game, 'garden', 0.6);
    orderWith(game, 'classic', 0.8);
    game.grill[0] = { kind: 'patty', cooked: 5.1 };
    game.board = { kind: 'lettuce', progress: 0.75 };
    game.chef.x = 400;
    game.chef.y = 600;
    game.chef.chopAnim = 1;
    game.shiftLeft = 152;
    game.coins = 28;
  } else if (name === 'serve') {
    // The payoff: a finished plate in hand at the window, coins popping.
    orderWith(game, 'double', 0.5);
    orderWith(game, 'deluxe', 0.9);
    game.chef.hand = { plate: true, plateItems: ['bun', 'patty', 'patty', 'cheese', 'sauce'] };
    game.chef.x = 1080;
    game.chef.y = 600;
    game.grill[0] = { kind: 'patty', cooked: 6.5 };
    game.plate = [];
    game.floaters.push({ x: 880, y: 205, text: '+$26', color: '#f5b942', life: 1.3 });
    game.floaters.push({ x: 700, y: 190, text: 'COMBO x3!', color: '#7dff8a', life: 1.1 });
    game.combo = 3;
    game.shiftLeft = 96;
    game.coins = 88;
  } else if (name === 'rush') {
    // The dinner rush: a full board, one ticket nearly out of patience.
    orderWith(game, 'deluxe', 0.18);
    orderWith(game, 'double', 0.42);
    orderWith(game, 'classic', 0.66);
    orderWith(game, 'garden', 0.9);
    game.grill[0] = { kind: 'patty', cooked: 8.2 };
    game.grill[1] = { kind: 'patty', cooked: 1.5 };
    game.grill[2] = { kind: 'patty', cooked: 13.5 };
    game.board = { kind: 'tomato', progress: 0.9 };
    game.plate = ['bun', 'patty', 'cheese'];
    game.chef.hand = { kind: 'lettuce', prepared: true };
    game.chef.x = 760;
    game.chef.y = 620;
    game.shiftLeft = 38;
    game.rush = true;
    game.coins = 132;
    game.score = 4100;
    game.served = 11;
    game.hearts = 2;
  } else {
    // Default: a fresh, lively kitchen a few seconds in.
    spawnOrder(game);
    spawnOrder(game);
    game.grill[0] = { kind: 'patty', cooked: 2.0 };
    game.plate = ['bun'];
  }
  return game;
}
