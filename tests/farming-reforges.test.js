import test from 'node:test';
import assert from 'node:assert/strict';

import {
  CROP_REFORGE_RECOMMENDATIONS,
  FARMING_TOOL_REFORGES,
  cropReforgeRecommendations,
  recommendationLabels,
} from '../src/farming-reforges.js';

const CROP_IDS = [
  'wheat',
  'carrot',
  'potato',
  'pumpkin',
  'melon',
  'mushroom',
  'cactus',
  'sugar-cane',
  'cocoa-beans',
  'nether-wart',
  'sunflower',
  'moonflower',
  'wild-rose',
];

test('all current farming tool reforges are represented', () => {
  assert.deepEqual(
    FARMING_TOOL_REFORGES.map(reforge => reforge.id).sort(),
    ['blessed', 'bountiful', 'deep-fried', 'earthy', 'overpriced'].sort(),
  );
});

test('every farming crop has an explicit recommendation record', () => {
  assert.deepEqual(Object.keys(CROP_REFORGE_RECOMMENDATIONS).sort(), CROP_IDS.sort());

  for (const cropId of CROP_IDS) {
    const recommendation = cropReforgeRecommendations(cropId);
    assert.equal(recommendation.cropId, cropId);
    assert.equal(recommendation.normalCoins, 'bountiful');
    assert.equal(recommendation.feastRareCropCoins, 'overpriced');
    assert.equal(recommendation.collection, 'blessed');
    assert.equal(recommendation.xp, 'blessed');
    assert.equal(recommendation.feastSeasoning, 'deep-fried');
    assert.equal(recommendation.sowdust, 'earthy');
    assert.equal(recommendation.feastRareCropEligible, true);
  }
});

test('conditional Feast recommendations are marked as conditional', () => {
  for (const cropId of CROP_IDS) {
    const labels = recommendationLabels(cropId);
    const feastMoney = labels.find(row => row.goal === 'Feast RARE-CROP coins');
    const rareCrops = labels.find(row => row.goal === 'RARE CROPS / Overbloom');

    assert.equal(feastMoney?.reforge, 'overpriced');
    assert.equal(feastMoney?.conditional, 'crop must be in season');
    assert.equal(rareCrops?.conditional, 'crop must be in season');
  }
});
