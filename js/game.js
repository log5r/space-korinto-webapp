// Game state, rules, controls, physics and animation loop.
(() => {
'use strict';

const { W, H, L, Rgt, T, B, R, FIELD_L, LANE_W, CX, ARC_CX, ARC_CY, ARC_R, GRAVITY, MAX_SPEED, LAUNCH_MIN, LAUNCH_MAX, LAUNCH_INTERVAL, HANDLE_DEAD,
        TIME_LIMIT, START_BALLS, MAX_BALLS_IN_PLAY, HOLES, BUMPER_POINTS, BUMPER_KICK, SLING_POINTS, SLING_KICK, STAR_POINTS,
        LANE_POINTS, LANE_REPEAT_POINTS, LANES_BONUS, MAX_MULTIPLIER, FLIPPER_SPEED, FLIPPER_HOLD, FLIPPER_COOLDOWN, SCORE_MAX, SCORE_LIMIT_RETURN, clamp, rand, lerp } = window.SpaceKorinto;
const { t, labelButton } = window.SpaceKorinto.i18n;
const canvas = document.getElementById('c');
const sound = window.SpaceKorinto.createAudio();
const { initAudio, sfx } = sound;
const board = window.SpaceKorinto.createBoard(localStorage.getItem('korinto_mode') === 'timed');
function configureBoard() {
  if (board.timed !== (state.modeId === 'timed')) {
    Object.assign(board, window.SpaceKorinto.createBoard(state.modeId === 'timed'));
    state.balls = [];
  }
}

// ---------------------------------------------------------------- game state
const MODES = ['normal', 'timed', 'infinite'];
// best scores are kept per mode: an endless run would otherwise bury every normal-mode score
const bestKey = id => 'korinto_best_' + id;
const loadBest = id => +(localStorage.getItem(bestKey(id)) || 0);
const savedMode = localStorage.getItem('korinto_mode');
const state = {
  mode: 'ready',           // ready | playing | over
  paused: false,           // only meaningful while playing; the loop keeps rendering but stops updating
  modeId: MODES.includes(savedMode) ? savedMode : 'normal',   // normal (30 balls) | timed (90 s) | infinite; picked on the title screen
  endReason: null,         // time | balls | finish | limit — why the last run ended
  score: 0, best: 0,
  time: TIME_LIMIT, timeAlive: 0,
  stock: START_BALLS,      // balls left to fire (normal mode only)
  paidBalls: 0, shots: 0, hits: 0, outs: 0, hitsByType: {}, kicks: 0,
  multiplier: 1, laneSets: 0,
  handle: 0.55, launchT: 0,
  balls: [], particles: [], popups: [], aurora: [], vortex: null,
  banner: null, keys: {},
  impact: 0, glow: 0, hitColor: null,   // impact = pulse added per hole entry; glow eases after it (LED flare + soft flash)
  returnAt: 0,             // SCORE LIMIT screen: time (performance.now) at which it returns to the title
  flashFx: localStorage.getItem('korinto_flash') !== '0',
  auroraFx: localStorage.getItem('korinto_aurora') !== '0',
  demoT: 0,                // attract mode: the handle wanders on its own before a game starts
};
state.best = loadBest(state.modeId);

function newBall(x, y, vx, vy) { return { x, y, vx, vy, r: R, trail: [], still: 0, age: 0, inLane: null, inStar: null }; }
function ballSpeed(b) { return Math.hypot(b.vx, b.vy); }
const infiniteBalls = () => state.modeId !== 'normal';

// ---------------------------------------------------------------- start / reset
function startGame() {
  configureBoard();
  initAudio();
  Object.assign(state, { mode: 'playing', endReason: null, best: loadBest(state.modeId), score: 0, time: TIME_LIMIT, timeAlive: 0,
                         stock: START_BALLS, paidBalls: 0, shots: 0, hits: 0, outs: 0, hitsByType: {}, kicks: 0, multiplier: 1, laneSets: 0, launchT: LAUNCH_INTERVAL,
                         balls: [], particles: [], popups: [], aurora: [], vortex: null, banner: null, impact: 0, glow: 0, paused: false });
  sound.setGameplayEnabled(true);
  Object.assign(board.gate, { angle: -0.42, omega: 0, clock: 0, side: -1, warning: false });
  for (const l of board.lanes) l.lit = false;
  for (const f of board.flippers) { f.pressed = false; f.hold = 0; f.cool = 0; }
  document.getElementById('start').classList.add('hidden');
  document.getElementById('over').classList.add('hidden');
  setHidden('pause', true); setHidden('pauseBtn', false);
  showBanner(state.modeId === 'normal' ? 'NORMAL' : state.modeId === 'timed' ? 'TIME ATTACK' : 'INFINITE', state.modeId === 'normal' ? `${START_BALLS} BALLS` : state.modeId === 'timed' ? `${TIME_LIMIT} SEC` : '', 1.4);
}
// reason: 'time' (timer ran out), 'balls' (stock and field empty), 'finish' (pause screen), 'limit' (score hit SCORE_MAX)
function endGame(reason) {
  state.mode = 'over'; state.endReason = reason; state.paused = false;
  sound.setGameplayEnabled(false);
  setHidden('pause', true); setHidden('pauseBtn', true);
  if (state.score > state.best) { state.best = state.score; localStorage.setItem(bestKey(state.modeId), state.best); }
  document.getElementById('overTitle').textContent = reason === 'time' ? 'TIME UP' : reason === 'balls' ? 'BALL OUT' : reason === 'limit' ? 'SCORE LIMIT' : 'FINISHED';
  const finalScore = document.getElementById('finalScore');
  finalScore.textContent = state.score.toLocaleString();
  finalScore.classList[state.score >= 1e12 ? 'add' : 'remove']('long');   // 13+ digits would overflow the overlay at full size
  document.getElementById('finalBest').textContent = 'BEST ' + state.best.toLocaleString();
  const stats = document.getElementById('finalStats');
  const played = state.modeId === 'timed' ? '' : t('played', { time: fmtTime(state.timeAlive) });
  stats.textContent = played + t('stats', { shots: state.shots, hits: state.hits, mult: state.multiplier });
  if (reason === 'limit') {
    stats.textContent = t('limitNote', { max: SCORE_MAX.toLocaleString(), seconds: SCORE_LIMIT_RETURN });
    state.returnAt = performance.now() + SCORE_LIMIT_RETURN * 1000;
  }
  stats.className = reason === 'limit' ? 'limit' : '';
  setHidden('retryBtn', reason === 'limit');   // the capped run is over for good; only the title is offered
  document.getElementById('over').classList.remove('hidden');
  if (reason === 'time') sfx('timeup');
}
// back to the title screen (the machine keeps running behind it as the attract demo)
function showTitle() {
  state.mode = 'ready'; state.endReason = null;
  sound.setGameplayEnabled(false);
  document.getElementById('over').classList.add('hidden');
  document.getElementById('start').classList.remove('hidden');
}
function setHidden(id, hidden) { document.getElementById(id).classList[hidden ? 'add' : 'remove']('hidden'); }
// ---------------------------------------------------------------- pause
function setPaused(on) {
  if (state.mode !== 'playing' || state.paused === on) return;
  state.paused = on;
  sound.setGameplayEnabled(!on);
  state.keys = {};   // a key held across the pause must not keep the handle turning afterwards
  setHidden('pause', !on);
  document.getElementById('pauseBtn').textContent = on ? '▶' : '❚❚';
  labelButton('pauseBtn', on ? 'resumeAction' : 'pauseAction');
}
function togglePause() { setPaused(!state.paused); }
// finish from the pause screen: the run ends now with its current score, exactly as if the clock had hit zero
function finishGame() {
  if (state.mode !== 'playing') return;
  setPaused(false);
  endGame('finish');
}
// quit from the pause screen: back to the title, the run is discarded (no best-score update)
function quitGame() {
  if (state.mode !== 'playing') return;
  setPaused(false);
  state.banner = null; state.popups = []; state.particles = [];
  setHidden('pauseBtn', true);
  showTitle();
}
function selectMode(id, persist = true) {
  state.aurora = []; state.vortex = null;
  state.modeId = id; state.best = loadBest(id);
  configureBoard();
  if (persist) localStorage.setItem('korinto_mode', id);
  for (const m of MODES) document.getElementById('mode' + m[0].toUpperCase() + m.slice(1)).classList[m === id ? 'add' : 'remove']('selected');
}
function fmtTime(sec) {
  const s = Math.floor(sec), m = Math.floor(s / 60) % 60, h = Math.floor(s / 3600), pad = n => String(n).padStart(2, '0');
  return (h ? h + ':' + pad(m) : m) + ':' + pad(s % 60);
}
// every point goes through here: the total is clamped at SCORE_MAX and reaching it ends the run
function addScore(pts) {
  if (state.mode !== 'playing') return;
  state.score = Math.min(SCORE_MAX, state.score + pts);
  if (state.score >= SCORE_MAX) endGame('limit');
}
function showBanner(text, sub, dur, color) { state.banner = { text, sub, t: 0, dur, color }; }
function popup(x, y, text, color = '#fff', size = 18) { state.popups.push({ x, y, text, color, size, t: 0 }); }

// ---------------------------------------------------------------- input
// the handle gauge follows the pointer's horizontal position across the board (far left = released)
function pointerToHandle(clientX) {
  const rect = canvas.getBoundingClientRect();
  const x = (clientX - rect.left) * (W / rect.width);
  return clamp((x - L - 20) / (Rgt - L - 40), 0, 1);
}
canvas.addEventListener('mousemove', e => { state.handle = pointerToHandle(e.clientX); });
canvas.addEventListener('touchstart', e => { e.preventDefault(); state.handle = pointerToHandle(e.touches[0].clientX); }, { passive: false });
canvas.addEventListener('touchmove', e => { e.preventDefault(); state.handle = pointerToHandle(e.touches[0].clientX); }, { passive: false });
window.addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT') return;   // Space on a focused checkbox toggles it, it must not also start / resume the game
  state.keys[e.key] = true;
  if (e.key === 'm' || e.key === 'M') toggleMute();
  if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') togglePause();
  if (e.key === ' ' || e.key === 'Enter') {
    if (state.mode === 'over' && state.endReason === 'limit') showTitle();
    else if (state.paused) setPaused(false);
    else if (state.mode !== 'playing') startGame();
  }
});
window.addEventListener('keyup', e => { state.keys[e.key] = false; });
document.getElementById('startBtn').addEventListener('click', startGame);
document.getElementById('retryBtn').addEventListener('click', startGame);
document.getElementById('titleBtn').addEventListener('click', showTitle);
document.getElementById('resumeBtn').addEventListener('click', () => setPaused(false));
document.getElementById('finishBtn').addEventListener('click', finishGame);
document.getElementById('quitBtn').addEventListener('click', quitGame);
document.getElementById('pauseBtn').addEventListener('click', e => { togglePause(); e.target.blur(); });
// switching tabs mid-run: coming back should not drop the player straight into a stream of balls already in flight
document.addEventListener('visibilitychange', () => { if (document.hidden) setPaused(true); });
for (const m of MODES) document.getElementById('mode' + m[0].toUpperCase() + m.slice(1)).addEventListener('click', () => selectMode(m));
selectMode(state.modeId, false);   // reflect the remembered mode in the picker without rewriting it
function toggleMute() {
  const muted = sound.toggleMute();
  document.getElementById('mute').textContent = muted ? '🔇' : '🔊';
  labelButton('mute', muted ? 'unmuteAction' : 'muteAction');
}
document.getElementById('mute').addEventListener('click', e => { initAudio(); toggleMute(); e.target.blur(); });
// flash effect toggle: one checkbox on the title screen and one on the pause screen, kept in sync and remembered across sessions
const flashToggles = [...document.querySelectorAll('.flashToggle')];
function setFlashFx(on) {
  state.flashFx = on;
  localStorage.setItem('korinto_flash', on ? '1' : '0');
  for (const el of flashToggles) el.checked = on;
}
for (const el of flashToggles) el.addEventListener('change', e => { setFlashFx(e.target.checked); e.target.blur(); });
setFlashFx(state.flashFx);
const auroraToggles = [...document.querySelectorAll('.auroraToggle')];
function setAuroraFx(on) {
  state.auroraFx = on;
  localStorage.setItem('korinto_aurora', on ? '1' : '0');
  for (const el of auroraToggles) el.checked = on;
  // Clear immediately, including while paused; enabling starts fresh trails.
  state.aurora = [];
  for (const b of state.balls) delete b.auroraPrevious;
}
for (const el of auroraToggles) el.addEventListener('change', e => { setAuroraFx(e.target.checked); e.target.blur(); });
setAuroraFx(state.auroraFx);
// volume slider: same arrangement as the flash toggle (title + pause screen, synced, remembered). Releasing the slider plays a
// chrome ping so the new level can be judged without leaving the menu
const volumeSliders = [...document.querySelectorAll('.volumeSlider')], volumeValues = [...document.querySelectorAll('.volumeValue')];
function setVolume(pct) {
  pct = clamp(Math.round(pct), 0, 100);
  sound.setVolume(pct / 100);
  localStorage.setItem('korinto_volume', pct);
  for (const el of volumeSliders) el.value = pct;
  for (const el of volumeValues) el.textContent = pct + '%';
}
for (const el of volumeSliders) {
  el.addEventListener('input', e => setVolume(+e.target.value));
  el.addEventListener('change', () => { initAudio(); sfx('metal', 0.9); });
  el.addEventListener('pointerup', e => e.target.blur());   // not on change: arrow keys fire change per step and must keep focus
}
setVolume(localStorage.getItem('korinto_volume') === null ? 100 : +localStorage.getItem('korinto_volume'));

// ---------------------------------------------------------------- scoring events
function scored(base, x, y, color, size = 14, noMult = false) {
  if (state.mode !== 'playing') return 0;
  const pts = noMult ? base : base * state.multiplier;
  addScore(pts);
  if (x != null) popup(x, y, '+' + pts.toLocaleString(), color, size);
  return pts;
}
// a ball dropping into a wormhole is swallowed: points, payout, sound, a ring on the board
function capture(b, h) {
  b.dead = true;
  state.particles.push({ x: h.x, y: h.y, ring: true, t: 0, life: 0.45, color: h.color });
  state.particles.push({ x: b.x, y: b.y, sink: true, hx: h.x, hy: h.y, t: 0, life: 0.35 });
  h.flash = 1;
  if (state.mode === 'playing') {
    state.hits++;
    state.hitsByType[h.type] = (state.hitsByType[h.type] || 0) + 1;
    const reward = window.SpaceKorinto.holeReward(h, state.modeId, board.gate.side, board.gate.clock);
    scored(reward.points, h.x, h.y - h.r - 14, h.color, h.type === 'black' ? 18 : 14);
    if (!infiniteBalls() && reward.payout) { state.stock += reward.payout; state.paidBalls += reward.payout; popup(h.x, h.y - h.r - 32, `+${reward.payout} BALL`, '#dfe9ff', 11); }
    state.impact = Math.max(state.impact, h.type === 'black' ? 0.9 : 0.55); state.hitColor = h.color;
  }
  sfx(h.type === 'black' ? 'blackhole' : 'wormhole', h.type === 'black' ? 1 : 0.8);
}
function onLane(b, l) {
  if (state.mode === 'playing') state.hitsByType.lane = (state.hitsByType.lane || 0) + 1;
  if (!l.lit) { l.lit = true; scored(LANE_POINTS, l.x, l.y + 34, '#ffd23f', 12); }
  else scored(LANE_REPEAT_POINTS, l.x, l.y + 34, '#ffd23f', 12);
  sfx('lane');
  if (board.lanes.every(x => x.lit)) {
    for (const x of board.lanes) x.lit = false;
    state.laneSets++;
    const bonus = scored(LANES_BONUS, null);
    if (state.multiplier < MAX_MULTIPLIER) state.multiplier++;
    if (state.mode === 'playing') {
      showBanner(`×${state.multiplier} MULTIPLIER`, `HYPERSPACE +${bonus.toLocaleString()}`, 1.8, '#ff5ce0');
      state.impact = 0.8; state.hitColor = '#ff5ce0';
    }
    sfx('hyperspace');
  }
}
function checkSensors(b) {
  // a hole swallows a ball rolling over it; a ball flying upward fast enough skips across (a flipper shot has to fall in from its apex)
  for (const h of board.holes) if (Math.hypot(b.x - h.x, b.y - h.y) < h.r - 5 && (b.vy > -150 || ballSpeed(b) < 300)) { capture(b, h); return; }
  for (const l of board.lanes) {
    if (board.timed) {
      // Count a downward crossing of the chute, not a touch or an upward return.
      if (b.previousY < l.y && b.y >= l.y && b.vy > 0) {
        const x = b.previousX + (b.x - b.previousX) * (l.y - b.previousY) / (b.y - b.previousY);
        if (Math.abs(x - l.x) < l.halfWidth && b.inLane !== l) { b.inLane = l; onLane(b, l); }
      }
      // Rearm after leaving below the chute, so jitter near the sensor cannot score twice.
      if (b.inLane === l && b.y > l.y + 30) b.inLane = null;
    } else {
      const inside = Math.hypot(b.x - l.x, b.y - l.y) < l.r + 4;
      if (inside && b.inLane !== l) { b.inLane = l; onLane(b, l); }
      else if (!inside && b.inLane === l) b.inLane = null;
    }
  }
  for (const s of board.stars) {
    const inside = Math.hypot(b.x - s.x, b.y - s.y) < s.r + 4;
    if (inside && b.inStar !== s) { b.inStar = s; s.flash = 1; scored(STAR_POINTS, s.x, s.y - 18, '#ffd23f', 12); sfx('star'); }
    else if (!inside && b.inStar === s) b.inStar = null;
  }
}

// ---------------------------------------------------------------- physics
// circle vs. line segment (segments may have a thickness `w` and be one-way: they only stop a ball on the side their normal points to)
function collideSegment(b, s) {
  const dx = s.bx - s.ax, dy = s.by - s.ay, len2 = dx * dx + dy * dy || 1;
  const u = clamp(((b.x - s.ax) * dx + (b.y - s.ay) * dy) / len2, 0, 1);
  const px = s.ax + dx * u, py = s.ay + dy * u;
  let nx = b.x - px, ny = b.y - py;
  const d = Math.hypot(nx, ny), minD = b.r + (s.w || 0) / 2;
  if (d >= minD) return false;
  if (s.oneWay && nx * s.nx + ny * s.ny <= 0) return false;
  if (d < 1e-6) { const l = Math.sqrt(len2); nx = -dy / l; ny = dx / l; } else { nx /= d; ny /= d; }
  b.x += nx * (minD - d); b.y += ny * (minD - d);
  const vn = b.vx * nx + b.vy * ny;
  if (vn < 0) {
    b.vx -= (1 + s.e) * vn * nx; b.vy -= (1 + s.e) * vn * ny;
    const tx = -ny, ty = nx, vt = b.vx * tx + b.vy * ty;   // a little tangential friction so balls settle instead of skating
    b.vx -= vt * 0.008 * tx; b.vy -= vt * 0.008 * ty;
    return -vn;
  }
  return 0.001;
}
// circle vs. static circle (pins, bumpers); `jitter` tilts the normal a touch so identical shots still scatter
function collideCircle(b, cx, cy, rr, e, jitter = 0) {
  let nx = b.x - cx, ny = b.y - cy;
  const d = Math.hypot(nx, ny), minD = b.r + rr;
  if (d >= minD) return null;
  if (d < 1e-6) { nx = 0; ny = -1; } else { nx /= d; ny /= d; }
  if (jitter) { const a = Math.atan2(ny, nx) + rand(-jitter, jitter); nx = Math.cos(a); ny = Math.sin(a); }
  b.x += nx * (minD - d); b.y += ny * (minD - d);
  const vn = b.vx * nx + b.vy * ny;
  if (vn < 0) { b.vx -= (1 + e) * vn * nx; b.vy -= (1 + e) * vn * ny; }
  return { nx, ny, impact: Math.max(0, -vn) };
}
// circle vs. a swinging tapered capsule: the flipper's surface speed at the contact point goes into the bounce
function collideFlipper(b, f) {
  const dx = Math.cos(f.angle) * f.len, dy = Math.sin(f.angle) * f.len, len2 = dx * dx + dy * dy;
  const u = clamp(((b.x - f.px) * dx + (b.y - f.py) * dy) / len2, 0, 1);
  const px = f.px + dx * u, py = f.py + dy * u, fr = f.r0 + (f.r1 - f.r0) * u;
  let nx = b.x - px, ny = b.y - py;
  const d = Math.hypot(nx, ny), minD = b.r + fr;
  if (d >= minD) return false;
  if (d < 1e-6) { nx = 0; ny = -1; } else { nx /= d; ny /= d; }
  b.x += nx * (minD - d); b.y += ny * (minD - d);
  const rx = px - f.px, ry = py - f.py, svx = -f.omega * ry, svy = f.omega * rx;
  const vn = (b.vx - svx) * nx + (b.vy - svy) * ny;
  if (vn < 0) { b.vx -= 1.3 * vn * nx; b.vy -= 1.3 * vn * ny; }
  return true;
}
// outer rails and the arc at the top; also re-applied after ball-ball separation so nothing is ever left in a wall
function confine(b, dt) {
  if (b.x - R < L) { b.x = L + R; if (b.vx < 0) b.vx = -b.vx * 0.4; }
  if (b.x + R > Rgt) { b.x = Rgt - R; if (b.vx > 0) { b.vx = -b.vx * 0.4; if (dt) sfx('wall', 0.35); } }
  if (b.y < ARC_CY) {
    let nx = b.x - ARC_CX, ny = b.y - ARC_CY;
    const d = Math.hypot(nx, ny), max = ARC_R - R;
    if (d > max) {
      nx /= d; ny /= d;
      b.x = ARC_CX + nx * max; b.y = ARC_CY + ny * max;
      const vn = b.vx * nx + b.vy * ny;
      if (vn > 0) { b.vx -= 1.15 * vn * nx; b.vy -= 1.15 * vn * ny; if (vn > 250 && dt) sfx('wall', 0.3); }
      // the rail scrubs a little speed off a ball riding along it
      if (dt) { b.vx *= 1 - 0.06 * dt; b.vy *= 1 - 0.06 * dt; }
    }
  }
}
function stepBall(b, dt) {
  b.previousX = b.x; b.previousY = b.y;
  b.vy += GRAVITY * dt;
  applyVortex(b, dt);
  b.x += b.vx * dt; b.y += b.vy * dt;
  confine(b, dt);
  // walls, lane dividers, slingshots, flipper guides
  for (const s of board.segs) {
    const imp = collideSegment(b, s);
    if (!imp) continue;
    if (s.sling) onSling(b, s.sling);
    else if (imp > 180) sfx('wall', 0.3);
  }
  // pins
  for (const n of board.pinsNear(b.x, b.y)) {
    if (state.modeId !== 'infinite' && n.gateZone) continue;
    const hit = collideCircle(b, n.x, n.y, n.r, 0.55 + rand(-0.08, 0.08), 0.05);
    if (hit && hit.impact > 40) { n.flash = 1; sfx('pin', clamp(hit.impact / 900, 0.2, 1)); }
  }
  // planet bumpers: solid, and they kick the ball away hard
  for (const p of board.bumpers) {
    const hit = collideCircle(b, p.x, p.y, p.r, 0.2);
    if (!hit || p.cool > 0) continue;
    b.vx = hit.nx * BUMPER_KICK + b.vx * 0.2; b.vy = hit.ny * BUMPER_KICK + b.vy * 0.2;
    p.flash = 1; p.cool = 0.08;
    if (state.modeId === 'infinite') b.hue = ((b.hue ?? 180) + 65) % 360;
    scored(BUMPER_POINTS, p.x, p.y - p.r - 12, p.ring, 13);
    sfx('bumper');
  }
  if (state.modeId !== 'infinite') {
    const g = board.gate;
    collideFlipper(b, g);
    collideFlipper(b, { ...g, angle: g.angle + Math.PI });
  }
  for (const f of board.flippers) collideFlipper(b, f);
  const sp = ballSpeed(b);
  if (sp > MAX_SPEED) { b.vx *= MAX_SPEED / sp; b.vy *= MAX_SPEED / sp; }
  checkSensors(b);
}
function onSling(b, sl) {
  if (sl.cool > 0) return;
  sl.cool = 0.12; sl.flash = 1;
  b.vx += sl.nx * SLING_KICK; b.vy += sl.ny * SLING_KICK - 120;
  scored(SLING_POINTS, (sl.pts[0][0] + sl.pts[2][0]) / 2 + sl.nx * 26, (sl.pts[0][1] + sl.pts[2][1]) / 2 - 10, '#ff5ce0', 12);
  sfx('sling');
}
function ballBallCollisions() {
  const bs = state.balls;
  for (let i = 0; i < bs.length; i++) for (let j = i + 1; j < bs.length; j++) {
    const a = bs[i], b = bs[j];
    if (a.dead || b.dead) continue;
    const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy), rr = a.r + b.r;
    if (d >= rr || d === 0) continue;
    const nx = dx / d, ny = dy / d, overlap = rr - d;
    a.x -= nx * overlap / 2; a.y -= ny * overlap / 2; b.x += nx * overlap / 2; b.y += ny * overlap / 2;
    const rvx = b.vx - a.vx, rvy = b.vy - a.vy, vn = rvx * nx + rvy * ny;
    if (vn >= 0) continue;
    const jn = -(1 + 0.6) * vn / 2;   // equal masses
    a.vx -= jn * nx; a.vy -= jn * ny; b.vx += jn * nx; b.vy += jn * ny;
    if (-vn > 120) sfx('clink', clamp(-vn / 1200, 0.2, 0.8));
  }
}
// fire a ball up the launch lane; the handle sets how hard, a tiny jitter keeps repeated shots from stacking
function launch() {
  const speed = lerp(LAUNCH_MIN, LAUNCH_MAX, state.handle) + rand(-10, 10);
  state.balls.push(newBall(L + LANE_W / 2, B - R - 1, 0, -speed));
  if (state.mode === 'playing') { state.shots++; if (!infiniteBalls()) state.stock--; }
  sfx('launch', 0.7);
}

// ---------------------------------------------------------------- auto flippers
// a flipper swings when a ball is falling into the zone above it, holds for a moment, then drops back and rests briefly
function inCatchZone(b, f) {
  if (b.vy < -50) return false;   // anything not on its way up: falling balls and balls resting on the flipper
  const left = f.side === 'L';
  const x0 = left ? f.px - 6 : f.px - f.len - 10, x1 = left ? f.px + f.len + 10 : f.px + 6;
  return b.x > x0 && b.x < x1 && b.y > f.py - 66 && b.y < f.py + 6;
}
function updateFlippers(dt) {
  for (const f of board.flippers) {
    if (f.pressed) { f.hold -= dt; if (f.hold <= 0) { f.pressed = false; f.cool = FLIPPER_COOLDOWN; } }
    else if (f.cool > 0) f.cool -= dt;
    else if (state.balls.some(b => !b.dead && inCatchZone(b, f))) { f.pressed = true; f.hold = FLIPPER_HOLD; sfx('flipper'); }
    const target = f.pressed ? f.active : f.rest, old = f.angle;
    if (f.angle !== target) {
      const dir = Math.sign(target - f.angle);
      f.angle += dir * FLIPPER_SPEED * dt;
      if ((dir > 0 && f.angle > target) || (dir < 0 && f.angle < target)) f.angle = target;
    }
    f.omega = (f.angle - old) / dt;
  }
}

// Ten-second phases, with a two-second warning and a smooth 1.5-second swing.
function updateGate(dt) {
  if (state.modeId === 'infinite') return;
  const g = board.gate, old = g.angle;
  g.clock += dt;
  const phase = Math.floor(g.clock / 10), elapsed = g.clock % 10;
  g.side = phase % 2 ? 1 : -1;
  g.warning = elapsed >= 8;
  const u = clamp(elapsed / 1.5, 0, 1), ease = u * u * (3 - 2 * u);
  g.angle = phase === 0 ? -0.42 : g.side * 0.42 * (2 * ease - 1);
  g.omega = dt > 0 ? (g.angle - old) / dt : 0;
}

// A quiet interval, four-second forecast, eight-second orbit and gentle release.
// All timing uses simulation time so pausing freezes both the forecast and the field.
function updateVortex() {
  if (state.modeId !== 'infinite' || state.mode !== 'playing') { state.vortex = null; return; }
  const clock = state.timeAlive, phase = clock % 32, cycle = Math.floor(clock / 32);
  const stage = phase < 18 ? 'calm' : phase < 22 ? 'warning' : phase < 30 ? 'active' : 'release';
  const age = phase - (stage === 'active' ? 22 : stage === 'release' ? 30 : 18);
  state.vortex = { stage, clock, x: CX + (cycle % 3 - 1) * 38, y: 492,
    direction: cycle % 2 ? -1 : 1, radius: 155,
    strength: stage === 'active' ? Math.min(1, age / 1.5) : stage === 'release' ? Math.max(0, 1 - age / 2) : 0,
    remaining: (stage === 'calm' ? 18 : stage === 'warning' ? 22 : stage === 'active' ? 30 : 32) - phase };
}
function applyVortex(b, dt) {
  const v = state.vortex;
  if (!v || !v.strength || state.modeId !== 'infinite' || state.mode !== 'playing' || b.x < FIELD_L + R) return;
  const dx = v.x - b.x, dy = v.y - b.y, distance = Math.hypot(dx, dy);
  if (distance < 1 || distance >= v.radius) return;
  const nx = dx / distance, ny = dy / distance;
  const force = v.strength * (1 - distance / v.radius);
  // Cancel some downward pull and drive a circulating flow; no singularity at the centre.
  const radial = v.stage === 'release' ? -1800 : 1900;
  b.vx += (nx * radial - ny * 2600 * v.direction) * force * dt;
  b.vy += (ny * radial + nx * 2600 * v.direction - GRAVITY) * force * dt;
}
function updateAurora(dt) {
  for (const p of state.aurora) p.life -= dt;
  state.aurora = state.aurora.filter(p => p.life > 0);
  if (!state.auroraFx || state.modeId !== 'infinite' || state.mode !== 'playing') { state.aurora = []; return; }
  for (const b of state.balls) {
    const prev = b.auroraPrevious;
    if (prev && Math.hypot(b.x - prev.x, b.y - prev.y) > 0.5) {
      const hue = b.hue ?? (180 + state.shots * 37) % 360;
      b.hue = hue;
      state.aurora.push({ x: prev.x, y: prev.y, ex: b.x, ey: b.y, hue, life: 1.25 });
    }
    b.auroraPrevious = { x: b.x, y: b.y };
  }
  // Bound cost even with the maximum number of balls and high-refresh displays.
  if (state.aurora.length > 1600) state.aurora.splice(0, state.aurora.length - 1600);
}

function updateFeatures(dt) {
  for (const p of board.bumpers) { p.flash = Math.max(0, p.flash - dt * 3); p.cool = Math.max(0, p.cool - dt); }
  for (const s of board.slings) { s.flash = Math.max(0, s.flash - dt * 3); s.cool = Math.max(0, s.cool - dt); }
  for (const h of board.holes) { h.flash = Math.max(0, h.flash - dt * 2); h.spin += dt * (1 + h.flash * 6); }
  for (const s of board.stars) s.flash = Math.max(0, s.flash - dt * 2);
  for (const n of board.pins) if (n.flash > 0) n.flash = Math.max(0, n.flash - dt * 6);
}

function update(dt) {
  if (state.paused) return;
  // handle: keys turn it, the pointer sets it directly; before a game starts it wanders on its own as the attract demo
  const kdir = (state.keys['ArrowRight'] || state.keys['d'] || state.keys['D'] ? 1 : 0) - (state.keys['ArrowLeft'] || state.keys['a'] || state.keys['A'] ? 1 : 0);
  if (kdir) state.handle = clamp(state.handle + kdir * 0.5 * dt, 0, 1);
  if (state.mode !== 'playing') { state.demoT += dt; state.handle = 0.5 + 0.4 * Math.sin(state.demoT * 0.35); }

  if (state.mode === 'playing') {
    state.timeAlive += dt;
    if (state.modeId === 'timed') {
      const before = Math.ceil(state.time);
      state.time -= dt;
      if (Math.ceil(state.time) !== before && state.time <= 10 && state.time > 0) sfx('tick', 0.6);
      if (state.time <= 0) { state.time = 0; endGame('time'); return; }
    }
  }
  // launching: 100 balls a minute while the handle is turned and there is stock to fire
  state.launchT += dt;
  const canFire = state.handle >= HANDLE_DEAD && state.balls.length < MAX_BALLS_IN_PLAY && (state.mode !== 'playing' || infiniteBalls() || state.stock > 0);
  if (canFire && state.launchT >= LAUNCH_INTERVAL) { state.launchT = 0; launch(); }
  else if (!canFire) state.launchT = Math.min(state.launchT, LAUNCH_INTERVAL);

  updateVortex();
  updateFeatures(dt);
  // flippers step at the same rate as the balls so a fast swing meets the ball where it really is
  const steps = Math.max(1, Math.ceil(dt / (1 / 240)));
  for (let s = 0; s < steps; s++) {
    const h = dt / steps;
    updateGate(h);
    updateFlippers(h);
    for (const b of state.balls) {
      if (b.dead) continue;
      const n = Math.max(1, Math.ceil(ballSpeed(b) * h / (R * 0.45)));
      for (let i = 0; i < n && !b.dead; i++) stepBall(b, h / n);
    }
  }
  for (const b of state.balls) {
    if (b.dead) continue;
    b.age += dt;
    b.trail.unshift({ x: b.x, y: b.y }); if (b.trail.length > 5) b.trail.pop();
    // out at the bottom (the drain between the flippers or the outlanes); a ball that never cleared the lane is a foul and goes back to the stock
    if (b.y > B + R) {
      b.dead = true;
      if (b.x < FIELD_L) { if (state.mode === 'playing' && !infiniteBalls()) state.stock++; popup(b.x + 30, B - 30, 'FOUL', '#ffb08a', 12); }
      else { state.outs++; sfx('drain', 0.5); }
    }
    // a ball resting on a pin top gets a small shake, like a tap on the glass
    if (ballSpeed(b) < 25) { b.still += dt; if (b.still > 0.8) { b.vx = (b.x < CX ? 1 : -1) * rand(80, 160); b.vy = -200; b.still = 0; state.kicks++; } } else b.still = 0;
    if (b.age > 60) { b.dead = true; state.outs++; }   // safety net
  }
  updateAurora(dt);
  ballBallCollisions();
  for (const b of state.balls) confine(b, 0);
  state.balls = state.balls.filter(b => !b.dead);
  if (state.mode !== 'playing') { tickEffects(dt); return; }   // a hole may have capped the score and ended the run

  // normal mode ends once the stock and the board are both empty
  if (!infiniteBalls() && state.stock <= 0 && state.balls.length === 0) { endGame('balls'); return; }
  tickEffects(dt);
}
function tickEffects(dt) {
  for (const p of state.particles) p.t += dt;
  state.particles = state.particles.filter(p => p.t < p.life);
  for (const p of state.popups) p.t += dt;
  state.popups = state.popups.filter(p => p.t < 1.0);
  if (state.banner) { state.banner.t += dt; if (state.banner.t > state.banner.dur) state.banner = null; }
  // glow chases impact with a lag so the light swells and fades instead of snapping on
  state.impact = Math.max(0, state.impact - dt * 2.5);
  state.glow += (state.impact - state.glow) * (1 - Math.exp(-dt * 9));
}

const { render } = window.SpaceKorinto.createRenderer(canvas, state, board, fmtTime);

// ---------------------------------------------------------------- loop & layout
let last = performance.now();
function frame(now) {
  let dt = (now - last) / 1000; last = now;
  dt = Math.min(dt, 1 / 30);
  update(dt);
  if (state.mode === 'over' && state.endReason === 'limit' && now >= state.returnAt) showTitle();
  render();
  requestAnimationFrame(frame);
}
function fit() {
  const vw = window.innerWidth, vh = window.innerHeight, s = Math.min(vw / W, vh / H) * 0.98;
  canvas.style.width = (W * s) + 'px'; canvas.style.height = (H * s) + 'px';
}
window.addEventListener('resize', fit); fit();

requestAnimationFrame(frame);
window.__korinto = { state, board, update, startGame, endGame, addScore, onLane, capture }; // デバッグ用（DevTools から状態を確認できる）
})();
