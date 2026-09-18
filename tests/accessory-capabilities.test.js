import assert from 'node:assert/strict';
import test from 'node:test';

import {
  ACCESSORY_CAPABILITIES_VERIFIED,
  accessoryCapabilityState,
  accessoryEffectiveRarity,
  accessoryStateFromSnapshot,
} from '../src/accessory-capabilities.js';

const common = { itemId: 'COMMON_TEST', rarity: 'COMMON' };
const rare = { itemId: 'RARE_TEST', rarity: 'RARE' };
const epic = { itemId: 'EPIC_TEST', rarity: 'EPIC' };
const legendary = { itemId: 'LEGENDARY_TEST', rarity: 'LEGENDARY' };

test('Recombobulator raises a Farming accessory exactly one rarity', () => {
  assert.equal(accessoryEffectiveRarity(common, { recombobulated: true }), 'UNCOMMON');
  assert.equal(accessoryEffectiveRarity(rare, { recombobulated: true }), 'EPIC');
  assert.equal(accessoryEffectiveRarity(epic, { recombobulated: true }), 'LEGENDARY');
  assert.equal(accessoryEffectiveRarity(legendary, { recombobulated: true }), 'MYTHIC');
});

test('official cannot-recombobulate metadata overrides the normal Farming accessory default', () => {
  assert.equal(accessoryCapabilityState(epic, {}, { id: 'EPIC_TEST', canRecombobulate: false }).canRecombobulate, false);
  assert.equal(accessoryCapabilityState(epic, {}, { id: 'EPIC_TEST', canRecombobulate: true }).canRecombobulate, true);
});

test('synced Accessory Bag state carries only recombobulation into farming state', () => {
  const state = accessoryStateFromSnapshot({
    items: [{
      skyblockId: 'EPIC_TEST',
      recombobulated: 1,
      talismanEnrichment: 'magic_find',
      container: 'talisman_bag',
    }],
  }, 'EPIC_TEST');
  assert.deepEqual(state, {
    recombobulated: true,
    source: 'hypixel-sync',
  });
});

test('accessory capability verification date stays recorded', () => {
  assert.equal(ACCESSORY_CAPABILITIES_VERIFIED, '2026-09-18');
});
