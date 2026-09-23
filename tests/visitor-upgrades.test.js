import assert from 'node:assert/strict';
import test from 'node:test';

import '../src/runtime-data-patches.js';
import { UPGRADES } from '../src/data.js';
import { UPGRADE_FILTER, matchesUpgradeFilter } from '../src/planner-upgrade-filters.js';

test('Ladybug Pretty Clothes is a real Visitor upgrade in the live runtime data', () => {
  const row = UPGRADES.find(item => item.id === 'attribute-shard-ladybug-pretty-clothes');
  assert.ok(row);
  assert.equal(row.max, 10);
  assert.equal(row.stepGain, 1);
  assert.equal(row.metric, 'Visitor Copper');
  assert.equal(matchesUpgradeFilter(row, UPGRADE_FILTER.VISITOR), true);
});

test('Visitor-derived Farming Fortune rows remain outside the Visitor filter', () => {
  for (const id of [
    'equipment-blossom-set-visitor-bonus',
    'equipment-enchant-green-thumb-v-on-equipment',
  ]) {
    const row = UPGRADES.find(item => item.id === id);
    assert.ok(row, id);
    assert.equal(matchesUpgradeFilter(row, UPGRADE_FILTER.VISITOR), false, id);
  }
});
