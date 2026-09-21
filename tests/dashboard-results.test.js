import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../src/app.js', import.meta.url), 'utf8');
const activityModeUi = readFileSync(new URL('../src/activity-mode-ui.js', import.meta.url), 'utf8');
const computedStatsUi = readFileSync(new URL('../src/computed-stats-ui.js', import.meta.url), 'utf8');

function dashboardSource() {
  const match = app.match(/function dashboard\(\) \{([\s\S]*?)\n\}\n\nfunction gardenAccountProgression\(\)/);
  assert.ok(match, 'dashboard() source not found');
  return match[1];
}

test('dashboard separates global Fortune from per-crop totals', () => {
  const source = dashboardSource();

  for (const label of [
    'Global Farming Fortune',
    'Pest Fortune',
    'Overbloom',
    'Bonus Pest Chance',
    'All crops',
  ]) {
    assert.match(source, new RegExp(label), `dashboard should expose ${label}`);
  }

  assert.ok(source.includes('const totalFortune = values.globalFortune + values.cropFortune;'));
  assert.ok(source.includes('Global FF ${number(values.globalFortune)} · Crop FF ${number(values.cropFortune)}'));
  assert.doesNotMatch(source, /Effective Farming Fortune/);
  assert.doesNotMatch(source, /stats\.effectiveFortune|values\.effectiveFortune/);
  assert.ok(!source.includes('${esc(selectedCrop.name)} Crop Fortune'));
  assert.doesNotMatch(source, /Next upgrade|Account layer|Open upgrade planner|cropFocusCard\(\)/);
  assert.doesNotMatch(source, /data-open=|data-page=/, 'dashboard results must not contain editing/navigation actions');
  assert.match(source, /sourceCount/, 'dashboard must distinguish configured sources from an empty profile');
  assert.match(source, /No configured sources in this context/);
  assert.match(source, /fully calculated from configured sources/);
});

test('empty calculated totals are not presented as completed coverage', () => {
  assert.match(computedStatsUi, /The displayed 0 is an empty result, not a completed calculation/);
  assert.doesNotMatch(computedStatsUi, /Every configured global source currently has a modeled total contribution/);
});

test('topbar does not duplicate the dashboard stat results', () => {
  assert.doesNotMatch(app, /class="fortune-pill"/);
  assert.doesNotMatch(activityModeUi, /function renderStatsStrip\(/);
  assert.match(computedStatsUi, /function removeTopbarStats\(\)/);
  assert.match(computedStatsUi, /querySelector\('\.computed-stats-strip'\)\?\.remove\(\)/);
  assert.match(computedStatsUi, /querySelector\('\.fortune-pill'\)\?\.remove\(\)/);
});

test('activity switch exposes three fully named phases', () => {
  assert.match(activityModeUi, />Farming<\/button>/);
  assert.match(activityModeUi, />Spawning<\/button>/);
  assert.match(activityModeUi, />Killing<\/button>/);
  assert.doesNotMatch(activityModeUi, />Farm<\/button>|>Spawn<\/button>|>Kill<\/button>|>Pest<\/button>/);
  assert.match(activityModeUi, /data-activity-mode="pest-spawn"/);
  assert.match(activityModeUi, /data-activity-mode="pest-kill"/);
});
