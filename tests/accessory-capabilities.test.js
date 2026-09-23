import assert from 'node:assert/strict';
import test from 'node:test';

import {
  ACCESSORY_CAPABILITIES_VERIFIED,
  accessoryCapabilityState,
  accessoryEffectiveRarity,
  accessoryStateFromSnapshot,
  accessoryStrengthBonus,
  canEnrichAccessory,
  strengthEnrichmentCountFromSnapshot,
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

test('eligible effective rarity exposes Strength Enrichment', () => {
  assert.equal(canEnrichAccessory(epic, {}), false);
  assert.equal(canEnrichAccessory(epic, { recombobulated: true }), true);
  assert.equal(canEnrichAccessory(legendary, {}), true);
  assert.equal(accessoryStrengthBonus({ enrichment: 'strength' }), 1);
  assert.equal(accessoryStrengthBonus({ enrichment: 'magic_find' }), 0);
});

test('synced Accessory Bag state carries recombobulation and enrichment', () => {
  const state = accessoryStateFromSnapshot({
    items: [{
      skyblockId: 'EPIC_TEST',
      recombobulated: 1,
      talismanEnrichment: 'strength',
      container: 'talisman_bag',
    }],
  }, 'EPIC_TEST');
  assert.deepEqual(state, {
    recombobulated: true,
    enrichment: 'strength',
    source: 'hypixel-sync',
  });
});

test('all synced Strength Enrichments are counted, not only Farming accessories', () => {
  const count = strengthEnrichmentCountFromSnapshot({
    items: [
      { skyblockId: 'EPIC_TEST', talismanEnrichment: 'strength', container: 'talisman_bag' },
      { skyblockId: 'OTHER_ACCESSORY', talismanEnrichment: 'strength', locations: [{ container: 'talisman_bag', slot: 2 }] },
      { skyblockId: 'NOT_IN_BAG', talismanEnrichment: 'strength', container: 'inventory' },
      { skyblockId: 'MAGIC_FIND', talismanEnrichment: 'magic_find', container: 'talisman_bag' },
    ],
  });
  assert.equal(count, 2);
});

test('accessory capability verification date stays recorded', () => {
  assert.equal(ACCESSORY_CAPABILITIES_VERIFIED, '2026-09-23');
});
