import test from 'node:test';
import assert from 'node:assert/strict';
import {
  INTERNET_FARMING_TIME_VALUE_COINS_PER_HOUR,
  buyableNetCost,
  earnedNetCost,
  recurringGainCoinsPerHour,
  paybackHoursFromCost,
  gainPerMillionCost,
  evaluateBuyableUpgrade,
  evaluateEarnedUpgrade,
} from '../src/upgrade-economics.js';

test('Internet fallback is the researched 20m coins/hour benchmark', () => {
  assert.equal(INTERNET_FARMING_TIME_VALUE_COINS_PER_HOUR, 20_000_000);
});

test('BUYABLE route subtracts proceeds from replaced assets', () => {
  assert.equal(buyableNetCost({
    purchasePriceCoins: 30_000_000,
    applicationFeesCoins: 2_000_000,
    consumedInputMarketValueCoins: 3_000_000,
    saleProceedsReplacedAssetsCoins: 10_000_000,
  }), 25_000_000);
});

test('BUYABLE route can release capital instead of clamping to zero', () => {
  assert.equal(buyableNetCost({
    purchasePriceCoins: 10_000_000,
    saleProceedsReplacedAssetsCoins: 15_000_000,
  }), -5_000_000);
});

test('EARNED route converts only active opportunity cost and credits incidental grind profit', () => {
  assert.equal(earnedNetCost({
    directCoinCost: 10_000_000,
    activeGrindHours: 5,
    timeValueCoinsPerHour: 20_000_000,
    incidentalGrindProfitCoinsPerHour: 4_000_000,
  }), 90_000_000);
});

test('EARNED time component never becomes negative', () => {
  assert.equal(earnedNetCost({
    activeGrindHours: 2,
    timeValueCoinsPerHour: 20_000_000,
    incidentalGrindProfitCoinsPerHour: 25_000_000,
  }), 0);
});

test('recurring gain is complete after minus before state', () => {
  assert.equal(recurringGainCoinsPerHour({
    beforeNetCoinsPerHour: 18_000_000,
    afterNetCoinsPerHour: 18_500_000,
  }), 500_000);
});

test('payback and per-million efficiency use the same economic delta', () => {
  assert.equal(paybackHoursFromCost({
    acquisitionCostCoins: 10_000_000,
    recurringGainCoinsPerHour: 500_000,
  }), 20);

  assert.equal(gainPerMillionCost({
    acquisitionCostCoins: 10_000_000,
    recurringGainCoinsPerHour: 500_000,
  }), 50_000);
});

test('non-positive gain has no fabricated payback', () => {
  assert.equal(paybackHoursFromCost({
    acquisitionCostCoins: 10_000_000,
    recurringGainCoinsPerHour: 0,
  }), null);
  assert.equal(gainPerMillionCost({
    acquisitionCostCoins: 10_000_000,
    recurringGainCoinsPerHour: -1,
  }), null);
});

test('capital-releasing positive upgrade has immediate economic payback', () => {
  assert.equal(paybackHoursFromCost({
    acquisitionCostCoins: -5_000_000,
    recurringGainCoinsPerHour: 100_000,
  }), 0);
});

test('evaluation objects keep acquisition route and earned-time label explicit', () => {
  const buyable = evaluateBuyableUpgrade({
    beforeNetCoinsPerHour: 20_000_000,
    afterNetCoinsPerHour: 21_000_000,
    purchasePriceCoins: 10_000_000,
  });
  assert.equal(buyable.acquisitionMode, 'BUYABLE');
  assert.equal(buyable.paybackHours, 10);

  const earned = evaluateEarnedUpgrade({
    beforeNetCoinsPerHour: 20_000_000,
    afterNetCoinsPerHour: 21_000_000,
    activeGrindHours: 2,
  });
  assert.equal(earned.acquisitionMode, 'EARNED');
  assert.equal(earned.costLabel, 'EARNED — time converted to coins');
  assert.equal(earned.acquisitionCostCoins, 40_000_000);
  assert.equal(earned.paybackHours, 40);
  assert.equal(earned.timeValueSource, 'internet_benchmark');
});
