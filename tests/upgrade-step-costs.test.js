import test from 'node:test';
import assert from 'node:assert/strict';
import { UPGRADES } from '../src/data.js';
import { UPGRADE_STEP_COSTS, stepCostForUpgrade } from '../src/upgrade-step-costs.js';
import { resolveUpgradeCost } from '../src/upgrade-cost-resolution.js';
import {
  MARKET_AVERAGE_MODEL_VERSION,
  MARKET_KIND,
  MARKET_SIDE,
  writeCachedMarketAverage,
} from '../src/market-average-prices.js';

function storeFor(id, level = 0, extra = {}) {
  return {
    levels: level > 0 ? { [id]: level } : {},
    owned: {},
    costs: {},
    ...extra,
  };
}

async function withStorage(run) {
  const map = new Map();
  const previous = globalThis.localStorage;
  globalThis.localStorage = {
    getItem: key => map.has(key) ? map.get(key) : null,
    setItem: (key, value) => map.set(key, String(value)),
    removeItem: key => map.delete(key),
  };
  try {
    return await run();
  } finally {
    globalThis.localStorage = previous;
  }
}

function cacheBazaar(itemTag, coinsPerUnit) {
  const now = Date.now();
  writeCachedMarketAverage({
    version: MARKET_AVERAGE_MODEL_VERSION,
    source: 'skycofl-90d',
    market: MARKET_KIND.BAZAAR,
    side: MARKET_SIDE.ACQUIRE,
    itemTag,
    coinsPerUnit,
    sampleCount: 90,
    windowDays: 90,
    windowStartMs: now - 90 * 24 * 60 * 60 * 1000,
    windowEndMs: now,
    computedAtMs: now,
    attributionUrl: 'https://sky.coflnet.com/data',
  });
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

test('priced research steps retain provenance and earned steps never masquerade as free', () => {
  for (const [id, model] of Object.entries(UPGRADE_STEP_COSTS)) {
    for (const [target, step] of Object.entries(model.steps)) {
      if (step.unit === 'coins') {
        assert.ok(Number(step.coins) > 0, `${id} target ${target} has no positive researched snapshot`);
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

test('Dedication resolves the incremental legal route from 90-day market averages', async () => {
  await withStorage(async () => {
    cacheBazaar('ENCHANTMENT_DEDICATION_1', 100);
    cacheBazaar('ENCHANTMENT_DEDICATION_2', 150);
    cacheBazaar('ENCHANTMENT_DEDICATION_4', 1_000);

    const expected = [100, 100, 150, 1_000];
    for (let current = 0; current < expected.length; current += 1) {
      const resolved = resolveUpgradeCost(storeFor('tool-enchant-dedication', current), 'tool-enchant-dedication');
      assert.equal(resolved.acquisitionMode, 'BUYABLE');
      assert.equal(resolved.origin, 'market-average');
      assert.equal(resolved.currentLevel, current);
      assert.equal(resolved.targetLevel, current + 1);
      assert.equal(resolved.coins, expected[current]);
    }
  });
});

test('Cultivating I is market-buyable but II-X are earned progression', async () => {
  await withStorage(async () => {
    const id = 'tool-enchant-cultivating-x';
    cacheBazaar('ENCHANTMENT_CULTIVATING_1', 4_500_000);

    const first = resolveUpgradeCost(storeFor(id, 0), id);
    assert.equal(first.acquisitionMode, 'BUYABLE');
    assert.equal(first.origin, 'market-average');
    assert.equal(first.coins, 4_500_000);
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
});

test('permanent stacks charge one additional 90-day-priced consumable, not the five-stack total', async () => {
  await withStorage(async () => {
    const cases = [
      ['chocolate-factory-refined-dark-cacao-permanent-bonus', 'REFINED_DARK_CACOA_TRUFFLE', 310_000],
      ['consumable-rosewater-flask-permanent-stacks', 'FILLED_ROSEWATER_FLASK', 9_500_000],
      ['consumable-feast-burger-permanent-overbloom', 'FEAST_BURGER', 8_750_000],
    ];
    for (const [id, itemTag, perStep] of cases) {
      cacheBazaar(itemTag, perStep);
      const start = resolveUpgradeCost(storeFor(id, 0), id);
      const fourth = resolveUpgradeCost(storeFor(id, 3), id);
      assert.equal(start.acquisitionMode, 'BUYABLE', id);
      assert.equal(start.origin, 'market-average', id);
      assert.equal(start.coins, perStep, id);
      assert.equal(fourth.coins, perStep, id);
      assert.equal(fourth.targetLevel, 4, id);
    }
  });
});

test('already researched tool modifiers have reachable 90-day next-step prices', async () => {
  await withStorage(async () => {
    const cases = [
      ['tool-farming-for-dummies', 'FARMING_FOR_DUMMIES', 290_000],
      ['tool-overclocker-3000', 'OVERCLOCKER_3000', 245_000],
      ['tool-recombobulator-effect-on-tool-stats', 'RECOMBOBULATOR_3000', 10_000_000],
    ];
    for (const [id, itemTag, coins] of cases) {
      cacheBazaar(itemTag, coins);
      const resolved = resolveUpgradeCost(storeFor(id, 0), id);
      assert.equal(resolved.acquisitionMode, 'BUYABLE', id);
      assert.equal(resolved.origin, 'market-average', id);
      assert.equal(resolved.coins, coins, id);
      assert.equal(resolved.targetLevel, 1, id);
    }
  });
});

test('a step-aware row beyond its researched target range stays unknown instead of falling back to a full-build price', () => {
  const id = 'tool-enchant-dedication';
  const resolved = resolveUpgradeCost(storeFor(id, 4), id);
  assert.equal(resolved.acquisitionMode, 'UNKNOWN');
  assert.equal(resolved.coins, 0);
  assert.equal(resolved.targetLevel, 5);
  assert.match(resolved.reason, /no researched next-step route/);
});

test('step lookup rejects invalid targets', () => {
  assert.equal(stepCostForUpgrade('tool-enchant-dedication', 0), null);
  assert.equal(stepCostForUpgrade('tool-enchant-dedication', 1.5), null);
  assert.equal(stepCostForUpgrade('not-an-upgrade', 1), null);
});
