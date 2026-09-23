import assert from 'node:assert/strict';
import test from 'node:test';

import { setupPetItemContribution } from '../src/setup-pet-items.js';

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
