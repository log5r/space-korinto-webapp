window.SpaceKorinto.createAudio = function () {
'use strict';

// ---------------------------------------------------------------- audio
let audio = null, master = null, muted = false, volume = 1;   // volume = 0..1 as shown to the player; mapped to a perceptual gain curve below
let gameplayEnabled = false;
const gameplaySources = new Set();
function trackSource(source, gameplay) {
  if (gameplay) {
    gameplaySources.add(source);
    source.onended = () => gameplaySources.delete(source);
  }
  return source;
}
function setGameplayEnabled(enabled) {
  gameplayEnabled = enabled;
  if (!enabled) {
    // Also cancel queued fanfare notes so they cannot leak into menus or resume later.
    for (const source of gameplaySources) source.stop();
    gameplaySources.clear();
  }
}
function initAudio() {
  if (audio) return;
  try { audio = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { audio = null; return; }
  master = audio.createGain();   // every sound goes through this one node, so the volume setting applies to all of them at once
  master.gain.value = volume * volume;
  master.connect(audio.destination);
}
function noiseBuffer() {
  const len = audio.sampleRate * 0.3, buf = audio.createBuffer(1, len, audio.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  return buf;
}
let _noise = null;
function noise(t, g, freq, q, vol, dur) {
  if (!_noise) _noise = noiseBuffer();
  const src = trackSource(audio.createBufferSource(), true); src.buffer = _noise;
  const f = audio.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q;
  src.connect(f); f.connect(g);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  src.start(t); src.stop(t + dur + 0.01);
}
function ping(t, freq, vol, dur, type = 'sine', slideTo = null, gameplay = true) {
  const o = trackSource(audio.createOscillator(), gameplay); const og = audio.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  og.gain.setValueAtTime(vol, t); og.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(og); og.connect(master); o.start(t); o.stop(t + dur + 0.02);
}
// pins get hit dozens of times a second with several balls in the air; keep those ticks from piling up
let lastNail = 0;
function sfx(kind, vol = 1) {
  const gameplay = kind !== 'metal' && kind !== 'timeup';
  if (!audio || muted || volume <= 0 || (gameplay && !gameplayEnabled)) return;
  if (audio.state === 'suspended') audio.resume();
  const t = audio.currentTime;
  const g = audio.createGain(); g.connect(master);
  if (kind === 'pin') {
    // silver pin: a tiny bright tick
    if (t - lastNail < 0.045) return;
    lastNail = t;
    noise(t, g, 3200, 3, 0.18 * vol, 0.035);
    ping(t, 2600 + Math.random() * 600, 0.06 * vol, 0.05, 'triangle');
  } else if (kind === 'wall') {
    // steel rail clank
    noise(t, g, 1100, 2.5, 0.3 * vol, 0.07);
    ping(t, 420, 0.15 * vol, 0.14, 'triangle', 300);
  } else if (kind === 'launch') {
    // spring hammer thunk
    noise(t, g, 500, 1.5, 0.25 * vol, 0.06);
    ping(t, 180, 0.2 * vol, 0.12, 'triangle', 90);
  } else if (kind === 'clink') {
    // ball-ball steel clink
    ping(t, 2400, 0.25 * vol, 0.06, 'triangle');
  } else if (kind === 'bumper') {
    // planet bumper: a fat synth thump with a bright edge
    noise(t, g, 1800, 2, 0.25 * vol, 0.05);
    ping(t, 220, 0.35 * vol, 0.14, 'square', 110);
  } else if (kind === 'sling') {
    ping(t, 360, 0.25 * vol, 0.09, 'sawtooth', 180);
  } else if (kind === 'flipper') {
    noise(t, g, 900, 1.5, 0.28 * vol, 0.04);
  } else if (kind === 'wormhole') {
    // wormhole: a descending swirl
    ping(t, 1200, 0.22 * vol, 0.45, 'sine', 240);
    ping(t + 0.05, 900, 0.14 * vol, 0.4, 'triangle', 180);
  } else if (kind === 'blackhole') {
    // black hole: deeper, longer, with a low rumble under it
    ping(t, 900, 0.25 * vol, 0.7, 'sine', 90);
    ping(t + 0.04, 600, 0.18 * vol, 0.6, 'triangle', 60);
    noise(t, g, 200, 1, 0.3 * vol, 0.5);
  } else if (kind === 'lane') {
    ping(t, 880, 0.2 * vol, 0.16, 'sine', 1320);
  } else if (kind === 'star') {
    ping(t, 660, 0.18 * vol, 0.12, 'sine', 990);
  } else if (kind === 'hyperspace') {
    // all lanes lit: rising arpeggio
    [523, 659, 784, 1047, 1319].forEach((f, i) => {
      const o = trackSource(audio.createOscillator(), true); const og = audio.createGain();
      o.type = 'square'; o.frequency.value = f;
      const s = t + i * 0.09;
      og.gain.setValueAtTime(0.0001, s); og.gain.linearRampToValueAtTime(0.22, s + 0.02); og.gain.exponentialRampToValueAtTime(0.001, s + 0.4);
      o.connect(og); og.connect(master); o.start(s); o.stop(s + 0.45);
    });
  } else if (kind === 'drain') {
    // ball lost between the flippers: a soft downward whoosh
    noise(t, g, 600, 1, 0.12 * vol, 0.2);
    ping(t, 300, 0.1 * vol, 0.25, 'sine', 120);
  } else if (kind === 'metal') {
    // chrome ping (used to preview the volume)
    [1, 2.76, 5.4].forEach((m, i) => ping(t, 880 * m, 0.25 * vol / (i + 1), 0.35 - i * 0.08, 'sine', null, false));
  } else if (kind === 'jackpot') {
    // jackpot fanfare
    [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => {
      const o = trackSource(audio.createOscillator(), true); const og = audio.createGain();
      o.type = 'triangle'; o.frequency.value = f;
      const s = t + i * 0.11;
      og.gain.setValueAtTime(0.0001, s); og.gain.linearRampToValueAtTime(0.3, s + 0.02); og.gain.exponentialRampToValueAtTime(0.001, s + 0.5);
      o.connect(og); og.connect(master); o.start(s); o.stop(s + 0.55);
    });
  } else if (kind === 'timeup') {
    [600, 500, 400, 300].forEach((f, i) => ping(t + i * 0.25, f, 0.25 * vol, 0.3, 'square', null, false));
  } else if (kind === 'tick') {
    ping(t, 1500, 0.15 * vol, 0.04, 'square');
  }
}

function toggleMute() { muted = !muted; return muted; }
// v is 0..1; squared so the slider feels linear to the ear (a 50% slider is roughly half as loud, not barely quieter)
function setVolume(v) {
  volume = Math.min(1, Math.max(0, v));
  if (master) master.gain.setTargetAtTime(volume * volume, audio.currentTime, 0.02);
}
function getVolume() { return volume; }
return { initAudio, sfx, setGameplayEnabled, toggleMute, setVolume, getVolume };
};
