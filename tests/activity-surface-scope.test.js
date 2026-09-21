import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const activityUi = readFileSync(new URL('../src/activity-mode-ui.js', import.meta.url), 'utf8');
const loadoutUi = readFileSync(new URL('../src/loadout-capabilities-ui.js', import.meta.url), 'utf8');
const activityCss = readFileSync(new URL('../src/activity-mode-ui.css', import.meta.url), 'utf8');
const indexHtml = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('phase selector is limited to contexts where the selected loadout matters', () => {
  assert.match(activityUi, /const MODE_SWITCH_PAGES = new Set\(\['dashboard', 'setups', 'focus', 'planner'\]\)/);
  assert.match(activityUi, /if \(!MODE_SWITCH_PAGES\.has\(page\)\) \{[\s\S]*control\?\.remove\(\);[\s\S]*return;/);
  for (const sharedPage of ['tools', 'shards', 'account', 'crops', 'buffs', 'pests']) {
    assert.doesNotMatch(activityUi, new RegExp(`MODE_SWITCH_PAGES[^\\n]*['"]${sharedPage}['"]`));
  }
});

test('Tools owns both crop tools and the physical Vacuum', () => {
  assert.match(loadoutUi, /if \(raw\.page !== 'tools'\) return;/);
  assert.match(loadoutUi, /const anchor = content\.querySelector\('\.sb-tool-picker'\)/);
  assert.match(loadoutUi, /data-vacuum-panel/);
  assert.match(loadoutUi, /Physical killing tool for Pest loadouts/);
});

test('Vacuum totals are calculated in Killing context while configuration stays under Tools', () => {
  assert.match(loadoutUi, /statsForMode\(raw, cropId, ACTIVITY_MODE\.PEST_KILL\)/);
  assert.doesNotMatch(loadoutUi, /statsForMode\(raw, cropId, ACTIVITY_MODE\.PEST_SPAWN\)/);
  assert.match(loadoutUi, /setActivityModeOnState\(scoped, mode\)/);
  assert.match(loadoutUi, /applySnapshotToProgress\(scoped,/);
  assert.match(loadoutUi, /const totalPestFortune = Number\(killStats\.globalFortune \|\| 0\) \+ Number\(killStats\.pestFortune \|\| 0\)/);
  for (const label of ['Total Pest Fortune', 'Pest Overbloom', 'Vacuum · Pest killing tool']) {
    assert.match(loadoutUi, new RegExp(label));
  }
});


test('shared mobile pages use Farming420 in the topbar instead of leaving a blank black strip', () => {
  assert.match(activityUi, /topbar\.classList\.add\('activity-mode-topbar-shared'\)/);
  assert.match(activityUi, /main\?\.classList\.add\('activity-mode-page-shared'\)/);
  assert.match(activityUi, /topbar\.classList\.remove\('activity-mode-topbar-shared'\)/);
  assert.match(activityCss, /@media \(max-width: 780px\)[\s\S]*\.topbar \.mobile-title\s*\{[\s\S]*display:\s*block\s*!important;/);
  assert.match(activityCss, /\.activity-mode-topbar-shared\s*\{[\s\S]*display:\s*flex\s*!important;/);
  assert.match(activityCss, /\.activity-mode-page-shared \.content\s*\{[\s\S]*padding-top:\s*10px;/);
  assert.doesNotMatch(activityCss, /activity-mode-topbar-shared[\s\S]*display:\s*none\s*!important/);
  assert.match(indexHtml, /src\/activity-mode-ui\.css\?v=20260919-1/);
  assert.match(indexHtml, /src\/activity-mode-ui\.js\?v=20260919-1/);
});
