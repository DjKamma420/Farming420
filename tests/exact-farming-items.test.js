import assert from 'node:assert/strict';
import test from 'node:test';

import {
  GARDEN_VACUUM_ITEMS,
  availableOfficialGemstoneSlots,
  farmingToolSkyblockId,
  farmingToolTierRarity,
  gemstoneRequirementSatisfied,
  officialGemstoneUnlockCoins,
  officialGemstoneUnlockItems,
  vacuumEffectiveRarity,
  vacuumFallbackGemstoneSlotCount,
} from '../src/exact-farming-items.js';

test('every modeled crop tool tier resolves to one concrete Hypixel item id', () => {
  assert.equal(farmingToolSkyblockId("Euclid's Wheat Sickle", 1), 'THEORETICAL_HOE_WHEAT_1');
  assert.equal(farmingToolSkyblockId("Euclid's Wheat Sickle", 3), 'THEORETICAL_HOE_WHEAT_3');
  assert.equal(farmingToolSkyblockId('Pumpkin Dicer', 2), 'PUMPKIN_DICER_2');
  assert.equal(farmingToolSkyblockId('Cocoa Chopper', 3), 'COCO_CHOPPER_3');
  assert.equal(farmingToolSkyblockId('not a farming tool', 1), null);
});

test('current farming tool Mk tiers use the post-Greenhouse rarity ladder', () => {
  assert.equal(farmingToolTierRarity(1), 'UNCOMMON');
  assert.equal(farmingToolTierRarity(2), 'RARE');
  assert.equal(farmingToolTierRarity(3), 'EPIC');
  assert.equal(farmingToolTierRarity(99), 'EPIC');
});

test('official levelable_lvl requirements gate tool gemstone sockets exactly', () => {
  const req = { type: 'ITEM_DATA', dataKey: 'levelable_lvl', operator: 'GREATER_THAN_OR_EQUALS', value: '15' };
  assert.equal(gemstoneRequirementSatisfied(req, { toolLevel: 14 }), false);
  assert.equal(gemstoneRequirementSatisfied(req, { toolLevel: 15 }), true);
  assert.equal(gemstoneRequirementSatisfied({ type: 'UNKNOWN' }, { toolLevel: 50 }), false, 'unknown requirements are never guessed');

  const item = { gemstoneSlots: [
    { slotType: 'PERIDOT', requirements: [] },
    { slotType: 'PERIDOT', requirements: [req] },
  ] };
  assert.equal(availableOfficialGemstoneSlots(item, { toolLevel: 1 }).length, 1);
  assert.equal(availableOfficialGemstoneSlots(item, { toolLevel: 15 }).length, 2);
});

test('official gemstone unlock costs stay structured', () => {
  const slot = { costs: [
    { type: 'COINS', coins: 250000 },
    { type: 'ITEM', itemId: 'FINE_PERIDOT_GEM', amount: 2 },
  ] };
  assert.equal(officialGemstoneUnlockCoins(slot), 250000);
  assert.deepEqual(officialGemstoneUnlockItems(slot), [{ itemId: 'FINE_PERIDOT_GEM', amount: 2 }]);
});

test('Vacuum fallback capabilities belong to the physical Vacuum model', () => {
  assert.equal(GARDEN_VACUUM_ITEMS.length, 5);
  assert.equal(vacuumFallbackGemstoneSlotCount('SKYMART_VACUUM'), 0);
  assert.equal(vacuumFallbackGemstoneSlotCount('INFINI_VACUUM'), 1);
  assert.equal(vacuumFallbackGemstoneSlotCount('INFINI_VACUUM_HOOVERIUS'), 2);
  assert.equal(vacuumEffectiveRarity('INFINI_VACUUM_HOOVERIUS', false), 'LEGENDARY');
  assert.equal(vacuumEffectiveRarity('INFINI_VACUUM_HOOVERIUS', true), 'MYTHIC');
});
