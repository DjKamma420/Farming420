import assert from 'node:assert/strict';
import test from 'node:test';

import {
  FARMING_RELEVANT_PET_ITEMS,
  isFarmingRelevantPetItem,
  recommendedFarmingPetItem,
  setupPetItemContribution,
} from '../src/setup-pet-items.js';

test('Yellow Bandana is a flat +30 Farming Fortune', () => {
  assert.equal(setupPetItemContribution({ skyblockId: 'YELLOW_BANDANA' }).globalFortune, 30);
});

test('Green Bandana is +4 Farming Fortune per Garden level, capped at 60', () => {
  assert.equal(setupPetItemContribution({ skyblockId: 'GREEN_BANDANA' }, { gardenLevel: 1 }).globalFortune, 4);
  assert.equal(setupPetItemContribution({ skyblockId: 'GREEN_BANDANA' }, { gardenLevel: 15 }).globalFortune, 60);
  assert.equal(setupPetItemContribution({ skyblockId: 'GREEN_BANDANA' }, { gardenLevel: 99 }).globalFortune, 60);
});

test('Green Bandana remains incomplete without Garden level', () => {
  const value = setupPetItemContribution({ skyblockId: 'GREEN_BANDANA' });
  assert.equal(value.complete, false);
  assert.equal(value.globalFortune, 0);
  assert.ok(value.reasons[0].includes('Garden level'));
});

test('Poignant Lucky Clover contributes setup-local +13 Overbloom', () => {
  const value = setupPetItemContribution({ skyblockId: 'POIGNANT_LUCKY_CLOVER' });
  assert.equal(value.complete, true);
  assert.equal(value.overbloom, 13);
  assert.equal(value.globalFortune, 0);
});

test('Brown Bandana needs eligible Pest Bestiary tiers and caps at 45 BPC', () => {
  const unknown = setupPetItemContribution({ skyblockId: 'BROWN_BANDANA' });
  assert.equal(unknown.complete, false);
  assert.ok(unknown.reasons[0].includes('Eligible Pest Bestiary tier total'));

  assert.equal(
    setupPetItemContribution({ skyblockId: 'BROWN_BANDANA' }, { eligiblePestBestiaryTiers: 100 }).bonusPestChance,
    20,
  );
  assert.equal(
    setupPetItemContribution({ skyblockId: 'BROWN_BANDANA' }, { eligiblePestBestiaryTiers: 999 }).bonusPestChance,
    45,
  );
});

test('unknown pet items stay incomplete instead of becoming zero-value supported items', () => {
  const value = setupPetItemContribution({ skyblockId: 'SOME_FUTURE_ITEM', displayName: 'Future Item' });
  assert.equal(value.complete, false);
  assert.ok(value.reasons[0].includes('Future Item'));
});


test('the setup Pet Item catalogue contains only modeled farming-relevant choices', () => {
  assert.deepEqual(
    FARMING_RELEVANT_PET_ITEMS.map(item => item.id),
    ['YELLOW_BANDANA', 'GREEN_BANDANA', 'BROWN_BANDANA', 'POIGNANT_LUCKY_CLOVER'],
  );
  assert.equal(isFarmingRelevantPetItem('GREEN_BANDANA'), true);
  assert.equal(isFarmingRelevantPetItem({ id: 'PET_ITEM_COMBAT_SKILL_BOOST_EPIC' }), false);
  assert.equal(isFarmingRelevantPetItem({ id: 'PET_ITEM_FISHING_SKILL_BOOST_EPIC' }), false);
});

test('Pet Item recommendation follows the active farming objective', () => {
  assert.equal(recommendedFarmingPetItem({ setupId: 'normal', gardenLevel: 7 }).item.id, 'YELLOW_BANDANA');
  assert.equal(recommendedFarmingPetItem({ setupId: 'normal', gardenLevel: 8 }).item.id, 'GREEN_BANDANA');
  assert.equal(recommendedFarmingPetItem({ setupId: 'pest', gardenLevel: 15 }).item.id, 'BROWN_BANDANA');
  assert.equal(recommendedFarmingPetItem({ setupId: 'pest-kill', gardenLevel: 15 }).item.id, 'POIGNANT_LUCKY_CLOVER');

  const unknownGarden = recommendedFarmingPetItem({ setupId: 'normal' });
  assert.equal(unknownGarden.item, null);
  assert.equal(unknownGarden.conditional, true);
  assert.match(unknownGarden.reason, /Garden 8/);
});
