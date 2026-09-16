const { mkdirSync, rmSync, copyFileSync } = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const output = path.join(root, 'dist');
const files = [
  'index.html',
  'css/style.css',
  'js/core.js',
  'js/i18n.js',
  'js/audio.js',
  'js/board.js',
  'js/renderer.js',
  'js/game.js',
  'LICENSE',
];

rmSync(output, { recursive: true, force: true });
for (const file of files) {
  const target = path.join(output, file);
  mkdirSync(path.dirname(target), { recursive: true });
  copyFileSync(path.join(root, file), target);
}
console.log(`Prepared ${files.length} public files in dist/.`);
