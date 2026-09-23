import assert from 'node:assert/strict';
import test from 'node:test';

import {
  blossomBaseFortune,
  blossomPieceCount,
  greenThumbFortune,
  greenThumbMarginalPerLevel,
  greenThumbTotalLevel,
  isBlossomPiece,
  isPestEquipmentPiece,
  minimumGreenThumbLevel,
  pestEquipmentBaseBonusPestChance,
  pestEquipmentBaseCooldownReductionPct,
  pesthunterEradicatorFortune,
  rootedFortuneForPiece,
  rootedFortuneForPieces,
  thornyArmorBonusOverbloom,
  thornyBaseOverbloomForPieces,
  thornyFortuneForPieces,
  thornyPieceCount,
  squeakyBaseBonusPestChanceForPieces,
  squeakyCooldownReductionPct,
  squeakyFortuneForPieces,
} from '../src/equipment-fortune.js';

const piece = overrides => ({
  displayName: 'Blossom Necklace',
  rarity: 'LEGENDARY',
  reforge: 'rooted',
  enchantments: { green_thumb: 5 },
  ...(overrides || {}),
});

test('Blossom pieces are identified by exact cleaned equipment names', () => {
  assert.equal(isBlossomPiece(piece({ displayName: '§5Blossom Necklace' })), true);
  assert.equal(isBlossomPiece(piece({ displayName: 'Blossom Cloak' })), true);
  assert.equal(isBlossomPiece(piece({ displayName: 'Peony Necklace' })), false);
});

test('Blossom base fortune is seven per equipped Blossom piece', () => {
  const pieces = [
    piece({ displayName: 'Blossom Necklace' }),
    piece({ displayName: 'Blossom Cloak' }),
    piece({ displayName: 'Blossom Belt' }),
    piece({ displayName: 'Blossom Bracelet' }),
  ];
  assert.equal(blossomPieceCount(pieces), 4);
  assert.equal(blossomBaseFortune(pieces), 28);
});

test('Pesthunter equipment and Pest Vest expose their direct BPC and additive cooldown reduction', () => {
  const pieces = [
    piece({ skyblockId: 'PESTHUNTERS_NECKLACE', displayName: "Pesthunter's Necklace", rarity: 'RARE', reforge: null }),
    piece({ skyblockId: 'PEST_VEST', displayName: 'Pest Vest', rarity: 'EPIC', reforge: null }),
    piece({ skyblockId: 'PESTHUNTERS_BELT', displayName: "Pesthunter's Belt", rarity: 'RARE', reforge: null }),
    piece({ skyblockId: 'PESTHUNTERS_GLOVES', displayName: "Pesthunter's Gloves", rarity: 'RARE', reforge: null }),
  ];
  assert.ok(pieces.every(isPestEquipmentPiece));
  assert.equal(pestEquipmentBaseBonusPestChance(pieces), 25);
  assert.equal(pestEquipmentBaseCooldownReductionPct(pieces), 45);
  assert.equal(pesthunterEradicatorFortune(pieces), 75, 'Pest Vest replaces the fourth Pesthunter piece');
});

test('Squeaky scales FF/BPC by effective rarity and adds 2.5% cooldown reduction per piece', () => {
  const pieces = [
    piece({ skyblockId: 'PESTHUNTERS_NECKLACE', rarity: 'RARE', recombobulated: true, reforge: 'squeaky' }),
    piece({ skyblockId: 'PEST_VEST', rarity: 'EPIC', recombobulated: true, reforge: 'squeaky' }),
    piece({ skyblockId: 'PESTHUNTERS_BELT', rarity: 'RARE', recombobulated: true, reforge: 'squeaky' }),
    piece({ skyblockId: 'PESTHUNTERS_GLOVES', rarity: 'RARE', recombobulated: true, reforge: 'squeaky' }),
  ];
  assert.equal(squeakyFortuneForPieces(pieces), 34);
  assert.equal(squeakyBaseBonusPestChanceForPieces(pieces), 6.5);
  assert.equal(squeakyCooldownReductionPct(pieces), 10);
});

test('Eradicator follows the current Pesthunter piece-count tiers', () => {
  const pesthunter = Array.from({ length: 4 }, (_, index) =>
    piece({ skyblockId: ['PESTHUNTERS_NECKLACE', 'PESTHUNTERS_CLOAK', 'PESTHUNTERS_BELT', 'PESTHUNTERS_GLOVES'][index] }));
  assert.equal(pesthunterEradicatorFortune(pesthunter.slice(0, 1)), 0);
  assert.equal(pesthunterEradicatorFortune(pesthunter.slice(0, 2)), 50);
  assert.equal(pesthunterEradicatorFortune(pesthunter.slice(0, 3)), 75);
  assert.equal(pesthunterEradicatorFortune(pesthunter), 100);
});

test('Rooted fortune is derived from each effective item rarity', () => {
  assert.equal(rootedFortuneForPiece(piece({ rarity: 'EPIC' })), 15);
  assert.equal(rootedFortuneForPiece(piece({ rarity: 'LEGENDARY' })), 18);
  assert.equal(rootedFortuneForPiece(piece({ rarity: 'MYTHIC' })), 21);
  assert.equal(rootedFortuneForPiece(piece({ rarity: 'LEGENDARY', recombobulated: true })), 21, 'base Legendary + Recombobulator is Mythic for Rooted');
  assert.equal(rootedFortuneForPiece(piece({ rarity: 'LEGENDARY', reforge: 'blooming' })), 0);
  assert.equal(rootedFortuneForPieces([
    piece({ rarity: 'EPIC' }),
    piece({ rarity: 'LEGENDARY' }),
    piece({ rarity: 'MYTHIC' }),
    piece({ rarity: 'LEGENDARY' }),
  ]), 72);
});

test('Thorny sums item-local Farming Fortune and base Overbloom', () => {
  const pieces = [
    piece({ rarity: 'EPIC', reforge: 'thorny' }),
    piece({ rarity: 'LEGENDARY', reforge: 'thorny' }),
    piece({ rarity: 'MYTHIC', reforge: 'thorny' }),
    piece({ rarity: 'LEGENDARY', reforge: 'rooted' }),
  ];
  assert.equal(thornyPieceCount(pieces), 3);
  assert.equal(thornyFortuneForPieces(pieces), 30);
  assert.equal(thornyBaseOverbloomForPieces(pieces), 3.75);
});

test('each Thorny equipment piece receives the armor-Thorns Overbloom bonus', () => {
  const pieces = Array.from({ length: 4 }, () => piece({ rarity: 'MYTHIC', reforge: 'thorny' }));
  assert.equal(thornyArmorBonusOverbloom(pieces, 17), 6.8);
  assert.equal(thornyArmorBonusOverbloom(pieces, 16), 6.4);
});

test('Green Thumb sums actual levels across equipped pieces', () => {
  const pieces = [
    piece({ enchantments: { green_thumb: 5 } }),
    piece({ enchantments: { green_thumb: 4 } }),
    piece({ enchantments: { green_thumb: 2 } }),
    piece({ enchantments: {} }),
  ];
  assert.equal(greenThumbTotalLevel(pieces), 11);
  assert.equal(greenThumbFortune(pieces, 140), 77);
  assert.equal(greenThumbMarginalPerLevel(140), 7);
});

test('Green Thumb refuses an unknown visitor count instead of guessing', () => {
  assert.equal(greenThumbFortune([piece()], null), null);
  assert.equal(greenThumbMarginalPerLevel(undefined), null);
});

test('Green Thumb detection records the minimum level across a complete enchanted set', () => {
  assert.equal(minimumGreenThumbLevel([
    piece({ enchantments: { green_thumb: 5 } }),
    piece({ enchantments: { green_thumb: 4 } }),
    piece({ enchantments: { green_thumb: 5 } }),
    piece({ enchantments: { green_thumb: 3 } }),
  ]), 3);
  assert.equal(minimumGreenThumbLevel([
    piece({ enchantments: { green_thumb: 5 } }),
    piece({ enchantments: {} }),
  ]), 0);
});
