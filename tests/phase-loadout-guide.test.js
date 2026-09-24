import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ACTIVITY_MODE } from '../src/activity-mode.js';
import {
  PEST_LOADOUT_LAST_VERIFIED,
  baselineTiers,
  pestLoadoutTier,
} from '../research/pest-loadout-progression.js';

const root = new URL('../', import.meta.url);
const read = path => readFileSync(new URL(path, root), 'utf8');
const master = JSON.parse(read('research/hypixel_farming_master_ai_2026-09-16.json'));
const researched = master.pest_loadout_progression;

test('the runtime tiers match the master research file', () => {
  assert.equal(PEST_LOADOUT_LAST_VERIFIED, researched.last_verified);
  assert.equal(pestLoadoutTier('midgame').physicalArmorSets, researched.midgame_pre_rose_dragon.normal_physical_armor_sets);
  assert.equal(pestLoadoutTier('endgame').physicalArmorSets, researched.endgame_two_armor_baseline.physical_armor_sets);
});

test('the visible progression choices stay on the two-set baseline', () => {
  const baselines = baselineTiers();
  assert.ok(baselines.length >= 2);
  for (const tier of baselines) assert.equal(tier.physicalArmorSets, 2);
  const guide = read('src/phase-loadout-guide.js');
  assert.match(guide, /function tiers\(\) \{\s*return baselineTiers\(\);/);
  assert.match(guide, /2 physical sets:/);
  assert.match(guide, /FF set \+ BPC set/);
});

test('Killing reuses the Farming armor in the researched baseline', () => {
  for (const tier of baselineTiers()) {
    assert.equal(tier.phases[ACTIVITY_MODE.PEST_KILL].reusesArmorFrom, ACTIVITY_MODE.FARM, tier.id);
  }
});

test('the guide documents automatic FF inheritance instead of offering a manual copy action', () => {
  const guide = read('src/phase-loadout-guide.js');
  assert.match(guide, /Killing automatically reuses FF Armor and Equipment/);
  assert.match(guide, /Only the Killing Pet can differ/);
  assert.doesNotMatch(guide, /data-phase-copy-armor|copyFarmingArmor|ensurePhysicalItemId/);
});

test('the spawn phase is still labelled short because that changes the numbers', () => {
  assert.match(read('research/pest-loadout-progression.js'), /SPAWN_PHASE_IS_SHORT/);
  assert.match(read('src/phase-loadout-guide.js'), /SPAWN_PHASE_IS_SHORT/);
  assert.equal(typeof pestLoadoutTier('midgame').phases[ACTIVITY_MODE.PEST_SPAWN].timing, 'string');
});

test('the guide is wired into the app', () => {
  const html = read('index.html');
  assert.match(html, /src\/phase-loadout-guide\.js/);
  assert.match(html, /src\/phase-loadout-guide\.css/);
});
