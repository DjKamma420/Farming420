import assert from 'node:assert/strict';
import test from 'node:test';

import {
  blossomBaseFortune,
  blossomPieceCount,
  greenThumbFortune,
  greenThumbMarginalPerLevel,
  greenThumbTotalLevel,
  isBlossomPiece,
  minimumGreenThumbLevel,
  rootedFortuneForPiece,
  rootedFortuneForPieces,
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
