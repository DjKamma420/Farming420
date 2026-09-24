import assert from 'node:assert/strict';
import test from 'node:test';

import {
  ELEMENTAL_STRENGTH_SHARDS,
  FARMING_SHARD_SYNERGIES,
  FARMING_SYNERGY_VERIFIED,
  cowFortuneDeltaForAddedStrength,
  cowFortuneDeltaForStrengthPercentChange,
  elementalStrengthFromShardLevels,
  jormungStrengthPercent,
  nextElementalShardStrength,
  strengthUntilNextCowFortune,
} from '../src/farming-synergies.js';

test('all five elemental Strength shards are modeled', () => {
  assert.deepEqual(ELEMENTAL_STRENGTH_SHARDS.map(row => row.name), [
    'Flash Shard',
    'Quake Shard',
    'Bolt Shard',
    'Aero Shard',
    'Tempest Shard',
  ]);
  assert.ok(ELEMENTAL_STRENGTH_SHARDS.every(row => row.perLevelStrength === 1 && row.maxLevel === 10));
});

test('Starborn Echo of Elemental boosts the other elemental Strength shard effects', () => {
  const result = elementalStrengthFromShardLevels({
    flash: 10,
    quake: 10,
    bolt: 10,
    aero: 10,
    tempest: 10,
  }, 10);
  assert.equal(result.baseStrength, 50);
  assert.equal(result.boostPercent, 20);
  assert.equal(result.effectiveStrength, 60);
  assert.equal(nextElementalShardStrength('flash', 10), 1.2);
});

test('Molthorn strengthens Jormung Unlimited Power', () => {
  assert.equal(jormungStrengthPercent(10, 0), 1);
  assert.equal(jormungStrengthPercent(10, 10), 1.5);
  assert.equal(FARMING_SHARD_SYNERGIES.almightyEcho.target, '"Unlimited" Attributes');
});

test('Strength changes are evaluated through the actual Cow floor formula', () => {
  const noThreshold = cowFortuneDeltaForAddedStrength({ currentStrength: 1000, addedStrength: 1 });
  assert.equal(noThreshold.deltaFortune, 0);

  const crosses = cowFortuneDeltaForAddedStrength({ currentStrength: 1000, addedStrength: 20 });
  assert.equal(crosses.deltaFortune, 1);

  const percent = cowFortuneDeltaForStrengthPercentChange({
    currentStrength: 1000,
    currentPercent: 1,
    nextPercent: 1.1,
  });
  assert.ok(percent.addedStrength > 0);
  assert.ok(percent.afterStrength > percent.beforeStrength);
});

test('next Cow threshold exposes why small Strength bonuses can need stacking', () => {
  const remaining = strengthUntilNextCowFortune(1000);
  assert.ok(remaining > 0);
  assert.ok(remaining < 30);
});

test('synergy research stays dated', () => {
  assert.equal(FARMING_SYNERGY_VERIFIED, '2026-09-23');
});
