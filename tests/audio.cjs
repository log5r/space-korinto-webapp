// Exercise real audio scheduling through game transitions with a silent Web Audio stub.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { load } = require('./harness.cjs');
const sources = [];
const param = () => ({ value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {}, linearRampToValueAtTime() {}, setTargetAtTime() {} });
const source = () => {
  const node = { frequency: param(), connect() {}, start() {}, stop(at) { if (at === undefined) this.cancelled = true; } };
  sources.push(node);
  return node;
};
class AudioContext {
  currentTime = 1;
  sampleRate = 100;
  state = 'running';
  createGain() { return { gain: param(), connect() {} }; }
  createOscillator() { return source(); }
  createBufferSource() { return source(); }
  createBiquadFilter() { return { frequency: param(), Q: param(), connect() {} }; }
  createBuffer() { return { getChannelData: () => new Float32Array(30) }; }
}
const { context, click, run, game } = load({ transform(name, code) {
  if (name !== 'game.js') return code;
  const realAudio = fs.readFileSync(path.join(__dirname, '../js/audio.js'), 'utf8');
  // Install the real factory after the harness has installed its defaults.
  return realAudio +
    `const factory = window.SpaceKorinto.createAudio; window.SpaceKorinto.createAudio = () => { const a = factory(); window.testAudio = a; return a; };\n` + code;
} });

context.window.AudioContext = AudioContext;
const audio = context.window.testAudio;
audio.initAudio();
const silentDemo = () => {
  const before = sources.length;
  run(3, 0.5);
  audio.sfx('jackpot');
  assert.equal(sources.length, before, 'menus must not schedule table sounds');
};
silentDemo();
assert.ok(game.state.balls.length > 0, 'title demo still moves');
audio.sfx('metal');
assert.ok(sources.length > 0, 'volume preview remains audible on title');
click('startBtn');
run(1, 0.5);
const beforeFanfare = sources.length;
audio.sfx('jackpot');
const fanfare = sources.slice(beforeFanfare);
assert.equal(fanfare.length, 7);
click('pauseBtn');
assert.ok(fanfare.every(s => s.cancelled), 'pause cancels playing and scheduled notes');
silentDemo();
click('resumeBtn');
const beforeResume = sources.length;
run(1, 0.5);
assert.ok(sources.length > beforeResume, 'resume restores table sounds');
for (const reason of ['time', 'balls', 'finish', 'limit']) {
  click('startBtn');
  const before = sources.length;
  audio.sfx('blackhole');
  const playing = sources.slice(before);
  game.endGame(reason);
  assert.ok(playing.every(s => s.cancelled), 'ending stops active table effects');
  silentDemo();
  click('titleBtn');
  silentDemo();
}
click('startBtn');
click('pauseBtn');
click('quitBtn');
silentDemo();
audio.setVolume(0.4);
click('startBtn');
click('pauseBtn');
click('resumeBtn');
assert.equal(audio.getVolume(), 0.4, 'screen changes preserve volume');
audio.toggleMute();
click('pauseBtn');
click('resumeBtn');
const beforeMute = sources.length;
audio.sfx('launch');
assert.equal(sources.length, beforeMute, 'screen changes preserve user mute');
console.log('Audio checks passed: silent menus, cancellation, resume, preview and user settings.');
