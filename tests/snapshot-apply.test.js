import assert from 'node:assert/strict';
import test from 'node:test';

import { UPGRADES } from '../src/data.js';
import {
  applySnapshotToProgress,
  cropsForToolItem,
  hasPerfectGem,
  isAutoApplied,
  stripFormatting,
  turboCropLevel,
} from '../src/snapshot-apply.js';
import { createEmptyProfileSnapshot } from '../src/profile-normalizer.js';

function emptyState() {
  return { schemaVersion: 3, profile: { levels: {}, owned: {}, cropProgress: {}, toolProgress: {} } };
}

function snapshotWith(overrides = {}) {
  const snapshot = createEmptyProfileSnapshot();
  return { ...snapshot, ...overrides, garden: { ...snapshot.garden, ...(overrides.garden || {}) } };
}

function toolItem(overrides = {}) {
  return {
    container: 'inventory',
    displayName: '§dMelon Dicer 3.0',
    enchantments: {},
    gems: {},
    ...overrides,
  };
}

test('colour codes are stripped from display names', () => {
  assert.equal(stripFormatting('§dMelon Dicer 3.0'), 'Melon Dicer 3.0');
  assert.equal(stripFormatting("\u00a76\u00a7lEuclid's Wheat Hoe"), "Euclid's Wheat Hoe");
  assert.equal(stripFormatting(null), '');
});

test('a tool is matched to its crop by the tool name in the data layer', () => {
  assert.deepEqual(cropsForToolItem(toolItem()), ['melon']);
  assert.deepEqual(cropsForToolItem(toolItem({ displayName: "\u00a76Euclid's Wheat Hoe" })), ['wheat']);
  assert.deepEqual(cropsForToolItem(toolItem({ displayName: 'Cactus Knife' })), ['cactus']);
});

test('the shared Eclipse Hoe matches both crops that use it', () => {
  assert.deepEqual(cropsForToolItem(toolItem({ displayName: '§5Eclipse Hoe' })).sort(), ['moonflower', 'sunflower']);
});

test('an item that is not a farming tool matches nothing', () => {
  assert.deepEqual(cropsForToolItem(toolItem({ displayName: '§fDiamond Sword' })), []);
  assert.deepEqual(cropsForToolItem(toolItem({ displayName: null })), []);
});

test('a perfect peridot is detected in both recorded gem shapes', () => {
  assert.equal(hasPerfectGem({ PERIDOT_0: 'PERFECT' }), true);
  assert.equal(hasPerfectGem({ PERIDOT_0: { quality: 'PERFECT', uuid: 'x' } }), true);
  assert.equal(hasPerfectGem({ PERIDOT_0: 'FLAWLESS' }), false);
  assert.equal(hasPerfectGem({ JASPER_0: 'PERFECT' }), false);
  assert.equal(hasPerfectGem(null), false);
});

test('Turbo-Crop is read by prefix, so no crop suffix has to be known', () => {
  assert.equal(turboCropLevel({ turbo_melon: 5 }), 5);
  assert.equal(turboCropLevel({ turbo_cane: 3, harvesting: 6 }), 3);
  assert.equal(turboCropLevel({ turbo_some_future_crop: 4 }), 4);
  assert.equal(turboCropLevel({ harvesting: 6 }), 0);
  assert.equal(turboCropLevel(undefined), 0);
});

test('derived account and garden values land on the account and crop cards', () => {
  const state = emptyState();
  applySnapshotToProgress(state, snapshotWith({
    skills: { farming: { level: 42, xp: 1, cap: null, status: 'DERIVED' } },
    garden: { unlockedPlotCount: 17, cropUpgrades: { melon: 9, wheat: 4 } },
  }));

  assert.equal(state.profile.levels['account-skill-farming-skill-level'], 42);
  assert.equal(state.profile.owned['account-skill-farming-skill-level'], true);
  assert.equal(state.profile.levels['garden-garden-plots-unlocked'], 17);
  assert.equal(state.profile.cropProgress.melon.levels['crop-progression-crop-upgrade-selected-crop'], 9);
  assert.equal(state.profile.cropProgress.wheat.levels['crop-progression-crop-upgrade-selected-crop'], 4);
});

test('tool counters, enchantments, reforge, gem and recomb land on that tool', () => {
  const state = emptyState();
  applySnapshotToProgress(state, snapshotWith({
    items: [toolItem({
      farmingForDummies: 5,
      overclockerLevel: 7,
      recombobulated: 1,
      reforge: 'blessed',
      gems: { PERIDOT_0: 'PERFECT' },
      enchantments: { dedication: 4, cultivating: 10, harvesting: 6, turbo_melon: 5 },
    })],
  }));

  const tool = state.profile.toolProgress['melon-dicer'].levels;
  assert.equal(tool['tool-farming-for-dummies'], 5);
  assert.equal(tool['tool-overclocker-3000'], 7);
  assert.equal(tool['tool-enchant-dedication'], 4);
  assert.equal(tool['tool-enchant-cultivating-x'], 10);
  assert.equal(tool['tool-enchant-harvesting-vi'], 6);
  assert.equal(tool['tool-enchant-turbo-crop'], 5);
  assert.equal(tool['tool-reforge-blessed-reforge'], 1);
  assert.equal(tool['tool-recombobulator-effect-on-tool-stats'], 1);
  assert.equal(tool['tool-gem-perfect-peridot-on-farming-tool'], 1);
});

test('values are clamped to each documented maximum', () => {
  const state = emptyState();
  applySnapshotToProgress(state, snapshotWith({
    skills: { farming: { level: 999, xp: 1, cap: null, status: 'DERIVED' } },
    items: [toolItem({ overclockerLevel: 99, enchantments: { dedication: 99 } })],
  }));
  const max = id => UPGRADES.find(entry => entry.id === id).max;
  assert.equal(state.profile.levels['account-skill-farming-skill-level'], max('account-skill-farming-skill-level'));
  assert.equal(state.profile.toolProgress['melon-dicer'].levels['tool-overclocker-3000'], max('tool-overclocker-3000'));
  assert.equal(state.profile.toolProgress['melon-dicer'].levels['tool-enchant-dedication'], max('tool-enchant-dedication'));
});

test('a shared tool fills both crops that use it', () => {
  const state = emptyState();
  applySnapshotToProgress(state, snapshotWith({
    items: [toolItem({ displayName: 'Eclipse Hoe', enchantments: { harvesting: 6 } })],
  }));
  assert.equal(state.profile.toolProgress['eclipse-hoe'].levels['tool-enchant-harvesting-vi'], 6);
});

test('a set-wide armor bonus needs every slot, and an incomplete set is reported', () => {
  const piece = extra => ({ container: 'armor', displayName: 'Helianthus Helmet', gems: {}, enchantments: {}, ...extra });

  const partial = emptyState();
  const partialResult = applySnapshotToProgress(partial, snapshotWith({
    items: [piece({ reforge: 'mossy' }), piece({ reforge: 'mossy' })],
  }));
  assert.equal(partial.profile.levels['armor-reforge-mossy-on-full-armor'], undefined);
  assert.ok(partialResult.skipped.some(note => /2 of 4 armor pieces/.test(note)));

  const full = emptyState();
  applySnapshotToProgress(full, snapshotWith({
    items: Array.from({ length: 4 }, () => piece({ reforge: 'mossy', enchantments: { pesterminator: 6 }, gems: { PERIDOT_0: 'PERFECT' } })),
  }));
  assert.equal(full.profile.levels['armor-reforge-mossy-on-full-armor'], 1);
  assert.equal(full.profile.levels['armor-enchant-pesterminator-vi-on-full-armor'], 1);
  assert.equal(full.profile.levels['armor-gem-perfect-peridot-on-full-armor'], 1);
});

test('one armor piece missing the effect blocks the set-wide bonus', () => {
  const piece = reforge => ({ container: 'armor', displayName: 'Helianthus Helmet', gems: {}, enchantments: {}, reforge });
  const state = emptyState();
  applySnapshotToProgress(state, snapshotWith({
    items: [piece('mossy'), piece('mossy'), piece('mossy'), piece('blessed')],
  }));
  assert.equal(state.profile.levels['armor-reforge-mossy-on-full-armor'], undefined);
});

test('a set-wide enchantment is recorded at the lowest level across the set', () => {
  const piece = level => ({ container: 'armor', displayName: 'Helianthus Helmet', gems: {}, enchantments: { sunset: level } });
  const state = emptyState();
  applySnapshotToProgress(state, snapshotWith({ items: [piece(5), piece(3), piece(5), piece(4)] }));
  assert.equal(state.profile.levels['armor-enchant-sunset-v-day-overbloom'], 3);
});

test('loadout containers count as armor and equipment', () => {
  const state = emptyState();
  applySnapshotToProgress(state, snapshotWith({
    items: Array.from({ length: 4 }, (_, index) => ({
      container: `loadout.equipment.set_a.equipment_slot_${index + 1}`,
      displayName: 'Lotus Bracelet', gems: {}, enchantments: { green_thumb: 5 }, reforge: 'rooted',
    })),
  }));
  assert.equal(state.profile.levels['equipment-reforge-rooted-on-full-equipment'], 1);
  // The Green Thumb entry is a yes/no upgrade (max 1), so the level clamps.
  assert.equal(state.profile.levels['equipment-enchant-green-thumb-v-on-equipment'], 1);
});

test('applied values are stamped as auto so the UI can mark them', () => {
  const state = emptyState();
  applySnapshotToProgress(state, snapshotWith({
    skills: { farming: { level: 30, xp: 1, cap: null, status: 'DERIVED' } },
    items: [toolItem({ farmingForDummies: 3 })],
  }));
  assert.ok(isAutoApplied(state, 'account', 'account-skill-farming-skill-level'));
  assert.ok(isAutoApplied(state, 'tool:melon-dicer', 'tool-farming-for-dummies'));
  assert.ok(!isAutoApplied(state, 'account', 'accessory-fermento-artifact'));
});

test('a zero or absent value never marks an entry as owned', () => {
  const state = emptyState();
  applySnapshotToProgress(state, snapshotWith({
    items: [toolItem({ farmingForDummies: 0, overclockerLevel: null, recombobulated: 0, enchantments: { dedication: 0 } })],
  }));
  const tool = state.profile.toolProgress['melon-dicer'] || { levels: {}, owned: {} };
  assert.deepEqual(tool.levels, {});
  assert.deepEqual(tool.owned, {});
});

test('entries the sync cannot fill are reported rather than silently zeroed', () => {
  const state = emptyState();
  const result = applySnapshotToProgress(state, snapshotWith({ items: [] }));
  // Mk. II/III need an item-id table this repo has not verified, so they must
  // stay in the unmapped list instead of being guessed at.
  assert.ok(result.unmapped.includes('tool-mk-ii'));
  assert.ok(result.unmapped.includes('accessory-fermento-artifact'));
  assert.ok(!result.unmapped.includes('tool-farming-for-dummies'));
});

test('a sync never overwrites the whole state, only the entries it filled', () => {
  const state = emptyState();
  state.profile.name = 'My profile';
  state.profile.globalFortune = 1234;
  state.profile.levels['accessory-fermento-artifact'] = 1;
  applySnapshotToProgress(state, snapshotWith({
    skills: { farming: { level: 20, xp: 1, cap: null, status: 'DERIVED' } },
  }));
  assert.equal(state.profile.name, 'My profile');
  assert.equal(state.profile.globalFortune, 1234);
  assert.equal(state.profile.levels['accessory-fermento-artifact'], 1, 'manual entries survive a sync');
  assert.equal(state.profile.levels['account-skill-farming-skill-level'], 20);
});

test('an unknown crop id in the snapshot is ignored instead of creating a bucket', () => {
  const state = emptyState();
  applySnapshotToProgress(state, snapshotWith({ garden: { cropUpgrades: { 'not-a-crop': 5, melon: 2 } } }));
  assert.equal(state.profile.cropProgress['not-a-crop'], undefined);
  assert.equal(state.profile.cropProgress.melon.levels['crop-progression-crop-upgrade-selected-crop'], 2);
});

test('decoded items that match no tool are reported', () => {
  const state = emptyState();
  const result = applySnapshotToProgress(state, snapshotWith({
    items: [{ container: 'inventory', displayName: 'Diamond Sword', gems: {}, enchantments: {} }],
  }));
  assert.ok(result.skipped.some(note => /No decoded item matched a known farming tool/.test(note)));
});
