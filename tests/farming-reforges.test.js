import assert from 'node:assert/strict';
import test from 'node:test';

import {
  FARMING_REFORGES_VERIFIED,
  FARMING_TOOL_REFORGES,
  cropReforgeRecommendations,
  reforgeById,
} from '../src/farming-reforges.js';

test('current farming reforge catalog contains all five Harvest Feast-era reforges', () => {
  assert.deepEqual(FARMING_TOOL_REFORGES.map(entry => entry.id), [
    'bountiful',
    'blessed',
    'overpriced',
    'deep-fried',
    'earthy',
  ]);
  assert.equal(FARMING_REFORGES_VERIFIED, '2026-09-16');
  for (const reforge of FARMING_TOOL_REFORGES) {
    assert.ok(reforge.source.startsWith('https://hypixel.net/'));
    assert.equal(reforge.lastVerified, FARMING_REFORGES_VERIFIED);
    assert.ok(reforge.summary.length > 20);
  }
});

test('recommendations stay goal-specific instead of inventing one universal best', () => {
  const wheat = cropReforgeRecommendations('wheat');
  assert.equal(wheat.money, 'bountiful');
  assert.equal(wheat.collection, 'blessed');
  assert.equal(wheat.xp, 'blessed');
  assert.equal(wheat.rareCrops, 'overpriced');
  assert.equal(wheat.feastSeasoning, 'deep-fried');
  assert.equal(wheat.sowdust, 'earthy');

  const melon = cropReforgeRecommendations('melon');
  assert.equal(melon.money, 'bountiful');
  assert.equal(melon.collection, 'overpriced');
});

test('reforge lookup accepts normalized ids only and does not guess unknown reforges', () => {
  assert.equal(reforgeById('OVERPRICED')?.name, 'Overpriced');
  assert.equal(reforgeById('deep-fried')?.stone, 'Hashbrown');
  assert.equal(reforgeById('imaginary'), null);
});
