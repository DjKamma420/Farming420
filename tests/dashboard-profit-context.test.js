import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../src/app.js', import.meta.url), 'utf8');
const planner = readFileSync(new URL('../src/revenue-planner.js', import.meta.url), 'utf8');
const contexts = readFileSync(new URL('../src/farming-context.js', import.meta.url), 'utf8');
const css = readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8');

test('Dashboard owns the farming event context selector', () => {
  assert.match(app, /FARMING_CONTEXT_OPTIONS/);
  assert.match(app, /data-dashboard-context/);
  assert.match(contexts, /Harvest Feast/);
  assert.match(contexts, /Grand Feast/);
  assert.match(contexts, /Jacob's Contest/);
  assert.match(app, /computeStatTotals\(state, selectedCrop\.id, mode, contextScopes\)/);
});

test('Dashboard Coins per hour is source-driven instead of a fixed 20m claim', () => {
  assert.match(app, /Estimated Coins\/h/);
  assert.match(app, /measuredBaseline\(/);
  assert.match(app, /liveCropUnitPrice\(/);
  assert.match(app, /liveHarvestFeastMaterialPrice\(/);
  assert.match(app, /data-dashboard-estimate="breaksPerSecond"/);
  assert.match(app, /data-dashboard-estimate="uptimePercent"/);
  assert.match(app, /unknown crop mechanics stay unknown instead of being guessed/);
});

test('the old Fortune to Coins information card is gone from Upgrade Planner', () => {
  assert.doesNotMatch(planner, /Fortune → Coins/);
  assert.match(planner, /PLANNER_BENCHMARK_COINS_PER_HOUR/);
  assert.match(planner, /Recommended upgrades · all sets/);
});

test('Dashboard estimate controls collapse to phone width', () => {
  assert.match(css, /\.dashboard-estimate-grid/);
  assert.match(css, /@media \(max-width:480px\)[\s\S]*?\.dashboard-estimate-grid\{grid-template-columns:1fr\}/);
});
