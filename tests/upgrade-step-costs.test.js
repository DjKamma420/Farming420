import test from 'node:test';
import assert from 'node:assert/strict';
import { UPGRADES } from '../src/data.js';
import { UPGRADE_STEP_COSTS, stepCostForUpgrade } from '../src/upgrade-step-costs.js';
import { resolveUpgradeCost } from '../src/upgrade-cost-resolution.js';

function store(level = 0) {
  return { levels: level > 0 ? { target: level } : {}, owned: {}, costs: {} };
}

function storeFor(id, level = 0, extra = {}) {
  return {
    levels: level > 0 ? { [id]: level } : {},
    owned: {},
    costs: {},
    ...extra,
  };
}

test('every step-aware entry is a real upgrade and its targets are contiguous', () => {
  const known = new Set(UPGRADES.map(item => item.id));
  for (const [id, model] of Object.entries(UPGRADE_STEP_COSTS)) {
    assert.ok(known.has(id), `${id} is not in UPGRADES`);
    const targets = Object.keys(model.steps).map(Number).sort((a, b) => a - b);
    assert.ok(targets.length > 0, `${id} has no steps`);
    assert.deepEqual(targets, Array.from({ length: targets.at(-1) }, (_, index) => index + 1), `${id} has a target-level gap`);
  }
});

test('priced steps carry provenance and earned steps never masquerade as free', () => {
  for (const [id, model] of Object.entries(UPGRADE_STEP_COSTS)) {
    for (const [target, step] of Object.entries(model.steps)) {
      if (step.unit === 'coins') {
        assert.ok(Number(step.coins) > 0, `${id} target ${target} has no positive coin cost`);
        assert.ok(step.items?.length, `${id} target ${target} names no acquisition item`);
        assert.ok(step.sources?.length, `${id} target ${target} has no source`);
        assert.ok(step.verifiedAt, `${id} target ${target} has no verification date`);
      } else if (step.unit === 'time') {
        assert.equal(step.coins, null, `${id} target ${target} turns earned progression into zero coins`);
        assert.ok(step.reason, `${id} target ${target} does not explain its earned route`);
      } else {
        assert.fail(`${id} target ${target} has invalid unit ${step.unit}`);
      }
    }
  }
});

test('Dedication resolves the incremental legal cost of the next level', () => {
  const id = 'tool-enchant-dedication';
  const expected = [400_699, 400_699, 801_398, 52_832_483];
  for (let current = 0; current < expected.length; current += 1) {
    const resolved = resolveUpgradeCost(storeFor(id, current), id);
    assert.equal(resolved.acquisitionMode, 'BUYABLE');
    assert.equal(resolved.currentLevel, current);
    assert.equal(resolved.targetLevel, current + 1);
    assert.equal(resolved.coins, expected[current]);
  }
});

test('Cultivating I is buyable but II-X are earned progression', () => {
  const id = 'tool-enchant-cultivating-x';
  const first = resolveUpgradeCost(storeFor(id, 0), id);
  assert.equal(first.acquisitionMode, 'BUYABLE');
  assert.equal(first.coins, 4_469_104);
  assert.equal(first.targetLevel, 1);

  const second = resolveUpgradeCost(storeFor(id, 1), id);
  assert.equal(second.acquisitionMode, 'EARNED');
  assert.equal(second.coins, 0);
  assert.equal(second.targetLevel, 2);
  assert.equal(second.progressTarget, 1_000);

  const tenth = resolveUpgradeCost(storeFor(id, 9), id);
  assert.equal(tenth.acquisitionMode, 'EARNED');
  assert.equal(tenth.targetLevel, 10);
  assert.equal(tenth.progressTarget, 25_000_000);
});

test('permanent stacks charge one additional consumable, not the five-stack total', () => {
  const cases = [
    ['chocolate-factory-refined-dark-cacao-permanent-bonus', 314_153],
    ['consumable-rosewater-flask-permanent-stacks', 9_505_942],
    ['consumable-feast-burger-permanent-overbloom', 8_758_628],
  ];
  for (const [id, perStep] of cases) {
    const start = resolveUpgradeCost(storeFor(id, 0), id);
    const fourth = resolveUpgradeCost(storeFor(id, 3), id);
    assert.equal(start.coins, perStep, id);
    assert.equal(fourth.coins, perStep, id);
    assert.equal(fourth.targetLevel, 4, id);
  }
});

test('already researched tool modifiers now have a reachable next-step price', () => {
  const cases = [
    ['tool-farming-for-dummies', 291_201],
    ['tool-overclocker-3000', 244_434],
    ['tool-recombobulator-effect-on-tool-stats', 10_084_157],
  ];
  for (const [id, coins] of cases) {
    const resolved = resolveUpgradeCost(storeFor(id, 0), id);
    assert.equal(resolved.acquisitionMode, 'BUYABLE', id);
    assert.equal(resolved.origin, 'research', id);
    assert.equal(resolved.coins, coins, id);
    assert.equal(resolved.targetLevel, 1, id);
  }
});

test('a step-aware row beyond its researched target range stays unknown instead of falling back to a full-build price', () => {
  const id = 'tool-enchant-dedication';
  const resolved = resolveUpgradeCost(storeFor(id, 4), id);
  assert.equal(resolved.acquisitionMode, 'UNKNOWN');
  assert.equal(resolved.coins, 0);
  assert.equal(resolved.targetLevel, 5);
  assert.match(resolved.reason, /no researched next-step cost/);
});

test('step lookup rejects invalid targets', () => {
  assert.equal(stepCostForUpgrade('tool-enchant-dedication', 0), null);
  assert.equal(stepCostForUpgrade('tool-enchant-dedication', 1.5), null);
  assert.equal(stepCostForUpgrade('not-an-upgrade', 1), null);
});
