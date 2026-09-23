import assert from 'node:assert/strict';
import test from 'node:test';

import {
  mooshroomCowContribution,
  mooshroomStrengthFortune,
  mooshroomStrengthRequirement,
  petLevelFromExperience,
} from '../src/mooshroom-cow.js';
import { computeStatTotals } from '../src/computed-stats.js';

function stateWithCow({ strength, rarity = 'LEGENDARY', experience = 1_000_000_000 } = {}) {
  return {
    selectedCrop: 'melon',
    profile: {
      inputs: strength === undefined ? {} : { strength },
      levels: {}, owned: {}, manualGain: {}, cropProgress: {}, toolProgress: {}, autoApplied: {},
      normalizedSnapshot: {
        pets: [{ type: 'MOOSHROOM_COW', rarity, experience, active: true }],
      },
    },
  };
}

test('pet XP resolves the Mooshroom Cow level used by the perk', () => {
  assert.equal(petLevelFromExperience(0, 'LEGENDARY'), 1);
  assert.equal(petLevelFromExperience(1_000_000_000, 'LEGENDARY'), 100);
});

test('the shared pet XP helper supports a verified level-200 extension without changing level-100 pets', () => {
  const options = { maxLevel: 200, extraLevelXp: 1_886_700 };
  assert.equal(petLevelFromExperience(25_353_229, 'LEGENDARY', options), 99);
  assert.equal(petLevelFromExperience(25_353_230, 'LEGENDARY', options), 100);
  assert.equal(petLevelFromExperience(27_239_930, 'LEGENDARY', options), 101);
  assert.equal(petLevelFromExperience(214_023_230, 'LEGENDARY', options), 200);
  assert.equal(petLevelFromExperience(214_023_230, 'LEGENDARY'), 100);
});

test('Farming Strength threshold scales from 39.8 at level 1 to 20 at level 100', () => {
  assert.equal(mooshroomStrengthRequirement(1), 39.8);
  assert.equal(mooshroomStrengthRequirement(100), 20);
});

test('level 100 legendary Cow uses the current floor((Strength / 20) * 0.7) formula', () => {
  assert.equal(mooshroomStrengthFortune(1000, 100, 'LEGENDARY'), 35);
  assert.equal(mooshroomStrengthFortune(1160, 100, 'LEGENDARY'), 40);
  assert.equal(mooshroomStrengthFortune(1180, 100, 'LEGENDARY'), 41);
});

test('manual Strength is an input and Cow contribution is a derived Fortune output', () => {
  const cow = mooshroomCowContribution(stateWithCow({ strength: 1000 }));
  assert.equal(cow.active, true);
  assert.equal(cow.level, 100);
  assert.equal(cow.baseFortune, 100);
  assert.equal(cow.strengthFortune, 35);
  assert.equal(cow.value, 135);
  assert.equal(cow.incomplete, false);
});

test('missing Strength keeps known base Cow Fortune but marks the total incomplete', () => {
  const cow = mooshroomCowContribution(stateWithCow());
  assert.equal(cow.value, 100);
  assert.equal(cow.incomplete, true);
  assert.ok(cow.reasons.includes('Strength input is missing'));
});

test('non-legendary Cow has no Farming Strength perk', () => {
  const cow = mooshroomCowContribution(stateWithCow({ rarity: 'EPIC', strength: 1000 }));
  assert.equal(cow.baseFortune, 100);
  assert.equal(cow.strengthFortune, 0);
  assert.equal(cow.value, 100);
  assert.equal(cow.incomplete, false);
});

test('computed global Fortune includes the active Cow automatically', () => {
  const totals = computeStatTotals(stateWithCow({ strength: 1000 }), 'melon');
  assert.equal(totals.globalFortune, 135);
  assert.equal(totals.derived.mooshroomCow.strengthFortune, 35);
});
