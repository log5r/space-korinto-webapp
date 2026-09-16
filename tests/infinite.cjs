const assert = require('node:assert/strict');
const { load } = require('./harness.cjs');
const { game, run, click, consts } = load({ seed: 72 });
const { state } = game;
click('modeInfinite'); game.startGame();
run(18.1, 0.55);
assert.equal(state.vortex.stage, 'warning');
assert.ok(state.aurora.length > 0);
click('pauseBtn');
const before = JSON.stringify([state.vortex, state.aurora]);
run(2);
assert.equal(JSON.stringify([state.vortex, state.aurora]), before);
click('resumeBtn'); run(4.1, 0.55);
assert.equal(state.vortex.stage, 'active');
run(8, 0.55);
assert.equal(state.vortex.stage, 'release');
run(2, 0.55);
assert.equal(state.vortex.stage, 'calm');
// Compare one physical step with and without the field at the same position.
function velocityAt(time) {
  game.startGame(); state.timeAlive = time; state.handle = 0;
  const b = { x: 310, y: 480, vx: 0, vy: 0, r: 8, trail: [], age: 0, still: 0 };
  state.balls = [b]; game.update(1 / 240);
  return [b.vx, b.vy];
}
const calm = velocityAt(10), active = velocityAt(25);
assert.ok(Math.hypot(active[0] - calm[0], active[1] - calm[1]) > 1, 'vortex physically curves the ball');
game.startGame();
for (let i = 0; i < 180 * 60; i++) {
  state.handle = 0.55; game.update(1 / 60);
  assert.ok(state.aurora.length <= 1600);
  for (const b of state.balls) {
    assert.ok([b.x, b.y, b.vx, b.vy].every(Number.isFinite));
    assert.ok(b.x >= consts.L + consts.R - 0.5 && b.x <= consts.Rgt - consts.R + 0.5);
  }
}
state.balls = []; run(1.3, 0);
assert.equal(state.aurora.length, 0, 'detached trails expire');
game.startGame();
assert.equal(state.vortex, null); assert.equal(state.aurora.length, 0);
for (const mode of ['modeNormal', 'modeTimed']) {
  click(mode); game.startGame(); run(25, 0.55);
  assert.equal(state.vortex, null); assert.equal(state.aurora.length, 0);
}
console.log('Infinite checks passed: phases, pause, reset, force, bounded trails, containment and mode isolation.');
