// The score is capped at Number.MAX_SAFE_INTEGER; reaching it ends the run on the SCORE LIMIT screen.
const assert = require('node:assert/strict');
const { load } = require('./harness.cjs');

const { game, click, document, consts } = load();
const { state } = game;
const { SCORE_MAX } = consts;

click('modeInfinite'); click('startBtn');
state.score = SCORE_MAX - 100;
game.addScore(50);
assert.equal(state.score, SCORE_MAX - 50);
assert.equal(state.mode, 'playing');
game.addScore(1e6);
assert.equal(state.score, SCORE_MAX, 'the score never exceeds the cap');
assert.equal(state.mode, 'over');
assert.equal(state.endReason, 'limit');
assert.equal(document.getElementById('overTitle').textContent, 'SCORE LIMIT');
assert.match(document.getElementById('finalStats').textContent, /9,007,199,254,740,991/);
assert.equal(state.best, SCORE_MAX);
game.addScore(1);
assert.equal(state.score, SCORE_MAX, 'no points after the run has ended');
console.log('Score limit checks passed.');
