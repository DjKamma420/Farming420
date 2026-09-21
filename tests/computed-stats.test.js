import assert from 'node:assert/strict';
import test from 'node:test';

import {
  applyComputedStatsToState,
  computeTotalsFromEntries,
  statAxisFor,
} from '../src/computed-stats.js';

function baseState() {
  return {
    selectedCrop: 'melon',
    profile: {
      globalFortune: 9999,
      cropFortune: { melon: 9999 },
      levels: {},
      owned: {},
      manualGain: {},
      cropProgress: { melon: { levels: {}, owned: {}, manualGain: {} } },
      toolProgress: {},
      plannerEconomics: {},
      autoApplied: {},
    },
  };
}

test('stat axes separate global fortune, crop fortune, overbloom and pest chance', () => {
  assert.equal(statAxisFor({ metric: 'Crop Yield', section: 'account', cropScope: 'Any' }), 'globalFortune');
  assert.equal(statAxisFor({ metric: 'Crop Yield', section: 'crops', cropScope: 'Any' }), 'cropFortune');
  assert.equal(statAxisFor({ metric: 'Crop Yield', section: 'account', cropScope: 'Melon' }), 'cropFortune');
  assert.equal(statAxisFor({ metric: 'Rare Crops', section: 'chips', cropScope: 'Any' }), 'overbloom');
  assert.equal(statAxisFor({ metric: 'Pest Spawn', section: 'pests', cropScope: 'Any' }), 'bonusPestChance');
});

test('totals are derived from configured source levels, never from an entered end value', () => {
  const state = baseState();
  state.profile.levels.global = 2;
  state.profile.levels.overbloom = 4;
  state.profile.levels.pest = 3;
  state.profile.cropProgress.melon.levels.crop = 3;

  const entries = [
    { id: 'global', metric: 'Crop Yield', section: 'account', cropScope: 'Any', status: 'ACTIVE', max: 10, stepGain: 4 },
    { id: 'crop', metric: 'Crop Yield', section: 'crops', cropScope: 'Any', status: 'ACTIVE', max: 10, stepGain: 5 },
    { id: 'overbloom', metric: 'Rare Crops', section: 'chips', cropScope: 'Any', status: 'ACTIVE', max: 10, stepGain: 2.5 },
    { id: 'pest', metric: 'Pest Spawn', section: 'pests', cropScope: 'Any', status: 'ACTIVE', max: 10, stepGain: 2 },
  ];

  const totals = computeTotalsFromEntries(state, entries, 'melon');
  assert.equal(totals.globalFortune, 8);
  assert.equal(totals.cropFortune, 15);
  assert.equal(totals.effectiveFortune, 23);
  assert.equal(totals.overbloom, 10);
  assert.equal(totals.bonusPestChance, 6);
  assert.deepEqual(totals.sourceCount, {
    globalFortune: 1,
    cropFortune: 1,
    pestFortune: 0,
    overbloom: 1,
    bonusPestChance: 1,
  });
});

test('an empty profile has zero configured sources instead of looking fully calculated', () => {
  const totals = computeTotalsFromEntries(baseState(), [], 'melon');
  assert.deepEqual(totals.sourceCount, {
    globalFortune: 0,
    cropFortune: 0,
    pestFortune: 0,
    overbloom: 0,
    bonusPestChance: 0,
  });
  assert.deepEqual(totals.incomplete.globalFortune, []);
});

test('unmodeled configured source is flagged incomplete instead of using manual marginal input as a total', () => {
  const state = baseState();
  state.profile.levels.dynamic = 1;
  state.profile.manualGain.dynamic = 123;
  const totals = computeTotalsFromEntries(state, [
    { id: 'dynamic', metric: 'Crop Yield', section: 'account', cropScope: 'Any', status: 'ACTIVE', max: 1, stepGain: 0 },
  ], 'melon');

  assert.equal(totals.globalFortune, 0);
  assert.deepEqual(totals.incomplete.globalFortune, [
    { id: 'dynamic', reason: 'total formula not modeled yet' },
  ]);
});

test('derived Thorny totals keep Farming Fortune and both Overbloom parts separate', () => {
  const state = baseState();
  const values = {
    'equipment-reforge-thorny-on-full-mythic-equipment-ff': 48,
    'equipment-reforge-thorny-on-full-mythic-equipment-overbloom': 6,
    'equipment-reforge-thorny-thorns-overbloom': 6.8,
  };
  for (const [id, value] of Object.entries(values)) {
    state.profile.levels[id] = id.endsWith('-ff') ? 4 : 1;
    state.profile.owned[id] = true;
    state.profile.manualGain[id] = value;
    state.profile.autoApplied.account ||= {};
    state.profile.autoApplied.account[id] = { value: state.profile.levels[id], manualGain: value, source: 'hypixel-sync' };
  }
  const entries = [
    { id: 'equipment-reforge-thorny-on-full-mythic-equipment-ff', metric: 'Crop Yield', section: 'gear', cropScope: 'Any', status: 'ACTIVE', max: 4, stepGain: 0 },
    { id: 'equipment-reforge-thorny-on-full-mythic-equipment-overbloom', metric: 'Rare Crops', section: 'gear', cropScope: 'Any', status: 'ACTIVE', max: 4, stepGain: 0 },
    { id: 'equipment-reforge-thorny-thorns-overbloom', metric: 'Rare Crops', section: 'gear', cropScope: 'Any', status: 'ACTIVE', max: 1, stepGain: 0 },
  ];
  const totals = computeTotalsFromEntries(state, entries, 'melon');
  assert.equal(totals.globalFortune, 48);
  assert.equal(totals.overbloom, 12.8);
});

test('derived cache overwrites legacy manual global and crop end values', () => {
  const state = baseState();
  state.profile.levels['account-skill-farming-skill-level'] = 10;
  const snapshot = applyComputedStatsToState(state);

  assert.equal(snapshot.globalFortune, 40);
  assert.equal(state.profile.globalFortune, 40);
  assert.notEqual(state.profile.cropFortune.melon, 9999);
  assert.equal(state.profile.plannerEconomics.melon.overbloom, snapshot.overbloomByCrop.melon);
});


test('event-scoped sources only enter totals when their context is active', () => {
  const state = baseState();
  state.profile.levels.normal = 1;
  state.profile.levels.feast = 2;
  state.profile.levels.contest = 3;
  const entries = [
    { id: 'normal', metric: 'Crop Yield', section: 'account', modeScope: 'Any', cropScope: 'Any', status: 'ACTIVE', max: 1, stepGain: 10 },
    { id: 'feast', metric: 'Crop Yield', section: 'buffs', modeScope: 'Harvest Feast', cropScope: 'Any', status: 'ACTIVE', max: 5, stepGain: 5 },
    { id: 'contest', metric: 'Crop Yield', section: 'chips', modeScope: 'Jacob Contest', cropScope: 'Any', status: 'ACTIVE', max: 20, stepGain: 7 },
  ];

  const normal = computeTotalsFromEntries(state, entries, 'melon', 'farm');
  assert.equal(normal.globalFortune, 10);

  const feast = computeTotalsFromEntries(state, entries, 'melon', 'farm', 'Harvest Feast');
  assert.equal(feast.globalFortune, 20);

  const contest = computeTotalsFromEntries(state, entries, 'melon', 'farm', 'Jacob Contest');
  assert.equal(contest.globalFortune, 31);
});
