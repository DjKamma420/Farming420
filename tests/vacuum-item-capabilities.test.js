import assert from 'node:assert/strict';
import test from 'node:test';

import '../src/vacuum-data-patches.js';
import { UPGRADES } from '../src/data.js';
import { ACTIVITY_MODE } from '../src/activity-mode.js';
import { computeStatTotals } from '../src/computed-stats.js';
import { vacuumPeridotFortune, vacuumRarity } from '../src/vacuum-state.js';

test('Vacuum item-local books have the real caps and stat axes', () => {
  const dummies = UPGRADES.find(item => item.id === 'vacuum-farming-for-dummies');
  const bookworm = UPGRADES.find(item => item.id === 'vacuum-bookworms-favorite-book');
  assert.equal(dummies?.max, 5);
  assert.equal(dummies?.stepGain, 1);
  assert.equal(dummies?.metric, 'Crop Yield');
  assert.equal(bookworm?.max, 5);
  // +20 each, +100 at five. 0.27 doubled this from +10, and
  // research/VACUUM_RESEARCH.md lists "not +10" as an explicit correction --
  // but this assertion pinned the old number, which is how the stale value
  // survived a test suite that was supposed to protect it.
  assert.equal(bookworm?.stepGain, 20);
  assert.equal(bookworm?.metric, 'Vacuum Damage');
});

test('Hooverius Recomb changes host rarity and therefore Peridot Fortune', () => {
  const bucket = {
    skyblockId: 'INFINI_VACUUM_HOOVERIUS',
    recombobulated: false,
    gemSlots: [
      { unlocked: true, gem: 'PERFECT PERIDOT' },
      { unlocked: true, gem: 'PERFECT PERIDOT' },
    ],
  };
  assert.equal(vacuumRarity(bucket), 'LEGENDARY');
  assert.equal(vacuumPeridotFortune(bucket), 16);
  bucket.recombobulated = true;
  assert.equal(vacuumRarity(bucket), 'MYTHIC');
  assert.equal(vacuumPeridotFortune(bucket), 20);
});

test('Vacuum Peridot and Farming for Dummies count only in Pest mode', () => {
  const state = {
    selectedCrop: 'melon',
    profile: {
      vacuumProgress: {
        skyblockId: 'INFINI_VACUUM_HOOVERIUS',
        recombobulated: true,
        gemSlots: [
          { unlocked: true, gem: 'PERFECT PERIDOT' },
          { unlocked: true, gem: 'PERFECT PERIDOT' },
        ],
        levels: { 'vacuum-farming-for-dummies': 5 },
        owned: { 'vacuum-farming-for-dummies': true },
      },
    },
  };
  const pest = computeStatTotals(state, 'melon', ACTIVITY_MODE.PEST);
  const farm = computeStatTotals(state, 'melon', ACTIVITY_MODE.FARM);
  assert.equal(pest.pestFortune, 25, '20 Peridot + 5 Farming for Dummies');
  assert.equal(farm.pestFortune, 0);
});

test('Bookworm damage never fabricates Farming Fortune', () => {
  const state = {
    selectedCrop: 'melon',
    profile: { vacuumProgress: {
      levels: { 'vacuum-bookworms-favorite-book': 5 },
      owned: { 'vacuum-bookworms-favorite-book': true },
    } },
  };
  const pest = computeStatTotals(state, 'melon', ACTIVITY_MODE.PEST);
  assert.equal(pest.pestFortune, 0);
});
