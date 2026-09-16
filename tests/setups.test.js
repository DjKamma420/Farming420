import assert from 'node:assert/strict';
import test from 'node:test';

import {
  ITEM_SOURCE,
  SLOT_IDS,
  activeSetup,
  createDefaultSetups,
  createEmptyItem,
  createSetup,
  itemRecordFromDecoded,
  nextSetupId,
  normalizeSetups,
  prefillSetupFromSnapshot,
  setupSummary,
} from '../src/setups.js';

function decoded(overrides = {}) {
  return { container: 'armor', slot: 3, displayName: '§6Helianthus Helmet', enchantments: {}, gems: {}, ...overrides };
}

test('the default setups are the three mutually exclusive states the spec names', () => {
  const setups = createDefaultSetups();
  assert.deepEqual(setups.list.map(setup => setup.id), ['normal', 'pest', 'contest']);
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
  assert.match(setup.slots.pet.displayName, /MOOSHROOM_COW/);
  assert.equal(setup.slots.petItem.skyblockId, 'GREEN_BANDANA');
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
