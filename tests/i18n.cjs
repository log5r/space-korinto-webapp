// Language selection, translation coverage, results text, retry, pause and mute labels.
const assert = require('node:assert/strict');
const { load } = require('./harness.cjs');

for (const [navigator, expected] of [
  [{ languages: ['ja-JP', 'en-US'] }, 'ja'], [{ languages: ['en-GB', 'ja'] }, 'en'],
  [{ languages: ['fr-FR', 'ja'] }, 'ja'], [{ languages: ['de', 'fr'] }, 'en'],
  [{ language: 'JA-jp' }, 'ja'], [{ languages: [], language: 'en-US' }, 'en'], [{}, 'en'],
]) {
  const { document, translated, game, click } = load({ navigator });
  assert.equal(document.documentElement.lang, expected);
  for (const el of translated) {
    assert.ok(el.innerHTML && el.innerHTML !== el.dataset.i18n, `missing translation: ${el.dataset.i18n}`);
    if (expected === 'en') assert.doesNotMatch(el.innerHTML, /[ぁ-んァ-ヶ一-龠]/);
  }
  const { state } = game;
  click('startBtn');
  assert.equal(state.mode, 'playing');
  state.score = 1234; state.shots = 80; state.hits = 9; state.multiplier = 3;
  document.getElementById('pauseBtn').listeners.click({ target: { blur() {} } });
  assert.equal(state.paused, true);
  assert.equal(document.getElementById('pauseBtn').attrs['aria-label'], expected === 'en' ? 'Resume (P)' : '再開 (P)');
  click('finishBtn');
  assert.equal(state.mode, 'over');
  assert.equal(state.best, 1234);
  assert.equal(document.getElementById('overTitle').textContent, 'FINISHED');
  assert.match(document.getElementById('finalStats').textContent, expected === 'en'
    ? /^Played 0:00 \/ Shots: 80 \/ Wormholes: 9 \/ Final multiplier: ×3$/ : /^プレイ時間 0:00 ／ 発射 80 発 ／ ワームホール 9 個 ／ 最終倍率 ×3$/);
  click('retryBtn');
  assert.equal(state.score, 0);
  document.getElementById('mute').listeners.click({ target: { blur() {} } });
  assert.equal(document.getElementById('mute').attrs['aria-label'], expected === 'en' ? 'Unmute (M)' : 'ミュート解除 (M)');
}
console.log('Language selection, translation coverage, results, retry, pause and mute checks passed.');
