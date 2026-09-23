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

test('Upgrade Planner combines all setup rows without mixing earned progression into upgrades', () => {
  assert.match(planner, /allSetBenchmarkRows\(raw\)\.filter\(row => row\.acquisitionMode !== 'EARNED'\)/);
  assert.match(planner, /PLANNER_ACTIVITY_MODES/);
  assert.match(planner, /aggregateUpgradeRows/);
  const rendered = planner.match(/panel\.innerHTML = `\$\{maxingPanel\(raw\)\}[\s\S]*?\$\{benchmarkPanel\(raw\)\}[\s\S]*?<div class="planner-list revenue-list">/);
  assert.ok(rendered, 'planner benchmark markup not found');
  assert.doesNotMatch(rendered[0], /earnedAssumptionsPanel|economicsPanel/);
});

test('Focus on next uses explicit progression goals instead of acquisition cost type', () => {
  assert.match(planner, /const FOCUS_PROGRESSION_IDS = new Set\(\[/);
  assert.match(planner, /'account-skill-farming-skill-level'/);
  assert.match(planner, /'tool-tool-base-counter-fortune'/);
  assert.match(planner, /\.filter\(row => FOCUS_PROGRESSION_IDS\.has\(row\.item\?\.id\)\)/);
  const focusFunction = planner.match(/function focusNextRows\(raw, scope = focusScope\(\)\)[\s\S]*?\n}\n\nfunction focusScopePanel/);
  assert.ok(focusFunction, 'focusNextRows not found');
  assert.doesNotMatch(focusFunction[0], /acquisitionMode === 'EARNED'/);
  assert.doesNotMatch(focusFunction[0], /pet-switch-to-best-farming-pet/);
  assert.match(planner, /`Farming Level \$\{target\}`/);
  assert.match(planner, /`Tool Level \$\{target\}`/);
  assert.match(planner, /const FOCUS_AVERAGE_STEP_HOURS = 1;/);
  assert.match(planner, /planning average/);
  assert.match(planner, /scheduling assumption, not an asserted in-game completion time/);
});

test('Focus on next separates Global and Crop progression scopes', () => {
  assert.match(planner, /const FOCUS_SCOPE_KEY = 'farming420-focus-scope-v1';/);
  assert.match(planner, /function focusScope\(\)/);
  assert.match(planner, /function focusItemIsCropScoped\(item\)/);
  assert.match(planner, /item\?\.section === 'crops'/);
  assert.match(planner, /item\?\.section === 'tools'/);
  assert.match(planner, /focusItemIsCropScoped\(row\.item\) === cropScoped/);
  assert.match(planner, /<option value="global"/);
  assert.match(planner, /<option value="crop"/);
  assert.match(planner, /data-focus-crop/);
  assert.match(planner, /localStorage\.setItem\(FOCUS_SCOPE_KEY/);
  assert.match(planner, /cropSelect\.dispatchEvent\(new Event\('change', \{ bubbles: true \}\)\)/);
});

test('Fortune and Overbloom are converted to a common Coins per hour benchmark', () => {
  assert.match(planner, /PLANNER_BENCHMARK_COINS_PER_HOUR = INTERNET_FARMING_TIME_VALUE_COINS_PER_HOUR/);
  assert.match(planner, /statDeltas\(item, itemGain\)/);
  assert.match(planner, /normalCropCoinsPerHour: PLANNER_BENCHMARK_COINS_PER_HOUR/);
  assert.match(planner, /rareCropCoinsPerHour: PLANNER_BENCHMARK_COINS_PER_HOUR/);
  assert.match(planner, /Marginal value and payback use the common/);
  assert.doesNotMatch(planner, /Fortune → Coins/);
});
