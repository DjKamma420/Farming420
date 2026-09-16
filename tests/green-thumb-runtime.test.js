import assert from 'node:assert/strict';
import test from 'node:test';

import '../src/runtime-data-patches.js';
import { UPGRADES } from '../src/data.js';

test('Green Thumb is an active 20-level equipment progression', () => {
  const entry = UPGRADES.find(item => item.id === 'equipment-enchant-green-thumb-v-on-equipment');
  assert.ok(entry);
  assert.equal(entry.status, 'ACTIVE');
  assert.equal(entry.max, 20);
  assert.equal(entry.stepGain, 0);
  assert.match(entry.name, /Green Thumb on equipment/);
  assert.match(entry.notes, /0\.05 Farming Fortune per unique Garden visitor served/);
});
