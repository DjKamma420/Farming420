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

test('selection anchors use stable control identity instead of mutable item or input values', () => {
  const source = read('app.js');
  assert.match(source, /function scrollAnchorAttributes\(element\)/);
  assert.match(source, /element\.matches\?\.\('\.slot-card\[data-slot\]'\)/);
  assert.match(source, /\['data-slot', 'data-setup-target'\]/);
  assert.match(source, /\['name', 'type'\]\.includes\(attr\.name\)/);
  assert.doesNotMatch(source, /\['name', 'value', 'type'\]\.includes\(attr\.name\)/);
});

test('marked proxy events cannot replace the user scroll anchor', () => {
  const source = read('app.js');
  const start = source.indexOf('function captureInteractionScrollAnchor(event)');
  const end = source.indexOf('\n}\n', start) + 3;
  assert.ok(start >= 0 && end > start, 'scroll-anchor capture handler not found');
  const handler = source.slice(start, end);
  assert.match(handler, /if \(event\.farming420Proxy === true\) return/);
  assert.match(handler, /rememberScrollAnchor\(event\.target\)/);

  const redesign = read('skyblock-redesign.js');
  const cropStart = redesign.indexOf('function setCrop(cropId)');
  const cropEnd = redesign.indexOf('\n}\n', cropStart) + 3;
  const setCrop = redesign.slice(cropStart, cropEnd);
  assert.match(setCrop, /event\.farming420Proxy = true/);
  assert.match(setCrop, /select\.dispatchEvent\(event\)/);
});

test('tool selection relies on the shared scroll anchor instead of a second manual scrollBy path', () => {
  const source = read('skyblock-redesign.js');
  assert.doesNotMatch(source, /pendingToolViewportAnchor/);
  assert.doesNotMatch(source, /rememberToolViewportAnchor/);
  assert.doesNotMatch(source, /restoreToolViewportAnchor/);
  assert.match(source, /setCrop\(cropId\)/);
});

test('late physical value renders preserve the active selection position', () => {
  const source = read('app.js');
  const handler = source.match(/window\.addEventListener\('farming420:item-value-updated',[\s\S]*?\n\}\);/)?.[0] || '';
  assert.match(handler, /const interaction = captureInteraction\(\)/);
  assert.match(handler, /render\(\)/);
  assert.match(handler, /restoreInteraction\(interaction\)/);
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
  assert.match(source, /addEventListener\('farming420:state-changed'[\s\S]*const nextState = loadState\(\);[\s\S]*state = nextState;[\s\S]*render\(\);/);
});
