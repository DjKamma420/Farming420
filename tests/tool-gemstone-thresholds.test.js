import assert from 'node:assert/strict';
import test from 'node:test';

import {
  normalizeToolGemstoneSlots,
  toolGemstoneFortune,
  toolGemstoneSlotCountForLevel,
} from '../src/gemstone-slots.js';

test('farming tool gemstone slot count follows current tool level', () => {
  for (const [level, expected] of [[1,1],[14,1],[15,2],[24,2],[25,3],[49,3],[50,4]]) {
    assert.equal(toolGemstoneSlotCountForLevel(level), expected, `level ${level}`);
  }
  assert.equal(toolGemstoneSlotCountForLevel(0), 1, 'the physical Mk I tool starts at level 1');
});

test('dormant future slots are excluded from active fortune', () => {
  const stored = [
    { unlocked: true, gem: 'PERFECT PERIDOT' },
    { unlocked: true, gem: 'PERFECT PERIDOT' },
    { unlocked: true, gem: 'PERFECT PERIDOT' },
    { unlocked: true, gem: 'PERFECT PERIDOT' },
  ];
  assert.equal(normalizeToolGemstoneSlots(stored, 1).length, 1);
  assert.equal(toolGemstoneFortune(stored, 'MYTHIC', 1), 10);
  assert.equal(toolGemstoneFortune(stored, 'MYTHIC', 2), 20);
  assert.equal(toolGemstoneFortune(stored, 'MYTHIC', 4), 40);
});
