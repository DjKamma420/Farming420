import test from 'node:test';
import assert from 'node:assert/strict';

import { UPGRADES } from '../src/data.js';
import {
  PLANNER_UPGRADE_TARGET,
  plannerUpgradeTarget,
} from '../src/planner-upgrade-objective.js';

function byId(id) {
  return UPGRADES.find(item => item.id === id);
}

test('direct shard catalog includes current farming and Pest targets', () => {
  const expected = new Map([
    ['attribute-shard-fly-fortunate-farmer', PLANNER_UPGRADE_TARGET.FARMING_FORTUNE],
    ['attribute-shard-firefly-solar-power', PLANNER_UPGRADE_TARGET.FARMING_FORTUNE],
    ['attribute-shard-lunar-moth-lunar-power', PLANNER_UPGRADE_TARGET.FARMING_FORTUNE],
    ['attribute-shard-beetle-crop-bug', PLANNER_UPGRADE_TARGET.OVERBLOOM],
    ['attribute-shard-field-mouse-shard-pest-overbloom', PLANNER_UPGRADE_TARGET.OVERBLOOM],
    ['attribute-shard-cricket-pest-fortune', PLANNER_UPGRADE_TARGET.FARMING_FORTUNE],
    ['attribute-shard-keeled-slug-bonus-pest-chance', PLANNER_UPGRADE_TARGET.BONUS_PEST_CHANCE],
    ['attribute-shard-moth-pest-cooldown', PLANNER_UPGRADE_TARGET.PEST_COOLDOWN],
  ]);

  for (const [id, target] of expected) {
    const item = byId(id);
    assert.ok(item, id);
    assert.equal(item.section, 'shards', id);
    assert.equal(item.lastVerified, '2026-09-27', id);
    assert.equal(plannerUpgradeTarget(item), target, id);
  }
});

test('old combined day/night shard entry is gone', () => {
  assert.equal(byId('attribute-shard-firefly-or-lunar-moth-shard'), undefined);
});

test('unpriced farming-relevant shard mechanics remain visible but unranked', () => {
  for (const id of [
    'attribute-shard-praying-mantis-pest-ruler',
    'attribute-shard-rat-sprayonator-serendipity',
    'attribute-shard-cocoaleech-groovy-radar',
    'attribute-shard-locust-crop-speed',
    'attribute-shard-dragonfly-garden-wisdom',
  ]) {
    const item = byId(id);
    assert.ok(item, id);
    assert.deepEqual(item.plannerTargets, [], id);
    assert.equal(plannerUpgradeTarget(item), PLANNER_UPGRADE_TARGET.OTHER, id);
  }
});

test('Pesthunter and Freshly Baked progressions are real global calculator entries', () => {
  const pesthunter = byId('pest-pesthunter-accessory-bpc-setup');
  assert.equal(pesthunter.section, 'accessories');
  assert.equal(pesthunter.max, 4);
  assert.equal(pesthunter.stepGain, 20);
  assert.equal(plannerUpgradeTarget(pesthunter), PLANNER_UPGRADE_TARGET.BONUS_PEST_CHANCE);

  const freshly = byId('accessory-freshly-baked-overbloom');
  assert.equal(freshly.section, 'accessories');
  assert.equal(freshly.max, 5);
  assert.equal(freshly.stepGain, 1);
  assert.equal(plannerUpgradeTarget(freshly), PLANNER_UPGRADE_TARGET.OVERBLOOM);
});
