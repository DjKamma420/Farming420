import assert from 'node:assert/strict';
import test from 'node:test';

import {
  ITEM_SOURCE,
  SLOT_IDS,
  activeSetup,
  applyCandidateSetupSafely,
  createDefaultSetups,
  createEmptyItem,
  createSetup,
  itemRecordFromDecoded,
  nextSetupId,
  normalizeSetups,
  prefillSetupFromSnapshot,
  setupSummary,
  ensurePhysicalItemId,
  physicalItemId,
  writeLinkedSetupSlot,
} from '../src/setups.js';

function decoded(overrides = {}) {
  return { container: 'armor', slot: 3, displayName: '§6Helianthus Helmet', enchantments: {}, gems: {}, ...overrides };
}

test('the default setups are farming, pest spawning, and pest killing', () => {
  const setups = createDefaultSetups();
  assert.deepEqual(setups.list.map(setup => setup.id), ['normal', 'pest', 'pest-kill']);
  assert.deepEqual(setups.list.map(setup => setup.name), ['Farming', 'Pest Spawning', 'Pest Killing']);
  assert.equal(setups.activeId, 'normal');
});

test('a new setup starts with every slot empty', () => {
  const setup = createSetup('x', 'X');
  assert.deepEqual(Object.keys(setup.slots).sort(), [...SLOT_IDS].sort());
  assert.ok(Object.values(setup.slots).every(slot => slot === null));
});

test('a damaged or partial setup object is repaired rather than rejected', () => {
  const setups = normalizeSetups({ list: [{ id: 'a', slots: { helmet: { displayName: 'Hat' } } }, null, { name: 'no id' }] });
  assert.equal(setups.list.length, 1);
  assert.equal(setups.list[0].name, 'a', 'a missing name falls back to the id');
  assert.equal(setups.list[0].slots.helmet.displayName, 'Hat');
  assert.equal(setups.list[0].slots.boots, null);
  assert.equal(setups.activeId, 'a', 'an unknown active id falls back to the first setup');
});

test('an empty or missing setup object yields the defaults', () => {
  for (const input of [null, undefined, {}, { list: [] }, 'nonsense']) {
    assert.equal(normalizeSetups(input).list.length, 3);
  }
});

test('the active setup is resolved, falling back to the first one', () => {
  assert.equal(activeSetup(createDefaultSetups()).id, 'normal');
  assert.equal(activeSetup({ activeId: 'gone', list: [createSetup('a', 'A')] }).id, 'a');
});

test('a new setup id never collides with an existing one', () => {
  const setups = createDefaultSetups();
  const id = nextSetupId(setups);
  assert.ok(!setups.list.some(setup => setup.id === id));
});

test('a decoded item becomes an item record with its colour codes stripped', () => {
  const record = itemRecordFromDecoded(decoded({
    skyblockId: 'HELIANTHUS_HELMET',
    reforge: 'mossy',
    enchantments: { pesterminator: 6 },
    gems: { PERIDOT_0: 'PERFECT' },
    recombobulated: 1,
    itemUuid: 'uuid-1',
  }));
  assert.equal(record.displayName, 'Helianthus Helmet');
  assert.equal(record.skyblockId, 'HELIANTHUS_HELMET');
  assert.equal(record.reforge, 'mossy');
  assert.equal(record.enchantments.pesterminator, 6);
  assert.deepEqual(record.gems, ['PERFECT PERIDOT']);
  assert.equal(record.recombobulated, true);
  assert.equal(record.source, ITEM_SOURCE.SYNC);
  assert.equal(record.itemUuid, 'uuid-1');
  assert.equal(record.physicalItemId, 'uuid:uuid-1');
});

test('recombobulated is false when the counter is absent or zero', () => {
  assert.equal(itemRecordFromDecoded(decoded()).recombobulated, false);
  assert.equal(itemRecordFromDecoded(decoded({ recombobulated: 0 })).recombobulated, false);
});

test('worn armor fills the four armor slots helmet-first', () => {
  const snapshot = {
    items: [
      decoded({ slot: 0, displayName: 'Helianthus Boots' }),
      decoded({ slot: 1, displayName: 'Helianthus Leggings' }),
      decoded({ slot: 2, displayName: 'Helianthus Chestplate' }),
      decoded({ slot: 3, displayName: 'Helianthus Helmet' }),
    ],
  };
  const { setup, filled } = prefillSetupFromSnapshot(createSetup('a', 'A'), snapshot);
  assert.equal(setup.slots.helmet.displayName, 'Helianthus Helmet');
  assert.equal(setup.slots.chestplate.displayName, 'Helianthus Chestplate');
  assert.equal(setup.slots.leggings.displayName, 'Helianthus Leggings');
  assert.equal(setup.slots.boots.displayName, 'Helianthus Boots');
  assert.equal(filled.length, 4);
});

test('only worn containers are used, never stored items', () => {
  const snapshot = {
    items: [
      decoded({ container: 'enderchest', displayName: 'Spare Helmet' }),
      decoded({ container: 'backpack.0', displayName: 'Another Helmet' }),
      decoded({ container: 'inventory', displayName: 'Third Helmet' }),
    ],
  };
  const { setup, filled } = prefillSetupFromSnapshot(createSetup('a', 'A'), snapshot);
  assert.deepEqual(filled, [], 'owning an item is not the same as wearing it');
  assert.ok(Object.values(setup.slots).every(slot => slot === null));
});

test('equipment fills its four slots in slot order', () => {
  const snapshot = {
    items: [0, 1, 2, 3].map(slot => decoded({ container: 'equipment', slot, displayName: `Piece ${slot}` })),
  };
  const { setup } = prefillSetupFromSnapshot(createSetup('a', 'A'), snapshot);
  assert.equal(setup.slots.equipment1.displayName, 'Piece 0');
  assert.equal(setup.slots.equipment4.displayName, 'Piece 3');
});

test('the active pet and its held item fill the pet slots', () => {
  const snapshot = {
    items: [],
    pets: [
      { type: 'ELEPHANT', tier: 'EPIC', rarity: 'EPIC', active: false },
      { type: 'MOOSHROOM_COW', rarity: 'LEGENDARY', active: true, heldItem: 'GREEN_BANDANA' },
    ],
  };
  const { setup } = prefillSetupFromSnapshot(createSetup('a', 'A'), snapshot);
  assert.equal(setup.slots.pet.displayName, 'Mooshroom Cow Pet');
  assert.equal(setup.slots.pet.skyblockId, 'MOOSHROOM_COW');
  assert.equal(setup.slots.petItem.skyblockId, 'GREEN_BANDANA');
});

test('autofill derives the active pet level from synced experience and keeps its physical identity', () => {
  const snapshot = {
    items: [],
    pets: [{
      uuid: 'pet-123',
      type: 'BEE',
      rarity: 'COMMON',
      experience: 100,
      active: true,
      heldItem: 'GREEN_BANDANA',
    }],
  };
  const { setup } = prefillSetupFromSnapshot(createSetup('a', 'A'), snapshot);
  assert.equal(setup.slots.pet.petLevel, 2);
  assert.equal(setup.slots.pet.physicalItemId, 'pet:pet-123');
  assert.equal(setup.slots.petItem.displayName, 'Green Bandana');
  assert.equal(setup.slots.petItem.physicalItemId, 'pet-held:pet-123');
});

test('Rose Dragon profile XP resolves through level 200 without a synthetic level field', () => {
  const snapshot = {
    items: [],
    pets: [{
      uuid: 'rose-xp',
      type: 'ROSE_DRAGON',
      rarity: 'LEGENDARY',
      experience: 214_023_230,
      level: null,
      active: true,
      heldItem: null,
    }],
  };
  const { setup } = prefillSetupFromSnapshot(createSetup('a', 'A'), snapshot);
  assert.equal(setup.slots.pet.skyblockId, 'ROSE_DRAGON');
  assert.equal(setup.slots.pet.petLevel, 200);
  assert.equal(setup.slots.pet.physicalItemId, 'pet:rose-xp');
});

test('an unhatched Rose Dragon profile remains below level 100 instead of being clamped to 100', () => {
  const snapshot = {
    items: [],
    pets: [{
      uuid: 'rose-egg',
      type: 'ROSE_DRAGON',
      rarity: 'LEGENDARY',
      experience: 0,
      level: null,
      active: true,
      heldItem: null,
    }],
  };
  const { setup } = prefillSetupFromSnapshot(createSetup('a', 'A'), snapshot);
  assert.equal(setup.slots.pet.petLevel, 1);
});

test('applying a recommended setup preserves a non-empty phase setup as a separate backup', () => {
  const setups = createDefaultSetups();
  const target = setups.list.find(setup => setup.id === 'normal');
  target.slots.helmet = {
    ...createEmptyItem(),
    skyblockId: 'OLD_HELMET',
    displayName: 'Old Helmet',
    source: ITEM_SOURCE.MANUAL,
    physicalItemId: 'uuid:old-helmet',
  };

  const candidate = createSetup('candidate', 'Candidate');
  candidate.slots.helmet = {
    ...createEmptyItem(),
    skyblockId: 'HELIANTHUS_HELMET',
    displayName: 'Helianthus Helmet',
    source: ITEM_SOURCE.SYNC,
    physicalItemId: 'uuid:new-helmet',
  };

  const result = applyCandidateSetupSafely(setups, 'normal', candidate);
  assert.equal(result.applied, true);
  assert.equal(result.targetSetupId, 'normal');
  assert.ok(result.backupId);

  const backup = setups.list.find(setup => setup.id === result.backupId);
  assert.equal(backup.slots.helmet.skyblockId, 'OLD_HELMET');
  assert.equal(backup.slots.helmet.source, ITEM_SOURCE.MANUAL);
  assert.equal(target.slots.helmet.skyblockId, 'HELIANTHUS_HELMET');
  assert.equal(target.slots.helmet.physicalItemId, 'uuid:new-helmet');
  assert.equal(setups.activeId, 'normal');
});

test('applying to an empty phase setup needs no backup', () => {
  const setups = createDefaultSetups();
  const candidate = createSetup('candidate', 'Candidate');
  candidate.slots.pet = {
    ...createEmptyItem(),
    skyblockId: 'MOSQUITO',
    displayName: 'Mosquito Pet',
    petLevel: 100,
    source: ITEM_SOURCE.SYNC,
    physicalItemId: 'pet:mosquito',
  };

  const result = applyCandidateSetupSafely(setups, 'pest', candidate);
  assert.equal(result.applied, true);
  assert.equal(result.backupId, null);
  assert.equal(setups.list.find(setup => setup.id === 'pest').slots.pet.skyblockId, 'MOSQUITO');
  assert.equal(setups.activeId, 'pest');
});

test('re-applying an identical candidate does not create backup noise', () => {
  const setups = createDefaultSetups();
  const target = setups.list.find(setup => setup.id === 'pest-kill');
  target.slots.pet = {
    ...createEmptyItem(),
    skyblockId: 'ROSE_DRAGON',
    displayName: 'Rose Dragon Pet',
    physicalItemId: 'pet:rose',
  };
  const candidate = createSetup('candidate', 'Candidate');
  candidate.slots.pet = structuredClone(target.slots.pet);

  const beforeCount = setups.list.length;
  const result = applyCandidateSetupSafely(setups, 'pest-kill', candidate);
  assert.equal(result.applied, false);
  assert.equal(result.backupId, null);
  assert.equal(result.reason, 'candidate already matches target');
  assert.equal(setups.list.length, beforeCount);
  assert.equal(setups.activeId, 'pest-kill');
});

test('safe candidate application rejects missing targets without mutating setups', () => {
  const setups = createDefaultSetups();
  const before = structuredClone(setups);
  const candidate = createSetup('candidate', 'Candidate');
  const result = applyCandidateSetupSafely(setups, 'missing-phase', candidate);
  assert.equal(result.applied, false);
  assert.equal(result.reason, 'target setup is missing');
  assert.deepEqual(setups, before);
});

test('an inactive pet is never assumed to be the equipped one', () => {
  const snapshot = { items: [], pets: [{ type: 'ELEPHANT', active: false }, { type: 'HEDGEHOG', active: null }] };
  const { setup } = prefillSetupFromSnapshot(createSetup('a', 'A'), snapshot);
  assert.equal(setup.slots.pet, null);
});

test('a prefill never discards a slot the player filled in by hand', () => {
  const manual = { ...createEmptyItem(), displayName: 'My own helmet', source: ITEM_SOURCE.MANUAL };
  const base = createSetup('a', 'A');
  base.slots.helmet = manual;

  const snapshot = { items: [decoded({ slot: 3, displayName: 'Synced Helmet' })] };
  const kept = prefillSetupFromSnapshot(base, snapshot);
  assert.equal(kept.setup.slots.helmet.displayName, 'My own helmet');

  const overwritten = prefillSetupFromSnapshot(base, snapshot, { overwrite: true });
  assert.equal(overwritten.setup.slots.helmet.displayName, 'Synced Helmet');
});

test('a prefill does not mutate the setup it was given', () => {
  const base = createSetup('a', 'A');
  const snapshot = { items: [decoded({ slot: 3 })] };
  prefillSetupFromSnapshot(base, snapshot);
  assert.equal(base.slots.helmet, null);
});

test('an empty snapshot fills nothing and reports nothing', () => {
  const { setup, filled } = prefillSetupFromSnapshot(createSetup('a', 'A'), {});
  assert.deepEqual(filled, []);
  assert.ok(Object.values(setup.slots).every(slot => slot === null));
});

test('the summary counts filled slots and how many came from a sync', () => {
  const snapshot = { items: [decoded({ slot: 3 })] };
  const { setup } = prefillSetupFromSnapshot(createSetup('a', 'A'), snapshot);
  setup.slots.boots = { ...createEmptyItem(), displayName: 'Manual boots' };
  const summary = setupSummary(setup);
  assert.equal(summary.filled, 2);
  assert.equal(summary.fromSync, 1);
  assert.equal(summary.total, SLOT_IDS.length);
});

test('legacy synced items recover their physical identity from the NBT UUID', () => {
  const setups = normalizeSetups({
    activeId: 'a',
    list: [{ id: 'a', slots: { helmet: { displayName: 'Hat', itemUuid: 'old-uuid', source: ITEM_SOURCE.SYNC } } }],
  });
  assert.equal(setups.slots, undefined);
  assert.equal(setups.list[0].slots.helmet.physicalItemId, 'uuid:old-uuid');
});

test('reusing a manual item creates one stable physical identity', () => {
  const item = { ...createEmptyItem(), displayName: 'Shared Helmet' };
  const linked = ensurePhysicalItemId(item, 'shared:normal:helmet');
  assert.equal(physicalItemId(linked), 'shared:normal:helmet');
  assert.equal(ensurePhysicalItemId(linked, 'other').physicalItemId, 'shared:normal:helmet');
});

test('editing one linked setup item updates every reference to the same physical object', () => {
  const setups = createDefaultSetups();
  const shared = ensurePhysicalItemId({ ...createEmptyItem(), displayName: 'Helianthus Helmet', reforge: 'mossy' }, 'shared:normal:helmet');
  setups.list[0].slots.helmet = { ...shared };
  setups.list[2].slots.helmet = { ...shared };

  writeLinkedSetupSlot(setups, 'pest-kill', 'helmet', { ...shared, reforge: 'mantid', source: ITEM_SOURCE.MANUAL });

  assert.equal(setups.list[0].slots.helmet.reforge, 'mantid');
  assert.equal(setups.list[2].slots.helmet.reforge, 'mantid');
  assert.equal(setups.list[0].slots.helmet.physicalItemId, 'shared:normal:helmet');
});

test('clearing a linked slot removes only that loadout reference', () => {
  const setups = createDefaultSetups();
  const shared = ensurePhysicalItemId({ ...createEmptyItem(), displayName: 'Helianthus Helmet' }, 'shared:normal:helmet');
  setups.list[0].slots.helmet = { ...shared };
  setups.list[2].slots.helmet = { ...shared };

  writeLinkedSetupSlot(setups, 'pest-kill', 'helmet', null);

  assert.ok(setups.list[0].slots.helmet);
  assert.equal(setups.list[2].slots.helmet, null);
});

test('replacing a linked slot with a different physical item does not mutate the old object elsewhere', () => {
  const setups = createDefaultSetups();
  const shared = ensurePhysicalItemId({ ...createEmptyItem(), displayName: 'Old Helmet' }, 'shared:normal:helmet');
  setups.list[0].slots.helmet = { ...shared };
  setups.list[2].slots.helmet = { ...shared };

  writeLinkedSetupSlot(setups, 'pest-kill', 'helmet', { ...createEmptyItem(), displayName: 'Different Helmet' });

  assert.equal(setups.list[0].slots.helmet.displayName, 'Old Helmet');
  assert.equal(setups.list[2].slots.helmet.displayName, 'Different Helmet');
});
