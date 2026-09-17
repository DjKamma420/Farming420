import assert from 'node:assert/strict';
import test from 'node:test';

import {
  ACTIVITY_MODE,
  activityModeForState,
  itemAppliesToActivity,
  setActivityModeOnState,
} from '../src/activity-mode.js';
import { computeTotalsFromEntries } from '../src/computed-stats.js';
import { activeMooshroomCow, mooshroomCowContribution } from '../src/mooshroom-cow.js';

function progressBucket() {
  return { levels: {}, owned: {}, costs: {}, manualGain: {} };
}

function baseState() {
  return {
    selectedCrop: 'melon',
    profile: {
      levels: {},
      owned: {},
      costs: {},
      manualGain: {},
      cropProgress: { melon: progressBucket() },
      toolProgress: { 'melon-dicer': progressBucket() },
      vacuumProgress: progressBucket(),
      autoApplied: {},
      setups: {
        modelVersion: 1,
        activeId: 'normal',
        list: [
          { id: 'normal', name: 'Normal Farming', slots: {} },
          { id: 'pest', name: 'Pest Farming', slots: {} },
        ],
      },
    },
  };
}

test('activity mode defaults to Farm and follows the normal/pest setup ids', () => {
  assert.equal(activityModeForState({}), ACTIVITY_MODE.FARM);
  assert.equal(activityModeForState({ profile: { setups: { activeId: 'normal' } } }), ACTIVITY_MODE.FARM);
  assert.equal(activityModeForState({ profile: { setups: { activeId: 'pest' } } }), ACTIVITY_MODE.PEST);
});

test('changing activity mode selects only the Farm or Pest setup without deleting other saved setups', () => {
  const state = baseState();
  state.profile.setups.list.push({ id: 'contest', name: 'Old contest setup', slots: {} });

  assert.equal(setActivityModeOnState(state, ACTIVITY_MODE.PEST), ACTIVITY_MODE.PEST);
  assert.equal(state.profile.setups.activeId, 'pest');
  assert.ok(state.profile.setups.list.some(setup => setup.id === 'contest'));

  assert.equal(setActivityModeOnState(state, ACTIVITY_MODE.FARM), ACTIVITY_MODE.FARM);
  assert.equal(state.profile.setups.activeId, 'normal');
});

test('Farm uses farming tools while Pest uses vacuum and pest-only effects', () => {
  const farmingTool = { id: 'tool-reforge-blessed-reforge', section: 'tools', modeScope: 'Any' };
  const vacuum = { id: 'vacuum-reforge-beady-pest-only-farming-fortune', section: 'tools', modeScope: 'Pest Vacuum Drops' };
  const pestOverbloom = { id: 'attribute-shard-field-mouse-shard-pest-overbloom', section: 'shards', modeScope: 'Pest Vacuum Drops' };
  const global = { id: 'account-skill-farming-skill-level', section: 'account', modeScope: 'Any' };
  const feast = { id: 'harvest-feast-bonus', section: 'buffs', modeScope: 'Harvest Feast' };

  assert.equal(itemAppliesToActivity(farmingTool, ACTIVITY_MODE.FARM), true);
  assert.equal(itemAppliesToActivity(farmingTool, ACTIVITY_MODE.PEST), false);
  assert.equal(itemAppliesToActivity(vacuum, ACTIVITY_MODE.FARM), false);
  assert.equal(itemAppliesToActivity(vacuum, ACTIVITY_MODE.PEST), true);
  assert.equal(itemAppliesToActivity(pestOverbloom, ACTIVITY_MODE.FARM), false);
  assert.equal(itemAppliesToActivity(pestOverbloom, ACTIVITY_MODE.PEST), true);
  assert.equal(itemAppliesToActivity(global, ACTIVITY_MODE.FARM), true);
  assert.equal(itemAppliesToActivity(global, ACTIVITY_MODE.PEST), true);
  assert.equal(itemAppliesToActivity(feast, ACTIVITY_MODE.FARM), false);
  assert.equal(itemAppliesToActivity(feast, ACTIVITY_MODE.PEST), false);
});

test('computed totals use crop tool for Farm, Vacuum for Pest, and show BPC in both sets', () => {
  const state = baseState();
  state.profile.levels.global = 1;
  state.profile.levels.commonOb = 1;
  state.profile.levels.pestOb = 1;
  state.profile.levels.bpc = 1;
  state.profile.toolProgress['melon-dicer'].levels.farmTool = 1;
  state.profile.vacuumProgress.levels.vacuum = 1;

  const entries = [
    { id: 'global', section: 'account', metric: 'Crop Yield', modeScope: 'Any', cropScope: 'Any', status: 'ACTIVE', max: 1, stepGain: 10 },
    { id: 'farmTool', section: 'tools', metric: 'Crop Yield', modeScope: 'Any', cropScope: 'Any', status: 'ACTIVE', max: 1, stepGain: 20 },
    { id: 'vacuum', section: 'tools', category: 'Vacuum Reforge', metric: 'Crop Yield', modeScope: 'Pest Vacuum Drops', cropScope: 'Any', status: 'ACTIVE', max: 1, stepGain: 100 },
    { id: 'commonOb', section: 'chips', metric: 'Rare Crops', modeScope: 'Any', cropScope: 'Any', status: 'ACTIVE', max: 1, stepGain: 5 },
    { id: 'pestOb', section: 'shards', metric: 'Rare Crops', modeScope: 'Pest Vacuum Drops', cropScope: 'Any', status: 'ACTIVE', max: 1, stepGain: 2 },
    { id: 'bpc', section: 'pests', metric: 'Pest Spawn', modeScope: 'Pest Spawning', cropScope: 'Any', status: 'ACTIVE', max: 1, stepGain: 3 },
  ];

  const farm = computeTotalsFromEntries(state, entries, 'melon', ACTIVITY_MODE.FARM);
  assert.equal(farm.globalFortune, 10);
  assert.equal(farm.cropFortune, 20);
  assert.equal(farm.pestFortune, 0);
  assert.equal(farm.effectiveFortune, 30);
  assert.equal(farm.overbloom, 5);
  assert.equal(farm.bonusPestChance, 3);

  const pest = computeTotalsFromEntries(state, entries, 'melon', ACTIVITY_MODE.PEST);
  assert.equal(pest.globalFortune, 10);
  assert.equal(pest.cropFortune, 0);
  assert.equal(pest.pestFortune, 100);
  assert.equal(pest.effectiveFortune, 110);
  assert.equal(pest.overbloom, 7);
  assert.equal(pest.bonusPestChance, 3);
});

test('the selected setup pet overrides the pet that happened to be active at last sync', () => {
  const state = baseState();
  state.profile.normalizedSnapshot = {
    pets: [{ type: 'MOOSHROOM_COW', rarity: 'LEGENDARY', experience: 1000, active: true }],
  };
  state.profile.setups.list[0].slots = {
    pet: { displayName: 'Legendary Elephant', rarity: 'LEGENDARY' },
  };

  assert.equal(activeMooshroomCow(state), null);

  state.profile.setups.list[0].slots.pet = {
    displayName: 'Legendary Mooshroom Cow', rarity: 'LEGENDARY',
  };
  const cow = activeMooshroomCow(state);
  assert.equal(cow.type, 'MOOSHROOM_COW');
  assert.equal(cow.source, 'setup+profile');
});

test('manual pet level and rarity drive Mooshroom Cow perk values', () => {
  const state = baseState();
  state.profile.inputs = { strength: 2000 };
  state.profile.normalizedSnapshot = { pets: [] };
  state.profile.setups.list[0].slots.pet = {
    skyblockId: 'MOOSHROOM_COW',
    displayName: 'Mooshroom Cow',
    rarity: 'LEGENDARY',
    petLevel: 50,
  };

  const contribution = mooshroomCowContribution(state);
  assert.equal(contribution.active, true);
  assert.equal(contribution.level, 50);
  assert.equal(contribution.rarity, 'LEGENDARY');
  assert.equal(contribution.baseFortune, 50);
  assert.ok(contribution.strengthFortune > 0);
  assert.equal(contribution.incomplete, false);
});
