import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = name => readFileSync(new URL(`../src/${name}`, import.meta.url), 'utf8');
const app = read('app.js');
const planner = read('revenue-planner.js');
const activity = read('activity-mode-ui.js');

test('Focus on next is a first-class navigation page', () => {
  assert.match(app, /\['focus', 'Focus on next'\]/);
  assert.match(app, /case 'focus': content = focusNextPage\(\); break;/);
  assert.match(app, /class="focus-next-list"/);
  assert.match(activity, /MODE_SWITCH_PAGES = new Set\(\[[^\]]*'focus'/);
});

test('Upgrade Planner no longer mixes earned progression into upgrade rows', () => {
  assert.match(planner, /benchmarkEvaluatedRows\(raw\)\.filter\(row => row\.acquisitionMode !== 'EARNED'\)/);
  const rendered = planner.match(/panel\.innerHTML = `\$\{benchmarkPanel\(raw\)\}[\s\S]*?<div class="planner-list revenue-list">/);
  assert.ok(rendered, 'planner benchmark markup not found');
  assert.doesNotMatch(rendered[0], /earnedAssumptionsPanel|economicsPanel/);
});

test('Focus on next contains only earned progression and keeps time separate', () => {
  assert.match(planner, /function focusNextRows\(raw\)[\s\S]*?\.filter\(row => row\.acquisitionMode === 'EARNED'\)/);
  assert.match(planner, /const FOCUS_AVERAGE_STEP_HOURS = 1;/);
  assert.match(planner, /planning average/);
  assert.match(planner, /scheduling assumption, not an asserted in-game completion time/);
});

test('Fortune and Overbloom are converted to a common Coins per hour benchmark', () => {
  assert.match(planner, /PLANNER_BENCHMARK_COINS_PER_HOUR = INTERNET_FARMING_TIME_VALUE_COINS_PER_HOUR/);
  assert.match(planner, /statDeltas\(item, itemGain\)/);
  assert.match(planner, /normalCropCoinsPerHour: PLANNER_BENCHMARK_COINS_PER_HOUR/);
  assert.match(planner, /rareCropCoinsPerHour: PLANNER_BENCHMARK_COINS_PER_HOUR/);
  assert.match(planner, /No manual Coins\/h baseline is required/);
  assert.match(planner, /comparison value, not a claim about your farm's actual profit/);
});
