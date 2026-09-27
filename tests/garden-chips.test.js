import assert from 'node:assert/strict';
import test from 'node:test';

import {
  GARDEN_CHIPS,
  GARDEN_CHIP_LAST_VERIFIED,
  GARDEN_CHIP_RARITIES,
  GARDEN_CHIP_SOWDUST_COST_BY_TARGET_LEVEL,
  gardenChipById,
  gardenChipCopiesForRarity,
  gardenChipEffectAtLevel,
  gardenChipEffectPerLevel,
  gardenChipMaxLevel,
  gardenChipSowdustSpent,
  gardenChipSowdustToLevel,
  normalizeGardenChipProgress,
} from '../src/garden-chips.js';

test('all ten current Garden Chips are modeled exactly once', () => {
  assert.equal(GARDEN_CHIPS.length, 10);
  assert.equal(new Set(GARDEN_CHIPS.map(chip => chip.id)).size, 10);
  assert.equal(new Set(GARDEN_CHIPS.map(chip => chip.upgradeId)).size, 10);
  for (const chip of GARDEN_CHIPS) {
    assert.match(chip.source, /hypixelskyblock\.minecraft\.wiki\/w\/Garden_Chips/);
    assert.equal(chip.lastVerified, GARDEN_CHIP_LAST_VERIFIED);
    assert.match(chip.lastVerified, /^\d{4}-\d{2}-\d{2}$/);
  }
});

test('rarity controls the exact level cap and total duplicate count', () => {
  assert.deepEqual(
    Object.fromEntries(Object.entries(GARDEN_CHIP_RARITIES).map(([id, rarity]) => [id, rarity.maxLevel])),
    { RARE: 10, EPIC: 15, LEGENDARY: 20 },
  );
  assert.equal(gardenChipCopiesForRarity('RARE'), 1);
  assert.equal(gardenChipCopiesForRarity('EPIC'), 5);
  assert.equal(gardenChipCopiesForRarity('LEGENDARY'), 21);
  assert.equal(gardenChipMaxLevel('unknown'), null);
});

test('Sowdust costs match the current level table and cumulative totals', () => {
  assert.equal(GARDEN_CHIP_SOWDUST_COST_BY_TARGET_LEVEL[2], 100_000);
  assert.equal(GARDEN_CHIP_SOWDUST_COST_BY_TARGET_LEVEL[20], 2_650_000);
  assert.equal(gardenChipSowdustSpent(10), 5_250_000);
  assert.equal(gardenChipSowdustSpent(15), 13_250_000);
  assert.equal(gardenChipSowdustSpent(20), 25_000_000);
  assert.equal(gardenChipSowdustToLevel(10, 20), 19_750_000);
});

test('Cropshot scaling changes with rarity instead of assuming Legendary', () => {
  const chip = gardenChipById('cropshot');
  assert.equal(gardenChipEffectPerLevel(chip, 'RARE'), 3);
  assert.equal(gardenChipEffectPerLevel(chip, 'EPIC'), 4);
  assert.equal(gardenChipEffectPerLevel(chip, 'LEGENDARY'), 5);
  assert.equal(gardenChipEffectAtLevel(chip, 'RARE', 10), 30);
  assert.equal(gardenChipEffectAtLevel(chip, 'EPIC', 15), 60);
  assert.equal(gardenChipEffectAtLevel(chip, 'LEGENDARY', 20), 100);
});

test('Rarefinder and Overdrive use the current 2026 maxima', () => {
  assert.equal(gardenChipEffectAtLevel('rarefinder', 'LEGENDARY', 20), 50);
  assert.equal(gardenChipEffectAtLevel('overdrive', 'LEGENDARY', 20), 140);
});

test('levels are clamped to the selected rarity cap', () => {
  assert.equal(gardenChipEffectAtLevel('cropshot', 'RARE', 20), 30);
  assert.deepEqual(
    normalizeGardenChipProgress({ rarity: 'RARE', level: 20, source: 'manual' }),
    { rarity: 'RARE', level: 10, source: 'manual' },
  );
});

test('unknown rarity preserves level but never invents an effect', () => {
  const progress = normalizeGardenChipProgress({ rarity: null, level: 12, source: 'legacy' });
  assert.deepEqual(progress, { rarity: null, level: 12, source: 'legacy' });
  assert.equal(gardenChipEffectAtLevel('cropshot', progress.rarity, progress.level), null);
});
