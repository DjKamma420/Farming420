import assert from 'node:assert/strict';
import test from 'node:test';

import {
  CROP_MILESTONE_DEFINITIONS,
  CROP_MILESTONE_MAX_TOTAL,
  cropMilestoneLevelFromCollected,
  cropMilestonesFromResources,
} from '../src/crop-milestones.js';

test('the current Garden has 13 crops and 598 total possible crop milestones', () => {
  assert.equal(CROP_MILESTONE_DEFINITIONS.length, 13);
  assert.equal(CROP_MILESTONE_MAX_TOTAL, 598);
  assert.ok(CROP_MILESTONE_DEFINITIONS.every(crop => crop.thresholds.length === 47));
});

test('current Garden resource keys include the non-obvious mushroom and Sunflower ids', () => {
  const byId = Object.fromEntries(CROP_MILESTONE_DEFINITIONS.map(crop => [crop.id, crop.apiKey]));
  assert.equal(byId.mushroom, 'MUSHROOM_COLLECTION');
  assert.equal(byId['cocoa-beans'], 'INK_SACK:3');
  assert.equal(byId['nether-wart'], 'NETHER_STALK');
  assert.equal(byId.sunflower, 'DOUBLE_PLANT');
  assert.equal(byId.moonflower, 'MOONFLOWER');
  assert.equal(byId['wild-rose'], 'WILD_ROSE');
});

test('milestone tier is derived from cumulative collected amount without off-by-one errors', () => {
  const wheat = CROP_MILESTONE_DEFINITIONS.find(crop => crop.id === 'wheat').thresholds;
  assert.equal(cropMilestoneLevelFromCollected(0, wheat), 0);
  assert.equal(cropMilestoneLevelFromCollected(29, wheat), 0);
  assert.equal(cropMilestoneLevelFromCollected(30, wheat), 1);
  assert.equal(cropMilestoneLevelFromCollected(79, wheat), 1);
  assert.equal(cropMilestoneLevelFromCollected(80, wheat), 2);
  assert.equal(cropMilestoneLevelFromCollected(20_218_410, wheat), 46);
  assert.equal(cropMilestoneLevelFromCollected(999_999_999, wheat), 46);
});

test('a present sparse resources map treats omitted crops as zero collected', () => {
  const result = cropMilestonesFromResources({ WHEAT: 80 });
  assert.equal(result.complete, true);
  assert.equal(result.byCrop.wheat, 2);
  assert.equal(result.byCrop.carrot, 0);
  assert.equal(result.total, 2);
});

test('a fully maxed resource map derives 598 total milestones', () => {
  const resources = Object.fromEntries(CROP_MILESTONE_DEFINITIONS.map(crop => [
    crop.apiKey,
    crop.thresholds.at(-1),
  ]));
  const result = cropMilestonesFromResources(resources);
  assert.equal(result.complete, true);
  assert.equal(result.total, 598);
  assert.ok(Object.values(result.byCrop).every(level => level === 46));
});

test('missing or malformed resources stay unknown instead of becoming zero', () => {
  const missing = cropMilestonesFromResources(null);
  assert.equal(missing.complete, false);
  assert.equal(missing.total, null);

  const malformed = cropMilestonesFromResources({ WHEAT: 'not-a-number' });
  assert.equal(malformed.complete, false);
  assert.equal(malformed.total, null);
  assert.ok(malformed.reasons.some(reason => reason.includes('WHEAT')));
});
