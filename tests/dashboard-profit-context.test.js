import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../src/app.js', import.meta.url), 'utf8');
const planner = readFileSync(new URL('../src/revenue-planner.js', import.meta.url), 'utf8');
const contexts = readFileSync(new URL('../src/farming-context.js', import.meta.url), 'utf8');
const css = readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8');
const economics = readFileSync(new URL('../src/dashboard-economics.js', import.meta.url), 'utf8');

test('Dashboard owns the farming event context selector', () => {
  assert.match(app, /FARMING_CONTEXT_OPTIONS/);
  assert.match(app, /data-dashboard-context/);
  assert.match(contexts, /Harvest Feast/);
  assert.match(contexts, /Grand Feast/);
  assert.match(contexts, /Jacob's Contest/);
  assert.match(app, /computeStatTotals\(state, farmingMode \? selectedCrop\.id : null, mode, contextScopes\)/);
});

test('Dashboard Coins per hour is source-driven instead of a fixed 20m claim', () => {
  assert.match(app, /Estimated Coins\/h/);
  assert.match(app, /calculateDashboardEconomics\(/);
  assert.match(economics, /measuredBaseline\(/);
  assert.match(app, /averageCropUnitPrice\(/);
  assert.match(app, /averageHarvestFeastMaterialPrice\(/);
  assert.doesNotMatch(app, /data-dashboard-estimate/);
  assert.match(app, /data-dashboard-open-planner/);
  assert.match(planner, /data-measured="\$\{esc\(field\.key\)\}"/);
});

test('the old Fortune to Coins information card is gone from the action planner', () => {
  assert.doesNotMatch(planner, /Fortune → Coins/);
  assert.match(planner, /PLANNER_BENCHMARK_COINS_PER_HOUR/);
  assert.match(planner, /Recommended actions · all sets/);
  assert.match(planner, /generateRecommendationActions\(rows\)/);
});

test('Dashboard economics summary collapses to phone width without configuration fields', () => {
  assert.match(css, /\.dashboard-economics-meta/);
  assert.match(css, /@media \(max-width:780px\)[\s\S]*?\.dashboard-economics-meta\{grid-template-columns:1fr\}/);
  assert.doesNotMatch(css, /\.dashboard-estimate-grid/);
});
