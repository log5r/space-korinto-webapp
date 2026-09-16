// Gate timing, pause/retry, physical deflection and normal-mode containment.
const assert = require('node:assert/strict');
const { load } = require('./harness.cjs');
const { game, run, click, consts } = load({ seed: 12 });
const { state, board } = game;
game.startGame();
run(8.1, 0);
assert.equal(board.gate.warning, true);
assert.equal(board.gate.side, -1);
click('pauseBtn');
const clock = board.gate.clock;
run(3, 0);
assert.equal(board.gate.clock, clock, 'pause freezes the gate and its warning');
click('resumeBtn');
run(3.5, 0);
assert.equal(board.gate.side, 1);
assert.ok(Math.abs(board.gate.angle - 0.42) < 1e-8);
assert.equal(board.gate.warning, false);
click('retryBtn');
assert.equal(board.gate.clock, 0);
assert.equal(board.gate.angle, -0.42);
for (const side of [-1, 1]) {
  game.startGame();
  board.gate.clock = side < 0 ? 2 : 12;
  board.gate.angle = side * 0.42;
  const b = { x: 300, y: 455, vx: 0, vy: 180, r: 8, trail: [], age: 0, still: 0 };
  state.balls.push(b);
  run(0.12, 0);
  assert.ok(b.vx * side > 30, 'the tilted gate physically sends a falling ball downhill');
}
// Actual captures obey the visible side reward, including the unaffected black hole.
for (const side of [-1, 1]) {
  game.startGame(); board.gate.side = side;
  for (const h of board.holes) {
    const beforeStock = state.stock, beforeScore = state.score;
    game.capture({ x: h.x, y: h.y, trail: [] }, h);
    const lit = h.type === 'black' || Math.sign(h.x - 300) === side;
    assert.equal(state.stock - beforeStock, lit ? h.payout : 0);
    assert.equal(state.score - beforeScore, lit ? h.points : h.points / 2);
  }
}
click('modeInfinite'); game.startGame(); run(1, 0);
assert.equal(board.gate.clock, 0, 'other modes retain the original board');
click('modeNormal'); game.startGame(); state.stock = 1000;
for (let i = 0; i < 60 * 90; i++) {
  state.handle = (Math.floor(i / 600) % 2) ? 0.8 : 0.1;
  game.update(1 / 60);
  for (const b of state.balls) {
    assert.ok([b.x, b.y, b.vx, b.vy].every(Number.isFinite));
    assert.ok(b.x >= consts.L + consts.R - 0.5 && b.x <= consts.Rgt - consts.R + 0.5);
    assert.ok(b.age < 60, 'no ball needs the age safety net');
  }
}
assert.ok(state.kicks < 40, 'the swept area does not trap balls');
console.log('Gate checks passed: timing, pause, retry, deflection, mode isolation and containment.');

// Timed mode shares the physical gate, but doubles only the lit side's points.
click('modeTimed'); game.startGame();
run(8.1, 0);
assert.equal(board.gate.warning, true);
click('pauseBtn');
const timedClock = board.gate.clock, timeLeft = state.time;
run(2, 0);
assert.equal(board.gate.clock, timedClock);
assert.equal(state.time, timeLeft);
click('resumeBtn'); run(3.5, 0);
assert.equal(board.gate.side, 1);
assert.ok(Math.abs(board.gate.angle - 0.42) < 1e-8);
for (const side of [-1, 1]) {
  board.gate.side = side; state.multiplier = 3;
  for (const h of board.holes) {
    const points = state.score, time = state.time, stock = state.stock;
    game.capture({ x: h.x, y: h.y, trail: [] }, h);
    const doubled = h.type !== 'black' && Math.sign(h.x - 300) === side;
    assert.equal(state.score - points, h.points * 3 * (doubled ? 2 : 1));
    assert.equal(state.time, time);
    assert.equal(state.stock, stock);
  }
}
game.startGame();
assert.equal(board.gate.clock, 0);
assert.equal(state.time, 90);
for (let i = 0; i < 5401 && state.mode === 'playing'; i++) {
  state.handle = 0.6; game.update(1 / 60);
}
assert.equal(state.endReason, 'time');
assert.equal(state.time, 0);
assert.ok(Math.abs(state.timeAlive - 90) < 0.02);
console.log('Timed gate checks passed: pause, switching, multiplier, rewards, retry and fixed 90-second finish.');
