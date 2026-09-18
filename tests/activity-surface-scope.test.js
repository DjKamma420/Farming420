import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const activityUi = readFileSync(new URL('../src/activity-mode-ui.js', import.meta.url), 'utf8');
const loadoutUi = readFileSync(new URL('../src/loadout-capabilities-ui.js', import.meta.url), 'utf8');

test('phase selector is limited to contexts where the selected loadout matters', () => {
  assert.match(activityUi, /const MODE_SWITCH_PAGES = new Set\(\['dashboard', 'setups', 'planner'\]\)/);
  assert.match(activityUi, /if \(!MODE_SWITCH_PAGES\.has\(page\)\) \{[\s\S]*control\?\.remove\(\);[\s\S]*return;/);
  for (const sharedPage of ['tools', 'shards', 'account', 'crops', 'buffs', 'pests']) {
    assert.doesNotMatch(activityUi, new RegExp(`MODE_SWITCH_PAGES[^\\n]*['"]${sharedPage}['"]`));
  }
});

test('Tools remains the shared crop-tool workspace even when Killing is selected', () => {
  assert.doesNotMatch(loadoutUi, /raw\.page !== 'tools'/);
  assert.doesNotMatch(loadoutUi, /data-tool-editor.*hidden|querySelectorAll\('\.card-grid'\).*hidden/s);
  assert.match(loadoutUi, /if \(raw\.page !== 'pests'\) return;/);
  assert.match(loadoutUi, /does not replace the shared crop Tool on the Tools page/);
});

test('Pests workspace combines Spawning and Killing totals and owns the Vacuum', () => {
  assert.match(loadoutUi, /statsForMode\(raw, cropId, ACTIVITY_MODE\.PEST_SPAWN\)/);
  assert.match(loadoutUi, /statsForMode\(raw, cropId, ACTIVITY_MODE\.PEST_KILL\)/);
  assert.match(loadoutUi, /setActivityModeOnState\(scoped, mode\)/);
  assert.match(loadoutUi, /applySnapshotToProgress\(scoped,/);
  assert.match(loadoutUi, /const totalPestFortune = Number\(killStats\.globalFortune \|\| 0\) \+ Number\(killStats\.pestFortune \|\| 0\)/);
  for (const label of ['Bonus Pest Chance', 'Total Pest Fortune', 'Pest Overbloom', 'Vacuum · Killing only']) {
    assert.match(loadoutUi, new RegExp(label));
  }
});
