// Sizzle & Serve — entry point. One job: boot the canvas, run the loop,
// wire keyboard + mouse input, and hand each frame to the renderer.
import { VIEW, SHIFT_SECONDS } from './config.js';
import { createGame, chefHome } from './state.js';
import { tickOrders, rushDrain } from './orders.js';
import { tickKitchen, useStation, nearestStation } from './kitchen.js';
import { moveChef } from './chef.js';
import { render } from './render.js';
import { playSound, ensureAudio } from './audio.js';
import { stageShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot');
const seed = Number(params.get('seed') || 7);

let game = shotName ? stageShot(shotName, seed) : createGame();
const keys = new Set();
let clickTarget = null;
let lastTime = performance.now();
let paused = false;

function fitCanvas() {
  const scale = Math.min(window.innerWidth / VIEW.width, window.innerHeight / VIEW.height);
  canvas.width = VIEW.width;
  canvas.height = VIEW.height;
  canvas.style.width = `${Math.floor(VIEW.width * scale)}px`;
  canvas.style.height = `${Math.floor(VIEW.height * scale)}px`;
}

function statusLine() {
  const el = document.getElementById('status');
  if (!el) return;
  if (game.screen === 'title') el.textContent = 'Sizzle and Serve. Press Enter to start.';
  else if (game.screen === 'over') el.textContent = `Shift over. You earned $${game.coins}. Press R to restart.`;
  else {
    el.textContent = `Shift ${Math.ceil(game.shiftLeft)} seconds left, $${game.coins}, ` +
      `${game.orders.length} orders open, ${game.hearts} hearts.`;
  }
}

function frame(now) {
  const dt = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;
  if (game.screen === 'play' && !paused && !shotName) {
    game.time += dt;
    game.shiftLeft = Math.max(0, SHIFT_SECONDS - game.time);
    const chopping = (keys.has('e') || keys.has(' ')) && nearestStation(game) === 'board' && game.board;
    moveChef(game, dt, keys, clickTarget);
    if (clickTarget && Math.hypot(clickTarget.x - game.chef.x, clickTarget.y - game.chef.y) < 10) clickTarget = null;
    tickKitchen(game, dt, chopping);
    tickOrders(game, dt);
    rushDrain(game, dt);
    for (const f of game.floaters) f.life -= dt;
    game.floaters = game.floaters.filter((f) => f.life > 0);
    if (game.messageLife > 0) game.messageLife -= dt;
    if (game.shiftLeft <= 0 || game.screen === 'over') game.screen = 'over';
    // Low-patience warning beep, at most once per ticket per few seconds.
    const urgent = game.orders.some((o) => o.patience < 10 && o.patience > 9.9);
    if (urgent) playSound('alarm', game.muted);
  }
  if (shotName) {
    // Staged shots hold still: the frame is the scene, no ticking.
    game.time = 42;
  }
  render(ctx, game);
  statusLine();
  requestAnimationFrame(frame);
}

function interact() {
  if (game.screen !== 'play' || paused) return;
  ensureAudio();
  const sound = useStation(game);
  if (sound) playSound(sound, game.muted);
}

window.addEventListener('keydown', (e) => {
  const key = e.key.toLowerCase();
  if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(key)) e.preventDefault();
  ensureAudio();
  if (game.screen === 'title' && key === 'enter') {
    game.screen = 'play';
    game.chef.x = chefHome().x;
    game.chef.y = chefHome().y;
    return;
  }
  if (game.screen === 'over' && key === 'r') {
    game = createGame();
    lastTime = performance.now();
    return;
  }
  if (key === 'p' && game.screen === 'play') {
    paused = !paused;
    return;
  }
  if (key === 'm') {
    game.muted = !game.muted;
    return;
  }
  if ((key === 'e' || key === ' ') && !e.repeat) {
    keys.add(key);
    interact();
    return;
  }
  keys.add(key);
});

window.addEventListener('keyup', (e) => {
  keys.delete(e.key.toLowerCase());
});

canvas.addEventListener('pointerdown', (e) => {
  ensureAudio();
  if (game.screen !== 'play' || paused) return;
  const rect = canvas.getBoundingClientRect();
  const x = ((e.clientX - rect.left) / rect.width) * VIEW.width;
  const y = ((e.clientY - rect.top) / rect.height) * VIEW.height;
  clickTarget = { x, y };
  // Clicking a station you already stand by uses it at once.
  if (nearestStation(game)) interact();
});

canvas.addEventListener('dblclick', () => {
  interact();
});

window.addEventListener('resize', fitCanvas);
fitCanvas();
requestAnimationFrame(frame);
