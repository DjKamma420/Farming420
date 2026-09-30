import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL(`../src/${path}`, import.meta.url), 'utf8');

test('Farming Effects cards explicitly disable item art', () => {
  const source = read('app.js');

  assert.match(source, /function card\(item, compact=false, \{ showArt = true \} = \{\}\)/);
  assert.match(source, /data-no-item-art="1"/);
  assert.match(source, /permanent\.map\(x=>card\(x, false, \{ showArt: false \}\)\)/);
  assert.match(source, /temporary\.map\(x=>card\(x, false, \{ showArt: false \}\)\)/);
});

test('item-art coverage does not inject portraits into no-art cards', () => {
  const source = read('item-art-coverage.js');

  assert.match(source, /if \(card\.dataset\.noItemArt === '1'\) return;/);
});
