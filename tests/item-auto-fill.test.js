import assert from 'node:assert/strict';
import test from 'node:test';

import {
  PHYSICAL_ITEM_SOURCE,
  autoFillPhysicalItems,
  observedGemstoneSlots,
} from '../src/item-auto-fill.js';
import { toolKeyForCropId } from '../src/migrations.js';
import { highestChainTier, TOOL_TIER_CHAIN } from '../src/progression-chains.js';

function state() {
  return {
    profile: {
      levels: {},
      owned: {},
      toolProgress: {},
      cropProgress: {},
    },
  };
}

function snapshot(items, status = 'AUTO') {
  return {
    items,
    provenance: { items: { status } },
  };
}

test('observed gemstone NBT is mapped by exact socket index', () => {
  assert.deepEqual(observedGemstoneSlots({
    PERIDOT_1: { quality: 'PERFECT' },
    PERIDOT_0: 'FINE',
    JASPER_0: 'PERFECT',
  }), [
    { index: 0, gem: 'FINE PERIDOT' },
    { index: 1, gem: 'PERFECT PERIDOT' },
  ]);
});

test('one exact farming tool auto-fills its physical tier, reforge and observed gems', () => {
  const raw = state();
  const result = autoFillPhysicalItems(raw, snapshot([{
    skyblockId: 'MELON_DICER_3',
    itemUuid: 'melon-uuid',
    reforge: 'bountiful',
    gems: { PERIDOT_0: 'PERFECT', PERIDOT_2: 'FINE' },
  }]));

  const bucket = raw.profile.toolProgress[toolKeyForCropId('melon')];
  assert.equal(highestChainTier(bucket, TOOL_TIER_CHAIN), 3);
  assert.equal(bucket.reforge, 'bountiful');
  assert.equal(bucket.gemSlots[0].gem, 'PERFECT PERIDOT');
  assert.equal(bucket.gemSlots[2].gem, 'FINE PERIDOT');
  assert.equal(bucket.syncedSkyblockId, 'MELON_DICER_3');
  assert.equal(bucket.syncedItemUuid, 'melon-uuid');
  assert.equal(bucket.physicalSource, PHYSICAL_ITEM_SOURCE.SYNC);
  assert.deepEqual(result.applied, ['tool:melon']);
});

test('one exact Vacuum auto-fills model, reforge, enchants and item-local upgrades', () => {
  const raw = state();
  autoFillPhysicalItems(raw, snapshot([{
    skyblockId: 'INFINI_VACUUM_HOOVERIUS',
    itemUuid: 'vacuum-uuid',
    reforge: 'beady',
    recombobulated: 1,
    farmingForDummies: 4,
    enchantments: { bug_blender: 5 },
    gems: { PERIDOT_0: 'FLAWLESS', PERIDOT_1: 'PERFECT' },
  }]));

  const bucket = raw.profile.vacuumProgress;
  assert.equal(bucket.skyblockId, 'INFINI_VACUUM_HOOVERIUS');
  assert.equal(bucket.reforge, 'beady');
  assert.equal(bucket.recombobulated, true);
  assert.deepEqual(bucket.enchantments, { bug_blender: 5 });
  assert.equal(bucket.levels['vacuum-farming-for-dummies'], 4);
  assert.equal(bucket.levels['vacuum-enchant-bug-blender'], 5);
  assert.equal(bucket.gemSlots[1].gem, 'PERFECT PERIDOT');
  assert.equal(bucket.physicalSource, PHYSICAL_ITEM_SOURCE.SYNC);
});

test('multiple owned copies are not guessed into one physical editor', () => {
  const raw = state();
  const result = autoFillPhysicalItems(raw, snapshot([
    { skyblockId: 'MELON_DICER_2', itemUuid: 'one' },
    { skyblockId: 'MELON_DICER_3', itemUuid: 'two' },
    { skyblockId: 'INFINI_VACUUM', itemUuid: 'vac-one' },
    { skyblockId: 'INFINI_VACUUM_HOOVERIUS', itemUuid: 'vac-two' },
  ]));

  assert.equal(raw.profile.toolProgress[toolKeyForCropId('melon')], undefined);
  assert.equal(raw.profile.vacuumProgress, undefined);
  assert.equal(result.skipped.some(note => note.includes('2 owned copies')), true);
  assert.equal(result.skipped.some(note => note.includes('2 owned Vacuums')), true);
});

test('manual physical state is never replaced by a later sync', () => {
  const raw = state();
  raw.profile.toolProgress[toolKeyForCropId('melon')] = {
    levels: {},
    owned: {},
    costs: {},
    manualGain: {},
    physicalSource: PHYSICAL_ITEM_SOURCE.MANUAL,
    reforge: 'blessed',
  };
  raw.profile.vacuumProgress = {
    levels: {},
    owned: {},
    physicalSource: PHYSICAL_ITEM_SOURCE.MANUAL,
    skyblockId: 'SKYMART_VACUUM',
  };

  autoFillPhysicalItems(raw, snapshot([
    { skyblockId: 'MELON_DICER_3', reforge: 'bountiful' },
    { skyblockId: 'INFINI_VACUUM_HOOVERIUS', reforge: 'beady' },
  ]));

  assert.equal(raw.profile.toolProgress[toolKeyForCropId('melon')].reforge, 'blessed');
  assert.equal(raw.profile.vacuumProgress.skyblockId, 'SKYMART_VACUUM');
});

test('hidden or unknown item provenance never drives physical Auto-Fill', () => {
  for (const status of ['HIDDEN', 'UNKNOWN']) {
    const raw = state();
    const result = autoFillPhysicalItems(raw, snapshot([
      { skyblockId: 'MELON_DICER_3' },
      { skyblockId: 'INFINI_VACUUM_HOOVERIUS' },
    ], status));
    assert.deepEqual(raw.profile.toolProgress, {});
    assert.equal(raw.profile.vacuumProgress, undefined);
    assert.deepEqual(result.applied, []);
  }
});


test('later reliable sync clears removed synced Vacuum upgrades and gemstones', () => {
  const raw = state();
  autoFillPhysicalItems(raw, snapshot([{
    skyblockId: 'INFINI_VACUUM_HOOVERIUS',
    itemUuid: 'vacuum-uuid',
    farmingForDummies: 5,
    enchantments: { bug_blender: 5 },
    gems: { PERIDOT_0: 'PERFECT' },
  }]));
  autoFillPhysicalItems(raw, snapshot([{
    skyblockId: 'INFINI_VACUUM_HOOVERIUS',
    itemUuid: 'vacuum-uuid',
    farmingForDummies: 0,
    enchantments: {},
    gems: {},
  }]));

  const bucket = raw.profile.vacuumProgress;
  assert.equal(bucket.levels['vacuum-farming-for-dummies'], undefined);
  assert.equal(bucket.levels['vacuum-enchant-bug-blender'], undefined);
  assert.equal(bucket.gemSlots[0].gem, null);
});
