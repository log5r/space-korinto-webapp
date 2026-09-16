// Physics sanity across the whole handle range: balls stay inside the field, never stall for good, every wormhole and the
// lanes are reachable, and the auto flippers actually swing. Also the layout itself: no pin crowds a wall or another pin.
const assert = require('node:assert/strict');
const { load } = require('./harness.cjs');

const { game, click, consts } = load();
const { state, board } = game;
const { L, Rgt, T, R, PIN_R, FIELD_L, ARC_CX, ARC_CY, ARC_R } = consts;

// --- layout: pins keep a ball's width from the side rails (or hug the rail closer than a ball's radius) and from each other
for (const n of board.pins) {
  for (const wall of [FIELD_L, Rgt]) {
    const d = Math.abs(n.x - wall);
    if (n.y > ARC_CY) assert.ok(d < R || d >= 2 * R + PIN_R + 1, `pin at ${n.x | 0},${n.y | 0} is ${d.toFixed(1)} from a rail`);
  }
  if (n.y < ARC_CY) assert.ok(Math.hypot(n.x - ARC_CX, n.y - ARC_CY) <= ARC_R - 2 * R - PIN_R, `pin at ${n.x | 0},${n.y | 0} crowds the arc`);
  for (const m of board.pins) if (m !== n) assert.ok(Math.hypot(m.x - n.x, m.y - n.y) > PIN_R * 2, 'overlapping pins');
  for (const h of board.holes) assert.ok(Math.hypot(h.x - n.x, h.y - n.y) >= h.r, `pin at ${n.x | 0},${n.y | 0} sits inside a wormhole`);
}

// --- physics: a long run at each handle position
click('modeInfinite');
const seen = {};
let flips = 0;
for (const handle of [0.05, 0.2, 0.35, 0.5, 0.65, 0.8, 1]) {
  click('startBtn');
  let maxAge = 0;
  const wasPressed = board.flippers.map(f => f.pressed);
  for (let i = 0; i < 60 * 90; i++) {
    state.handle = handle; game.update(1 / 60);
    board.flippers.forEach((f, j) => { if (f.pressed && !wasPressed[j]) flips++; wasPressed[j] = f.pressed; });
    for (const b of state.balls) {
      assert.ok(Number.isFinite(b.x) && Number.isFinite(b.y), 'ball position is finite');
      const slack = 0.5;
      assert.ok(b.x >= L + R - slack && b.x <= Rgt - R + slack, `ball left the field sideways at ${b.x | 0},${b.y | 0} (handle ${handle})`);
      assert.ok(b.y >= T + R - slack, `ball went through the top at ${b.x | 0},${b.y | 0} (handle ${handle})`);
      if (b.y < ARC_CY) assert.ok(Math.hypot(b.x - ARC_CX, b.y - ARC_CY) <= ARC_R - R + slack, `ball outside the arc at ${b.x | 0},${b.y | 0}`);
      maxAge = Math.max(maxAge, b.age);
    }
  }
  assert.ok(state.shots >= 140, `fired ${state.shots} balls at handle ${handle}`);
  assert.ok(maxAge < 60, `a ball lingered ${maxAge.toFixed(1)}s at handle ${handle}`);
  assert.ok(state.kicks < 40, `${state.kicks} stuck-ball kicks at handle ${handle}`);
  for (const k in state.hitsByType) seen[k] = (seen[k] || 0) + state.hitsByType[k];
  click('pauseBtn'); click('quitBtn');
}
for (const type of ['small', 'mid', 'black', 'lane']) assert.ok(seen[type] > 0, `${type} never entered`);
assert.ok(seen.black >= 40, `black hole entries: ${seen.black}`);   // ~1,000 shots across the sweep
assert.ok(flips >= 500, `the auto flippers only swung ${flips} times`);
console.log('Board checks passed: layout clearances, containment, no stalls, every wormhole and lane reachable, auto flippers.');
