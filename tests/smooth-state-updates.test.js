import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const read = name => readFileSync(new URL(`../src/${name}`, import.meta.url), 'utf8');

test('direct card controls update app state without a hard page reload', () => {
  const source = read('direct-controls.js');
  assert.doesNotMatch(source, /(?:window\.)?location\.reload\s*\(/);
  assert.match(source, /dispatchEvent\(new Event\('farming420:state-changed'\)\)/);
});

test('ordinary app renders preserve scroll and the operated control stays viewport-relative', () => {
  const source = read('app.js');
  assert.match(source, /function render\(\{ preserveScroll = true \} = \{\}\)/);
  assert.match(source, /document\.querySelector\('#app \.main'\)\?\.scrollTop/);
  assert.match(source, /document\.querySelector\('#app \.sidebar nav'\)\?\.scrollTop/);
  assert.match(source, /viewportTop: element\.getBoundingClientRect\(\)\.top/);
  assert.match(source, /const delta = element\.getBoundingClientRect\(\)\.top - anchor\.viewportTop/);
  assert.match(source, /window\.scrollBy\(0, delta\)/);
  assert.match(source, /function currentScrollAnchor\(\)/);
  assert.doesNotMatch(source, /function consumeScrollAnchor\(\)/);
  assert.match(source, /new MutationObserver\(\(\) => scheduleScrollAnchorRestore\(\)\)/);
  assert.match(source, /scheduleScrollAnchorRestore\(activeScrollAnchor\)/);
});

test('relative scroll anchoring survives repeated renders from one interaction', () => {
  const source = read('app.js');
  assert.match(source, /const relativeAnchor = preserveScroll \? currentScrollAnchor\(\)/);
  assert.match(source, /restoreRelativeScrollAnchor\(relativeAnchor\);[\s\S]*scheduleScrollAnchorRestore\(relativeAnchor\)/);
  assert.match(source, /anchor !== currentScrollAnchor\(\)/);
});

test('tool workspace controls update state without hard page reloads', () => {
  const source = read('workspace-ui.js');
  assert.doesNotMatch(source, /(?:window\.)?location\.reload\s*\(/);
  assert.match(source, /dispatchEvent\(new Event\('farming420:state-changed'\)\)/);
});

test('reforge goal changes re-render in place instead of faking Tools navigation', () => {
  const source = read('skyblock-redesign-bridge.js');
  assert.doesNotMatch(source, /nav-link\[data-page=["']tools["']\][\s\S]*?\.click\(\)/);
  assert.match(source, /dispatchEvent\(new Event\('farming420:state-changed'\)\)/);
});

test('real page navigation still starts the destination page at the top', () => {
  const source = read('app.js');
  assert.match(source, /\[data-page\][\s\S]*render\(\{ preserveScroll: false \}\)/);
  assert.match(source, /addEventListener\('farming420:state-changed'[\s\S]*state = loadState\(\);[\s\S]*render\(\);/);
});
