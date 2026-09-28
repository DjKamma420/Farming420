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

test('dashboard keeps global Fortune separate while also exposing the selected crop total', () => {
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
  assert.match(source, /Effective Fortune/);
  assert.match(source, /stats\.effectiveFortune/);
  assert.ok(source.includes('${esc(selectedCrop.name)} Crop Fortune'));
  assert.doesNotMatch(source, /Next upgrade|Account layer|cropFocusCard\(\)/);
  assert.match(source, /data-dashboard-open-planner/, 'Dashboard may link to the Planner for throughput configuration');
  assert.doesNotMatch(source, /data-dashboard-estimate|data-open=|data-page=/, 'Dashboard must not contain inline configuration controls');
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

test('activity switch exposes phases without presenting Killing as another physical set', () => {
  assert.match(activityModeUi, /aria-label="Farming phase, linked to FF Set"[^>]*>Farming<\/button>/);
  assert.match(activityModeUi, /aria-label="Spawning phase, linked to BPC Set"[^>]*>Spawning<\/button>/);
  assert.match(activityModeUi, /aria-label="Killing phase, linked to FF Set"[^>]*>Killing<\/button>/);
  assert.doesNotMatch(activityModeUi, />FF Set · Killing<\/button>|>BPC Set · Spawning<\/button>/);
  assert.match(activityModeUi, /data-activity-mode="pest-spawn"/);
  assert.match(activityModeUi, /data-activity-mode="pest-kill"/);
});

test('dashboard resolves every phase through its linked physical loadout', () => {
  const match = app.match(/function dashboardLoadoutSummary\(mode, selectedCrop\) \{([\s\S]*?)\n\}/);
  assert.ok(match, 'dashboardLoadoutSummary() source not found');
  const source = match[1];

  assert.match(source, /effectiveSetup\(state\.profile\.setups, setupIdForActivity\(mode\)\)/);
  assert.match(source, /setup: dashboardLinkedSetLabel\(mode\)/);
  assert.doesNotMatch(source, /setups\?\.list\?\.find/);
  assert.match(app, /return mode === ACTIVITY_MODE\.PEST_SPAWN \? 'BPC Set' : 'FF Set'/);
  assert.match(dashboardSource(), /linked physical loadout: \$\{linkedSetLabel\}/);
});
