import test from 'node:test';
import assert from 'node:assert/strict';

import {
  DROP_SCALING,
  calculateFarmingProfit,
  evaluateProfitTransition,
} from '../src/profit-engine.js';

test('normal crop stream applies combined Farming and Crop Fortune', () => {
  const result = calculateFarmingProfit({
    throughput: { breaksPerSecond: 10, baseFarmingUptimeRatio: 1 },
    stats: { farmingFortune: 100, cropFortune: 50 },
    normalDrops: [{
      id: 'crop',
      baseUnitsPerBreak: 1,
      unitValueCoins: 2,
      scaling: DROP_SCALING.COMBINED_FORTUNE,
    }],
  });

  assert.equal(result.complete, true);
  assert.equal(result.throughput.validBreaksPerHour, 36_000);
  assert.equal(result.streams[0].expectedUnitsPerHour, 90_000);
  assert.equal(result.netCoinsPerHour, 180_000);
});

test('rare crop stream applies Overbloom only to its explicit probability stream', () => {
  const result = calculateFarmingProfit({
    throughput: { breaksPerSecond: 5, baseFarmingUptimeRatio: 1 },
    stats: { farmingFortune: 500, overbloom: 100 },
    rareDrops: [{
      id: 'rare',
      baseProbability: 0.001,
      rollsPerBreak: 1,
      expectedQuantity: 1,
      unitValueCoins: 10_000,
      scaling: DROP_SCALING.OVERBLOOM,
    }],
  });

  assert.equal(result.complete, true);
  assert.equal(result.streams[0].effectiveProbability, 0.002);
  assert.equal(result.streams[0].expectedUnitsPerHour, 36);
  assert.equal(result.netCoinsPerHour, 360_000);
});

test('per-break pest spawns feed back into farming uptime instead of becoming free extra loot', () => {
  const result = calculateFarmingProfit({
    throughput: { breaksPerSecond: 10, baseFarmingUptimeRatio: 1 },
    stats: {},
    pest: {
      expectedPestsPerBreak: 0.001,
      handlingSecondsPerPest: 20,
      drops: [{
        id: 'guaranteed',
        baseProbability: 1,
        rollsPerPest: 1,
        expectedQuantity: 1,
        unitValueCoins: 100,
        scaling: DROP_SCALING.NONE,
      }],
    },
    normalDrops: [{
      id: 'crop',
      baseUnitsPerBreak: 1,
      unitValueCoins: 1,
      scaling: DROP_SCALING.NONE,
    }],
  });

  assert.equal(result.complete, true);
  assert.ok(result.throughput.validBreaksPerHour < 36_000);
  assert.ok(result.throughput.pestHandlingSecondsPerHour > 0);
  assert.equal(
    Math.round(result.throughput.effectiveFarmingSecondsPerHour + result.throughput.pestHandlingSecondsPerHour),
    3600,
  );
});

test('May-2026 style pest RNG can use pest Overbloom while base pest output uses Pest Fortune', () => {
  const result = calculateFarmingProfit({
    throughput: { breaksPerSecond: 10, baseFarmingUptimeRatio: 1 },
    stats: { pestFortune: 100, overbloom: 50, pestOverbloom: 50 },
    pest: {
      fixedPestsPerHour: 10,
      handlingSecondsPerPest: 0,
      drops: [
        {
          id: 'base',
          baseProbability: 0.1,
          rollsPerPest: 1,
          expectedQuantity: 1,
          unitValueCoins: 100,
          scaling: DROP_SCALING.PEST_FORTUNE,
        },
        {
          id: 'rng',
          baseProbability: 0.1,
          rollsPerPest: 1,
          expectedQuantity: 1,
          unitValueCoins: 100,
          scaling: DROP_SCALING.PEST_OVERBLOOM,
        },
      ],
    },
  });

  assert.equal(result.complete, true);
  assert.equal(result.streams.find(row => row.id === 'base').effectiveProbability, 0.2);
  assert.equal(result.streams.find(row => row.id === 'rng').effectiveProbability, 0.2);
});

test('missing mechanics stay incomplete instead of silently becoming zero', () => {
  const result = calculateFarmingProfit({
    throughput: { breaksPerSecond: 10, baseFarmingUptimeRatio: 1 },
    normalDrops: [{ id: 'crop', baseUnitsPerBreak: 1, unitValueCoins: 1 }],
  });

  assert.equal(result.complete, false);
  assert.equal(result.netCoinsPerHour, null);
  assert.equal(result.knownNetCoinsPerHour, 0);
  assert.match(result.missing[0].path, /scaling/);
});

test('recurring costs reduce known net profit', () => {
  const result = calculateFarmingProfit({
    throughput: { breaksPerSecond: 1, baseFarmingUptimeRatio: 1 },
    normalDrops: [{
      id: 'crop',
      baseUnitsPerBreak: 1,
      unitValueCoins: 10,
      scaling: DROP_SCALING.NONE,
    }],
    costsPerHour: [{ id: 'consumable', coinsPerHour: 5_000 }],
  });

  assert.equal(result.complete, true);
  assert.equal(result.grossCoinsPerHour, 36_000);
  assert.equal(result.netCoinsPerHour, 31_000);
});

test('transition uses complete before/after profit and recovered resale value', () => {
  const before = { complete: true, netCoinsPerHour: 1_000_000 };
  const after = { complete: true, netCoinsPerHour: 1_100_000 };
  const transition = evaluateProfitTransition({
    before,
    after,
    cost: {
      purchaseCostCoins: 10_000_000,
      applicationCostCoins: 1_000_000,
      expectedResaleRecoveredCoins: 2_000_000,
      activeGrindHours: 3,
      passiveWaitHours: 12,
    },
  });

  assert.equal(transition.profitDeltaPerHour, 100_000);
  assert.equal(transition.cashRequiredCoins, 11_000_000);
  assert.equal(transition.netAcquisitionCostCoins, 9_000_000);
  assert.equal(transition.paybackHours, 90);
  assert.equal(transition.activeGrindHours, 3);
  assert.equal(transition.passiveWaitHours, 12);
});
