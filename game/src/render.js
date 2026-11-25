// Sizzle & Serve — renderer. One job: draw everything on the canvas: the
// kitchen, the order board, the food, the chef, the HUD and the screens.
import { VIEW, COLORS, STATIONS, PAT_COOK_SECONDS, PAT_BURN_SECONDS } from './config.js';
import { INGREDIENTS, PANTRY_ORDER, plateProgress } from './recipes.js';
import { formatClock } from './config.js';
import { nearestStation, stationPrompt, pantryBinAt } from './kitchen.js';

/** Draw one ingredient icon centred at (x, y), roughly `size` wide. */
export function drawIngredient(ctx, kind, x, y, size) {
  const s = size / 2;
  ctx.save();
  ctx.translate(x, y);
  if (kind === 'bun') {
    ctx.fillStyle = '#e8b25e';
    ctx.beginPath();
    ctx.ellipse(0, -s * 0.35, s, s * 0.55, 0, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = '#c98f3a';
    ctx.fillRect(-s, -s * 0.4, s * 2, s * 0.22);
    ctx.fillStyle = '#f3cd8a';
    ctx.beginPath();
    ctx.ellipse(0, s * 0.45, s, s * 0.4, 0, 0, Math.PI);
    ctx.fill();
    ctx.fillStyle = '#fff2cf';
    for (const [dx, dy] of [[-0.4, -0.55], [0.1, -0.7], [0.45, -0.5]]) {
      ctx.beginPath();
      ctx.ellipse(dx * s, dy * s, s * 0.1, s * 0.06, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (kind === 'patty') {
    ctx.fillStyle = '#7a4a2b';
    roundRect(ctx, -s, -s * 0.45, s * 2, s * 0.9, s * 0.35);
    ctx.fill();
    ctx.fillStyle = '#5d3620';
    for (const [dx, dy] of [[-0.5, 0], [0, -0.15], [0.5, 0.1]]) {
      ctx.beginPath();
      ctx.arc(dx * s, dy * s, s * 0.12, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (kind === 'lettuce') {
    ctx.fillStyle = '#6fbf4a';
    ctx.beginPath();
    for (let i = 0; i <= 8; i += 1) {
      const a = (i / 8) * Math.PI * 2;
      const r = s * (0.75 + 0.25 * Math.sin(i * 2.4));
      const px = Math.cos(a) * r;
      const py = Math.sin(a) * r * 0.55;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#4d8f33';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-s * 0.7, 0);
    ctx.lineTo(s * 0.7, 0);
    ctx.stroke();
  } else if (kind === 'tomato') {
    ctx.fillStyle = '#e14b3a';
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.85, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#c93327';
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.55, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f2826f';
    ctx.beginPath();
    ctx.arc(-s * 0.3, -s * 0.3, s * 0.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#5da24a';
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.85);
    ctx.lineTo(-s * 0.25, -s * 1.05);
    ctx.lineTo(s * 0.25, -s * 1.05);
    ctx.closePath();
    ctx.fill();
  } else if (kind === 'cheese') {
    ctx.fillStyle = '#f7c948';
    ctx.beginPath();
    ctx.moveTo(-s, s * 0.6);
    ctx.lineTo(s, s * 0.6);
    ctx.lineTo(s, -s * 0.2);
    ctx.lineTo(-s, s * 0.6);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#e0a92e';
    for (const [dx, dy] of [[-0.3, 0.3], [0.3, 0.35]]) {
      ctx.beginPath();
      ctx.arc(dx * s, dy * s, s * 0.11, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (kind === 'sauce') {
    ctx.fillStyle = '#e8823a';
    ctx.beginPath();
    ctx.moveTo(-s * 0.7, -s * 0.6);
    ctx.quadraticCurveTo(0, -s * 1.1, s * 0.7, -s * 0.6);
    ctx.quadraticCurveTo(s * 0.5, s * 0.2, s * 0.25, s * 0.7);
    ctx.quadraticCurveTo(0, s * 0.35, -s * 0.25, s * 0.7);
    ctx.quadraticCurveTo(-s * 0.5, s * 0.2, -s * 0.7, -s * 0.6);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(-s * 0.25, -s * 0.45, s * 0.12, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

export function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawStationBase(ctx, r, label) {
  ctx.fillStyle = COLORS.counterSide;
  roundRect(ctx, r.x, r.y, r.w, r.h, 10);
  ctx.fill();
  ctx.fillStyle = COLORS.counterTop;
  roundRect(ctx, r.x + 4, r.y + 4, r.w - 8, 26, 7);
  ctx.fill();
  ctx.fillStyle = COLORS.ink;
  ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(label.toUpperCase(), r.x + 12, r.y + 17);
}

/** Draw the order board: one ticket per open order, patience draining. */
export function drawOrderBoard(ctx, game) {
  ctx.fillStyle = COLORS.wallTrim;
  ctx.fillRect(0, 66, VIEW.width, 6);
  ctx.fillStyle = '#3a2c1c';
  ctx.fillRect(0, 72, VIEW.width, 96);
  ctx.fillStyle = '#f5e6c8';
  ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('ORDER BOARD', 24, 88);
  if (game.orders.length === 0) {
    ctx.fillStyle = '#cbb98f';
    ctx.font = '15px system-ui, sans-serif';
    ctx.fillText('No orders yet — the lunch crowd is coming…', 180, 88);
  }
  game.orders.forEach((order, i) => {
    const x = 180 + i * 250;
    const y = 80;
    const w = 236;
    const h = 80;
    const frac = Math.max(0, order.patience / order.maxPatience);
    ctx.fillStyle = COLORS.ticket;
    roundRect(ctx, x, y, w, h, 8);
    ctx.fill();
    ctx.fillStyle = frac < 0.33 ? '#d64541' : '#2b2118';
    ctx.fillRect(x, y, 6, h);
    ctx.fillStyle = COLORS.ink;
    ctx.font = 'bold 14px system-ui, sans-serif';
    ctx.fillText(`#${order.id} ${order.recipe.name}`, x + 14, y + 16);
    ctx.fillStyle = COLORS.gold;
    ctx.font = 'bold 14px system-ui, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`$${order.recipe.price}`, x + w - 10, y + 16);
    ctx.textAlign = 'left';
    order.recipe.items.forEach((item, j) => {
      drawIngredient(ctx, item, x + 24 + j * 34, y + 44, 26);
    });
    ctx.fillStyle = '#e5dcc4';
    ctx.fillRect(x + 14, y + 66, w - 28, 6);
    ctx.fillStyle = frac < 0.33 ? '#d64541' : frac < 0.66 ? '#f5b942' : '#5da24a';
    ctx.fillRect(x + 14, y + 66, (w - 28) * frac, 6);
    ctx.fillStyle = COLORS.muted;
    ctx.font = '11px system-ui, sans-serif';
    ctx.fillText(`${Math.ceil(order.patience)}s`, x + w - 34, y + 44);
  });
}

/** Draw the pantry bins with their ingredient icons. */
export function drawPantry(ctx, game) {
  const r = STATIONS.bins;
  drawStationBase(ctx, r, r.label);
  const cols = 2;
  const cw = r.w / cols;
  const ch = (r.h - 34) / 3;
  PANTRY_ORDER.forEach((kind, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const cx = r.x + col * cw + cw / 2;
    const cy = r.y + 34 + row * ch + ch / 2;
    ctx.fillStyle = '#f7f1e3';
    roundRect(ctx, cx - cw / 2 + 6, cy - ch / 2 + 6, cw - 12, ch - 12, 8);
    ctx.fill();
    drawIngredient(ctx, kind, cx, cy - 8, 44);
    ctx.fillStyle = COLORS.ink;
    ctx.font = '12px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(INGREDIENTS[kind].name, cx, cy + ch / 2 - 12);
    ctx.textAlign = 'left';
  });
}

/** Draw the grill: three slots, patties browning, smoke when hot. */
export function drawGrill(ctx, game) {
  const r = STATIONS.grill;
  drawStationBase(ctx, r, r.label);
  ctx.fillStyle = COLORS.grill;
  roundRect(ctx, r.x + 12, r.y + 40, r.w - 24, r.h - 52, 8);
  ctx.fill();
  for (let i = 0; i < 3; i += 1) {
    const cx = r.x + 60 + i * 92;
    const cy = r.y + 95;
    ctx.strokeStyle = '#565d66';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, 34, 0, Math.PI * 2);
    ctx.stroke();
    const slot = game.grill[i];
    if (slot) {
      const frac = Math.min(1, slot.cooked / PAT_COOK_SECONDS);
      drawIngredient(ctx, 'patty', cx, cy, 52);
      if (slot.cooked >= PAT_BURN_SECONDS) {
        ctx.fillStyle = '#222';
        ctx.font = 'bold 20px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('✕', cx, cy - 30);
        ctx.textAlign = 'left';
      } else if (slot.cooked >= PAT_COOK_SECONDS) {
        ctx.fillStyle = '#7dff8a';
        ctx.font = 'bold 13px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('READY!', cx, cy - 34);
        ctx.textAlign = 'left';
      } else {
        ctx.fillStyle = '#e0653a';
        ctx.fillRect(cx - 26, cy + 30, 52 * frac, 5);
      }
      if (game.sizzle > 0.3) {
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.beginPath();
        ctx.arc(cx - 10, cy - 30 - (game.time * 20 % 14), 4, 0, Math.PI * 2);
        ctx.arc(cx + 12, cy - 36 - (game.time * 26 % 18), 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}

/** Draw the chopping board with its item and progress ring. */
export function drawBoard(ctx, game) {
  const r = STATIONS.board;
  drawStationBase(ctx, r, r.label);
  ctx.fillStyle = COLORS.board;
  roundRect(ctx, r.x + 30, r.y + 42, r.w - 60, r.h - 56, 10);
  ctx.fill();
  ctx.strokeStyle = '#b57e42';
  ctx.lineWidth = 2;
  ctx.strokeRect(r.x + 38, r.y + 50, r.w - 76, r.h - 72);
  const item = game.board;
  if (item) {
    drawIngredient(ctx, item.kind, r.x + r.w / 2, r.y + r.h / 2 + 6, 64);
    if (item.progress < 1) {
      ctx.strokeStyle = '#2b2118';
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.arc(r.x + r.w / 2, r.y + r.h / 2 + 6, 46, -Math.PI / 2, -Math.PI / 2 + item.progress * Math.PI * 2);
      ctx.stroke();
      // The prompt bubble above the chef already says "Hold E — chopping".
    } else {
      ctx.fillStyle = '#2e7d32';
      ctx.font = 'bold 14px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('CHOPPED ✓', r.x + r.w / 2, r.y + r.h - 16);
      ctx.textAlign = 'left';
    }
  } else {
    ctx.fillStyle = '#8a6a42';
    ctx.font = '14px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Drop lettuce or tomato here', r.x + r.w / 2, r.y + r.h / 2 + 6);
    ctx.textAlign = 'left';
  }
}

/** Draw the assembly counter: the plate and its stacked burger. */
export function drawAssembly(ctx, game) {
  const r = STATIONS.assembly;
  drawStationBase(ctx, r, r.label);
  const cx = r.x + r.w / 2;
  const cy = r.y + 200;
  // Plate
  ctx.fillStyle = '#f4f6f8';
  ctx.beginPath();
  ctx.ellipse(cx, cy + 60, 120, 26, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#c3ccd4';
  ctx.lineWidth = 2;
  ctx.stroke();
  // Stacked layers, bottom bun at the bottom. Smaller icons, wider spacing,
  // so each layer peeks out instead of burying the one below it.
  const layers = [...game.plate];
  layers.forEach((kind, i) => {
    const ly = cy + 46 - i * 20;
    drawIngredient(ctx, kind, cx, ly, 112);
  });
  if (layers.length === 0) {
    ctx.fillStyle = '#5d686f';
    ctx.font = '14px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Empty plate — start with a bun', cx, cy - 30);
    ctx.textAlign = 'left';
  } else {
    // Match hint against the first order this plate could feed.
    const target = game.orders.find((o) => plateProgress(game.plate, o.recipe).hit > 0);
    if (target) {
      const p = plateProgress(game.plate, target.recipe);
      ctx.fillStyle = COLORS.ink;
      ctx.font = 'bold 14px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${p.hit}/${p.total} for #${target.id} ${target.recipe.name}`, cx, cy - 52);
      // A finished plate that matches a ticket gets a green READY tag.
      if (p.hit === p.total) {
        ctx.fillStyle = '#2e7d32';
        roundRect(ctx, cx - 90, cy - 86, 180, 24, 12);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 13px system-ui, sans-serif';
        ctx.fillText('✓ READY TO SERVE', cx, cy - 73);
      }
      ctx.textAlign = 'left';
    }
  }
  // Tray of spare buns for flavour.
  drawIngredient(ctx, 'bun', r.x + 46, r.y + 280, 40);
  drawIngredient(ctx, 'cheese', r.x + 110, r.y + 280, 40);
}

/** Draw the serving window and the bin. */
export function drawWindow(ctx, game) {
  const r = STATIONS.window;
  drawStationBase(ctx, r, r.label);
  ctx.fillStyle = COLORS.window;
  roundRect(ctx, r.x + 12, r.y + 40, r.w - 24, r.h - 52, 8);
  ctx.fill();
  ctx.fillStyle = '#eaf7ff';
  ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(game.orders.length ? 'NEXT UP: SERVE!' : 'WINDOW CLEAR', r.x + r.w / 2, r.y + 66);
  ctx.fillStyle = '#2b2118';
  ctx.font = '13px system-ui, sans-serif';
  ctx.fillText('Hand a finished plate to the window', r.x + r.w / 2, r.y + 90);
  ctx.fillText('Match a ticket for full price + tip', r.x + r.w / 2, r.y + 112);
  ctx.textAlign = 'left';
  const t = STATIONS.trash;
  drawStationBase(ctx, t, t.label);
  ctx.fillStyle = '#5a5148';
  roundRect(ctx, t.x + 40, t.y + 44, t.w - 80, t.h - 58, 8);
  ctx.fill();
  ctx.fillStyle = '#8a8178';
  ctx.font = 'bold 22px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('🗑', t.x + t.w / 2, t.y + 84);
  ctx.textAlign = 'left';
}

/** Draw the chef: toque, face, apron, and whatever is in their hands. */
export function drawChef(ctx, game) {
  const c = game.chef;
  const bob = c.moving ? Math.sin(game.time * 14) * 3 : 0;
  ctx.save();
  ctx.translate(c.x, c.y + bob);
  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.beginPath();
  ctx.ellipse(0, 26, 26, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  // Body / apron
  ctx.fillStyle = '#f4f6f8';
  roundRect(ctx, -18, -6, 36, 34, 10);
  ctx.fill();
  ctx.fillStyle = '#d64541';
  ctx.fillRect(-18, 8, 36, 8);
  // Arms
  ctx.fillStyle = '#f2c79b';
  ctx.beginPath();
  ctx.arc(-20, 4, 7, 0, Math.PI * 2);
  ctx.arc(20, 4, 7, 0, Math.PI * 2);
  ctx.fill();
  // Head
  ctx.fillStyle = '#f2c79b';
  ctx.beginPath();
  ctx.arc(0, -20, 15, 0, Math.PI * 2);
  ctx.fill();
  // Toque
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(-8, -34, 9, 0, Math.PI * 2);
  ctx.arc(0, -38, 10, 0, Math.PI * 2);
  ctx.arc(8, -34, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(-14, -36, 28, 8);
  // Face
  ctx.fillStyle = '#2b2118';
  ctx.beginPath();
  ctx.arc(-5 + c.dir * 2, -20, 1.8, 0, Math.PI * 2);
  ctx.arc(5 + c.dir * 2, -20, 1.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#2b2118';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.arc(c.dir * 2, -15, 5, 0.15 * Math.PI, 0.85 * Math.PI);
  ctx.stroke();
  // What's in hand, held high so it reads at a glance.
  const hand = c.hand;
  if (hand) {
    if (hand.plate) {
      // A mini stack above the chef's head: plate, then the top layers,
      // spaced so each layer reads instead of collapsing into one blob.
      ctx.fillStyle = '#f4f6f8';
      ctx.beginPath();
      ctx.ellipse(0, -58, 30, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      const top = hand.plateItems.slice(-3);
      top.forEach((kind, i) => {
        drawIngredient(ctx, kind, 0, -66 - (top.length - 1 - i) * 12, 32);
      });
    } else {
      drawIngredient(ctx, hand.kind, 0, -52, 40);
      if (hand.burnt) {
        ctx.fillStyle = '#d64541';
        ctx.font = 'bold 12px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('BURNT', 0, -72);
        ctx.textAlign = 'left';
      }
    }
  }
  ctx.restore();
}

/** Draw the top HUD bar: clock, coins, score, combo, hearts. */
export function drawHud(ctx, game) {
  ctx.fillStyle = '#2b2118';
  ctx.fillRect(0, 0, VIEW.width, 64);
  ctx.fillStyle = '#f5b942';
  ctx.font = 'bold 26px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('🍳 SIZZLE & SERVE', 20, 32);
  const clockText = formatClock(game.shiftLeft);
  const clockColor = game.shiftLeft <= 30 ? '#ff6b5e' : game.rush ? '#f5b942' : '#ffffff';
  ctx.fillStyle = clockColor;
  ctx.font = 'bold 24px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`⏱ ${clockText}`, 500, 32);
  if (game.rush) {
    ctx.fillStyle = '#ff6b5e';
    ctx.font = 'bold 15px system-ui, sans-serif';
    ctx.fillText('DINNER RUSH!', 500, 54);
  }
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 20px system-ui, sans-serif';
  ctx.fillText(`💰 $${game.coins}`, 700, 32);
  ctx.fillStyle = '#cbb98f';
  ctx.font = '16px system-ui, sans-serif';
  ctx.fillText(`Score ${game.score}`, 820, 32);
  if (game.combo >= 2) {
    ctx.fillStyle = '#7dff8a';
    ctx.font = 'bold 16px system-ui, sans-serif';
    ctx.fillText(`COMBO x${game.combo}`, 950, 32);
  }
  ctx.textAlign = 'right';
  ctx.font = '20px system-ui, sans-serif';
  ctx.fillText('♥'.repeat(Math.max(0, game.hearts)) + '♡'.repeat(Math.max(0, 3 - game.hearts)), 1260, 32);
  ctx.textAlign = 'left';
}

/** Draw prompt, message and floaters. */
export function drawOverlays(ctx, game) {
  const prompt = game.screen === 'play' ? stationPrompt(game) : '';
  if (prompt) {
    ctx.fillStyle = 'rgba(43,33,24,0.9)';
    const w = ctx.measureText(prompt).width + 120;
    // Sit clear above the plate the chef may be holding overhead.
    roundRect(ctx, game.chef.x - w / 2, game.chef.y - 140, w, 30, 15);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 14px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(prompt, game.chef.x, game.chef.y - 124);
    ctx.textAlign = 'left';
  }
  if (game.messageLife > 0 && game.message) {
    ctx.fillStyle = 'rgba(255,253,245,0.95)';
    roundRect(ctx, 340, 172, 600, 30, 8);
    ctx.fill();
    ctx.fillStyle = COLORS.ink;
    ctx.font = '14px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(game.message, 640, 187);
    ctx.textAlign = 'left';
  }
  for (const f of game.floaters) {
    ctx.globalAlpha = Math.min(1, f.life);
    ctx.fillStyle = f.color;
    ctx.font = 'bold 22px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(f.text, f.x, f.y - (1.4 - f.life) * 40);
    ctx.textAlign = 'left';
    ctx.globalAlpha = 1;
  }
  // Highlight the nearest station so the player always knows where E works.
  const near = game.screen === 'play' ? nearestStation(game) : null;
  if (near) {
    const r = STATIONS[near];
    ctx.strokeStyle = '#f5b942';
    ctx.lineWidth = 3;
    ctx.setLineDash([8, 6]);
    roundRect(ctx, r.x - 4, r.y - 4, r.w + 8, r.h + 8, 12);
    ctx.stroke();
    ctx.setLineDash([]);
  }
}

/** Title screen overlay. */
export function drawTitle(ctx, game) {
  ctx.fillStyle = 'rgba(43,33,24,0.82)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  ctx.fillStyle = '#f5b942';
  ctx.font = 'bold 64px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('🍳 SIZZLE & SERVE', 640, 220);
  ctx.fillStyle = '#fff';
  ctx.font = '28px system-ui, sans-serif';
  ctx.fillText('The lunch-rush cooking game', 640, 270);
  ctx.font = '19px system-ui, sans-serif';
  const lines = [
    'WASD / arrows — run around the kitchen    •    E — grab, chop, grill, plate, serve',
    'Click a station to walk to it    •    P pause    •    M mute',
    'Take orders from the board, grill patties, chop veg, stack burgers, serve before',
    'the patience bar runs out. Tips grow with fast serves — chain them for combos!',
    '3 missed orders ends the shift. The last 45 seconds are the dinner rush.',
  ];
  lines.forEach((line, i) => ctx.fillText(line, 640, 340 + i * 32));
  ctx.fillStyle = '#7dff8a';
  ctx.font = 'bold 26px system-ui, sans-serif';
  ctx.fillText('Press ENTER to start your shift', 640, 560);
  ctx.textAlign = 'left';
}

/** Game-over screen overlay. */
export function drawGameOver(ctx, game) {
  ctx.fillStyle = 'rgba(43,33,24,0.85)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  ctx.fillStyle = '#f5b942';
  ctx.font = 'bold 52px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('SHIFT OVER!', 640, 240);
  ctx.fillStyle = '#fff';
  ctx.font = '26px system-ui, sans-serif';
  ctx.fillText(`You earned $${game.coins} ($${game.tips} in tips)  •  ${game.served} orders served  •  ${game.missed} walked out`, 640, 310);
  ctx.fillText(`Best combo x${game.bestCombo}  •  Score ${game.score}`, 640, 350);
  ctx.fillStyle = '#7dff8a';
  ctx.font = 'bold 24px system-ui, sans-serif';
  ctx.fillText('Press R to run another shift', 640, 430);
  ctx.textAlign = 'left';
}

/** One full frame. */
export function render(ctx, game) {
  // Floor
  ctx.fillStyle = COLORS.floor;
  ctx.fillRect(0, 168, VIEW.width, VIEW.height - 168);
  ctx.fillStyle = COLORS.floorDark;
  for (let y = 180; y < VIEW.height; y += 46) ctx.fillRect(0, y, VIEW.width, 3);
  ctx.fillStyle = COLORS.wall;
  ctx.fillRect(0, 168, VIEW.width, 42);
  drawOrderBoard(ctx, game);
  drawPantry(ctx, game);
  drawGrill(ctx, game);
  drawBoard(ctx, game);
  drawAssembly(ctx, game);
  drawWindow(ctx, game);
  drawChef(ctx, game);
  drawHud(ctx, game);
  drawOverlays(ctx, game);
  if (game.screen === 'title') drawTitle(ctx, game);
  if (game.screen === 'over') drawGameOver(ctx, game);
}
