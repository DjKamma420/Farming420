import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

import {
  FARMING_PETS,
  clampPetLevel,
  farmingPetById,
  petIconUrl,
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
    assert.match(pet.lastVerified, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(pet.lastVerified >= '2026-09-17', `${pet.id} verification date regressed`);
    assert.ok(pet.rarities.length > 0);
    assert.match(pet.iconUrl, /^https:\/\/skyah\.net\/icons\/pets\/[a-z0-9_]+\.webp$/);
  }
});


test('farming pets have exact rendered icons for dropdowns and setup portraits', () => {
  const expected = {
    BEE: 'https://skyah.net/icons/pets/bee.webp',
    CHICKEN: 'https://skyah.net/icons/pets/chicken.webp',
    ELEPHANT: 'https://skyah.net/icons/pets/elephant.webp',
    HEDGEHOG: 'https://skyah.net/icons/pets/hedgehog.webp',
    MOOSHROOM_COW: 'https://skyah.net/icons/pets/mooshroom_cow.webp',
    MOSQUITO: 'https://skyah.net/icons/pets/mosquito.webp',
    ORCHID_MANTIS: 'https://skyah.net/icons/pets/orchid_mantis.webp',
    PIG: 'https://skyah.net/icons/pets/pig.webp',
    RABBIT: 'https://skyah.net/icons/pets/rabbit.webp',
    ROSE_DRAGON: 'https://skyah.net/icons/pets/rose_dragon.webp',
    SLUG: 'https://skyah.net/icons/pets/slug.webp',
  };
  assert.deepEqual(Object.fromEntries(FARMING_PETS.map(pet => [pet.id, pet.iconUrl])), expected);
  for (const [id, url] of Object.entries(expected)) assert.equal(petIconUrl(id), url, id);
  assert.equal(petIconUrl('not_a_pet'), null);
});

test('setup slot art prefers pet species art before generic item art', () => {
  const source = readFileSync(new URL('../src/item-art-ui.js', import.meta.url), 'utf8');
  assert.match(source, /petIconUrl\(itemId\) \|\| knownSkyblockRenderedIcon\(itemId\)/);
});

test('current farming-pet rarity ranges stay explicit instead of free text', () => {
  assert.deepEqual([...petRarities('ELEPHANT')], ['COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY', 'MYTHIC']);
  assert.deepEqual([...petRarities('RABBIT')], ['COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY', 'MYTHIC']);
  assert.deepEqual([...petRarities('BEE')], ['COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY', 'MYTHIC']);
  assert.deepEqual([...petRarities('SLUG')], ['EPIC', 'LEGENDARY']);
  assert.deepEqual([...petRarities('HEDGEHOG')], ['LEGENDARY']);
  assert.deepEqual([...petRarities('ROSE_DRAGON')], ['LEGENDARY']);
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
