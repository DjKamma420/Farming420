import assert from 'node:assert/strict';
import test from 'node:test';

import {
  FARMING_PETS,
  clampPetLevel,
  farmingPetById,
  petLevelBounds,
  petRarities,
} from '../src/setup-pet-catalog.js';

test('the setup pet picker exposes unique sourced farming pets', () => {
  const ids = FARMING_PETS.map(pet => pet.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(ids.includes('MOOSHROOM_COW'));
  assert.ok(ids.includes('ELEPHANT'));
  assert.ok(ids.includes('ORCHID_MANTIS'));
  assert.ok(ids.includes('HEDGEHOG'));
  for (const pet of FARMING_PETS) {
    assert.match(pet.source, /^https:\/\/github\.com\/NotEnoughUpdates\/NotEnoughUpdates-REPO\/tree\//);
    assert.equal(pet.lastVerified, '2026-09-28');
    assert.equal(pet.rarityItemIds.length, pet.rarities.length);
    assert.ok(pet.rarityItemIds.every(id => id.startsWith(`${pet.id};`)));
    assert.ok(pet.rarities.length > 0);
  }
});

test('current farming-pet rarity ranges match the verified NEU item variants', () => {
  const expected = {
    BEE: ['COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY', 'MYTHIC'],
    CHICKEN: ['COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY'],
    ELEPHANT: ['COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY', 'MYTHIC'],
    HEDGEHOG: ['LEGENDARY'],
    MOOSHROOM_COW: ['COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY'],
    MOSQUITO: ['COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY'],
    ORCHID_MANTIS: ['COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY'],
    PIG: ['COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY'],
    RABBIT: ['COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY', 'MYTHIC'],
    ROSE_DRAGON: ['LEGENDARY'],
    SLUG: ['EPIC', 'LEGENDARY'],
  };

  for (const [id, rarities] of Object.entries(expected)) {
    assert.deepEqual([...petRarities(id)], rarities, `${id} rarity range changed`);
    const pet = farmingPetById(id);
    const expectedIds = rarities.map(rarity => {
      const index = ['COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY', 'MYTHIC'].indexOf(rarity);
      return `${id};${index}`;
    });
    assert.deepEqual([...pet.rarityItemIds], expectedIds);
  }
});

test('Rose Dragon preserves unhatched levels and caps at 200 while normal pets cap at 100', () => {
  assert.deepEqual(petLevelBounds('ROSE_DRAGON'), { min: 1, max: 200 });
  assert.deepEqual(petLevelBounds('MOOSHROOM_COW'), { min: 1, max: 100 });
  assert.equal(clampPetLevel('ROSE_DRAGON', 50), 50);
  assert.equal(clampPetLevel('ROSE_DRAGON', 250), 200);
  assert.equal(clampPetLevel('ROSE_DRAGON', null), null);
  assert.equal(clampPetLevel('MOOSHROOM_COW', 73.9), 73);
});

test('unknown pet ids stay unknown rather than inheriting a rarity or level', () => {
  assert.equal(farmingPetById('not_a_pet'), null);
  assert.deepEqual([...petRarities('not_a_pet')], []);
  assert.equal(petLevelBounds('not_a_pet'), null);
  assert.equal(clampPetLevel('not_a_pet', 100), null);
});
