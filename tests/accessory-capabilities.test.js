import assert from 'node:assert/strict';
import test from 'node:test';

import {
  ACCESSORY_ENRICHMENTS,
  accessoryCapabilityState,
  accessoryEffectiveRarity,
  accessoryStateFromSnapshot,
  canEnrichAccessory,
  normalizeAccessoryEnrichment,
} from '../src/accessory-capabilities.js';

const common = { itemId: 'COMMON_TEST', rarity: 'COMMON' };
const rare = { itemId: 'RARE_TEST', rarity: 'RARE' };
const epic = { itemId: 'EPIC_TEST', rarity: 'EPIC' };
const legendary = { itemId: 'LEGENDARY_TEST', rarity: 'LEGENDARY' };

test('Recombobulator raises a Farming accessory exactly one rarity for eligibility', () => {
  assert.equal(accessoryEffectiveRarity(common, { recombobulated: true }), 'UNCOMMON');
  assert.equal(accessoryEffectiveRarity(rare, { recombobulated: true }), 'EPIC');
  assert.equal(accessoryEffectiveRarity(epic, { recombobulated: true }), 'LEGENDARY');
  assert.equal(accessoryEffectiveRarity(legendary, { recombobulated: true }), 'MYTHIC');
});

test('enrichments are gated by effective rarity, so recombobulating EPIC is meaningful', () => {
  assert.equal(canEnrichAccessory(epic, { recombobulated: false }), false);
  assert.equal(canEnrichAccessory(epic, { recombobulated: true }), true);
  assert.equal(canEnrichAccessory(rare, { recombobulated: true }), false);
  assert.equal(canEnrichAccessory(legendary, { recombobulated: false }), true);
});

test('official cannot-recombobulate metadata overrides the normal Farming accessory default', () => {
  assert.equal(accessoryCapabilityState(epic, {}, { id: 'EPIC_TEST', canRecombobulate: false }).canRecombobulate, false);
  assert.equal(accessoryCapabilityState(epic, {}, { id: 'EPIC_TEST', canRecombobulate: true }).canRecombobulate, true);
});

test('the eleven live enrichment choices use stable NBT-friendly ids', () => {
  assert.equal(ACCESSORY_ENRICHMENTS.length, 11);
  assert.equal(normalizeAccessoryEnrichment('critical damage'), 'critical_damage');
  assert.equal(normalizeAccessoryEnrichment('bonus_attack_speed'), 'attack_speed');
  assert.equal(normalizeAccessoryEnrichment('not-real'), null);
});

test('synced Accessory Bag NBT carries recombobulation and enrichment into accessory state', () => {
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
    enrichment: 'magic_find',
    source: 'hypixel-sync',
  });
});
