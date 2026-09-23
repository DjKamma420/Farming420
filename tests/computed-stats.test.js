import assert from 'node:assert/strict';
import test from 'node:test';

import { createDefaultSetups } from '../src/setups.js';

import {
  applyComputedStatsToState,
  computeStatTotals,
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
    pestCooldownReductionPct: 0,
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
    pestCooldownReductionPct: 0,
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


test('Rose Dragon contributes profile-scaled Fortune and Overbloom as the selected setup pet', () => {
  const state = baseState();
  const setups = createDefaultSetups();
  setups.list[0].slots.pet = {
    skyblockId: 'ROSE_DRAGON',
    displayName: 'Rose Dragon Pet',
    rarity: 'LEGENDARY',
    petLevel: 200,
    physicalItemId: 'pet:dragon',
  };
  state.profile.setups = setups;
  state.profile.normalizedSnapshot = {
    skills: { farming: { level: 60 } },
    garden: { cropMilestoneTotal: 598 },
    pets: [{ uuid: 'dragon', type: 'ROSE_DRAGON', rarity: 'LEGENDARY', level: 200, active: true }],
    provenance: { pets: { status: 'AUTO', sources: [] } },
  };

  const totals = computeStatTotals(state, 'melon', 'farm');
  assert.ok(Math.abs(totals.globalFortune - 309.7) < 1e-9);
  assert.equal(totals.overbloom, 40);
  assert.equal(totals.derived.roseDragon.active, true);
  assert.deepEqual(totals.incomplete.globalFortune, []);
  assert.deepEqual(totals.incomplete.overbloom, []);
});

test('maxed Mantid plus 3/4 Pesthunter, Pest Vest and Squeaky produce exact spawning stats', () => {
  const state = baseState();
  const setups = createDefaultSetups();
  const pest = setups.list.find(setup => setup.id === 'pest');
  setups.activeId = 'pest';

  const armorNames = [
    ['helmet', 'HELIANTHUS_HELMET', 'Helianthus Helmet'],
    ['chestplate', 'HELIANTHUS_CHESTPLATE', 'Helianthus Chestplate'],
    ['leggings', 'HELIANTHUS_LEGGINGS', 'Helianthus Leggings'],
    ['boots', 'HELIANTHUS_BOOTS', 'Helianthus Boots'],
  ];
  for (const [slot, skyblockId, displayName] of armorNames) {
    pest.slots[slot] = {
      skyblockId,
      displayName,
      rarity: 'LEGENDARY',
      recombobulated: true,
      reforge: 'mantid',
      enchantments: { pesterminator: 6 },
      gems: [],
    };
  }

  const equipment = [
    ['equipment1', 'PESTHUNTERS_NECKLACE', "Pesthunter's Necklace", 'RARE'],
    ['equipment2', 'PEST_VEST', 'Pest Vest', 'EPIC'],
    ['equipment3', 'PESTHUNTERS_BELT', "Pesthunter's Belt", 'RARE'],
    ['equipment4', 'PESTHUNTERS_GLOVES', "Pesthunter's Gloves", 'RARE'],
  ];
  for (const [slot, skyblockId, displayName, rarity] of equipment) {
    pest.slots[slot] = {
      skyblockId,
      displayName,
      rarity,
      recombobulated: true,
      reforge: 'squeaky',
      enchantments: {},
      gems: [],
    };
  }

  state.profile.setups = setups;
  const totals = computeStatTotals(
    state,
    'melon',
    'pest-spawn',
    null,
    { recentPestKills: 20 },
  );

  assert.equal(totals.derived.pestSetupGear.mantidFortune, 48);
  assert.equal(totals.derived.pestSetupGear.squeakyFortune, 34);
  assert.equal(totals.globalFortune, 82);
  assert.equal(totals.bonusPestChance, 165.5);
  assert.equal(totals.pestCooldownReductionPct, 55);
  assert.deepEqual(totals.incomplete.bonusPestChance, []);
});

test('Mantid spawning remains explicitly incomplete when the last-10-minute kill count is unknown', () => {
  const state = baseState();
  const setups = createDefaultSetups();
  const pest = setups.list.find(setup => setup.id === 'pest');
  setups.activeId = 'pest';
  pest.slots.helmet = {
    skyblockId: 'HELIANTHUS_HELMET',
    displayName: 'Helianthus Helmet',
    rarity: 'LEGENDARY',
    reforge: 'mantid',
    enchantments: {},
    gems: [],
  };
  state.profile.setups = setups;

  const totals = computeStatTotals(state, 'melon', 'pest-spawn');
  assert.equal(totals.derived.pestSetupGear.mantidRecentKillBpc, null);
  assert.ok(totals.incomplete.bonusPestChance.some(row => row.reason.includes('last 10 minutes')));
});

test('Pesthunter Eradicator becomes Pest Fortune only in the kill phase', () => {
  const state = baseState();
  const setups = createDefaultSetups();
  const kill = setups.list.find(setup => setup.id === 'pest-kill');
  setups.activeId = 'pest-kill';
  for (const [index, id] of ['PESTHUNTERS_NECKLACE', 'PESTHUNTERS_CLOAK', 'PESTHUNTERS_BELT'].entries()) {
    kill.slots[`equipment${index + 1}`] = {
      skyblockId: id,
      displayName: id,
      rarity: 'RARE',
      reforge: null,
      enchantments: {},
      gems: [],
    };
  }
  state.profile.setups = setups;

  const totals = computeStatTotals(state, 'melon', 'pest-kill');
  assert.equal(totals.pestFortune, 75);
  assert.equal(totals.bonusPestChance, 0);
  assert.equal(totals.pestCooldownReductionPct, 0);
});

test('Mosquito BPC is active only in Pest Spawning totals', () => {
  const state = baseState();
  const setups = createDefaultSetups();
  const pest = setups.list.find(setup => setup.id === 'pest');
  pest.slots.pet = {
    skyblockId: 'MOSQUITO',
    displayName: 'Mosquito Pet',
    rarity: 'COMMON',
    petLevel: 100,
    physicalItemId: 'pet:mosquito',
  };
  state.profile.setups = setups;
  state.profile.normalizedSnapshot = {
    garden: { visitors: { uniqueNpcsServed: 0 } },
    pets: [{ uuid: 'mosquito', type: 'MOSQUITO', rarity: 'COMMON', level: 100, active: false }],
  };

  setups.activeId = 'pest';
  assert.equal(computeStatTotals(state, 'melon', 'pest-spawn').bonusPestChance, 50);
  assert.equal(computeStatTotals(state, 'melon', 'farm').bonusPestChance, 0);
  assert.equal(computeStatTotals(state, 'melon', 'pest-kill').bonusPestChance, 0);
});

test('Mosquito Sugar Cane visitor Fortune is crop-local', () => {
  const state = baseState();
  const setups = createDefaultSetups();
  const farming = setups.list.find(setup => setup.id === 'normal');
  farming.slots.pet = {
    skyblockId: 'MOSQUITO',
    displayName: 'Mosquito Pet',
    rarity: 'LEGENDARY',
    petLevel: 100,
    physicalItemId: 'pet:mosquito',
  };
  state.profile.setups = setups;
  state.profile.normalizedSnapshot = {
    garden: { visitors: { uniqueNpcsServed: 100 } },
    pets: [{ uuid: 'mosquito', type: 'MOSQUITO', rarity: 'LEGENDARY', level: 100, active: true }],
  };

  const sugar = computeStatTotals(state, 'sugar-cane', 'farm');
  const melon = computeStatTotals(state, 'melon', 'farm');
  assert.equal(sugar.cropFortune, 175);
  assert.equal(melon.cropFortune, 0);
});

test('pet item planner toggles do not count globally without an active setup pet item', () => {
  const state = baseState();
  state.profile.levels['pet-item-green-bandana'] = 1;
  state.profile.owned['pet-item-green-bandana'] = true;
  const totals = computeTotalsFromEntries(state, [
    {
      id: 'pet-item-green-bandana',
      metric: 'Crop Yield',
      section: 'pets',
      cropScope: 'Any',
      status: 'ACTIVE',
      max: 1,
      stepGain: 60,
    },
  ], 'melon', 'farm');
  assert.equal(totals.globalFortune, 0);
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
