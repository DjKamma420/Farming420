import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

import { itemCapabilities } from '../src/item-capabilities.js';
import { createSetup, itemRecordFromDecoded, prefillSetupFromSnapshot } from '../src/setups.js';

const catalog = [
  {
    id: 'FARMHAND_HELMET',
    name: 'Farmhand Helmet',
    category: 'HELMET',
    gemstoneSlots: [],
    cannotReforge: false,
    canRecombobulate: null,
  },
  {
    id: 'CROPIE_HELMET',
    name: 'Cropie Helmet',
    category: 'HELMET',
    gemstoneSlots: [{ index: 0, slotType: 'PERIDOT' }],
    cannotReforge: false,
    canRecombobulate: null,
  },
];

test('unknown items preserve observed enchants without receiving generic enchant toggles', () => {
  const capabilities = itemCapabilities('helmet', {
    displayName: 'Unmapped Helmet',
    enchantments: { pesterminator: 3, future_account_enchant: 2 },
  }, catalog);

  assert.equal(capabilities.known, false);
  assert.equal(capabilities.canEnchant, false);
  assert.equal(capabilities.enchantmentRows.length > 0, true);
  assert.equal(capabilities.enchantmentRows.every(row => row.active), true);
  assert.equal(capabilities.enchantmentRows.some(row => row.storageKey === 'future_account_enchant'), true);
});

test('known exact items expose only their concrete gemstone socket count', () => {
  const farmhand = itemCapabilities('helmet', { skyblockId: 'FARMHAND_HELMET' }, catalog);
  const cropie = itemCapabilities('helmet', { skyblockId: 'CROPIE_HELMET' }, catalog);
  assert.equal(farmhand.gemstoneSlotCount, 0);
  assert.equal(cropie.gemstoneSlotCount, 1);
  assert.equal(cropie.gemstoneSlots[0].slotType, 'PERIDOT');
});

test('setup Auto-Fill recognizes worn equipment through merged item locations', () => {
  const setup = createSetup('test', 'Test');
  const snapshot = {
    provenance: { items: { status: 'AUTO' }, pets: { status: 'AUTO' } },
    items: [{
      container: 'inventory',
      slot: 9,
      displayName: 'Blossom Belt',
      enchantments: {},
      gems: {},
      locations: [
        { container: 'inventory', slot: 9 },
        { container: 'equipment', slot: 2 },
      ],
    }],
    pets: [],
  };

  const result = prefillSetupFromSnapshot(setup, snapshot);
  assert.equal(result.setup.slots.equipment3.displayName, 'Blossom Belt');
  assert.equal(result.equipmentSeen, 1);
});

test('hidden item and pet collections never overwrite setup slots', () => {
  const setup = createSetup('test', 'Test');
  const snapshot = {
    provenance: { items: { status: 'HIDDEN' }, pets: { status: 'UNKNOWN' } },
    items: [{
      container: 'armor',
      slot: 3,
      displayName: 'Stale Helmet',
      enchantments: {},
      gems: {},
    }],
    pets: [{ type: 'MOOSHROOM_COW', active: true }],
  };

  const result = prefillSetupFromSnapshot(setup, snapshot);
  assert.deepEqual(result.filled, []);
  assert.equal(result.setup.slots.helmet, null);
  assert.equal(result.setup.slots.pet, null);
  assert.equal(result.itemsReliable, false);
  assert.equal(result.petsReliable, false);
});

test('core gemstone editor is fixed to capability slots and preserves interaction on render', () => {
  const source = readFileSync(new URL('../src/app.js', import.meta.url), 'utf8');
  assert.match(source, /capabilities\.gemstoneSlots\.map\(\(socket, index\)/);
  assert.match(source, /gemValuesForSlotType\(socket\.slotType\)/);
  assert.doesNotMatch(source, /data-gem-add=/);
  assert.doesNotMatch(source, /data-gem-remove=/);
  assert.match(source, /function captureInteraction\(\)/);
  assert.match(source, /function restoreInteraction\(interaction\)/);
  assert.match(source, /window\.addEventListener\('farming420:state-changed',[\s\S]*captureInteraction\(\)[\s\S]*restoreInteraction\(interaction\)/);
});

test('exact capability enhancer does not sanitize synced values into storage during decoration', () => {
  const source = readFileSync(new URL('../src/exact-item-capabilities-ui.js', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /patchSlot\(raw, slotId, \{ recombobulated: false \}\)/);
  assert.doesNotMatch(source, /patchSlot\(raw, slotId, \{ gems: sanitized \}\)/);
});


test('decoded gemstone socket numbers keep their original item positions', () => {
  const item = itemRecordFromDecoded({
    skyblockId: 'CROPIE_HELMET',
    displayName: 'Cropie Helmet',
    enchantments: {},
    gems: { PERIDOT_1: 'PERFECT' },
  });
  assert.equal(item.gems[0], undefined);
  assert.equal(item.gems[1], 'PERFECT PERIDOT');
});


test('partial worn armor uses the authoritative armor slot instead of array position', () => {
  const setup = createSetup('test', 'Test');
  const snapshot = {
    provenance: { items: { status: 'AUTO' }, pets: { status: 'AUTO' } },
    items: [{
      container: 'armor',
      slot: 0,
      displayName: 'Rancher Boots',
      enchantments: {},
      gems: {},
    }],
    pets: [],
  };

  const result = prefillSetupFromSnapshot(setup, snapshot);
  assert.equal(result.setup.slots.boots.displayName, 'Rancher Boots');
  assert.equal(result.setup.slots.helmet, null);
});
