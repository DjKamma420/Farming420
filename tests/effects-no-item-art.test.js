import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL(`../src/${path}`, import.meta.url), 'utf8');

test('Farming Effects is a page-level no-image surface', () => {
  const source = read('app.js');

  assert.match(source, /function card\(item, compact=false, \{ showArt = true \} = \{\}\)/);
  assert.match(source, /data-disable-item-art="1"/);
  assert.match(source, /data-no-item-art="1"/);
  assert.match(source, /permanent\.map\(x=>card\(x, false, \{ showArt: false \}\)\)/);
  assert.match(source, /temporary\.map\(x=>card\(x, false, \{ showArt: false \}\)\)/);
});

test('all item-art renderers respect the Effects no-image boundary', () => {
  const coverage = read('item-art-coverage.js');
  const setupArt = read('item-art-ui.js');

  assert.match(coverage, /card\.dataset\.noItemArt === '1' \|\| card\.closest\('\[data-disable-item-art="1"\]'\)/);
  assert.match(setupArt, /card\.closest\('\[data-disable-item-art="1"\]'\)/);
});

test('Effects has a CSS fail-safe for accidental image nodes', () => {
  const css = read('item-art-coverage.css');

  assert.match(css, /\.effects-page img/);
  assert.match(css, /\.effects-page \.card-portrait/);
  assert.match(css, /display:\s*none !important/);
});
