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
    assert.match(pet.source, /^https:\/\/hypixelskyblock\.minecraft\.wiki\/w\//);
    assert.equal(pet.lastVerified, '2026-09-17');
    assert.ok(pet.rarities.length > 0);
  }
});

test('current farming-pet rarity ranges stay explicit instead of free text', () => {
  assert.deepEqual([...petRarities('ELEPHANT')], ['COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY', 'MYTHIC']);
  assert.deepEqual([...petRarities('RABBIT')], ['COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY', 'MYTHIC']);
  assert.deepEqual([...petRarities('BEE')], ['COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY', 'MYTHIC']);
  assert.deepEqual([...petRarities('SLUG')], ['EPIC', 'LEGENDARY']);
  assert.deepEqual([...petRarities('HEDGEHOG')], ['LEGENDARY']);
  assert.deepEqual([...petRarities('ROSE_DRAGON')], ['LEGENDARY']);
});

test('Rose Dragon keeps its special 100-200 level range while normal pets use 1-100', () => {
  assert.deepEqual(petLevelBounds('ROSE_DRAGON'), { min: 100, max: 200 });
  assert.deepEqual(petLevelBounds('MOOSHROOM_COW'), { min: 1, max: 100 });
  assert.equal(clampPetLevel('ROSE_DRAGON', 50), 100);
  assert.equal(clampPetLevel('ROSE_DRAGON', 250), 200);
  assert.equal(clampPetLevel('MOOSHROOM_COW', 73.9), 73);
});

test('unknown pet ids stay unknown rather than inheriting a rarity or level', () => {
  assert.equal(farmingPetById('not_a_pet'), null);
  assert.deepEqual([...petRarities('not_a_pet')], []);
  assert.equal(petLevelBounds('not_a_pet'), null);
  assert.equal(clampPetLevel('not_a_pet', 100), null);
});
