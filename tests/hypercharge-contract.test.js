import test from 'node:test';
import assert from 'node:assert/strict';

import {
  GARDEN_CHIPS,
  HYPERCHARGE_ELIGIBLE_MODIFIER_IDS,
  HYPERCHARGE_EXCLUDED_MODIFIER_IDS,
  TEMPORARY_FARMING_MODIFIERS,
  gardenChipEffect,
  isHyperchargeEligibleModifier,
  temporaryModifierEffect,
} from '../src/farming-modifiers-data.js';

test('Hypercharge rarity and level scaling matches the current Garden Chips contract', () => {
  assert.deepEqual(GARDEN_CHIPS.hypercharge.effect.rates, { RARE: 3, EPIC: 4, LEGENDARY: 5 });
  assert.equal(gardenChipEffect('hypercharge', { level: 10, rarity: 'RARE' }), 30);
  assert.equal(gardenChipEffect('hypercharge', { level: 15, rarity: 'EPIC' }), 60);
  assert.equal(gardenChipEffect('hypercharge', { level: 20, rarity: 'LEGENDARY' }), 100);
  assert.equal(GARDEN_CHIPS.hypercharge.lastVerified, '2026-09-27');
});

test('Hypercharge uses an explicit allowlist for current eligible effects', () => {
  assert.deepEqual(HYPERCHARGE_ELIGIBLE_MODIFIER_IDS, [
    'atmospheric-filter',
    'celestial-mason-jar',
    'chocolate-century-cake',
    'crop-fever',
    'magic-8-ball',
    'pesthunter-phillip',
    'slug-repugnant-aroma',
  ]);

  for (const id of HYPERCHARGE_ELIGIBLE_MODIFIER_IDS) {
    assert.equal(isHyperchargeEligibleModifier(id), true, id);
    const row = Object.values(TEMPORARY_FARMING_MODIFIERS).find(entry => entry.id === id);
    assert.ok(row, `missing modifier row: ${id}`);
    assert.equal(row.hyperchargeEligible, true, id);
  }
});

test('Hypercharge exclusions are explicit and cannot be amplified by the generic helper', () => {
  assert.deepEqual(HYPERCHARGE_EXCLUDED_MODIFIER_IDS, [
    'anita-talisman',
    'anita-ring',
    'anita-artifact',
    'refined-dark-cacao-truffle',
    'harvest-harbinger-potion',
    'melon-juice-mixin',
    'overdrive-chip',
  ]);

  for (const id of HYPERCHARGE_EXCLUDED_MODIFIER_IDS) {
    assert.equal(isHyperchargeEligibleModifier(id), false, id);
  }

  assert.equal(
    temporaryModifierEffect('harvest-harbinger-potion', { hyperchargePercent: 100 }).farmingFortune,
    50,
  );
  assert.equal(
    temporaryModifierEffect('melon-juice-mixin', { hyperchargePercent: 100 }).farmingFortune,
    15,
  );
  assert.equal(
    temporaryModifierEffect('refined-dark-cacao-truffle', { hyperchargePercent: 100 }).cocoaBeansFortune,
    30,
  );
});

test('Hypercharge amplifies only Farming Fortune and leaves other axes untouched', () => {
  const fever = temporaryModifierEffect('crop-fever', { hyperchargePercent: 100 });
  assert.equal(fever.farmingFortune, 200);
  assert.equal(fever.overbloom, 15);

  assert.equal(TEMPORARY_FARMING_MODIFIERS.magic8Ball.status, 'ACTIVE');
  assert.equal(TEMPORARY_FARMING_MODIFIERS.celestialMasonJar.effects.farmingFortune, 15);
  assert.equal(TEMPORARY_FARMING_MODIFIERS.slugRepugnantAroma.effects.farmingFortunePerPetLevel, 1);
  assert.equal(TEMPORARY_FARMING_MODIFIERS.slugRepugnantAroma.maxPetLevel, 100);
});
