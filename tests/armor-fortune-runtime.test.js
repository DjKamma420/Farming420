import assert from 'node:assert/strict';
import test from 'node:test';

import {
  helianthusBaseFortune,
  helianthusFeastFortune,
  helianthusPieceCount,
  mossyFortuneForPieces,
  mossyPieceCount,
  pesterminatorFortune,
  pesterminatorTotalLevel,
  perfectPeridotCountOnArmor,
  perfectPeridotFortuneOnArmor,
  sunsetTotalLevel,
} from '../src/armor-fortune.js';

const piece = (name, overrides = {}) => ({
  displayName: name,
  rarity: 'LEGENDARY',
  reforge: null,
  enchantments: {},
  gems: {},
  ...overrides,
});

test('Helianthus base Farming Fortune belongs to each individual armor piece', () => {
  assert.equal(helianthusBaseFortune([piece('Helianthus Helmet')]), 35);
  assert.equal(helianthusBaseFortune([piece('Helianthus Chestplate')]), 40);
  assert.equal(helianthusBaseFortune([piece('Helianthus Leggings')]), 40);
  assert.equal(helianthusBaseFortune([piece('Helianthus Boots')]), 35);
  assert.equal(helianthusBaseFortune([
    piece('Helianthus Helmet'), piece('Helianthus Chestplate'),
  ]), 75);
});

test('duplicate armor slots do not fabricate extra Helianthus pieces', () => {
  const pieces = [piece('Helianthus Helmet'), piece('Helianthus Helmet')];
  assert.equal(helianthusPieceCount(pieces), 1);
  assert.equal(helianthusBaseFortune(pieces), 35);
});

test('Feast stays separate from base stats and follows the verified tiered piece count', () => {
  const all = [
    piece('Helianthus Helmet'), piece('Helianthus Chestplate'),
    piece('Helianthus Leggings'), piece('Helianthus Boots'),
  ];
  assert.equal(helianthusFeastFortune(all.slice(0, 1)), 0);
  assert.equal(helianthusFeastFortune(all.slice(0, 2)), 25);
  assert.equal(helianthusFeastFortune(all.slice(0, 3)), 50);
  assert.equal(helianthusFeastFortune(all), 75);
});

test('Mossy is summed per equipped piece and effective rarity', () => {
  const pieces = [
    piece('Helianthus Helmet', { rarity: 'LEGENDARY', reforge: 'mossy' }),
    piece('Helianthus Chestplate', { rarity: 'MYTHIC', reforge: 'mossy' }),
    piece('Helianthus Leggings', { rarity: 'LEGENDARY', reforge: 'ancient' }),
  ];
  assert.equal(mossyPieceCount(pieces), 2);
  assert.equal(mossyFortuneForPieces(pieces), 55);
  assert.equal(
    mossyFortuneForPieces([piece('Helianthus Helmet', { rarity: 'LEGENDARY', reforge: 'mossy', recombobulated: true })]),
    30,
    'base Legendary + Recombobulator scales Mossy as Mythic',
  );
});

test('Pesterminator levels are summed per piece rather than requiring a full matching set', () => {
  const pieces = [
    piece('Helianthus Helmet', { enchantments: { pesterminator: 6 } }),
    piece('Helianthus Chestplate', { enchantments: { pesterminator: 3 } }),
  ];
  assert.equal(pesterminatorTotalLevel(pieces), 9);
  assert.equal(pesterminatorFortune(pieces), 18);
});

test('Sunset is tracked as per-piece levels without turning it into Farming Fortune', () => {
  assert.equal(sunsetTotalLevel([
    piece('Helianthus Helmet', { enchantments: { sunset: 5 } }),
    piece('Helianthus Chestplate', { enchantments: { sunset: 2 } }),
  ]), 7);
});

test('Perfect Peridot is counted per gemstone slot and scales with effective host rarity', () => {
  const pieces = [
    piece('Helianthus Helmet', { rarity: 'LEGENDARY', gems: { PERIDOT_0: 'PERFECT', PERIDOT_1: 'PERFECT' } }),
    piece('Helianthus Chestplate', { rarity: 'MYTHIC', gems: ['PERFECT PERIDOT'] }),
  ];
  assert.equal(perfectPeridotCountOnArmor(pieces), 3);
  assert.equal(perfectPeridotFortuneOnArmor(pieces), 26);
  assert.equal(
    perfectPeridotFortuneOnArmor([
      piece('Helianthus Helmet', {
        rarity: 'LEGENDARY',
        recombobulated: true,
        gems: { PERIDOT_0: 'PERFECT', PERIDOT_1: 'PERFECT' },
      }),
    ]),
    20,
    'two Perfect Peridots on base Legendary + Recombobulator use Mythic value',
  );
});
