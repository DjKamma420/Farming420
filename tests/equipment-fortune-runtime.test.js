import assert from 'node:assert/strict';
import test from 'node:test';

import {
  blossomBaseFortune,
  blossomPieceCount,
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

test('Rooted fortune is derived from each item rarity', () => {
  assert.equal(rootedFortuneForPiece(piece({ rarity: 'EPIC' })), 15);
  assert.equal(rootedFortuneForPiece(piece({ rarity: 'LEGENDARY' })), 18);
  assert.equal(rootedFortuneForPiece(piece({ rarity: 'MYTHIC' })), 21);
  assert.equal(rootedFortuneForPiece(piece({ rarity: 'LEGENDARY', reforge: 'blooming' })), 0);
  assert.equal(rootedFortuneForPieces([
    piece({ rarity: 'EPIC' }),
    piece({ rarity: 'LEGENDARY' }),
    piece({ rarity: 'MYTHIC' }),
    piece({ rarity: 'LEGENDARY' }),
  ]), 72);
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
