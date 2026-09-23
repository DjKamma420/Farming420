import assert from 'node:assert/strict';
import test from 'node:test';

import { maxedOtherFarmingPets, roseDragonContribution } from '../src/rose-dragon.js';
import { createDefaultSetups } from '../src/setups.js';

function state({
  level = 200,
  farmingLevel = 60,
  cropMilestoneTotal = 598,
  pets = [],
  petStatus = 'AUTO',
} = {}) {
  const setups = createDefaultSetups();
  setups.list[0].slots.pet = {
    skyblockId: 'ROSE_DRAGON',
    displayName: 'Rose Dragon Pet',
    petLevel: level,
    rarity: 'LEGENDARY',
    physicalItemId: 'pet:dragon',
  };
  return {
    selectedCrop: 'melon',
    profile: {
      levels: {},
      setups,
      normalizedSnapshot: {
        skills: { farming: { level: farmingLevel } },
        garden: { cropMilestoneTotal },
        pets: [
          { uuid: 'dragon', type: 'ROSE_DRAGON', rarity: 'LEGENDARY', level, active: true },
          ...pets,
        ],
        provenance: { pets: { status: petStatus, sources: [] } },
      },
    },
  };
}

const MAXED_OTHERS = [
  ['BEE', 'MYTHIC'],
  ['CHICKEN', 'LEGENDARY'],
  ['ELEPHANT', 'MYTHIC'],
  ['HEDGEHOG', 'LEGENDARY'],
  ['MOOSHROOM_COW', 'LEGENDARY'],
  ['MOSQUITO', 'LEGENDARY'],
  ['ORCHID_MANTIS', 'LEGENDARY'],
  ['PIG', 'LEGENDARY'],
  ['RABBIT', 'MYTHIC'],
  ['SLUG', 'LEGENDARY'],
].map(([type, rarity], index) => ({
  uuid: `other-${index}`,
  type,
  rarity,
  level: 100,
  experience: 1_000_000_000,
  active: false,
}));

test('Rose Dragon level is derived from profile XP when the API has no explicit level field', () => {
  const value = state();
  value.profile.setups.list[0].slots.pet.petLevel = null;
  value.profile.normalizedSnapshot.pets[0].level = null;
  value.profile.normalizedSnapshot.pets[0].experience = 214_023_230;
  const result = roseDragonContribution(value);
  assert.equal(result.level, 200);
  assert.equal(result.overbloom, 40);
});

test('an unhatched Rose Dragon egg has known zero stats and needs no Farming or Garden inputs', () => {
  const value = state({ level: 1, farmingLevel: null, cropMilestoneTotal: null });
  const result = roseDragonContribution(value);
  assert.equal(result.level, 1);
  assert.equal(result.globalFortune, 0);
  assert.equal(result.overbloom, 0);
  assert.equal(result.incomplete, false);
});

test('level 200 Rose Dragon matches the sourced max formula before Symbiosis', () => {
  const result = roseDragonContribution(state());
  assert.equal(result.active, true);
  assert.equal(result.baseFortune, 40);
  assert.equal(result.gardenPower, 180);
  assert.ok(Math.abs(result.rosyScales - 89.7) < 1e-9);
  assert.equal(result.overbloom, 40);
  assert.equal(result.symbiosis, 0);
  assert.ok(Math.abs(result.globalFortune - 309.7) < 1e-9);
});

test('Symbiosis adds +3 FF for each other unique maxed Farming Pet at level 200', () => {
  const result = roseDragonContribution(state({ pets: MAXED_OTHERS }));
  assert.equal(result.symbiosisPetCount, 10);
  assert.equal(result.symbiosis, 30);
  assert.ok(Math.abs(result.globalFortune - 339.7) < 1e-9);
});

test('duplicate maxed pets count once and another Rose Dragon never counts', () => {
  const pets = [
    MAXED_OTHERS[0],
    { ...MAXED_OTHERS[0], uuid: 'duplicate-bee' },
    { uuid: 'second-dragon', type: 'ROSE_DRAGON', rarity: 'LEGENDARY', level: 200 },
  ];
  const maxed = maxedOtherFarmingPets(state({ pets }).profile.normalizedSnapshot);
  assert.equal(maxed.complete, true);
  assert.equal(maxed.count, 1);
  assert.deepEqual([...maxed.species], ['BEE']);
});

test('Rose Dragon perks scale continuously with pet level from 100 to 200', () => {
  const result = roseDragonContribution(state({
    level: 101,
    farmingLevel: 1,
    cropMilestoneTotal: 1,
  }));
  assert.ok(Math.abs(result.baseFortune - 20.2) < 1e-12);
  assert.ok(Math.abs(result.gardenPower - 1.515) < 1e-12);
  assert.ok(Math.abs(result.rosyScales - 0.07575) < 1e-12);
  assert.ok(Math.abs(result.overbloom - 20.2) < 1e-12);
  assert.equal(result.symbiosis, 0);
});

test('level 200 Symbiosis stays incomplete when pet ownership is stale', () => {
  const result = roseDragonContribution(state({ petStatus: 'HIDDEN' }));
  assert.equal(result.symbiosis, 0);
  assert.equal(result.incomplete, true);
  assert.ok(result.fortuneIncompleteReasons.some(reason => reason.includes('Pet ownership')));
  assert.deepEqual([...result.overbloomIncompleteReasons], []);
});

test('missing farming or milestone inputs mark Fortune incomplete without hiding known Overbloom', () => {
  const result = roseDragonContribution(state({
    farmingLevel: null,
    cropMilestoneTotal: null,
    level: 150,
  }));
  assert.equal(result.overbloom, 30);
  assert.equal(result.overbloomIncompleteReasons.length, 0);
  assert.equal(result.fortuneIncompleteReasons.length, 2);
  assert.equal(result.incomplete, true);
});

test('an unknown max-level state of an owned Farming Pet keeps Symbiosis incomplete', () => {
  const snapshot = state({
    pets: [{ uuid: 'bee', type: 'BEE', rarity: null, level: null, experience: null }],
  }).profile.normalizedSnapshot;
  const maxed = maxedOtherFarmingPets(snapshot);
  assert.equal(maxed.complete, false);
  assert.equal(maxed.count, null);
  assert.ok(maxed.reasons.some(reason => reason.includes('Bee Pet')));
});
