import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createDefaultSetups,
  createEmptyItem,
  createSetup,
  normalizeSetups,
  prefillSetupFromSnapshot,
} from '../src/setups.js';

test('pet level survives setup normalization and backup-style round trips', () => {
  const setups = createDefaultSetups();
  setups.list[0].slots.pet = {
    ...createEmptyItem(),
    skyblockId: 'MOOSHROOM_COW',
    displayName: 'Mooshroom Cow Pet',
    rarity: 'LEGENDARY',
    petLevel: 87,
  };
  const normalized = normalizeSetups(JSON.parse(JSON.stringify(setups)));
  assert.equal(normalized.list[0].slots.pet.petLevel, 87);
  assert.equal(normalized.list[0].slots.pet.rarity, 'LEGENDARY');
});

test('synced pets get a readable species name and preserve rarity aliases', () => {
  const snapshot = {
    items: [],
    pets: [{ type: 'MOOSHROOM_COW', tier: 'LEGENDARY', active: true }],
  };
  const { setup } = prefillSetupFromSnapshot(createSetup('a', 'A'), snapshot);
  assert.equal(setup.slots.pet.displayName, 'Mooshroom Cow Pet');
  assert.equal(setup.slots.pet.skyblockId, 'MOOSHROOM_COW');
  assert.equal(setup.slots.pet.rarity, 'LEGENDARY');
});

test('synced pet level is kept when the normalized snapshot provides it', () => {
  const snapshot = {
    items: [],
    pets: [{ type: 'ELEPHANT', rarity: 'MYTHIC', level: 100, active: true }],
  };
  const { setup } = prefillSetupFromSnapshot(createSetup('a', 'A'), snapshot);
  assert.equal(setup.slots.pet.petLevel, 100);
});
