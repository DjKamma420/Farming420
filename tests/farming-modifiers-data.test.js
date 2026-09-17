import test from 'node:test';
import assert from 'node:assert/strict';

import {
  CHIP_LEVEL_CAP,
  FARMING_SHARDS_027,
  GARDEN_CHIPS,
  TEMPORARY_FARMING_MODIFIERS,
  farmingModifierCoverage,
  gardenChipEffect,
  hyperchargedFarmingFortune,
  maxGardenChipEffect,
  temporaryModifierEffect,
} from '../src/farming-modifiers-data.js';

test('Garden Chip table covers all ten current chip families', () => {
  assert.equal(Object.keys(GARDEN_CHIPS).length, 10);
  assert.deepEqual(CHIP_LEVEL_CAP, { RARE: 10, EPIC: 15, LEGENDARY: 20 });
  assert.equal(maxGardenChipEffect('rarefinder'), 60);
  assert.equal(maxGardenChipEffect('vermin-vaporizer'), 100);
  assert.equal(maxGardenChipEffect('hypercharge'), 100);
});

test('0.27 Cropshot ambiguity does not fabricate missing live rarity rates', () => {
  assert.equal(GARDEN_CHIPS.cropshot.effect.currentReportedLegendaryLevel20Total, 60);
  assert.equal(gardenChipEffect('cropshot', { level: 10, rarity: 'RARE' }), 30);
  assert.equal(gardenChipEffect('cropshot', { level: 15, rarity: 'EPIC' }), null);
  assert.equal(gardenChipEffect('cropshot', { level: 20, rarity: 'LEGENDARY' }), null);
});

test('Hypercharge only multiplies explicitly eligible temporary Farming Fortune', () => {
  assert.equal(hyperchargedFarmingFortune(100, 100), 200);
  assert.equal(temporaryModifierEffect('crop-fever', { hyperchargePercent: 100 }).farmingFortune, 200);
  assert.equal(temporaryModifierEffect('atmospheric-filter', { hyperchargePercent: 100 }).farmingFortune, 50);
  assert.equal(temporaryModifierEffect('refined-dark-cacao-truffle', { hyperchargePercent: 100 }).cocoaBeansFortune, 30);
  assert.equal(TEMPORARY_FARMING_MODIFIERS.cropFever.effects.overbloom, 15);
});

test('Crop Fever trigger uses 0.001 percent per enchant level for 60 seconds', () => {
  const fever = TEMPORARY_FARMING_MODIFIERS.cropFever;
  assert.equal(fever.triggerProbabilityPerBreakPerEnchantLevel, 0.00001);
  assert.equal(fever.maxEnchantLevel, 5);
  assert.equal(fever.durationSeconds, 60);
});

test('0.27 farming shard table keeps context-specific effects separated', () => {
  assert.equal(FARMING_SHARDS_027.fieldMouse.effects.pestOverbloom, 5);
  assert.equal(FARMING_SHARDS_027.cricket.effects.farmingFortuneOnPests, 50);
  assert.equal(FARMING_SHARDS_027.fly.effects.farmingFortune, 25);
  assert.equal(FARMING_SHARDS_027.keeledSlug.effects.bonusPestChance, 10);
  assert.equal(FARMING_SHARDS_027.rat.effects.extraSprayonatorMaterialChance, 0.10);
  assert.equal(FARMING_SHARDS_027.timestalkClone.effects.greenhouseGrowthSpeedPercent, 5);
});

test('modifier coverage exposes unresolved mechanics instead of hiding them', () => {
  const coverage = farmingModifierCoverage();
  assert.equal(coverage.chips, 10);
  assert.deepEqual(coverage.chipsNeedLiveVerification, ['cropshot']);
  assert.ok(coverage.temporaryNeedVerification.includes('magic-8-ball'));
  assert.ok(coverage.shardInteractionVerification.includes('mudworm'));
  assert.ok(coverage.shardInteractionVerification.includes('timestalk-clone'));
});
