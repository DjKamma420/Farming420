import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const read = name => readFileSync(new URL(`../src/${name}`, import.meta.url), 'utf8');

test('direct card controls update app state without a hard page reload', () => {
  const source = read('direct-controls.js');
  assert.doesNotMatch(source, /(?:window\.)?location\.reload\s*\(/);
  assert.match(source, /dispatchEvent\(new Event\('farming420:state-changed'\)\)/);
});

test('ordinary app renders preserve content and navigation scroll positions', () => {
  const source = read('app.js');
  assert.match(source, /function render\(\{ preserveScroll = true \} = \{\}\)/);
  assert.match(source, /document\.querySelector\('#app \.main'\)\?\.scrollTop/);
  assert.match(source, /document\.querySelector\('#app \.sidebar nav'\)\?\.scrollTop/);
  assert.match(source, /main\.scrollTop = scrollState\.main/);
  assert.match(source, /nav\.scrollTop = scrollState\.nav/);
});

test('real page navigation still starts the destination page at the top', () => {
  const source = read('app.js');
  assert.match(source, /\[data-page\][\s\S]*render\(\{ preserveScroll: false \}\)/);
  assert.match(source, /addEventListener\('farming420:state-changed'[\s\S]*state = loadState\(\);[\s\S]*render\(\);/);
});
