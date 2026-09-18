import assert from 'node:assert/strict';
import test from 'node:test';

import {
  ACCESSORY_ENRICHMENTS,
  accessoryCapabilityState,
  accessoryEffectiveRarity,
  accessoryStateFromSnapshot,
  canEnrichAccessory,
  enrichmentTotalsFromSnapshot,
  farmingEnrichmentSummary,
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


test('full Accessory Bag aggregation includes non-farming accessories', () => {
  const totals = enrichmentTotalsFromSnapshot({
    items: [
      { container: 'talisman_bag', skyblockId: 'NON_FARMING_LEGENDARY', talismanEnrichment: 'speed' },
      { container: 'talisman_bag', skyblockId: 'HELIANTHUS_RELIC', talismanEnrichment: 'speed' },
      { container: 'talisman_bag', skyblockId: 'COMBAT_ACCESSORY', talismanEnrichment: 'critical_damage' },
      { container: 'inventory', skyblockId: 'NOT_ACTIVE_HERE', talismanEnrichment: 'speed' },
    ],
  });
  assert.equal(totals.counts.speed, 2);
  assert.equal(totals.bonuses.speed, 2);
  assert.equal(totals.counts.critical_damage, 1);
  assert.equal(totals.enrichedAccessories, 3);
});

test('exact duplicate ids in the Accessory Bag are not double-counted', () => {
  const totals = enrichmentTotalsFromSnapshot({
    items: [
      { container: 'talisman_bag', skyblockId: 'SAME_ID', talismanEnrichment: 'speed' },
      { container: 'talisman_bag', skyblockId: 'SAME_ID', talismanEnrichment: 'speed' },
    ],
  });
  assert.equal(totals.bonuses.speed, 1);
});

test('farming summary uses synced Speed automatically and a manual total only as override', () => {
  const profile = {
    normalizedSnapshot: {
      items: [
        { container: 'talisman_bag', skyblockId: 'NON_FARMING_ONE', talismanEnrichment: 'speed' },
        { container: 'talisman_bag', skyblockId: 'NON_FARMING_TWO', talismanEnrichment: 'speed' },
      ],
    },
    accessoryItems: {},
    enrichmentSpeedOverride: null,
  };
  assert.equal(farmingEnrichmentSummary(profile).speed, 2);
  assert.equal(farmingEnrichmentSummary(profile).hasOverride, false);

  profile.enrichmentSpeedOverride = 17;
  const overridden = farmingEnrichmentSummary(profile);
  assert.equal(overridden.speed, 17);
  assert.equal(overridden.detectedSpeed, 2);
  assert.equal(overridden.hasOverride, true);
});

test('manual Farming accessory enrichments fill the gap when no full bag sync exists', () => {
  const summary = farmingEnrichmentSummary({
    normalizedSnapshot: null,
    accessoryItems: {
      HELIANTHUS_RELIC: { source: 'manual', enrichment: 'speed' },
      MAGIC_8_BALL: { source: 'manual', enrichment: 'critical_damage' },
    },
  });
  assert.equal(summary.speed, 1);
  assert.equal(summary.manualKnownEnrichedAccessories, 2);
  assert.equal(summary.hasAccessoryBagData, false);
});

test('only Speed is marked farming-relevant among the normal enrichment stats', () => {
  const relevant = ACCESSORY_ENRICHMENTS.filter(entry => entry.farmingRelevant).map(entry => entry.id);
  assert.deepEqual(relevant, ['speed']);
});
