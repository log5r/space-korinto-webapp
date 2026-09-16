window.SpaceKorinto.createRenderer = function (canvas, state, board, fmtTime) {
'use strict';

const { W, H, HUD_H, WALL, L, Rgt, T, B, R, PIN_R, FIELD_L, ARC_CX, ARC_CY, ARC_R, HANDLE_DEAD, MAX_MULTIPLIER, rand } = window.SpaceKorinto;
const ctx = canvas.getContext('2d');
canvas.width = W; canvas.height = H;

// ---------------------------------------------------------------- textures
// brushed stainless: base gradient across the brushing direction + many faint scratches along it
function makeBrushedTexture(w, h, stops, vertical, alphaMax, count) {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  const c = cv.getContext('2d');
  const g = vertical ? c.createLinearGradient(0, 0, w, 0) : c.createLinearGradient(0, 0, 0, h);
  stops.forEach(([p, col]) => g.addColorStop(p, col));
  c.fillStyle = g; c.fillRect(0, 0, w, h);
  c.lineWidth = 1;
  for (let i = 0; i < count; i++) {
    const a = rand(0, alphaMax), light = Math.random() < 0.5;
    c.strokeStyle = light ? `rgba(255,255,255,${a})` : `rgba(0,0,0,${a * 1.4})`;
    const px = rand(0, w), py = rand(0, h), len = rand(20, 180);
    c.beginPath(); c.moveTo(px, py);
    if (vertical) c.lineTo(px, py + len); else c.lineTo(px + len, py);
    c.stroke();
  }
  return cv;
}
const STEEL = [[0, '#9aa1a8'], [0.25, '#d6dbe0'], [0.5, '#aab1b8'], [0.75, '#c9ced4'], [1, '#858c93']];
const LED_RAIL = '#4ff5ff';        // cyan LED strip along the rails
const HANDLE_LED = '#4f9dff';      // handle gauge LED: the player's colour
const LED_BLUE = '#dff6ff', LED_BLUE_GLOW = '#8fd8ff', GOLD = '#ffd23f';
const railTexH = makeBrushedTexture(W, WALL, STEEL, false, 0.10, 500);        // bottom rail
const railTexV = makeBrushedTexture(WALL, H, STEEL, true, 0.10, 500);         // side rails
const cornerTex = makeBrushedTexture(W, ARC_R, STEEL, false, 0.08, 400);      // frame corners outside the arc

function hexBolt(c, x, y, r, tone = '#c9ced4') {
  c.save();
  c.fillStyle = 'rgba(0,0,0,.45)'; c.beginPath(); c.arc(x + 1, y + 1.5, r + 1, 0, Math.PI * 2); c.fill();
  const g = c.createRadialGradient(x - r * 0.4, y - r * 0.4, 1, x, y, r);
  g.addColorStop(0, '#f4f6f8'); g.addColorStop(0.5, tone); g.addColorStop(1, '#4e555c');
  c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
  // hex socket
  c.fillStyle = 'rgba(0,0,0,.55)'; c.beginPath();
  for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3 + 0.3, hr = r * 0.5; c[i ? 'lineTo' : 'moveTo'](x + Math.cos(a) * hr, y + Math.sin(a) * hr); }
  c.closePath(); c.fill();
  c.restore();
}
function roundRect(c, x, y, w, h, r) {
  c.beginPath(); c.moveTo(x + r, y); c.lineTo(x + w - r, y); c.quadraticCurveTo(x + w, y, x + w, y + r);
  c.lineTo(x + w, y + h - r); c.quadraticCurveTo(x + w, y + h, x + w - r, y + h); c.lineTo(x + r, y + h);
  c.quadraticCurveTo(x, y + h, x, y + h - r); c.lineTo(x, y + r); c.quadraticCurveTo(x, y, x + r, y); c.closePath();
}
// the playfield outline: straight sides and bottom, semicircular top
function fieldPath(c, inset = 0) {
  c.beginPath();
  c.moveTo(L + inset, B - inset);
  c.lineTo(L + inset, ARC_CY);
  c.arc(ARC_CX, ARC_CY, ARC_R - inset, Math.PI, Math.PI * 2);
  c.lineTo(Rgt - inset, B - inset);
  c.closePath();
}
// chrome bar with a drop shadow (lane dividers, outlane walls, flipper guides)
function chromeLine(c, ax, ay, bx, by, w = 4) {
  c.save(); c.lineCap = 'round';
  c.strokeStyle = 'rgba(0,0,0,.5)'; c.lineWidth = w + 2; c.beginPath(); c.moveTo(ax + 1, ay + 2); c.lineTo(bx + 1, by + 2); c.stroke();
  const g = c.createLinearGradient(ax, ay - w, ax, ay + w); g.addColorStop(0, '#f4f6f8'); g.addColorStop(0.5, '#aab1b8'); g.addColorStop(1, '#5b626a');
  c.strokeStyle = g; c.lineWidth = w; c.beginPath(); c.moveTo(ax, ay); c.lineTo(bx, by); c.stroke();
  c.restore();
}
// silver pin, pre-rendered once (there are a couple of hundred of them)
const pinSprite = (() => {
  const s = Math.ceil(PIN_R * 2 + 8), cv = document.createElement('canvas'); cv.width = s; cv.height = s;
  const c = cv.getContext('2d'), cx = s / 2 - 1, cy = s / 2 - 1.5, r = PIN_R;
  c.fillStyle = 'rgba(0,0,0,.55)'; c.beginPath(); c.ellipse(cx + 1.5, cy + 2.5, r + 0.6, r + 0.2, 0, 0, Math.PI * 2); c.fill();
  const g = c.createRadialGradient(cx - r * 0.4, cy - r * 0.4, 0.3, cx, cy, r);
  g.addColorStop(0, '#ffffff'); g.addColorStop(0.5, '#c9ced4'); g.addColorStop(1, '#4e555c');
  c.fillStyle = g; c.beginPath(); c.arc(cx, cy, r, 0, Math.PI * 2); c.fill();
  return { cv, ox: cx, oy: cy };
})();

// ---------------------------------------------------------------- static background (cabinet + space + pins)
const bgCanvas = document.createElement('canvas'); bgCanvas.width = W; bgCanvas.height = H;
let backgroundPins;
function drawStaticBackground() {
  backgroundPins = board.pins;
  const c = bgCanvas.getContext('2d');
  c.clearRect(0, 0, W, H);
  // stainless frame: the top corners outside the arc are frame too
  c.drawImage(cornerTex, 0, HUD_H); c.drawImage(railTexH, 0, B);
  c.drawImage(railTexV, 0, 0); c.drawImage(railTexV, Rgt, 0);
  c.strokeStyle = 'rgba(0,0,0,.35)'; c.lineWidth = 1;
  [[0, H, L, B], [W, H, Rgt, B]].forEach(([x0, y0, x1, y1]) => { c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke(); });
  // deep space playfield: navy gradient, nebulae, stars, a planet peeking in at the lower left
  c.save(); fieldPath(c); c.clip();
  const g = c.createLinearGradient(0, T, 0, B); g.addColorStop(0, '#0a1040'); g.addColorStop(0.5, '#060a2c'); g.addColorStop(1, '#03041a');
  c.fillStyle = g; c.fillRect(0, 0, W, H);
  const neb = (x, y, r, col) => { const rg = c.createRadialGradient(x, y, 0, x, y, r); rg.addColorStop(0, col); rg.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = rg; c.fillRect(x - r, y - r, r * 2, r * 2); };
  neb(140, 330, 190, 'rgba(120,50,220,0.26)'); neb(470, 240, 170, 'rgba(0,160,255,0.2)'); neb(330, 700, 150, 'rgba(255,90,170,0.14)');
  for (let i = 0; i < 160; i++) {
    const x = L + rand(0, Rgt - L), y = T + rand(0, B - T), s = rand(0.4, 1.8), a = rand(0.35, 1);
    c.fillStyle = `rgba(255,255,255,${a})`; c.beginPath(); c.arc(x, y, s, 0, Math.PI * 2); c.fill();
    if (s > 1.5) { c.strokeStyle = `rgba(200,230,255,${a * 0.5})`; c.lineWidth = 0.6; c.beginPath(); c.moveTo(x - 5, y); c.lineTo(x + 5, y); c.moveTo(x, y - 5); c.lineTo(x, y + 5); c.stroke(); }
  }
  const pg = c.createRadialGradient(80, 800, 10, 100, 820, 120); pg.addColorStop(0, 'rgba(255,170,90,0.55)'); pg.addColorStop(0.6, 'rgba(200,80,40,0.35)'); pg.addColorStop(1, 'rgba(60,20,20,0)');
  c.fillStyle = pg; c.beginPath(); c.arc(100, 820, 120, 0, Math.PI * 2); c.fill();
  // inner shadow from the rails and the arc
  const sh = 18;
  [[L, 0, L + sh, 0], [Rgt, 0, Rgt - sh, 0], [0, B, 0, B - sh]].forEach(([x0, y0, x1, y1]) => {
    const gg = c.createLinearGradient(x0, y0, x1, y1); gg.addColorStop(0, 'rgba(0,0,0,.55)'); gg.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = gg; c.fillRect(L, T, Rgt - L, B - T);
  });
  const ag = c.createRadialGradient(ARC_CX, ARC_CY, ARC_R - sh, ARC_CX, ARC_CY, ARC_R); ag.addColorStop(0, 'rgba(0,0,0,0)'); ag.addColorStop(1, 'rgba(0,0,0,.55)');
  c.fillStyle = ag; c.fillRect(L, T, Rgt - L, ARC_R);
  // the drain: a red glow at the bottom between the flippers
  const dg = c.createRadialGradient(board.drain.x, B, 4, board.drain.x, B, 60); dg.addColorStop(0, 'rgba(255,92,92,.35)'); dg.addColorStop(1, 'rgba(255,92,92,0)');
  c.fillStyle = dg; c.fillRect(board.drain.x - 60, B - 60, 120, 60);
  c.font = '600 9px "Chakra Petch", "Helvetica Neue", Arial, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillStyle = 'rgba(255,140,140,.8)'; c.fillText('OUT', board.drain.x, B - 10);
  c.fillStyle = 'rgba(255,210,63,.55)'; c.fillText('AUTO FLIPPER', board.drain.x, B - 24);
  c.fillStyle = 'rgba(200,220,255,.75)'; c.fillText('HYPERSPACE', ARC_CX, board.timed ? 170 : 192);
  c.restore();
  // rail lip: bright edge on the inside, dark groove a little further out
  c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = 1; fieldPath(c, -0.5); c.stroke();
  c.strokeStyle = 'rgba(0,0,0,.6)'; fieldPath(c, -3.5); c.stroke();
  // cyan LED strip running just inside the rails
  c.save(); c.lineJoin = 'round';
  for (let i = 2; i >= 1; i--) {
    c.shadowColor = LED_RAIL; c.shadowBlur = 8 * i; c.strokeStyle = LED_RAIL; c.globalAlpha = 0.5; c.lineWidth = 1.5;
    fieldPath(c, 5); c.stroke();
  }
  c.shadowBlur = 0; c.globalAlpha = 1; c.strokeStyle = '#fff'; c.lineWidth = 0.7; fieldPath(c, 5); c.stroke();
  c.restore();
  // launch lane: chrome divider wall with a hinged return flap at its top
  const lg = c.createLinearGradient(FIELD_L - 5, 0, FIELD_L + 1, 0);
  STEEL.forEach(([p, col]) => lg.addColorStop(p, col));
  c.fillStyle = 'rgba(0,0,0,.5)'; c.fillRect(FIELD_L - 3, ARC_CY, 7, B - ARC_CY);
  c.fillStyle = lg; c.fillRect(FIELD_L - 5, ARC_CY, 6, B - ARC_CY);
  c.strokeStyle = 'rgba(255,255,255,.5)'; c.beginPath(); c.moveTo(FIELD_L - 4.5, ARC_CY); c.lineTo(FIELD_L - 4.5, B); c.stroke();
  const flap = board.segs.find(s => s.flap);
  chromeLine(c, flap.ax, flap.ay, flap.bx, flap.by, 3);
  // static chrome: lane dividers, outlane walls, flipper guides
  for (const s of board.segs) if (s.w && !s.sling) chromeLine(c, s.ax, s.ay, s.bx, s.by, s.w);
  // pins are part of the board, so they go into the static layer too
  for (const n of board.pins) if (!n.gateZone) c.drawImage(pinSprite.cv, n.x - pinSprite.ox, n.y - pinSprite.oy);
  // hex socket bolts at the corners and mid-rails
  [[14, HUD_H + 14], [W - 14, HUD_H + 14], [14, H - 14], [W - 14, H - 14], [14, (T + B) / 2], [W - 14, (T + B) / 2]]
    .forEach(([x, y]) => hexBolt(c, x, y, 6));
  // HUD bezel: polished chrome with a black glass window
  const pg2 = c.createLinearGradient(0, 0, 0, HUD_H);
  pg2.addColorStop(0, '#e9edf0'); pg2.addColorStop(0.18, '#7f868e'); pg2.addColorStop(0.5, '#c7ccd1'); pg2.addColorStop(0.85, '#5b626a'); pg2.addColorStop(1, '#d9dee3');
  c.fillStyle = pg2; c.fillRect(0, 0, W, HUD_H);
  c.fillStyle = '#05070c'; roundRect(c, 6, 6, W - 12, HUD_H - 14, 4); c.fill();
  c.fillStyle = 'rgba(255,255,255,.35)'; c.fillRect(0, 0, W, 1);
}
drawStaticBackground();

// ---------------------------------------------------------------- features
function drawPinFlashes() {
  for (const n of board.pins) {
    if (n.flash <= 0 || (state.modeId !== 'infinite' && n.gateZone)) continue;
    ctx.save(); ctx.shadowColor = LED_RAIL; ctx.shadowBlur = 10 * n.flash;
    ctx.fillStyle = `rgba(200,251,255,${0.9 * n.flash})`;
    ctx.beginPath(); ctx.arc(n.x, n.y, n.r + 1.2 * n.flash, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
}
function drawLanes() {
  for (const l of board.lanes) {
    if (board.timed) {
      ctx.save(); ctx.strokeStyle = l.lit ? GOLD : '#446888'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(l.x - l.halfWidth, l.y); ctx.lineTo(l.x + l.halfWidth, l.y); ctx.stroke();
      ctx.fillStyle = '#a2c6d2'; ctx.font = '10px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(l.x < 300 ? 'LOW' : l.x > 300 ? 'HIGH' : 'MID', l.x, l.y + 19); ctx.restore();
    }
    ctx.save(); ctx.beginPath(); ctx.arc(l.x, l.y, 6, 0, Math.PI * 2);
    if (l.lit) { ctx.fillStyle = GOLD; ctx.shadowColor = GOLD; ctx.shadowBlur = 14; ctx.fill(); }
    else { ctx.fillStyle = '#1a1e4a'; ctx.fill(); ctx.strokeStyle = '#6a74c8'; ctx.lineWidth = 1.2; ctx.stroke(); }
    ctx.restore();
  }
}
// gas-giant bumper with a glowing ring; it lights up white for an instant when hit
function drawBumpers() {
  for (const p of board.bumpers) {
    const { x, y, r } = p, lit = p.flash > 0;
    ctx.save();
    if (lit) { ctx.shadowColor = GOLD; ctx.shadowBlur = 30 * p.flash; }
    ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.beginPath(); ctx.arc(x + 3, y + 5, r, 0, Math.PI * 2); ctx.fill();
    const g = ctx.createRadialGradient(x - r * 0.4, y - r * 0.4, r * 0.1, x, y, r);
    g.addColorStop(0, lit ? '#fff' : p.base); g.addColorStop(0.6, p.base); g.addColorStop(1, p.dark);
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.save(); ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.clip();
    ctx.strokeStyle = 'rgba(255,255,255,.18)'; ctx.lineWidth = 3;
    for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.ellipse(x, y + i * r * 0.32, r * 1.1, r * 0.16, 0, 0, Math.PI * 2); ctx.stroke(); }
    ctx.restore();
    ctx.strokeStyle = lit ? '#fff' : p.ring; ctx.lineWidth = 3.5; ctx.shadowColor = p.ring; ctx.shadowBlur = 8 + 14 * p.flash;
    ctx.beginPath(); ctx.ellipse(x, y, r * 1.55, r * 0.42, -0.25, 0, Math.PI * 2); ctx.stroke();
    ctx.shadowBlur = 0; ctx.fillStyle = '#fff'; ctx.font = '800 10px "JetBrains Mono", "Menlo", "SF Mono", Consolas, monospace';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('100', x, y + 1);
    ctx.restore();
  }
}
// wormhole: a dark disc with slowly turning spiral arms and a coloured event-horizon ring
function drawHoles() {
  for (const h of board.holes) {
    const { x, y, r } = h, big = h.type === 'black';
    const reward = window.SpaceKorinto.holeReward(h, state.modeId, board.gate.side, board.gate.clock);
    const color = reward.lit ? h.color : '#69748b';
    const rgba = a => color.length === 7 ? `rgba(${parseInt(color.slice(1, 3), 16)},${parseInt(color.slice(3, 5), 16)},${parseInt(color.slice(5, 7), 16)},${a})` : color;
    ctx.save();
    const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, '#000'); g.addColorStop(0.55, '#02030c'); g.addColorStop(1, rgba(0.35));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = rgba(0.6); ctx.lineWidth = 1.2;
    for (let k = 0; k < 3; k++) {
      ctx.beginPath();
      for (let s = 0; s < 2.2; s += 0.08) { const rr = r * 0.15 + s * r * 0.36, a = s * 2.6 + k * 2.1 + h.spin; const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr * 0.75; s === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py); }
      ctx.stroke();
    }
    ctx.shadowColor = color; ctx.shadowBlur = (big ? 26 : 14) + 20 * h.flash; ctx.strokeStyle = h.flash > 0.5 ? '#fff' : color; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke();
    ctx.shadowBlur = 0; ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(x, y, r + 2.5, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = color; ctx.shadowColor = color; ctx.shadowBlur = 8;
    ctx.font = `600 ${big ? 11 : 9}px "Chakra Petch", "Helvetica Neue", Arial, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.fillText(big ? `${h.label} ${reward.points}` : String(reward.points), x, y + r + 6);
    if (state.modeId === 'normal' && !big) {
      ctx.font = '600 9px sans-serif';
      ctx.fillText(`+${reward.payout} BALL`, x, y + r + 18);
    }
    ctx.restore();
  }
}
// Recessed instrument screen: decorative only; the gate and balls pass in front.
function drawGateDisplay(g) {
  const x = 216, y = 410, w = 168, h = 44;
  const t = window.SpaceKorinto.i18n.t;
  const remaining = Math.max(0, 10 - g.clock % 10);
  const side = g.warning ? -g.side : g.side;
  const grace = state.modeId === 'timed' && window.SpaceKorinto.timedGateGrace(g.clock);
  const color = g.warning ? '#ffc568' : '#70eeff';
  ctx.save();
  // Dark inset seam and a brushed-metal bevel match the score display housing.
  ctx.fillStyle = '#02050a'; roundRect(ctx, x - 2, y - 2, w + 4, h + 4, 6); ctx.fill();
  const frame = ctx.createLinearGradient(x, y, x, y + h);
  frame.addColorStop(0, '#c4ced5'); frame.addColorStop(0.12, '#62717d');
  frame.addColorStop(0.5, '#293440'); frame.addColorStop(1, '#8b99a4');
  ctx.fillStyle = frame; roundRect(ctx, x, y, w, h, 4); ctx.fill();
  ctx.fillStyle = '#030b12'; roundRect(ctx, x + 9, y + 4, w - 18, h - 8, 3); ctx.fill();
  ctx.strokeStyle = '#111b24'; ctx.lineWidth = 1; ctx.stroke();
  for (const sx of [x + 5, x + w - 5]) for (const sy of [y + 7, y + h - 7]) {
    ctx.fillStyle = '#a1adb7'; ctx.beginPath(); ctx.arc(sx, sy, 1.8, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#34404b'; ctx.beginPath(); ctx.moveTo(sx - 1, sy + 0.5); ctx.lineTo(sx + 1, sy - 0.5); ctx.stroke();
  }
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = color; ctx.shadowColor = color; ctx.shadowBlur = 4;
  ctx.font = '700 15px "Chakra Petch", "Menlo", sans-serif';
  ctx.fillText((grace ? '◀ BOTH ▶' : t(side < 0 ? 'gateLeft' : 'gateRight')) + (state.modeId === 'timed' ? ' ×2' : ''), x + w / 2, y + 14);
  ctx.shadowBlur = 0; ctx.font = '10px sans-serif';
  ctx.fillStyle = g.warning ? '#ffdb9e' : '#a2c6d2';
  ctx.fillText(grace ? t('gateGrace') : g.warning ? t('gateCountdown', { seconds: Math.ceil(remaining) })
    : t(state.modeId === 'timed' ? (side < 0 ? 'gateTimedLow' : 'gateTimedHigh') : (side < 0 ? 'gateLowPower' : 'gateHighPower')), x + w / 2, y + 28);
  ctx.fillStyle = '#1e303c'; ctx.fillRect(x + 16, y + h - 9, w - 32, 2);
  ctx.fillStyle = color; ctx.fillRect(x + 16, y + h - 9, (w - 32) * remaining / 10, 2);
  // A restrained glass reflection keeps the text legible without a flashing effect.
  const glass = ctx.createLinearGradient(0, y + 4, 0, y + 23);
  glass.addColorStop(0, 'rgba(220,244,255,.09)'); glass.addColorStop(1, 'rgba(220,244,255,0)');
  ctx.fillStyle = glass; ctx.fillRect(x + 11, y + 5, w - 22, 18);
  ctx.restore();
}
function drawGate() {
  if (state.modeId === 'infinite') {
    for (const n of board.pins) if (n.gateZone) ctx.drawImage(pinSprite.cv, n.x - pinSprite.ox, n.y - pinSprite.oy);
    return;
  }
  const g = board.gate, color = '#4ff5ff';
  drawGateDisplay(g);
  ctx.save();
  ctx.translate(g.px, g.py); ctx.rotate(g.angle);
  chromeLine(ctx, -g.len, 0, g.len, 0, 12);
  ctx.strokeStyle = color; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(-g.len + 8, -2); ctx.lineTo(g.len - 8, -2); ctx.stroke();
  ctx.fillStyle = color; ctx.beginPath(); ctx.arc(g.side * (g.len - 8), 0, 7, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#172b42'; ctx.beginPath(); ctx.arc(0, 0, 13, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = color; ctx.stroke(); ctx.restore();

}
function drawStars() {
  for (const s of board.stars) {
    ctx.save(); ctx.translate(s.x, s.y);
    const lit = s.flash > 0;
    ctx.fillStyle = lit ? '#fff' : GOLD; ctx.shadowColor = GOLD; ctx.shadowBlur = 10 + 14 * s.flash;
    ctx.beginPath();
    for (let i = 0; i < 10; i++) { const r = i % 2 ? 4 : 9, a = -Math.PI / 2 + i * Math.PI / 5; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
    ctx.closePath(); ctx.fill();
    ctx.restore();
  }
}
function drawSlings() {
  for (const s of board.slings) {
    ctx.save(); ctx.beginPath(); s.pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.closePath();
    ctx.fillStyle = s.flash > 0 ? GOLD : '#20265e';
    if (s.flash > 0) { ctx.shadowColor = GOLD; ctx.shadowBlur = 20 * s.flash; }
    ctx.fill(); ctx.shadowBlur = 0;
    ctx.strokeStyle = '#c8ccff'; ctx.lineWidth = 3; ctx.lineJoin = 'round'; ctx.stroke();
    ctx.strokeStyle = s.flash > 0 ? '#fff' : '#ff5ce0'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(s.pts[0][0], s.pts[0][1]); ctx.lineTo(s.pts[2][0], s.pts[2][1]); ctx.stroke();
    ctx.restore();
  }
}
// chrome flipper with a yellow light line; the line burns brighter while it swings
function drawFlippers() {
  for (const f of board.flippers) {
    const { px, py, angle, len, r0, r1 } = f;
    const tx = px + Math.cos(angle) * len, ty = py + Math.sin(angle) * len, nx = -Math.sin(angle), ny = Math.cos(angle);
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.beginPath(); ctx.arc(px + 2, py + 4, r0, 0, Math.PI * 2); ctx.arc(tx + 2, ty + 4, r1, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.moveTo(px + nx * r0, py + ny * r0); ctx.lineTo(tx + nx * r1, ty + ny * r1);
    ctx.arc(tx, ty, r1, angle + Math.PI / 2, angle - Math.PI / 2, true); ctx.lineTo(px - nx * r0, py - ny * r0);
    ctx.arc(px, py, r0, angle - Math.PI / 2, angle + Math.PI / 2, true); ctx.closePath();
    const g = ctx.createLinearGradient(px + nx * 8, py + ny * 8, px - nx * 8, py - ny * 8);
    g.addColorStop(0, '#f4f6f8'); g.addColorStop(0.5, '#aab1b8'); g.addColorStop(1, '#4e555c');
    ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.stroke();
    ctx.shadowColor = GOLD; ctx.shadowBlur = f.pressed ? 18 : 8; ctx.strokeStyle = f.pressed ? '#fff' : GOLD; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(px + Math.cos(angle) * 8, py + Math.sin(angle) * 8); ctx.lineTo(tx - Math.cos(angle) * 4, ty - Math.sin(angle) * 4); ctx.stroke();
    ctx.shadowBlur = 0; hexBolt(ctx, px, py, 3.5);
    ctx.restore();
  }
}

// ---------------------------------------------------------------- ball
// mirror-polished stainless (from Easy Block Breaker); the rail reflection along the bottom is cyan here
function drawBall(b, scale = 1) {
  const x = b.x, y = b.y, R = b.r * scale;
  // faint motion blur trail
  for (let i = b.trail.length - 1; i >= 1; i--) {
    const t = b.trail[i]; ctx.globalAlpha = 0.05 * (1 - i / b.trail.length);
    ctx.fillStyle = '#c8ccd0'; ctx.beginPath(); ctx.arc(t.x, t.y, R, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
  // contact shadow on the board (light comes from upper-left)
  const sg = ctx.createRadialGradient(x + 4, y + 6, R * 0.2, x + 4, y + 6, R * 1.7);
  sg.addColorStop(0, 'rgba(0,0,0,.6)'); sg.addColorStop(0.6, 'rgba(0,0,0,.28)'); sg.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = sg; ctx.beginPath(); ctx.ellipse(x + 4, y + 6, R * 1.6, R * 1.35, 0, 0, Math.PI * 2); ctx.fill();
  // mirror-polished stainless: what sells the finish is contrast and sharp edges in the reflection, not a smooth
  // shading gradient. The sphere reflects the cabinet: a bright overhead "sky" that darkens toward the horizon, the
  // matte board below it, the LED rail at the bottom, and the two chrome side rails as thin vertical streaks.
  const bg = ctx.createRadialGradient(x - R * 0.40, y - R * 0.42, R * 0.04, x - R * 0.08, y - R * 0.05, R * 1.08);
  bg.addColorStop(0, '#ffffff'); bg.addColorStop(0.16, '#f5f7f9'); bg.addColorStop(0.36, '#c4cad0');
  bg.addColorStop(0.56, '#6a7178'); bg.addColorStop(0.76, '#23272c'); bg.addColorStop(0.90, '#0e1013'); bg.addColorStop(1, '#2c3136');
  ctx.fillStyle = bg; ctx.beginPath(); ctx.arc(x, y, R, 0, Math.PI * 2); ctx.fill();
  ctx.save(); ctx.beginPath(); ctx.arc(x, y, R, 0, Math.PI * 2); ctx.clip();
  // sky: near-white at the top, a thin dark band where the top rail reflects, then falling off to mid-grey at the horizon
  const sky = ctx.createLinearGradient(0, y - R, 0, y + R * 0.02);
  sky.addColorStop(0, 'rgba(255,255,255,.70)'); sky.addColorStop(0.10, 'rgba(255,255,255,.55)');
  sky.addColorStop(0.16, 'rgba(60,66,72,.30)'); sky.addColorStop(0.22, 'rgba(255,255,255,.35)');
  sky.addColorStop(0.60, 'rgba(210,216,222,.10)'); sky.addColorStop(1, 'rgba(120,128,136,0)');
  ctx.fillStyle = sky; ctx.fillRect(x - R, y - R, R * 2, R * 1.04);
  // ground: the board's reflection, a hard horizon slightly bowed by the curvature (we look down on it, so it sits a
  // touch above centre), near-black at the horizon, easing to a lighter grey where the board catches the rail light
  ctx.beginPath();
  ctx.moveTo(x - R * 1.02, y + R * 0.08);
  ctx.quadraticCurveTo(x, y - R * 0.16, x + R * 1.02, y + R * 0.08);
  ctx.lineTo(x + R * 1.02, y + R * 1.02); ctx.lineTo(x - R * 1.02, y + R * 1.02); ctx.closePath();
  const gnd = ctx.createLinearGradient(0, y - R * 0.05, 0, y + R);
  gnd.addColorStop(0, 'rgba(6,8,10,.92)'); gnd.addColorStop(0.22, 'rgba(14,17,20,.85)');
  gnd.addColorStop(0.55, 'rgba(58,64,70,.68)'); gnd.addColorStop(0.78, 'rgba(112,120,128,.55)');
  gnd.addColorStop(0.90, 'rgba(60,66,72,.6)'); gnd.addColorStop(1, 'rgba(20,22,25,.7)');
  ctx.fillStyle = gnd; ctx.fill();
  // bottom rail: the LED strip reflects as a bright arc hugging the lower edge, fading out toward the sides
  const led = ctx.createLinearGradient(x - R, 0, x + R, 0);
  led.addColorStop(0, 'rgba(180,240,255,0)'); led.addColorStop(0.3, 'rgba(180,240,255,.7)');
  led.addColorStop(0.7, 'rgba(180,240,255,.7)'); led.addColorStop(1, 'rgba(180,240,255,0)');
  ctx.strokeStyle = led; ctx.lineWidth = Math.max(1, R * 0.09);
  ctx.beginPath(); ctx.arc(x, y, R * 0.91, Math.PI * 0.26, Math.PI * 0.74); ctx.stroke();
  // side rails: thin bright streaks curving with the surface near the left and right limbs
  const rail = ctx.createLinearGradient(0, y - R, 0, y + R);
  rail.addColorStop(0, 'rgba(255,255,255,0)'); rail.addColorStop(0.3, 'rgba(255,255,255,.4)');
  rail.addColorStop(0.7, 'rgba(255,255,255,.3)'); rail.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.strokeStyle = rail; ctx.lineWidth = Math.max(0.8, R * 0.06);
  ctx.beginPath(); ctx.arc(x, y, R * 0.90, Math.PI * 0.78, Math.PI * 1.22); ctx.stroke();
  ctx.beginPath(); ctx.arc(x, y, R * 0.90, -Math.PI * 0.24, Math.PI * 0.24); ctx.stroke();
  // fresnel: the limb goes dark just inside the edge, then a hairline of reflected light on the very rim
  const fg = ctx.createRadialGradient(x, y, R * 0.72, x, y, R);
  fg.addColorStop(0, 'rgba(0,0,0,0)'); fg.addColorStop(0.75, 'rgba(0,0,0,.35)'); fg.addColorStop(1, 'rgba(0,0,0,.7)');
  ctx.fillStyle = fg; ctx.fillRect(x - R, y - R, R * 2, R * 2);
  ctx.restore();
  const rim = ctx.createLinearGradient(x - R, y - R, x + R, y + R);
  rim.addColorStop(0, 'rgba(255,255,255,.8)'); rim.addColorStop(0.5, 'rgba(255,255,255,.3)'); rim.addColorStop(1, 'rgba(255,255,255,.55)');
  ctx.strokeStyle = rim; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.arc(x, y, R - 0.5, 0, Math.PI * 2); ctx.stroke();
  // specular: a pin-sharp key light with a soft bloom around it, plus a small hard glint from the rail LED
  const bloom = ctx.createRadialGradient(x - R * 0.40, y - R * 0.44, 0, x - R * 0.40, y - R * 0.44, R * 0.55);
  bloom.addColorStop(0, 'rgba(255,255,255,.55)'); bloom.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = bloom; ctx.beginPath(); ctx.arc(x - R * 0.40, y - R * 0.44, R * 0.55, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath(); ctx.ellipse(x - R * 0.42, y - R * 0.46, R * 0.20, R * 0.12, -0.7, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(224,244,255,.85)';
  ctx.beginPath(); ctx.arc(x + R * 0.36, y + R * 0.46, R * 0.09, 0, Math.PI * 2); ctx.fill();
}

// ---------------------------------------------------------------- handle gauge
// black glass plate set into the bottom rail with a blue LED bar: how hard the next ball is fired
function drawHandle() {
  const gw = 220, x0 = W / 2 - gw / 2, y0 = B - 2, h = WALL - 4, k = state.handle;
  ctx.save();
  ctx.fillStyle = '#0a1018'; roundRect(ctx, x0, y0, gw, h, 4); ctx.fill();
  const rg = ctx.createLinearGradient(0, y0, 0, y0 + h);
  rg.addColorStop(0, 'rgba(255,255,255,.22)'); rg.addColorStop(0.35, 'rgba(255,255,255,.03)'); rg.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = rg; roundRect(ctx, x0, y0, gw, h, 4); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 1; roundRect(ctx, x0 + 0.5, y0 + 0.5, gw - 1, h - 1, 4); ctx.stroke();
  ctx.strokeStyle = 'rgba(0,0,0,.7)'; roundRect(ctx, x0 - 0.5, y0 - 0.5, gw + 1, h + 1, 5); ctx.stroke();
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.font = '600 9px "Chakra Petch", "Helvetica Neue", Arial, sans-serif'; ctx.fillStyle = '#6f8aa6';
  ctx.fillText('HANDLE', x0 + 8, y0 + h / 2);
  const bx = x0 + 56, bw = gw - 64, by = y0 + 7, bh = h - 14;
  ctx.fillStyle = 'rgba(255,255,255,.08)'; roundRect(ctx, bx, by, bw, bh, 2); ctx.fill();
  const firing = k >= HANDLE_DEAD && state.mode === 'playing' && !state.paused;
  const glow = firing ? 0.85 + 0.15 * Math.sin(performance.now() / 120) : 0.55;
  ctx.shadowColor = HANDLE_LED; ctx.shadowBlur = firing ? 14 : 6;
  ctx.fillStyle = `rgba(150,200,255,${glow})`; roundRect(ctx, bx, by, Math.max(2, bw * k), bh, 2); ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = 'rgba(160,205,255,.6)'; ctx.lineWidth = 1;
  for (let i = 1; i < 10; i++) { const tx = bx + bw * i / 10; ctx.beginPath(); ctx.moveTo(tx, by); ctx.lineTo(tx, by + (i === 5 ? bh : 3)); ctx.stroke(); }
  ctx.textAlign = 'right'; ctx.fillStyle = k < HANDLE_DEAD ? '#ffb1a8' : LED_BLUE;
  ctx.font = '800 9px "JetBrains Mono", "Menlo", "SF Mono", Consolas, monospace';
  ctx.fillText(k < HANDLE_DEAD ? 'STOP' : Math.round(k * 100) + '%', x0 + gw - 6, y0 + h / 2);
  ctx.restore();
}

// ---------------------------------------------------------------- effects
function drawParticles() {
  for (const p of state.particles) {
    const k = 1 - p.t / p.life;
    if (p.ring) {
      ctx.globalAlpha = k * 0.8; ctx.strokeStyle = p.color || '#ffe9a8'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(p.x, p.y, 4 + (1 - k) * 30, 0, Math.PI * 2); ctx.stroke();
    } else if (p.sink) {
      // the swallowed ball spirals into the hole and shrinks away
      const s = p.t / p.life, x = p.x + (p.hx - p.x) * s, y = p.y + (p.hy - p.y) * s;
      ctx.globalAlpha = 1 - s * 0.6;
      drawBall({ x, y, r: R, trail: [] }, 1 - s * 0.85);
    }
  }
  ctx.globalAlpha = 1;
}
function drawPopups() {
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (const p of state.popups) {
    const k = p.t;
    ctx.globalAlpha = k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3;
    ctx.font = `800 ${p.size}px -apple-system, Helvetica, Arial, sans-serif`;
    ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,.8)';
    ctx.strokeText(p.text, p.x, p.y - k * 40); ctx.fillStyle = p.color; ctx.fillText(p.text, p.x, p.y - k * 40);
  }
  ctx.globalAlpha = 1;
}
function drawBanner() {
  const bn = state.banner; if (!bn) return;
  const k = bn.t / bn.dur, a = k < 0.15 ? k / 0.15 : k > 0.75 ? (1 - k) / 0.25 : 1;
  ctx.save(); ctx.globalAlpha = a; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const y = 500;
  ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(L, y - 44, Rgt - L, 88);
  ctx.font = '900 44px -apple-system, Helvetica, Arial, sans-serif';
  ctx.fillStyle = bn.color || LED_BLUE; ctx.strokeStyle = 'rgba(0,0,0,.6)'; ctx.lineWidth = 4;
  ctx.strokeText(bn.text, W / 2, y - (bn.sub ? 12 : 0)); ctx.fillText(bn.text, W / 2, y - (bn.sub ? 12 : 0));
  if (bn.sub) { ctx.font = '700 20px -apple-system, Helvetica, Arial, sans-serif'; ctx.fillStyle = '#fff'; ctx.strokeText(bn.sub, W / 2, y + 24); ctx.fillText(bn.sub, W / 2, y + 24); }
  ctx.restore();
}
// HUD: white-blue LED digits on black glass
function drawHUD() {
  ctx.save();
  ctx.textBaseline = 'middle';
  const plate = (x, w, label, value, valueColor = LED_BLUE) => {
    const y = 12, h = HUD_H - 24;
    ctx.fillStyle = 'rgba(255,255,255,.03)'; roundRect(ctx, x, y, w, h, 3); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.10)'; ctx.lineWidth = 1; roundRect(ctx, x + 0.5, y + 0.5, w - 1, h - 1, 3); ctx.stroke();
    ctx.textAlign = 'left'; ctx.font = '600 10px "Chakra Petch", "Helvetica Neue", Arial, sans-serif'; ctx.fillStyle = '#6f8aa6';
    ctx.fillText(label, x + 9, y + 12);
    ctx.save();
    ctx.shadowColor = valueColor === LED_BLUE ? LED_BLUE_GLOW : valueColor; ctx.shadowBlur = 10;
    ctx.textAlign = 'right'; ctx.fillStyle = valueColor;
    // digits shrink to fit when the value outgrows the plate (a 16-digit score near SCORE_MAX, hours of elapsed time)
    const font = px => `800 ${px}px "JetBrains Mono", "Menlo", "SF Mono", Consolas, monospace`;
    ctx.font = font(22);
    const tw = ctx.measureText(value).width, room = w - 18;
    if (tw > room) ctx.font = font(Math.max(10, Math.floor(22 * room / tw)));
    ctx.fillText(value, x + w - 9, y + h - 17);
    ctx.restore();
  };
  const t = Math.ceil(state.time);
  // plate layout: BEST lives inside the SCORE plate as a small caption so long scores never overflow
  const SX = 12, SW = 246, BX = 268, BW = 96, TX = 374, TW = 104, MX = 488, MW = 100;
  plate(SX, SW, 'SCORE', state.score.toLocaleString());
  // BALLS: the stock in normal mode; the infinite modes never run out
  const low = state.modeId === 'normal' && state.stock <= 6 && state.mode === 'playing';
  plate(BX, BW, 'BALLS', state.modeId === 'normal' ? state.stock.toString() : '∞', low ? '#ffb1a8' : LED_BLUE);
  // TIME counts down in the timed mode (red and blinking for the last 10 s) and counts up otherwise
  if (state.modeId === 'timed') plate(TX, TW, 'TIME', t.toString(), t <= 10 && state.mode === 'playing' && (Math.floor(state.time * 4) % 2 === 0) ? '#ff5a4a' : t <= 10 ? '#ffb1a8' : LED_BLUE);
  else plate(TX, TW, state.modeId === 'infinite' ? 'TIME ∞' : 'TIME', fmtTime(state.timeAlive));
  plate(MX, MW, 'MULT', '×' + state.multiplier, state.multiplier > 1 ? '#ffd27a' : LED_BLUE);
  // BEST: small caption in the SCORE plate's label row; turns gold while the current run is beating it
  const beating = state.mode === 'playing' && state.score > 0 && state.score >= state.best;
  ctx.textAlign = 'right'; ctx.font = '700 10px "JetBrains Mono", "Menlo", "SF Mono", Consolas, monospace';
  ctx.fillStyle = beating ? '#ffd27a' : '#a9c8dc';
  ctx.fillText('BEST ' + state.best.toLocaleString(), SX + SW - 9, 12 + 12);
  // hyperspace lanes lit, in the MULT plate's label row; the bar under it fills as lanes light up
  const lit = board.lanes.filter(l => l.lit).length;
  ctx.fillStyle = '#6f8aa6'; ctx.fillText(`${lit}/${board.lanes.length}`, MX + MW - 9, 12 + 12);
  const bx = MX + 8, bw = MW - 16, by = HUD_H - 15;
  ctx.fillStyle = 'rgba(143,216,255,.12)'; ctx.fillRect(bx, by, bw, 3);
  ctx.fillStyle = state.multiplier >= MAX_MULTIPLIER ? '#ffd27a' : LED_BLUE; ctx.fillRect(bx, by, bw * lit / board.lanes.length, 3);
  ctx.restore();
}

// impact feedback: state.glow is a smoothed 0..1 value that swells after a hole entry and eases back
function drawImpactGlow() {
  const k = state.glow;
  if (!state.flashFx || k <= 0.005) return;
  ctx.save();
  const col = state.hitColor || LED_RAIL;
  ctx.lineJoin = 'round'; ctx.strokeStyle = col; ctx.shadowColor = col;
  for (let i = 3; i >= 1; i--) {
    ctx.shadowBlur = 10 * i + k * 14; ctx.globalAlpha = k * 0.45; ctx.lineWidth = 1.5 + k;
    fieldPath(ctx, 5); ctx.stroke();
  }
  ctx.shadowBlur = 0; ctx.globalAlpha = k * 0.9; ctx.strokeStyle = '#fff'; ctx.lineWidth = 1;
  fieldPath(ctx, 5); ctx.stroke();
  ctx.restore();
}
function drawImpactFlash() {
  const k = state.glow;
  if (!state.flashFx || k <= 0.005) return;
  ctx.save();
  ctx.globalAlpha = k * 0.1;
  ctx.fillStyle = state.hitColor || '#fff';
  fieldPath(ctx); ctx.fill();
  ctx.restore();
}

function render() {
  if (backgroundPins !== board.pins) drawStaticBackground();
  ctx.save();
  ctx.drawImage(bgCanvas, 0, 0);
  drawImpactGlow();
  // play area clip for everything on the board
  ctx.save(); fieldPath(ctx); ctx.clip();
  drawPinFlashes();
  drawLanes();
  drawHoles();
  drawStars();
  drawSlings();
  drawBumpers();
  drawGate();
  drawFlippers();
  drawParticles();
  for (const b of state.balls) drawBall(b);
  drawPopups();
  drawImpactFlash();
  ctx.restore();
  drawHandle();
  drawBanner();
  ctx.restore();
  drawHUD();
}

return { render };
};
