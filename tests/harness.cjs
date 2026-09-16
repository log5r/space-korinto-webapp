// Loads the game scripts into a bare VM context with a stub DOM, so the rules and physics can be exercised from Node.
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

function load({ navigator = { language: 'ja-JP' }, storage = {}, seed, transform = (name, source) => source } = {}) {
  const elements = new Map();
  const element = () => ({ style: {}, attrs: {}, listeners: {}, textContent: '', className: '', value: '', checked: false,
    classList: { add() {}, remove() {}, toggle() {} },
    addEventListener(event, cb) { this.listeners[event] = cb; },
    setAttribute(name, value) { this.attrs[name] = value; },
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 600, height: 880 }),
    blur() {} });
  const translated = [...html.matchAll(/data-i18n="([^"]+)"/g)].map(m => ({ ...element(), dataset: { i18n: m[1] } }));
  const document = { documentElement: {}, addEventListener() {},
    getElementById(id) { if (!elements.has(id)) elements.set(id, element()); return elements.get(id); },
    querySelectorAll: selector => selector === '[data-i18n]' ? translated : [] };
  const math = Object.create(Math);
  if (seed != null) math.random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  const context = vm.createContext({ navigator, document, Math: math,
    window: { addEventListener() {}, innerWidth: 600, innerHeight: 880 },
    localStorage: { getItem: k => (k in storage ? storage[k] : null), setItem(k, v) { storage[k] = String(v); }, removeItem(k) { delete storage[k]; } },
    performance: { now: () => 0 }, requestAnimationFrame() {} });
  const source = name => transform(name, fs.readFileSync(path.join(root, 'js', name), 'utf8'));
  for (const file of ['core.js', 'i18n.js', 'board.js']) vm.runInContext(source(file), context);
  let muted = false;
  Object.assign(context.window.SpaceKorinto, {
    createAudio: () => ({ initAudio() {}, sfx() {}, setGameplayEnabled() {}, setVolume() {}, getVolume: () => 1, toggleMute: () => muted = !muted }),
    createRenderer: () => ({ render() {} }),
  });
  vm.runInContext(source('game.js'), context);
  const game = context.window.__korinto;
  const click = id => document.getElementById(id).listeners.click({ target: { blur() {} } });
  // advance the simulation by `seconds` at 60 fps with the handle pinned to `handle`
  const run = (seconds, handle) => { for (let i = 0; i < Math.round(seconds * 60); i++) { if (handle != null) game.state.handle = handle; game.update(1 / 60); } };
  return { context, document, translated, storage, game, click, run, consts: context.window.SpaceKorinto };
}
module.exports = { load };
