import assert from 'node:assert/strict';
import test from 'node:test';

import {
  EQUIPMENT_FORTUNE_FACTS,
  EQUIPMENT_FORTUNE_VERIFIED,
  GREEN_THUMB_FORTUNE_PER_LEVEL_PER_UNIQUE_VISITOR,
  ROOTED_FORTUNE_BY_RARITY,
  THORNY_FORTUNE_BY_RARITY,
  THORNY_OVERBLOOM_BY_RARITY,
  THORNY_OVERBLOOM_PER_ARMOR_THORNS_TIER,
} from '../research/equipment-fortune.js';

test('equipment fortune verification is current', () => {
  assert.equal(EQUIPMENT_FORTUNE_VERIFIED, '2026-09-18');
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

test('Thorny rarity scaling and armor-Thorns multiplier stay pinned', () => {
  assert.deepEqual(THORNY_FORTUNE_BY_RARITY, {
    COMMON: 2,
    UNCOMMON: 4,
    RARE: 6,
    EPIC: 8,
    LEGENDARY: 10,
    MYTHIC: 12,
  });
  assert.deepEqual(THORNY_OVERBLOOM_BY_RARITY, {
    COMMON: 0.25,
    UNCOMMON: 0.5,
    RARE: 0.75,
    EPIC: 1,
    LEGENDARY: 1.25,
    MYTHIC: 1.5,
  });
  assert.equal(THORNY_OVERBLOOM_PER_ARMOR_THORNS_TIER, 0.1);
});

test('Green Thumb stays at +0.05 FF per level per unique visitor', () => {
  assert.equal(GREEN_THUMB_FORTUNE_PER_LEVEL_PER_UNIQUE_VISITOR, 0.05);
  assert.ok(EQUIPMENT_FORTUNE_FACTS.some(fact => fact.id === 'green-thumb-unique-visitor-scaling'));
});
