import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../src/app.js', import.meta.url), 'utf8');
const activityModeUi = readFileSync(new URL('../src/activity-mode-ui.js', import.meta.url), 'utf8');

function dashboardSource() {
  const match = app.match(/function dashboard\(\) \{([\s\S]*?)\n\}\n\nfunction accountPage\(\)/);
  assert.ok(match, 'dashboard() source not found');
  return match[1];
}

function statsStripSource() {
  const match = activityModeUi.match(/function renderStatsStrip\(raw\) \{([\s\S]*?)\n\}\n\nfunction simplifySetupEditor/);
  assert.ok(match, 'renderStatsStrip() source not found');
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
});

test('top stats strip uses global Fortune instead of the selected crop total', () => {
  const source = statsStripSource();

  assert.match(source, /<span>Global FF<\/span>/);
  assert.match(source, /stats\.globalFortune/);
  assert.doesNotMatch(source, /stats\.effectiveFortune/);
  assert.doesNotMatch(source, /Farm FF/);
});

test('base topbar fallback is global Fortune too', () => {
  assert.ok(app.includes('<div class="fortune-pill"><span>Global FF</span><strong>${Number(state.profile.globalFortune || 0).toLocaleString'));
});
