import test from 'node:test';
import assert from 'node:assert/strict';

import { ACTIVITY_MODE } from '../src/activity-mode.js';
import {
  PLANNER_UPGRADE_TARGET,
  plannerUpgradeTarget,
  plannerUpgradeTargetEligible,
  plannerUpgradeTargetRole,
  plannerUpgradeValueText,
} from '../src/planner-upgrade-objective.js';

const farmingFortune = {
  name: 'Farming Fortune upgrade',
  metric: 'Crop Yield',
  modeScope: 'Any',
};

const bonusPestChance = {
  name: 'Vermin Vaporizer Chip',
  metric: 'Pest Spawn',
  modeScope: 'Pest Spawning',
  notes: '+5 Bonus Pest Chance per level.',
};

const pestCooldown = {
  name: 'Moth Shard - Pest Cooldown',
  attribute: 'Pest Cooldown',
  metric: 'Pest Spawn',
  modeScope: 'Pest Spawning',
  notes: 'Reduces the Pest spawn cooldown.',
};

const overbloom = {
  name: 'Overbloom upgrade',
  metric: 'Overbloom',
  modeScope: 'Any',
};

test('planner identifies the stat an upgrade actually improves', () => {
  assert.equal(plannerUpgradeTarget(farmingFortune), PLANNER_UPGRADE_TARGET.FARMING_FORTUNE);
  assert.equal(plannerUpgradeTarget(bonusPestChance), PLANNER_UPGRADE_TARGET.BONUS_PEST_CHANCE);
  assert.equal(plannerUpgradeTarget(pestCooldown), PLANNER_UPGRADE_TARGET.PEST_COOLDOWN);
  assert.equal(plannerUpgradeTarget(overbloom), PLANNER_UPGRADE_TARGET.OVERBLOOM);
});

test('Spawning treats BPC and cooldown as primary while Farming Fortune is secondary', () => {
  const bpcRole = plannerUpgradeTargetRole(bonusPestChance, ACTIVITY_MODE.PEST_SPAWN);
  const cooldownRole = plannerUpgradeTargetRole(pestCooldown, ACTIVITY_MODE.PEST_SPAWN);
  const fortuneRole = plannerUpgradeTargetRole(farmingFortune, ACTIVITY_MODE.PEST_SPAWN);

  assert.equal(bpcRole.tier, 'primary');
  assert.equal(cooldownRole.tier, 'primary');
  assert.equal(bpcRole.priority, cooldownRole.priority);
  assert.equal(fortuneRole.tier, 'secondary');
  assert.ok(fortuneRole.priority > bpcRole.priority);
});

test('Spawning excludes loot-only Overbloom from its upgrade objective set', () => {
  assert.equal(plannerUpgradeTargetEligible(bonusPestChance, ACTIVITY_MODE.PEST_SPAWN), true);
  assert.equal(plannerUpgradeTargetEligible(pestCooldown, ACTIVITY_MODE.PEST_SPAWN), true);
  assert.equal(plannerUpgradeTargetEligible(farmingFortune, ACTIVITY_MODE.PEST_SPAWN), true);
  assert.equal(plannerUpgradeTargetEligible(overbloom, ACTIVITY_MODE.PEST_SPAWN), false);
});

test('planner value text uses the target stat instead of relabelling everything as FF', () => {
  assert.equal(plannerUpgradeValueText(bonusPestChance, 5), '+5 BPC');
  assert.equal(plannerUpgradeValueText(pestCooldown, 0), 'Pest cooldown reduction');
  assert.equal(plannerUpgradeValueText(farmingFortune, 48), '+48 FF');
});
