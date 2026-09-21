import assert from 'node:assert/strict';
import test from 'node:test';

import {
  FARMING_CONTEXT,
  FARMING_CONTEXT_OPTIONS,
  farmingContextForState,
  farmingContextLabel,
  farmingContextScopes,
  isGrandFeastContext,
  isHarvestFeastContext,
  normalizeFarmingContext,
} from '../src/farming-context.js';

test('farming contexts cover every currently modeled event scope used by Dashboard', () => {
  assert.deepEqual(FARMING_CONTEXT_OPTIONS.map(option => option.id), [
    'normal',
    'harvest-feast',
    'grand-feast',
    'jacob-contest',
  ]);
  assert.deepEqual(farmingContextScopes(FARMING_CONTEXT.HARVEST_FEAST), ['Harvest Feast']);
  assert.deepEqual(farmingContextScopes(FARMING_CONTEXT.GRAND_FEAST), ['Harvest Feast', 'Grand Feast']);
  assert.deepEqual(farmingContextScopes(FARMING_CONTEXT.JACOB_CONTEST), ['Jacob Contest']);
  assert.deepEqual(farmingContextScopes(FARMING_CONTEXT.NORMAL), []);
});

test('unknown saved contexts fall back to normal farming', () => {
  assert.equal(normalizeFarmingContext('not-real'), FARMING_CONTEXT.NORMAL);
  assert.equal(farmingContextForState({}), FARMING_CONTEXT.NORMAL);
  assert.equal(farmingContextForState({ profile: { farmingContext: 'grand-feast' } }), FARMING_CONTEXT.GRAND_FEAST);
});

test('Feast helpers keep Harvest Feast and Grand Feast related but distinct', () => {
  assert.equal(isHarvestFeastContext(FARMING_CONTEXT.HARVEST_FEAST), true);
  assert.equal(isHarvestFeastContext(FARMING_CONTEXT.GRAND_FEAST), true);
  assert.equal(isHarvestFeastContext(FARMING_CONTEXT.JACOB_CONTEST), false);
  assert.equal(isGrandFeastContext(FARMING_CONTEXT.GRAND_FEAST), true);
  assert.equal(isGrandFeastContext(FARMING_CONTEXT.HARVEST_FEAST), false);
  assert.equal(farmingContextLabel(FARMING_CONTEXT.JACOB_CONTEST), "Jacob's Contest");
});
