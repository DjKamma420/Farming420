import assert from 'node:assert/strict';
import test from 'node:test';

import {
  GARDEN_LEVEL_THRESHOLDS,
  gardenLevelFromExperience,
} from '../src/garden-level.js';

test('Garden XP thresholds derive the current 1-15 Garden level', () => {
  assert.equal(GARDEN_LEVEL_THRESHOLDS.length, 15);
  assert.equal(gardenLevelFromExperience(0), 1);
  assert.equal(gardenLevelFromExperience(69), 1);
  assert.equal(gardenLevelFromExperience(70), 2);
  assert.equal(gardenLevelFromExperience(519), 4);
  assert.equal(gardenLevelFromExperience(520), 5);
  assert.equal(gardenLevelFromExperience(60119), 14);
  assert.equal(gardenLevelFromExperience(60120), 15);
  assert.equal(gardenLevelFromExperience(1_000_000), 15);
});

test('missing or invalid Garden XP stays unknown', () => {
  assert.equal(gardenLevelFromExperience(null), null);
  assert.equal(gardenLevelFromExperience(undefined), null);
  assert.equal(gardenLevelFromExperience(''), null);
  assert.equal(gardenLevelFromExperience(-1), null);
  assert.equal(gardenLevelFromExperience('not-xp'), null);
});
