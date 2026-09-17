import test from 'node:test';
import assert from 'node:assert/strict';

import {
  ACTIVE_CROP_MODELS,
  HARVEST_FEAST_MODEL,
  HARVEST_FEAST_RARE_CROPS,
  cropModelCoverage,
  expectedRareCropProbability,
  harvestFeastRareCropInputs,
} from '../src/farming-mechanics-data.js';
import {
  PESTS,
  VACUUMS,
  activePestSpawnInput,
  expectedGuaranteedPestCropQuantity,
  expectedPestsPerSpawnFromBonusPestChance,
  feastPestRareCropDropInput,
  idealVacuumKillSeconds,
  pestDataCoverage,
} from '../src/pest-mechanics-data.js';
import { DROP_SCALING } from '../src/profit-engine.js';

test('active crop mechanics table covers all 13 current farming crops', () => {
  assert.equal(Object.keys(ACTIVE_CROP_MODELS).length, 13);
  const coverage = cropModelCoverage();
  assert.equal(coverage.total, 13);
  assert.equal(coverage.verified, 3);
  assert.deepEqual(
    Object.keys(HARVEST_FEAST_RARE_CROPS).sort(),
    Object.keys(ACTIVE_CROP_MODELS).sort(),
  );
});

test('Harvest Feast uses verified base probabilities and Overbloom scaling', () => {
  assert.equal(HARVEST_FEAST_MODEL.seasoning.baseProbability, 1 / 2250);
  assert.equal(HARVEST_FEAST_MODEL.cropMaterial.baseProbability, 1 / 18000);
  assert.equal(expectedRareCropProbability(1 / 2250, 100), 2 / 2250);

  const rows = harvestFeastRareCropInputs('wheat', {
    seasoningValueCoins: 1,
    cropMaterialValueCoins: 1000,
  });
  assert.equal(rows.length, 2);
  assert.equal(rows[0].physicalItem, false);
  assert.equal(rows[0].scaling, DROP_SCALING.OVERBLOOM);
  assert.equal(rows[1].name, 'Cornucopia');
  assert.equal(rows[1].scaling, DROP_SCALING.OVERBLOOM);
});

test('Bonus Pest Chance increases expected pests per successful spawn, not event probability', () => {
  assert.equal(expectedPestsPerSpawnFromBonusPestChance(0), 1);
  assert.equal(expectedPestsPerSpawnFromBonusPestChance(50), 1.5);
  assert.equal(expectedPestsPerSpawnFromBonusPestChance(250), 3.5);

  const input = activePestSpawnInput({ bonusPestChance: 250, handlingSecondsPerPest: 4 });
  assert.equal(input.spawnProbability, 0.002);
  assert.equal(input.pestsPerSpawnExpected, 3.5);
});

test('classic guaranteed Pest crop drops use per-pest Fortune divisors', () => {
  assert.equal(expectedGuaranteedPestCropQuantity('fly', { farmingFortune: 2000, cropFortune: 0 }), 1 + 2000 / 35);
  assert.equal(expectedGuaranteedPestCropQuantity('earthworm', { farmingFortune: 2000, cropFortune: 0 }), 5 + 2000 / 7);
  assert.equal(expectedGuaranteedPestCropQuantity('dragonfly', { farmingFortune: 2000, cropFortune: 0 }), null);

  const coverage = pestDataCoverage();
  assert.equal(coverage.totalCropPests, 13);
  assert.equal(coverage.guaranteedDropFormulaVerified, 10);
  assert.deepEqual(coverage.unresolvedGuaranteedDropFormulaIds.sort(), ['dragonfly', 'firefly', 'praying-mantis'].sort());
});

test('Feast Pest RARE CROP chance uses Pest Overbloom context', () => {
  const fly = feastPestRareCropDropInput('fly', 1000);
  const mouse = feastPestRareCropDropInput('field-mouse', 1000);
  assert.equal(fly.baseProbability, 0.15);
  assert.equal(mouse.baseProbability, 0.30);
  assert.equal(fly.scaling, DROP_SCALING.PEST_OVERBLOOM);
  assert.equal(mouse.randomInSeasonCrop, true);
});

test('vacuum table models all five Garden tiers and ideal damage time', () => {
  assert.equal(Object.keys(VACUUMS).length, 5);
  assert.equal(VACUUMS.SKYMART_VACUUM.damagePerSecond, 100);
  assert.equal(VACUUMS.INFINI_VACUUM_HOOVERIUS.damagePerSecond, 250);
  assert.equal(idealVacuumKillSeconds('SKYMART_VACUUM'), 6);
  assert.equal(idealVacuumKillSeconds('INFINI_VACUUM_HOOVERIUS'), 2.4);
  assert.equal(PESTS.fly.cropId, 'wheat');
});
