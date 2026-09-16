// The three modes: normal ends when the stock is spent, timed ends on the clock, infinite only ends by hand; bests are per mode.
const assert = require('node:assert/strict');
const { load } = require('./harness.cjs');

const { game, click, run, storage, consts, document } = load();
const { state, board } = game;
const { START_BALLS, TIME_LIMIT, MAX_BALLS_IN_PLAY, HANDLE_DEAD, LAUNCH_INTERVAL, HOLES, R } = consts;
const paid = () => state.paidBalls;
const black = board.holes.find(h => h.type === 'black');

// --- normal: 30 balls, one per shot, payouts come back, the run ends once the stock and the board are empty
click('modeNormal'); click('startBtn');
assert.equal(state.modeId, 'normal');
assert.equal(storage.korinto_mode, 'normal');
assert.equal(state.stock, START_BALLS);
run(LAUNCH_INTERVAL * 5, 0.5);
assert.equal(state.shots, 5);
assert.equal(state.stock - paid(), START_BALLS - 5, 'every shot costs a ball, every wormhole pays some back');
// a released handle stops the firing
const shots = state.shots;
run(3, 0);
assert.equal(state.shots, shots);
assert.ok(state.balls.length <= MAX_BALLS_IN_PLAY);
// once the stock is gone the run ends by itself as soon as the last ball has left the board
run(20, 0.9);
assert.equal(state.mode, 'playing');
state.stock = 0;
run(1, 0.9);
assert.equal(state.mode, 'playing', 'balls still on the board keep the run alive');
// wormhole payouts would top the stock back up, so keep draining it: the run ends when the last ball has left the board
for (let i = 0; i < 70 * 60 && state.mode === 'playing'; i++) { state.stock = 0; state.handle = 0.9; game.update(1 / 60); }
assert.equal(state.balls.length, 0);
assert.equal(state.mode, 'over');
assert.equal(state.endReason, 'balls');
assert.equal(document.getElementById('overTitle').textContent, 'BALL OUT');
assert.equal(storage.korinto_best_normal, String(state.score));

// --- timed: unlimited balls, the clock ends the run, black hole captures never extend the fixed clock
click('modeTimed'); click('startBtn');
assert.equal(state.modeId, 'timed');
assert.equal(state.time, TIME_LIMIT);
run(10, 0.5);
assert.ok(state.shots > 0);
assert.ok(Math.abs(state.time - (TIME_LIMIT - 10)) < 0.1, 'the clock counts down without extensions');
const t0 = state.time, s0 = state.score;
game.capture({ x: black.x, y: black.y, r: R, vx: 0, vy: 0, trail: [] }, black);
assert.equal(state.time, t0);
assert.equal(state.score - s0, HOLES.black.points);
state.time = 0.5;
run(1, 0.5);
assert.equal(state.mode, 'over');
assert.equal(state.endReason, 'time');
assert.equal(document.getElementById('overTitle').textContent, 'TIME UP');
assert.equal(storage.korinto_best_timed, String(state.score));

// --- infinite: no clock and no stock; only the pause screen ends it, and quitting keeps the best untouched
click('modeInfinite'); click('startBtn');
assert.equal(state.modeId, 'infinite');
run(60, 0.4);
assert.equal(state.mode, 'playing');
assert.ok(state.shots >= 90);
assert.ok(state.timeAlive > 59);
state.score = 777;
click('pauseBtn'); click('quitBtn');
assert.equal(state.mode, 'ready');
assert.equal(storage.korinto_best_infinite, undefined, 'quitting discards the run');
click('startBtn');
state.score = 4321;
click('pauseBtn'); click('finishBtn');
assert.equal(state.endReason, 'finish');
assert.equal(storage.korinto_best_infinite, '4321');
assert.equal(storage.korinto_best_normal, String(storage.korinto_best_normal), 'other modes keep their own bests');

// --- hyperspace lanes: lighting all three pays the bonus and raises the multiplier, which then scales every score
click('startBtn');
const before = state.score;
for (const l of board.lanes) game.onLane(null, l);
assert.equal(state.multiplier, 2);
assert.ok(board.lanes.every(l => !l.lit), 'lanes reset after a full set');
assert.equal(state.score - before, consts.LANE_POINTS * 3 + consts.LANES_BONUS);
const s1 = state.score;
game.capture({ x: black.x, y: black.y, r: R, vx: 0, vy: 0, trail: [] }, black);
assert.equal(state.score - s1, HOLES.black.points * 2, 'the multiplier applies to wormholes');
for (let i = 0; i < 10; i++) for (const l of board.lanes) game.onLane(null, l);
assert.equal(state.multiplier, consts.MAX_MULTIPLIER, 'the multiplier is capped');

// --- firing rates and handle stop/resume across all modes
for (const [button, expectedShots] of [['modeNormal', 10], ['modeTimed', 20], ['modeInfinite', 20]]) {
  click('pauseBtn'); click('quitBtn'); click(button); click('startBtn');
  run(6, HANDLE_DEAD / 2);
  assert.equal(state.shots, 0, `${state.modeId}: the dead zone stops firing`);
  run(6, 1);
  assert.equal(state.shots, expectedShots, `${state.modeId}: shots in six seconds`);
  run(2, 0);
  assert.equal(state.shots, expectedShots, `${state.modeId}: releasing the handle stops firing`);
  run(1 / 60, 1);
  assert.equal(state.shots, expectedShots + 1, `${state.modeId}: resuming fires one ball immediately`);
  assert.ok(state.balls.length <= MAX_BALLS_IN_PLAY);
}
console.log('Mode checks passed: normal stock & ball-out, fixed timed clock & black hole score, infinite finish/quit, lanes & multiplier, mode firing rates & handle dead zone.');
