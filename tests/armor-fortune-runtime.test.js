import assert from 'node:assert/strict';
import test from 'node:test';

import {
  helianthusBaseBonusPestChance,
  helianthusBaseFortune,
  helianthusFeastFortune,
  helianthusPieceCount,
  mantidBaseBonusPestChanceForPieces,
  mantidFortuneForPieces,
  mantidPieceCount,
  mantidRecentKillBonusPestChance,
  mossyFortuneForPieces,
  mossyPieceCount,
  pesterminatorBonusPestChance,
  pesterminatorFortune,
  pesterminatorTotalLevel,
  perfectPeridotCountOnArmor,
  perfectPeridotFortuneOnArmor,
  sunsetTotalLevel,
  thornsTotalLevel,
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
  assert.equal(pesterminatorBonusPestChance(pieces), 9);
});

test('Helianthus contributes +20 BPC per distinct equipped armor slot', () => {
  const pieces = [
    piece('Helianthus Helmet'),
    piece('Helianthus Chestplate'),
    piece('Helianthus Leggings'),
    piece('Helianthus Boots'),
  ];
  assert.equal(helianthusBaseBonusPestChance(pieces), 80);
  assert.equal(helianthusBaseBonusPestChance([pieces[0], pieces[0]]), 20);
});

test('Mantid scales FF and base BPC by effective rarity', () => {
  const pieces = [
    piece('Helianthus Helmet', { rarity: 'LEGENDARY', reforge: 'mantid', recombobulated: true }),
    piece('Helianthus Chestplate', { rarity: 'MYTHIC', reforge: 'mantid' }),
    piece('Helianthus Leggings', { rarity: 'EPIC', reforge: 'mantid' }),
  ];
  assert.equal(mantidPieceCount(pieces), 3);
  assert.equal(mantidFortuneForPieces(pieces), 32);
  assert.equal(mantidBaseBonusPestChanceForPieces(pieces), 6.5);
});

test('Mantid recent-kill BPC stacks per reforged piece and caps at +5 each', () => {
  const pieces = Array.from({ length: 4 }, (_, index) =>
    piece(`Helianthus ${['Helmet', 'Chestplate', 'Leggings', 'Boots'][index]}`, {
      rarity: 'MYTHIC',
      reforge: 'mantid',
    }));
  assert.equal(mantidRecentKillBonusPestChance(pieces, 0), 0);
  assert.equal(mantidRecentKillBonusPestChance(pieces, 10), 10);
  assert.equal(mantidRecentKillBonusPestChance(pieces, 20), 20);
  assert.equal(mantidRecentKillBonusPestChance(pieces, 999), 20);
  assert.equal(mantidRecentKillBonusPestChance(pieces, null), null);
});

test('Sunset is tracked as per-piece levels without turning it into Farming Fortune', () => {
  assert.equal(sunsetTotalLevel([
    piece('Helianthus Helmet', { enchantments: { sunset: 5 } }),
    piece('Helianthus Chestplate', { enchantments: { sunset: 2 } }),
  ]), 7);
});

test('Thorns keeps the legitimate event-item level V for Thorny calculations', () => {
  assert.equal(thornsTotalLevel([
    piece('Pufferfish Hat', { enchantments: { thorns: 5 } }),
    piece('Helianthus Chestplate', { enchantments: { thorns: 4 } }),
    piece('Helianthus Leggings', { enchantments: { thorns: 4 } }),
    piece('Helianthus Boots', { enchantments: { thorns: 4 } }),
  ]), 17);
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
