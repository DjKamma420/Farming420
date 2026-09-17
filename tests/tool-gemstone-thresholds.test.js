import assert from 'node:assert/strict';
import test from 'node:test';

import {
  normalizeToolGemstoneSlots,
  toolGemstoneFortune,
  toolGemstoneSlotCount,
  toolGemstoneSlotCountForLevel,
} from '../src/gemstone-slots.js';

test('farming tool gemstone sockets unlock at the current tool-level thresholds', () => {
  for (const [level, expected] of [[0,0],[1,1],[14,1],[15,2],[24,2],[25,3],[49,3],[50,4]]) {
    assert.equal(toolGemstoneSlotCountForLevel(level), expected, `level ${level}`);
  }
});

test('Mk tier limits how many level-qualified sockets physically exist', () => {
  assert.equal(toolGemstoneSlotCount(50, 1), 1, 'Mk. I supports only the first Peridot socket');
  assert.equal(toolGemstoneSlotCount(50, 2), 3, 'Mk. II supports the first three Peridot sockets');
  assert.equal(toolGemstoneSlotCount(50, 3), 4, 'Mk. III supports all four Peridot sockets');
  assert.equal(toolGemstoneSlotCount(15, 3), 2, 'tier never bypasses the level requirement');
  assert.equal(toolGemstoneSlotCount(1, 1), 1, 'the first socket exists from tool level 1');
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
