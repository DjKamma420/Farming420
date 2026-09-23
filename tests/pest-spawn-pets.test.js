import assert from 'node:assert/strict';
import test from 'node:test';

import { pestSpawnPetContribution } from '../src/pest-spawn-pets.js';
import { createDefaultSetups } from '../src/setups.js';

function stateWithPet({
  type,
  rarity,
  level = null,
  experience = null,
  visitors = 0,
} = {}) {
  const setups = createDefaultSetups();
  setups.activeId = 'pest';
  const setup = setups.list.find(row => row.id === 'pest');
  setup.slots.pet = {
    skyblockId: type,
    displayName: `${type} Pet`,
    rarity,
    petLevel: level,
    physicalItemId: 'pet:selected',
  };
  return {
    selectedCrop: 'melon',
    profile: {
      setups,
      normalizedSnapshot: {
        garden: { visitors: { uniqueNpcsServed: visitors } },
        pets: [{
          uuid: 'selected',
          type,
          rarity,
          level,
          experience,
          active: true,
        }],
      },
    },
  };
}

test('Mosquito grants +0.5 BPC per pet level at every rarity', () => {
  for (const rarity of ['COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY']) {
    const result = pestSpawnPetContribution(stateWithPet({ type: 'MOSQUITO', rarity, level: 100 }));
    assert.equal(result.bonusPestChance, 50);
    assert.deepEqual([...result.bpcReasons], []);
  }
});

test('Mosquito level falls back to the normal profile pet XP curve', () => {
  const state = stateWithPet({
    type: 'MOSQUITO',
    rarity: 'LEGENDARY',
    level: null,
    experience: 25_353_230,
  });
  const result = pestSpawnPetContribution(state);
  assert.equal(result.level, 100);
  assert.equal(result.bonusPestChance, 50);
});

test("Mosquito Buzzin' Barterer scales by rarity, level and unique visitors only on Sugar Cane", () => {
  const rare = pestSpawnPetContribution(
    stateWithPet({ type: 'MOSQUITO', rarity: 'RARE', level: 50, visitors: 100 }),
    'sugar-cane',
  );
  assert.equal(rare.visitorFortunePerVisitor, 0.5);
  assert.equal(rare.cropFortune, 50);

  const epic = pestSpawnPetContribution(
    stateWithPet({ type: 'MOSQUITO', rarity: 'EPIC', level: 50, visitors: 100 }),
    'sugar-cane',
  );
  assert.equal(epic.visitorFortunePerVisitor, 1);
  assert.equal(epic.cropFortune, 100);

  const capped = pestSpawnPetContribution(
    stateWithPet({ type: 'MOSQUITO', rarity: 'LEGENDARY', level: 100, visitors: 500 }),
    'sugar-cane',
  );
  assert.equal(capped.cropFortune, 175);

  const melon = pestSpawnPetContribution(
    stateWithPet({ type: 'MOSQUITO', rarity: 'LEGENDARY', level: 100, visitors: 500 }),
    'melon',
  );
  assert.equal(melon.cropFortune, 0);
});

test('Mosquito missing visitor data is incomplete only for eligible Sugar Cane Barterer', () => {
  const state = stateWithPet({ type: 'MOSQUITO', rarity: 'LEGENDARY', level: 100, visitors: 0 });
  state.profile.normalizedSnapshot.garden.visitors.uniqueNpcsServed = null;
  const sugar = pestSpawnPetContribution(state, 'sugar-cane');
  assert.ok(sugar.cropFortuneReasons.some(reason => reason.includes('visitor')));
  assert.deepEqual([...sugar.bpcReasons], []);

  const melon = pestSpawnPetContribution(state, 'melon');
  assert.deepEqual([...melon.cropFortuneReasons], []);
});

test('Mosquito Smooth Jazz uses its rarity-specific current scaling', () => {
  assert.equal(pestSpawnPetContribution(stateWithPet({ type: 'MOSQUITO', rarity: 'COMMON', level: 100 })).smoothJazzPct, 25);
  assert.equal(pestSpawnPetContribution(stateWithPet({ type: 'MOSQUITO', rarity: 'RARE', level: 100 })).smoothJazzPct, 35);
  assert.equal(pestSpawnPetContribution(stateWithPet({ type: 'MOSQUITO', rarity: 'LEGENDARY', level: 100 })).smoothJazzPct, 50);
});

test('Slug grants +0.4 BPC per level at both supported rarities', () => {
  for (const rarity of ['EPIC', 'LEGENDARY']) {
    const result = pestSpawnPetContribution(stateWithPet({ type: 'SLUG', rarity, level: 100 }));
    assert.equal(result.bonusPestChance, 40);
    assert.deepEqual([...result.bpcReasons], []);
  }
});

test('Legendary Slug Repugnant Aroma is +1 FF per level only on a sprayed plot', () => {
  const state = stateWithPet({ type: 'SLUG', rarity: 'LEGENDARY', level: 100 });
  const sprayed = pestSpawnPetContribution(state, 'melon', { sprayonatorActive: true });
  assert.equal(sprayed.globalFortune, 100);
  assert.deepEqual([...sprayed.globalFortuneReasons], []);

  const unsprayed = pestSpawnPetContribution(state, 'melon', { sprayonatorActive: false });
  assert.equal(unsprayed.globalFortune, 0);
  assert.deepEqual([...unsprayed.globalFortuneReasons], []);

  const unknown = pestSpawnPetContribution(state);
  assert.equal(unknown.globalFortune, 0);
  assert.ok(unknown.globalFortuneReasons.some(reason => reason.includes('Sprayonator')));
});

test('Epic Slug has no Repugnant Aroma dependency', () => {
  const result = pestSpawnPetContribution(stateWithPet({ type: 'SLUG', rarity: 'EPIC', level: 100 }));
  assert.equal(result.globalFortune, 0);
  assert.deepEqual([...result.globalFortuneReasons], []);
});
