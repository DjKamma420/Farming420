import assert from 'node:assert/strict';
import test from 'node:test';

import {
  EQUIPMENT_FORTUNE_FACTS,
  EQUIPMENT_FORTUNE_VERIFIED,
  ROOTED_FORTUNE_BY_RARITY,
} from '../research/equipment-fortune.js';

test('equipment fortune verification is current', () => {
  assert.equal(EQUIPMENT_FORTUNE_VERIFIED, '2026-09-16');
  assert.ok(EQUIPMENT_FORTUNE_FACTS.every(fact => fact.lastVerified === EQUIPMENT_FORTUNE_VERIFIED));
});

test('Rooted rarity scaling stays pinned to the verified table', () => {
  assert.deepEqual(ROOTED_FORTUNE_BY_RARITY, {
    COMMON: 6,
    UNCOMMON: 9,
    RARE: 12,
    EPIC: 15,
    LEGENDARY: 18,
    MYTHIC: 21,
  });
});
