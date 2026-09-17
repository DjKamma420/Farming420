import assert from 'node:assert/strict';
import test from 'node:test';

import {
  GREENHOUSE_BASE_CROP_DECAY_HOURS,
  GREENHOUSE_GRID_PLOTS,
  GREENHOUSE_LIVE_LOOT_MULTIPLIERS,
  GREENHOUSE_PLANNED_FOLLOWUPS,
  GREENHOUSE_UNLOCK_GARDEN_LEVEL,
  evaluateGreenhouseWindow,
  greenhouseBaseCropDecayState,
  greenhouseLootMultiplier,
  greenhousePlantRecord,
} from '../src/greenhouse-model.js';

test('Greenhouse fixed live boundaries match the sourced current model', () => {
  assert.equal(GREENHOUSE_UNLOCK_GARDEN_LEVEL, 7);
  assert.equal(GREENHOUSE_GRID_PLOTS, 100);
  assert.equal(GREENHOUSE_BASE_CROP_DECAY_HOURS, 72);
  assert.equal(GREENHOUSE_LIVE_LOOT_MULTIPLIERS.length, 53);
});

test('August 20 live multiplier table includes base crops and late mutations', () => {
  assert.equal(greenhouseLootMultiplier('Wheat'), 0.18);
  assert.equal(greenhouseLootMultiplier('Nether Wart'), 0.09);
  assert.equal(greenhouseLootMultiplier('Snoozling'), 21);
  assert.equal(greenhouseLootMultiplier('PlantBoy Advance'), 23);
  assert.equal(greenhouseLootMultiplier('Stoplight Petal'), 25);
  assert.equal(greenhouseLootMultiplier('Timestalk'), 9);
  assert.equal(greenhousePlantRecord('wild rose').kind, 'base-crop');
  assert.equal(greenhousePlantRecord('ashwreath').kind, 'mutation');
});

test('unknown Greenhouse plants never inherit a guessed multiplier', () => {
  assert.equal(greenhouseLootMultiplier('Future Mutation'), null);
  assert.equal(greenhousePlantRecord('Future Mutation'), null);
});

test('base-crop decay keeps the exact 72h boundary unresolved', () => {
  assert.equal(greenhouseBaseCropDecayState(71.99), 'safe');
  assert.equal(greenhouseBaseCropDecayState(72), 'boundary');
  assert.equal(greenhouseBaseCropDecayState(72.01), 'decayed');
  assert.equal(greenhouseBaseCropDecayState(null), 'unknown');
});

test('Greenhouse schedule applies live loot and explicit crop-effect multipliers', () => {
  const result = evaluateGreenhouseWindow({
    wallClockHours: 24,
    recurringInputCostCoins: 192,
    plants: [{
      id: 'Wheat',
      count: 10,
      harvestsPerPlantInWindow: 2,
      baseUnitsPerHarvest: 100,
      cropEffectYieldMultiplier: 1.2,
      unitValueCoins: 6,
      hoursSinceMature: 12,
    }],
  });

  assert.equal(result.complete, true);
  assert.equal(result.rows.length, 1);
  assert.equal(result.rows[0].lootMultiplier, 0.18);
  assert.equal(result.rows[0].expectedUnits, 432);
  assert.equal(result.grossValueCoins, 2592);
  assert.equal(result.netValueCoins, 2400);
  assert.equal(result.netCoinsPerRealHour, 100);
  assert.equal(result.plannedFollowupsApplied, false);
});

test('growth timing and crop-effect yield must be supplied rather than guessed', () => {
  const result = evaluateGreenhouseWindow({
    wallClockHours: 24,
    plants: [{
      id: 'Ashwreath',
      count: 4,
      baseUnitsPerHarvest: 100,
      unitValueCoins: 5,
    }],
  });

  assert.equal(result.complete, false);
  assert.equal(result.netCoinsPerRealHour, null);
  assert.ok(result.missing.includes('plants[0].harvestsPerPlantInWindow'));
  assert.ok(result.missing.includes('plants[0].cropEffectYieldMultiplier'));
});

test('exact 72h base-crop boundary prevents a fake complete result', () => {
  const result = evaluateGreenhouseWindow({
    wallClockHours: 72,
    plants: [{
      id: 'Pumpkin',
      count: 1,
      harvestsPerPlantInWindow: 1,
      baseUnitsPerHarvest: 100,
      cropEffectYieldMultiplier: 1,
      unitValueCoins: 10,
      hoursSinceMature: 72,
    }],
  });

  assert.equal(result.complete, false);
  assert.ok(result.missing.includes('plants[0].hoursSinceMatureBoundary'));
});

test('current live model never applies announced 0.27.1 follow-ups', () => {
  assert.ok(GREENHOUSE_PLANNED_FOLLOWUPS.length >= 3);
  for (const change of GREENHOUSE_PLANNED_FOLLOWUPS) {
    assert.equal(change.status, 'PLANNED');
    assert.equal(change.scoreInLiveCalculator, false);
  }
});
