// Reproducible balance sample; no browser or dependencies. Each run is capped at 180 seconds.
const { load } = require('../tests/harness.cjs');
const timed = process.argv.includes('--timed');
for (const strategy of (timed ? ['center', 'weak', 'lanes', 'strong', 'follow', 'build'] : ['center', 'weak', 'follow'])) {
  let seconds = 0, score = 0, shots = 0, paid = 0, ended = 0;
  for (let seed = 1; seed <= 6; seed++) {
    const { game } = load({ seed, storage: timed ? { korinto_mode: 'timed' } : {} });
    if (timed) game.state.modeId = 'timed';
    game.startGame();
    const s = game.state;
    for (let i = 0; i < 60 * 180 && s.mode === 'playing'; i++) {
      // React to the 2-second warning to allow for the ball's flight time.
      const right = Math.floor((s.timeAlive + 2) / 10) % 2;
      s.handle = strategy === 'center' ? 0.5 : strategy === 'weak' ? 0.1 : strategy === 'lanes' ? 0.6 : strategy === 'strong' ? 0.8 : strategy === 'build' && s.multiplier < 5 ? [.15, .5, .65][Math.floor(s.timeAlive / 4) % 3] : right ? (timed ? 0.65 : 0.8) : 0.1;
      game.update(1 / 60);
    }
    seconds += s.timeAlive; score += s.score; shots += s.shots; paid += s.paidBalls;
    if (s.endReason === (timed ? 'time' : 'balls')) ended++;
  }
  console.log(strategy, { averageSeconds: Math.round(seconds / 6), averageScore: Math.round(score / 6),
    ballsPaidPerShot: +(paid / shots).toFixed(3), endedRuns: `${ended}/6` });
}
