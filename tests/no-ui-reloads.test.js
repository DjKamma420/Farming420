import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL(`../src/${path}`, import.meta.url), 'utf8');

test('ordinary UI state changes never hard-reload the document', () => {
  const files = [
    'app.js',
    'workspace-ui.js',
    'exact-item-capabilities-ui.js',
    'navigation-dedupe.js',
    'skyblock-redesign.js',
    'skyblock-redesign-bridge.js',
  ];
  for (const file of files) {
    const source = read(file);
    assert.doesNotMatch(source, /(?:window\.)?location\.reload\s*\(/, `${file} still reloads the page`);
    assert.doesNotMatch(source, /window\.location\.replace\s*\(/, `${file} still navigates the whole document`);
  }
});

test('tool edits publish a state change instead of reloading', () => {
  const source = read('workspace-ui.js');
  assert.match(source, /function notifyStateChanged\(\) \{ window\.dispatchEvent\(new Event\('farming420:state-changed'\)\); \}/);
  assert.match(source, /mutator\(bucket, state, crop\); writeState\(state\); notifyStateChanged\(\);/);
});

test('recommended reforge goal changes do not fake a Tools navigation click', () => {
  const bridge = read('skyblock-redesign-bridge.js');
  assert.doesNotMatch(bridge, /nav-link\[data-page="tools"\][\s\S]*\.click\s*\(/);
  const redesign = read('skyblock-redesign.js');
  assert.match(redesign, /data-sb-goal/);
  assert.match(redesign, /localStorage\.setItem\(GOAL_KEY, button\.dataset\.sbGoal\);\s*reforgePanel\(\);/);
});

test('exact setup gemstone edits repaint in place', () => {
  const source = read('exact-item-capabilities-ui.js');
  assert.match(
    source,
    /patchSlot\(next, slotId, \{ gems \}\);\s*save\(next\);\s*window\.dispatchEvent\(new Event\('farming420:state-changed'\)\);/,
  );
});

test('backup restore and local reset repaint without a hard reload', () => {
  const app = read('app.js');
  assert.match(app, /localStorage\.setItem\(STORAGE_KEY, JSON\.stringify\(restored\.state\)\);\s*window\.dispatchEvent\(new Event\('farming420:state-changed'\)\);/);

  const foundation = read('foundation.js');
  const restoreStart = foundation.indexOf("settingsDialog.querySelector('[data-backup-restore]')");
  const resetStart = foundation.indexOf("settingsDialog.querySelector('[data-reset-app]')");
  const installStart = foundation.indexOf("settingsDialog.querySelector('[data-install-app]')");
  assert.ok(restoreStart >= 0 && resetStart > restoreStart && installStart > resetStart);
  const ordinarySettingsWrites = foundation.slice(restoreStart, installStart);
  assert.doesNotMatch(ordinarySettingsWrites, /location\.(?:reload|replace)\s*\(/);
  assert.match(ordinarySettingsWrites, /farming420:state-changed/);
});


test('scroll restoration survives post-render enhancement mutations', () => {
  const source = read('app.js');
  assert.match(source, /function restoreScrollState\(scrollState\)/);
  assert.match(
    source,
    /restoreScrollState\(scrollState\);\s*requestAnimationFrame\(\(\) => \{\s*restoreScrollState\(scrollState\);\s*requestAnimationFrame\(\(\) => restoreScrollState\(scrollState\)\);\s*\}\);/,
  );
});
