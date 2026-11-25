// Sizzle & Serve — the chef. One job: move the chef around the kitchen floor
// (keyboard or click-to-walk) and keep them inside the walkable area.
import { VIEW, STATIONS, clamp } from './config.js';

/** Walkable floor: below the counters, inside the walls. */
export function walkBounds() {
  return { x0: 30, y0: 560, x1: VIEW.width - 30, y1: VIEW.height - 24 };
}

/** Move the chef for one frame. `keys` is a Set of pressed key names. */
export function moveChef(game, dt, keys, target) {
  const chef = game.chef;
  let dx = 0;
  let dy = 0;
  if (keys.has('arrowleft') || keys.has('a')) dx -= 1;
  if (keys.has('arrowright') || keys.has('d')) dx += 1;
  if (keys.has('arrowup') || keys.has('w')) dy -= 1;
  if (keys.has('arrowdown') || keys.has('s')) dy += 1;
  if (dx === 0 && dy === 0 && target) {
    const tx = target.x - chef.x;
    const ty = target.y - chef.y;
    const dist = Math.hypot(tx, ty);
    if (dist > 8) {
      dx = tx / dist;
      dy = ty / dist;
    }
  }
  if (dx === 0 && dy === 0) {
    chef.moving = false;
    return;
  }
  const len = Math.hypot(dx, dy);
  dx /= len;
  dy /= len;
  // Hold Shift to hustle: a small speed boost for the dinner rush.
  const hustle = keys.has('shift') ? 1.35 : 1;
  chef.x += dx * chef.speed * hustle * dt;
  chef.y += dy * chef.speed * hustle * dt;
  const b = walkBounds();
  chef.x = clamp(chef.x, b.x0, b.x1);
  chef.y = clamp(chef.y, b.y0, b.y1);
  if (dx !== 0) chef.dir = dx > 0 ? 1 : -1;
  chef.moving = true;
}

/** True when the chef can reach a station rect from the floor. */
export function canReach(game, stationName) {
  const r = STATIONS[stationName];
  if (!r) return false;
  const cx = clamp(game.chef.x, r.x, r.x + r.w);
  const cy = clamp(game.chef.y, r.y, r.y + r.h);
  return Math.hypot(game.chef.x - cx, game.chef.y - cy) < 130;
}
