import test from 'node:test';
import assert from 'node:assert/strict';

import {
  PLANNER_PROFIT_MODE,
  calculateObservedBaselineProfit,
  calculateSourceDrivenCropProfit,
  evaluateObservedBaselineUpgrade,
  evaluateSourceDrivenUpgrade,
} from '../src/planner-profit-adapter.js';

const fortuneUpgrade = { name: 'Fortune test', metric: 'Crop Yield', notes: '' };
const overbloomUpgrade = { name: 'Overbloom test', metric: 'Overbloom', notes: '' };

test('observed baseline is calibrated exactly at the current stats', () => {
  const result = calculateObservedBaselineProfit({
    normalCropCoinsPerHour: 1_000_000,
    rareCropCoinsPerHour: 200_000,
    currentFortune: 500,
    currentOverbloom: 100,
  });
  assert.equal(result.mode, PLANNER_PROFIT_MODE.OBSERVED_CALIBRATED);
  assert.equal(result.ready, true);
  assert.equal(result.complete, true);
  assert.ok(Math.abs(result.netCoinsPerHour - 1_200_000) < 1e-6);
});

test('observed Fortune upgrade only rescales the observed normal stream', () => {
  const evaluated = evaluateObservedBaselineUpgrade({
    baseline: {
      normalCropCoinsPerHour: 1_000_000,
      rareCropCoinsPerHour: 200_000,
      currentFortune: 500,
      currentOverbloom: 100,
    },
    item: fortuneUpgrade,
    gain: 100,
    costCoins: 10_000_000,
  });
  assert.equal(evaluated.modeled, 'fortune');
  assert.ok(Math.abs(evaluated.before.netCoinsPerHour - 1_200_000) < 1e-6);
  assert.ok(Math.abs(evaluated.transition.profitDeltaPerHour - (1_000_000 / 6)) < 1e-6);
  assert.ok(Math.abs(evaluated.transition.paybackHours - 60) < 1e-6);
});

test('observed Overbloom upgrade only rescales the observed rare stream', () => {
  const evaluated = evaluateObservedBaselineUpgrade({
    baseline: {
      normalCropCoinsPerHour: 1_000_000,
      rareCropCoinsPerHour: 200_000,
      currentFortune: 500,
      currentOverbloom: 100,
    },
    item: overbloomUpgrade,
    gain: 20,
    costCoins: 1_000_000,
  });
  assert.equal(evaluated.modeled, 'overbloom');
  assert.ok(Math.abs(evaluated.transition.profitDeltaPerHour - 20_000) < 1e-6);
  assert.ok(Math.abs(evaluated.transition.paybackHours - 50) < 1e-6);
});

test('missing current stats stay missing in observed calibration', () => {
  const result = calculateObservedBaselineProfit({ normalCropCoinsPerHour: 1_000_000 });
  assert.equal(result.ready, true);
  assert.equal(result.complete, false);
  assert.equal(result.netCoinsPerHour, null);
  assert.ok(result.missing.some(row => row.path === 'currentFortune'));
});

test('no observed baseline is not a complete zero-profit model', () => {
  const result = calculateObservedBaselineProfit({ currentFortune: 500, currentOverbloom: 100 });
  assert.equal(result.ready, false);
  assert.equal(result.complete, false);
  assert.equal(result.netCoinsPerHour, null);
});

test('unknown acquisition cost never becomes instant zero-hour payback', () => {
  const evaluated = evaluateObservedBaselineUpgrade({
    baseline: { normalCropCoinsPerHour: 1_000_000, currentFortune: 500 },
    item: fortuneUpgrade,
    gain: 100,
    costCoins: null,
  });
  assert.equal(evaluated.transition.costKnown, false);
  assert.equal(evaluated.transition.cashRequiredCoins, null);
  assert.equal(evaluated.transition.paybackHours, null);
});

test('verified Pumpkin source model computes through the generic profit engine', () => {
  const result = calculateSourceDrivenCropProfit({
    cropId: 'pumpkin',
    stats: { farmingFortune: 50, cropFortune: 50 },
    breaksPerSecond: 20,
    baseFarmingUptimeRatio: 0.9,
    cropUnitValueCoins: 2,
  });
  assert.equal(result.mode, PLANNER_PROFIT_MODE.SOURCE_DRIVEN);
  assert.equal(result.cropDataStatus, 'VERIFIED');
  assert.equal(result.complete, true);
  assert.equal(result.throughput.validBreaksPerHour, 64_800);
  assert.equal(result.netCoinsPerHour, 259_200);
});

test('unverified Wheat base output remains incomplete instead of borrowing a vanilla constant', () => {
  const result = calculateSourceDrivenCropProfit({
    cropId: 'wheat',
    stats: { farmingFortune: 50, cropFortune: 50 },
    breaksPerSecond: 20,
    baseFarmingUptimeRatio: 0.9,
    cropUnitValueCoins: 2,
  });
  assert.equal(result.cropDataStatus, 'VERIFY');
  assert.equal(result.complete, false);
  assert.equal(result.netCoinsPerHour, null);
  assert.ok(result.missing.some(row => row.path.includes('baseUnitsPerBreak')));
});

test('source-driven upgrade compares complete before and after engine states', () => {
  const evaluated = evaluateSourceDrivenUpgrade({
    baseline: {
      cropId: 'pumpkin',
      stats: { farmingFortune: 50, cropFortune: 50 },
      breaksPerSecond: 20,
      baseFarmingUptimeRatio: 1,
      cropUnitValueCoins: 2,
    },
    item: fortuneUpgrade,
    gain: 50,
    costCoins: 1_000_000,
  });
  assert.equal(evaluated.before.complete, true);
  assert.equal(evaluated.after.complete, true);
  assert.equal(evaluated.transition.complete, true);
  assert.equal(evaluated.transition.profitDeltaPerHour, 72_000);
  assert.ok(Math.abs(evaluated.transition.paybackHours - (1_000_000 / 72_000)) < 1e-9);
});
