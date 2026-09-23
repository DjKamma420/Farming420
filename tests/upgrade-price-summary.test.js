import assert from 'node:assert/strict';
import test from 'node:test';
import { upgradePriceSummary } from '../src/upgrade-price-summary.js';

function market(prices) {
  return (id, targetLevel) => {
    const key = `${id}:${targetLevel ?? 'unit'}`;
    const coins = prices[key];
    return coins == null
      ? { complete: false, coins: null }
      : { complete: true, coins };
  };
}

test('shards expose unit value, owned-equivalent value and exact remaining cost to max', () => {
  const id = 'attribute-shard-cricket-pest-fortune';
  const summary = upgradePriceSummary(
    { levels: { [id]: 7 }, owned: { [id]: true } },
    { id, max: 10 },
    {
      resolveMarket: market({
        [`${id}:unit`]: 100_000,
        [`${id}:8`]: 800_000,
        [`${id}:9`]: 1_200_000,
        [`${id}:10`]: 1_600_000,
      }),
      resolveCost: () => ({ acquisitionMode: 'UNKNOWN', coins: 0 }),
    },
  );

  assert.equal(summary.shardCountOwned, 28);
  assert.equal(summary.currentShardValueCoins, 2_800_000);
  assert.equal(summary.shardCountToMax, 36);
  assert.equal(summary.nextCostCoins, 800_000);
  assert.equal(summary.costToMaxCoins, 3_600_000);
  assert.equal(summary.costToMaxComplete, true);
});

test('cost-to-max freshness uses the oldest market component timestamp', () => {
  const id = 'attribute-shard-cricket-pest-fortune';
  const summary = upgradePriceSummary(
    { levels: { [id]: 7 }, owned: { [id]: true } },
    { id, max: 10 },
    {
      resolveMarket: (_id, targetLevel) => {
        if (targetLevel == null) return { complete: true, coins: 100_000, computedAtMs: 4_000 };
        const rows = {
          8: { coins: 800_000, computedAtMs: 3_000 },
          9: { coins: 1_200_000, computedAtMs: 1_000 },
          10: { coins: 1_600_000, computedAtMs: 2_000 },
        };
        return { complete: true, ...rows[targetLevel] };
      },
      resolveCost: () => ({ acquisitionMode: 'UNKNOWN', coins: 0 }),
    },
  );

  assert.equal(summary.entryMarketComputedAtMs, 4_000);
  assert.equal(summary.nextCostComputedAtMs, 3_000);
  assert.equal(summary.costToMaxComputedAtMs, 1_000);
});

test('maxed rows have zero remaining cost without pretending their current value is zero', () => {
  const id = 'attribute-shard-galaxy-fish-shard';
  const summary = upgradePriceSummary(
    { levels: { [id]: 10 }, owned: { [id]: true } },
    { id, max: 10 },
    {
      resolveMarket: market({ [`${id}:unit`]: 2_000_000 }),
      resolveCost: () => ({ acquisitionMode: 'UNKNOWN', coins: 0 }),
    },
  );
  assert.equal(summary.costToMaxCoins, 0);
  assert.equal(summary.shardCountOwned, 24);
  assert.equal(summary.currentShardValueCoins, 48_000_000);
});

test('a partial multi-level row without researched step routes stays unknown to max', () => {
  const summary = upgradePriceSummary(
    { levels: { custom: 2 }, owned: { custom: true } },
    { id: 'custom', max: 5 },
    {
      resolveMarket: () => ({ complete: false, coins: null }),
      resolveCost: () => ({ acquisitionMode: 'UNKNOWN', coins: 0 }),
    },
  );
  assert.equal(summary.costToMaxComplete, false);
  assert.equal(summary.costToMaxCoins, null);
});

test('single-level buyable rows use their complete market acquisition route', () => {
  const summary = upgradePriceSummary(
    { levels: {}, owned: {} },
    { id: 'single', max: 1 },
    {
      resolveMarket: (_id, target) => target == null
        ? { complete: true, coins: 7_500_000 }
        : { complete: false, coins: null },
      resolveCost: () => ({ acquisitionMode: 'BUYABLE', coins: 7_500_000 }),
    },
  );
  assert.equal(summary.nextCostCoins, 7_500_000);
  assert.equal(summary.costToMaxCoins, 7_500_000);
  assert.equal(summary.costToMaxComplete, true);
});
