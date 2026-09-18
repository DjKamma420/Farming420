import assert from 'node:assert/strict';
import test from 'node:test';

import { CROPS, UPGRADES } from '../src/data.js';
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
  assert.equal(state.profile.toolProgress['eclipse-sickle'].levels['tool-enchant-harvesting-vi'], 6);
});

test('armor reforges, enchants and gems apply per equipped piece', () => {
  const armor = (displayName, extra = {}) => ({
    container: 'armor', displayName, rarity: 'LEGENDARY', gems: {}, enchantments: {}, ...extra,
  });
  const state = emptyState();
  applySnapshotToProgress(state, snapshotWith({
    items: [
      armor('Helianthus Helmet', { reforge: 'mossy', enchantments: { pesterminator: 6 }, gems: { PERIDOT_0: 'PERFECT' } }),
      armor('Helianthus Chestplate', { reforge: 'mossy', enchantments: { pesterminator: 3 } }),
    ],
  }));
  assert.equal(state.profile.levels['armor-reforge-mossy-on-full-armor'], 2);
  assert.equal(state.profile.manualGain['armor-reforge-mossy-on-full-armor'], 50);
  assert.equal(state.profile.levels['armor-enchant-pesterminator-vi-on-full-armor'], 9);
  assert.equal(state.profile.levels['armor-gem-perfect-peridot-on-full-armor'], 1);
  assert.equal(state.profile.manualGain['armor-gem-perfect-peridot-on-full-armor'], 8);
});

test('one armor piece without Mossy does not erase Mossy from the other pieces', () => {
  const piece = (name, reforge) => ({ container: 'armor', displayName: name, rarity: 'LEGENDARY', gems: {}, enchantments: {}, reforge });
  const state = emptyState();
  applySnapshotToProgress(state, snapshotWith({
    items: [
      piece('Helianthus Helmet', 'mossy'),
      piece('Helianthus Chestplate', 'mossy'),
      piece('Helianthus Leggings', 'mossy'),
      piece('Helianthus Boots', 'blessed'),
    ],
  }));
  assert.equal(state.profile.levels['armor-reforge-mossy-on-full-armor'], 3);
  assert.equal(state.profile.manualGain['armor-reforge-mossy-on-full-armor'], 75);
});

test('Sunset levels are summed per armor piece instead of taking a set minimum', () => {
  const piece = level => ({ container: 'armor', displayName: 'Armor Piece', gems: {}, enchantments: { sunset: level } });
  const state = emptyState();
  applySnapshotToProgress(state, snapshotWith({ items: [piece(5), piece(3), piece(5), piece(4)] }));
  assert.equal(state.profile.levels['armor-enchant-sunset-v-day-overbloom'], 17);
});

test('loadout containers count as armor and equipment', () => {
  const state = emptyState();
  applySnapshotToProgress(state, snapshotWith({
    items: Array.from({ length: 4 }, (_, index) => ({
      container: `loadout.equipment.set_a.equipment_slot_${index + 1}`,
      displayName: 'Lotus Bracelet', rarity: 'LEGENDARY', gems: {}, enchantments: { green_thumb: 5 }, reforge: 'rooted',
    })),
  }));
  assert.equal(state.profile.levels['equipment-reforge-rooted-on-full-equipment'], 4);
  assert.equal(state.profile.manualGain['equipment-reforge-rooted-on-full-equipment'], 72);
  assert.equal(state.profile.levels['equipment-enchant-green-thumb-v-on-equipment'], 20);
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

// --- the active setup drives the gear cards --------------------------------

function setupPiece(displayName = 'Helianthus Helmet', overrides = {}) {
  return { displayName, rarity: 'LEGENDARY', reforge: 'mossy', enchantments: {}, gems: [], ...overrides };
}

function fullSetupArmor(overrides = {}) {
  return {
    helmet: setupPiece('Helianthus Helmet', overrides.helmet),
    chestplate: setupPiece('Helianthus Chestplate', overrides.chestplate),
    leggings: setupPiece('Helianthus Leggings', overrides.leggings),
    boots: setupPiece('Helianthus Boots', overrides.boots),
  };
}

function stateWithSetup(slots) {
  const state = emptyState();
  state.profile.setups = {
    modelVersion: 1,
    activeId: 'normal',
    list: [
      { id: 'normal', name: 'Normal', slots: { helmet: null, chestplate: null, leggings: null, boots: null, equipment1: null, equipment2: null, equipment3: null, equipment4: null, pet: null, petItem: null, ...slots } },
      { id: 'pest', name: 'Pest', slots: { helmet: null, chestplate: null, leggings: null, boots: null, equipment1: null, equipment2: null, equipment3: null, equipment4: null, pet: null, petItem: null } },
    ],
  };
  return state;
}

test('a complete Helianthus setup separates base stats, Feast and per-piece Mossy', () => {
  const state = stateWithSetup(fullSetupArmor());
  applySnapshotToProgress(state, snapshotWith());
  assert.equal(state.profile.levels['armor-helianthus-armor-base-stats'], 4);
  assert.equal(state.profile.manualGain['armor-helianthus-armor-base-stats'], 150);
  assert.equal(state.profile.levels['armor-helianthus-feast-set-bonus'], 4);
  assert.equal(state.profile.manualGain['armor-helianthus-feast-set-bonus'], 75);
  assert.equal(state.profile.levels['armor-reforge-mossy-on-full-armor'], 4);
  assert.equal(state.profile.manualGain['armor-reforge-mossy-on-full-armor'], 100);
});

test('the setup wins over stale synced armor', () => {
  const synced = { container: 'armor', displayName: 'Old Helmet', rarity: 'LEGENDARY', reforge: 'blessed', enchantments: {}, gems: {} };
  const state = stateWithSetup(fullSetupArmor());
  applySnapshotToProgress(state, snapshotWith({ items: [synced, synced, synced, synced] }));
  assert.equal(state.profile.levels['armor-reforge-mossy-on-full-armor'], 4);
  assert.equal(state.profile.manualGain['armor-reforge-mossy-on-full-armor'], 100);
});

test('detected equipment is still used when the active setup leaves equipment empty', () => {
  const equipment = { container: 'equipment', displayName: 'Lotus', rarity: 'LEGENDARY', reforge: 'rooted', enchantments: {}, gems: {} };
  const state = stateWithSetup(fullSetupArmor());
  applySnapshotToProgress(state, snapshotWith({ items: [equipment, equipment, equipment, equipment] }));
  assert.equal(state.profile.levels['armor-reforge-mossy-on-full-armor'], 4, 'armor from the setup');
  assert.equal(state.profile.levels['equipment-reforge-rooted-on-full-equipment'], 4, 'equipment from the sync');
  assert.equal(state.profile.manualGain['equipment-reforge-rooted-on-full-equipment'], 72);
});

test('an incomplete armor setup still counts the individual pieces that are actually equipped', () => {
  const state = stateWithSetup({
    helmet: setupPiece('Helianthus Helmet'),
    chestplate: setupPiece('Helianthus Chestplate'),
  });
  applySnapshotToProgress(state, snapshotWith());
  assert.equal(state.profile.levels['armor-reforge-mossy-on-full-armor'], 2);
  assert.equal(state.profile.manualGain['armor-reforge-mossy-on-full-armor'], 50);
  assert.equal(state.profile.manualGain['armor-helianthus-armor-base-stats'], 75);
  assert.equal(state.profile.manualGain['armor-helianthus-feast-set-bonus'], 25);
});

test('removing Mossy from one setup piece keeps the other three Mossy pieces', () => {
  const state = stateWithSetup(fullSetupArmor());
  applySnapshotToProgress(state, snapshotWith());
  assert.equal(state.profile.levels['armor-reforge-mossy-on-full-armor'], 4);

  state.profile.setups.list[0].slots.boots.reforge = 'blessed';
  applySnapshotToProgress(state, snapshotWith());
  assert.equal(state.profile.levels['armor-reforge-mossy-on-full-armor'], 3);
  assert.equal(state.profile.manualGain['armor-reforge-mossy-on-full-armor'], 75);
  assert.ok(isAutoApplied(state, 'account', 'armor-reforge-mossy-on-full-armor'));
});

test('recomputing never clears a value the player set by hand', () => {
  const state = stateWithSetup({});
  state.profile.levels['armor-reforge-mossy-on-full-armor'] = 1;
  state.profile.owned['armor-reforge-mossy-on-full-armor'] = true;
  applySnapshotToProgress(state, snapshotWith());
  assert.equal(state.profile.levels['armor-reforge-mossy-on-full-armor'], 1, 'a manual entry is not auto-applied, so it survives');
});

test('switching the active setup re-derives from the newly active one', () => {
  const state = stateWithSetup(fullSetupArmor());
  applySnapshotToProgress(state, snapshotWith());
  assert.equal(state.profile.levels['armor-reforge-mossy-on-full-armor'], 4);

  state.profile.setups.activeId = 'pest';
  applySnapshotToProgress(state, snapshotWith());
  assert.equal(state.profile.levels['armor-reforge-mossy-on-full-armor'], undefined, 'the pest setup is empty');
});

test('Thorny reads all active armor Thorns tiers including the event Pufferfish Hat V', () => {
  const thorny = slot => ({
    displayName: `Mythic Thorny ${slot}`,
    rarity: 'MYTHIC',
    reforge: 'thorny',
    enchantments: {},
    gems: [],
  });
  const state = stateWithSetup({
    helmet: setupPiece('Pufferfish Hat', { skyblockId: 'PUFFERFISH_HAT_CELEBRATION', enchantments: { thorns: 5 }, reforge: null }),
    chestplate: setupPiece('Helianthus Chestplate', { enchantments: { thorns: 4 }, reforge: null }),
    leggings: setupPiece('Helianthus Leggings', { enchantments: { thorns: 4 }, reforge: null }),
    boots: setupPiece('Helianthus Boots', { enchantments: { thorns: 4 }, reforge: null }),
    equipment1: thorny('Necklace'),
    equipment2: thorny('Cloak'),
    equipment3: thorny('Belt'),
    equipment4: thorny('Bracelet'),
  });

  applySnapshotToProgress(state, snapshotWith());

  assert.equal(state.profile.levels['equipment-reforge-thorny-on-full-mythic-equipment-ff'], 4);
  assert.equal(state.profile.manualGain['equipment-reforge-thorny-on-full-mythic-equipment-ff'], 48);
  assert.equal(state.profile.levels['equipment-reforge-thorny-on-full-mythic-equipment-overbloom'], 4);
  assert.equal(state.profile.manualGain['equipment-reforge-thorny-on-full-mythic-equipment-overbloom'], 6);
  assert.equal(state.profile.levels['equipment-reforge-thorny-thorns-overbloom'], 1);
  assert.equal(state.profile.manualGain['equipment-reforge-thorny-thorns-overbloom'], 6.8);

  state.profile.setups.list[0].slots.helmet.enchantments.thorns = 4;
  applySnapshotToProgress(state, snapshotWith());
  assert.equal(state.profile.manualGain['equipment-reforge-thorny-thorns-overbloom'], 6.4);
});

test("Perfect Peridot is read per slot from the setup editor's list shape", () => {
  const withGem = name => setupPiece(name, { gems: ['PERFECT PERIDOT'] });
  const state = stateWithSetup({
    helmet: withGem('Helianthus Helmet'),
    chestplate: withGem('Helianthus Chestplate'),
    leggings: withGem('Helianthus Leggings'),
    boots: withGem('Helianthus Boots'),
  });
  applySnapshotToProgress(state, snapshotWith());
  assert.equal(state.profile.levels['armor-gem-perfect-peridot-on-full-armor'], 4);
  assert.equal(state.profile.manualGain['armor-gem-perfect-peridot-on-full-armor'], 32);
});

test('hasPerfectGem accepts both recorded shapes and rejects near-misses', () => {
  assert.equal(hasPerfectGem(['PERFECT PERIDOT']), true);
  assert.equal(hasPerfectGem(['FLAWLESS PERIDOT']), false);
  assert.equal(hasPerfectGem(['PERFECT JASPER']), false);
  assert.equal(hasPerfectGem({ PERIDOT_0: 'PERFECT' }), true);
  assert.equal(hasPerfectGem([]), false);
});

test('a state without setups still evaluates detected armor piece-by-piece', () => {
  const piece = name => ({ container: 'armor', displayName: name, rarity: 'LEGENDARY', reforge: 'mossy', enchantments: {}, gems: {} });
  const state = emptyState();
  applySnapshotToProgress(state, snapshotWith({ items: [
    piece('Helianthus Helmet'),
    piece('Helianthus Chestplate'),
    piece('Helianthus Leggings'),
    piece('Helianthus Boots'),
  ] }));
  assert.equal(state.profile.levels['armor-reforge-mossy-on-full-armor'], 4);
  assert.equal(state.profile.manualGain['armor-reforge-mossy-on-full-armor'], 100);
});

// --- the in-game tool rename -----------------------------------------------

test("a tool is recognised under its current in-game name", () => {
  const cases = [
    ["Euclid's Wheat Sickle", 'wheat'],
    ['Gauss Carrot Shovel', 'carrot'],
    ['Pythagorean Potato Shovel', 'potato'],
    ['Turing Sugar Cane Cutter', 'sugar-cane'],
    ['Newton Nether Wart Cutter', 'nether-wart'],
    ['Wild Rose Cutter', 'wild-rose'],
    ['Melon Dicer', 'melon'],
    ['Cactus Knife', 'cactus'],
    ['Cocoa Chopper', 'cocoa-beans'],
    ['Fungi Cutter', 'mushroom'],
    ['Pumpkin Dicer', 'pumpkin'],
  ];
  for (const [displayName, cropId] of cases) {
    assert.deepEqual(cropsForToolItem(toolItem({ displayName })), [cropId], displayName);
  }
});

test('the pre-rename names still match, so older data is not stranded', () => {
  for (const [displayName, cropId] of [
    ["Euclid's Wheat Hoe", 'wheat'],
    ['Gauss Carrot Hoe', 'carrot'],
    ['Turing Sugar Cane Hoe', 'sugar-cane'],
    ['Wild Rose Hoe', 'wild-rose'],
  ]) {
    assert.deepEqual(cropsForToolItem(toolItem({ displayName })), [cropId], displayName);
  }
});

test('the shared tool matches both crops under either name', () => {
  for (const displayName of ['Eclipse Sickle', 'Eclipse Hoe']) {
    assert.deepEqual(cropsForToolItem(toolItem({ displayName })).sort(), ['moonflower', 'sunflower'], displayName);
  }
});

test('a stack of the crop itself is not mistaken for the tool', () => {
  for (const displayName of ['Wild Rose', 'Melon Slice', 'Cactus', 'Cocoa Beans', 'Pumpkin', 'Enchanted Melon']) {
    assert.deepEqual(cropsForToolItem(toolItem({ displayName })), [], displayName);
  }
});

test('every crop declares a tool match, a source and a verification date', () => {
  for (const crop of CROPS) {
    assert.ok(crop.toolMatch, `${crop.id} has no toolMatch`);
    assert.match(String(crop.toolSource || ''), /^https?:\/\//, `${crop.id} has no tool source`);
    assert.match(String(crop.toolVerified || ''), /^\d{4}-\d{2}-\d{2}$/, `${crop.id} has no verification date`);
    assert.ok(
      crop.tool.toLowerCase().replace(/[^a-z0-9]+/g, ' ').includes(crop.toolMatch),
      `${crop.id}: "${crop.toolMatch}" is not part of "${crop.tool}"`,
    );
  }
});
