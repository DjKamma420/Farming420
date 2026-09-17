import assert from 'node:assert/strict';
import test from 'node:test';

import {
  normalizeToolGemstoneSlots,
  toolGemstoneFortune,
  toolGemstoneSlotCount,
  toolGemstoneSlotCountForLevel,
} from '../src/gemstone-slots.js';

test('farming tool gemstone fallback follows current official levelable_lvl requirements', () => {
  for (const [level, expected] of [[0,0],[1,0],[4,0],[5,1],[14,1],[15,2],[24,2],[25,3],[49,3],[50,4]]) {
    assert.equal(toolGemstoneSlotCountForLevel(level), expected, `levelable_lvl ${level}`);
  }
});

test('Mk tier limits how many official physical sockets can become active', () => {
  assert.equal(toolGemstoneSlotCount(50, 1), 2, 'Mk. I item data carries the first two Peridot sockets');
  assert.equal(toolGemstoneSlotCount(50, 2), 3, 'Mk. II item data carries the first three Peridot sockets');
  assert.equal(toolGemstoneSlotCount(50, 3), 4, 'Mk. III item data carries all four Peridot sockets');
  assert.equal(toolGemstoneSlotCount(15, 3), 2, 'tier never bypasses the levelable_lvl requirement');
  assert.equal(toolGemstoneSlotCount(5, 1), 1, 'the first official socket requirement is levelable_lvl 5');
  assert.equal(toolGemstoneSlotCount(0, 3), 0, 'an unlevelled/unknown tool has no active socket');
});

test('dormant future sockets are excluded from active fortune', () => {
  const stored = [
    { unlocked: true, gem: 'PERFECT PERIDOT' },
    { unlocked: true, gem: 'PERFECT PERIDOT' },
    { unlocked: true, gem: 'PERFECT PERIDOT' },
    { unlocked: true, gem: 'PERFECT PERIDOT' },
  ];
  assert.equal(normalizeToolGemstoneSlots(stored, 0).length, 0);
  assert.equal(toolGemstoneFortune(stored, 'MYTHIC', 0), 0);
  assert.equal(toolGemstoneFortune(stored, 'MYTHIC', 1), 10);
  assert.equal(toolGemstoneFortune(stored, 'MYTHIC', 2), 20);
  assert.equal(toolGemstoneFortune(stored, 'MYTHIC', 4), 40);
});
