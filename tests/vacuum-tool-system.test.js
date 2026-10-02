import assert from 'node:assert/strict';
import test from 'node:test';

import { computeStatTotals } from '../src/computed-stats.js';
import {
  VACUUM_BOOKWORM_BOOK,
  VACUUM_BUG_BLENDER,
  VACUUM_FARMING_FOR_DUMMIES,
} from '../src/vacuum-data-patches.js';
import {
  isVacuumDirectUpgrade,
  vacuumGemstoneSlotCount,
  vacuumPhysicalStats,
} from '../src/vacuum-state.js';

function stateWithVacuum(vacuumProgress) {
  return {
    selectedCrop: 'melon',
    profile: {
      levels: {},
      owned: {},
      manualGain: {},
      cropProgress: { melon: { levels: {}, owned: {}, manualGain: {} } },
      toolProgress: {},
      plannerEconomics: {},
      autoApplied: {},
      vacuumProgress,
    },
  };
}

test('the Vacuum editor exposes only direct Vacuum upgrades in its upgrade section', () => {
  assert.equal(isVacuumDirectUpgrade(VACUUM_FARMING_FOR_DUMMIES), true);
  assert.equal(isVacuumDirectUpgrade(VACUUM_BOOKWORM_BOOK), true);
  assert.equal(isVacuumDirectUpgrade(VACUUM_BUG_BLENDER), false, 'Bug Blender belongs in Enchantments');
  assert.equal(isVacuumDirectUpgrade({ category: 'Vacuum Reforge' }), false, 'reforges have their own mutually exclusive selector');
  assert.equal(isVacuumDirectUpgrade({ category: 'Tool Upgrade' }), false);
});

test('Vacuum gemstone capability follows the selected physical model', () => {
  assert.equal(vacuumGemstoneSlotCount({ skyblockId: 'SKYMART_VACUUM' }), 0);
  assert.equal(vacuumGemstoneSlotCount({ skyblockId: 'SKYMART_TURBO_VACUUM' }), 0);
  assert.equal(vacuumGemstoneSlotCount({ skyblockId: 'SKYMART_HYPER_VACUUM' }), 0);
  assert.equal(vacuumGemstoneSlotCount({ skyblockId: 'INFINI_VACUUM' }), 1);
  assert.equal(vacuumGemstoneSlotCount({ skyblockId: 'INFINI_VACUUM_HOOVERIUS' }), 2);
});

test('Buzzing Hooverius derives complete item-local Vacuum stats', () => {
  const bucket = {
    skyblockId: 'INFINI_VACUUM_HOOVERIUS',
    recombobulated: true,
    reforge: 'buzzing',
    levels: {
      [VACUUM_FARMING_FOR_DUMMIES.id]: 5,
      [VACUUM_BUG_BLENDER.id]: 5,
      [VACUUM_BOOKWORM_BOOK.id]: 5,
    },
    owned: {
      [VACUUM_FARMING_FOR_DUMMIES.id]: true,
      [VACUUM_BUG_BLENDER.id]: true,
      [VACUUM_BOOKWORM_BOOK.id]: true,
    },
    gemSlots: [
      { unlocked: true, gem: 'PERFECT PERIDOT' },
      { unlocked: true, gem: 'PERFECT PERIDOT' },
    ],
  };

  const stats = vacuumPhysicalStats(bucket);
  assert.equal(stats.rarity, 'MYTHIC');
  assert.equal(stats.baseFarmingFortune, 25);
  assert.equal(stats.reforgeFarmingFortune, 11);
  assert.equal(stats.gemstoneFarmingFortune, 20);
  assert.equal(stats.farmingFortune, 161);
  assert.equal(stats.damage, 1000);
  assert.equal(stats.range, 15);
});

test('Pest-kill totals include Vacuum base Fortune, Buzzing, gems and Vacuum upgrades without leaking into farming', () => {
  const bucket = {
    skyblockId: 'INFINI_VACUUM_HOOVERIUS',
    recombobulated: true,
    reforge: 'buzzing',
    levels: {
      [VACUUM_FARMING_FOR_DUMMIES.id]: 5,
      [VACUUM_BUG_BLENDER.id]: 5,
      [VACUUM_BOOKWORM_BOOK.id]: 5,
    },
    owned: {
      [VACUUM_FARMING_FOR_DUMMIES.id]: true,
      [VACUUM_BUG_BLENDER.id]: true,
      [VACUUM_BOOKWORM_BOOK.id]: true,
    },
    gemSlots: [
      { unlocked: true, gem: 'PERFECT PERIDOT' },
      { unlocked: true, gem: 'PERFECT PERIDOT' },
    ],
  };
  const state = stateWithVacuum(bucket);
  state.profile.levels['attribute-shard-field-mouse-shard-pest-overbloom'] = 10;
  state.profile.owned['attribute-shard-field-mouse-shard-pest-overbloom'] = true;

  const kill = computeStatTotals(state, 'melon', 'pest-kill');
  assert.equal(kill.pestFortune, 161);
  assert.equal(kill.effectiveFortune, 161);
  assert.equal(kill.overbloom, 0);
  assert.ok(kill.incomplete.overbloom.some(row=>row.id==='attribute-shard-field-mouse-shard-pest-overbloom')); 
  assert.equal(kill.derived.vacuumBaseFarmingFortune, 25);
  assert.equal(kill.derived.vacuumBuzzingFarmingFortune, 11);
  assert.equal(kill.derived.vacuumPeridotFortune, 20);
  assert.equal(kill.derived.vacuumPhysicalStats.damage, 1000);

  const farming = computeStatTotals(state, 'melon', 'farm');
  assert.equal(farming.pestFortune, 0);
  assert.equal(farming.derived.vacuumPhysicalStats, null);
});

test('Beady is counted once while still combining with the Vacuum base Fortune', () => {
  const state = stateWithVacuum({
    skyblockId: 'INFINI_VACUUM_HOOVERIUS',
    recombobulated: false,
    reforge: 'beady',
    levels: { 'vacuum-reforge-beady-pest-only-farming-fortune': 1 },
    owned: { 'vacuum-reforge-beady-pest-only-farming-fortune': true },
    gemSlots: [],
  });

  const totals = computeStatTotals(state, 'melon', 'pest-kill');
  assert.equal(totals.pestFortune, 125);
  assert.equal(totals.derived.vacuumBaseFarmingFortune, 25);
  assert.equal(totals.derived.vacuumBuzzingFarmingFortune, 0);
  assert.equal(totals.derived.vacuumPhysicalStats.farmingFortune, 125);
  assert.equal(totals.derived.vacuumPhysicalStats.damage, 425);
});


test('orphaned Vacuum modifier flags do not produce Pest Fortune without a selected physical Vacuum', () => {
  const state = stateWithVacuum({
    skyblockId: null,
    levels: {
      [VACUUM_FARMING_FOR_DUMMIES.id]: 5,
      [VACUUM_BUG_BLENDER.id]: 5,
      'vacuum-reforge-beady-pest-only-farming-fortune': 1,
    },
    owned: {
      [VACUUM_FARMING_FOR_DUMMIES.id]: true,
      [VACUUM_BUG_BLENDER.id]: true,
      'vacuum-reforge-beady-pest-only-farming-fortune': true,
    },
  });

  const totals = computeStatTotals(state, 'melon', 'pest-kill');
  assert.equal(totals.pestFortune, 0);
  assert.equal(totals.effectiveFortune, 0);
  assert.equal(totals.derived.vacuumPhysicalStats.selected, false);
});
