import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateUpgrade, rankEvaluatedUpgrades, statDeltas } from '../src/revenue-ranking.js';

test('statDeltas keeps Farming Fortune and Overbloom separate', () => {
  assert.deepEqual(statDeltas({ metric: 'Crop Yield' }, 5), {
    deltaFortune: 5,
    deltaOverbloom: 0,
    modeled: 'fortune',
  });
  assert.deepEqual(statDeltas({ metric: 'Overbloom / Visitor Cooldown' }, 3), {
    deltaFortune: 0,
    deltaOverbloom: 3,
    modeled: 'overbloom',
  });
});

test('Overbloom value depends on the rare crop revenue stream', () => {
  const noRareRevenue = evaluateUpgrade({
    item: { metric: 'Overbloom' },
    gain: 5,
    currentFortune: 1000,
    currentOverbloom: 100,
    normalCropCoinsPerHour: 20_000_000,
    rareCropCoinsPerHour: 0,
  });
  const richRareRevenue = evaluateUpgrade({
    item: { metric: 'Overbloom' },
    gain: 5,
    currentFortune: 1000,
    currentOverbloom: 100,
    normalCropCoinsPerHour: 20_000_000,
    rareCropCoinsPerHour: 10_000_000,
  });
  assert.equal(noRareRevenue.fortuneEquivalent, 0);
  assert.ok(richRareRevenue.fortuneEquivalent > 0);
  assert.ok(richRareRevenue.marginalCoinsHour > noRareRevenue.marginalCoinsHour);
});

test('known-cost upgrades rank by shortest payback before unknown-cost rows', () => {
  const rows = rankEvaluatedUpgrades([
    { item: { name: 'Unknown cost' }, payback: null, marginalCoinsHour: 2_000_000, fortuneEquivalent: 20 },
    { item: { name: 'Slow' }, payback: 10, marginalCoinsHour: 500_000, fortuneEquivalent: 10 },
    { item: { name: 'Fast' }, payback: 2, marginalCoinsHour: 250_000, fortuneEquivalent: 5 },
  ]);
  assert.deepEqual(rows.map(row => row.item.name), ['Fast', 'Slow', 'Unknown cost']);
});

test('without economics the model does not fabricate marginal coins', () => {
  const row = evaluateUpgrade({
    item: { metric: 'Crop Yield' },
    gain: 5,
    costCoins: 1_000_000,
    currentFortune: 1000,
  });
  assert.equal(row.economicsReady, false);
  assert.equal(row.marginalCoinsHour, null);
  assert.equal(row.payback, null);
  assert.equal(row.fortuneEquivalent, 5);
});

test('EARNED route stays unknown until active grind time is explicitly entered', () => {
  const row = evaluateUpgrade({
    item: { metric: 'Crop Yield' },
    gain: 10,
    acquisitionMode: 'EARNED',
    normalCropCoinsPerHour: 10_000_000,
  });
  assert.equal(row.acquisitionMode, 'EARNED');
  assert.equal(row.costKnown, false);
  assert.equal(row.cost, 0);
  assert.equal(row.activeGrindHours, null);
  assert.equal(row.payback, null);
  assert.equal(row.coinsPerEffectiveFortune, null);
});

test('EARNED route converts entered active time into opportunity cost', () => {
  const row = evaluateUpgrade({
    item: { metric: 'Crop Yield' },
    gain: 100,
    acquisitionMode: 'EARNED',
    activeGrindHours: 2,
    timeValueCoinsPerHour: 20_000_000,
    timeValueSource: 'internet_benchmark',
    normalCropCoinsPerHour: 1_000_000,
  });
  assert.equal(row.costKnown, true);
  assert.equal(row.cost, 40_000_000);
  assert.equal(row.marginalCoinsHour, 1_000_000);
  assert.equal(row.payback, 40);
  assert.equal(row.timeValueSource, 'internet_benchmark');
});

test('player-specific time value changes EARNED ranking cost without changing the stat gain', () => {
  const common = {
    item: { metric: 'Crop Yield' },
    gain: 10,
    acquisitionMode: 'EARNED',
    activeGrindHours: 2,
    normalCropCoinsPerHour: 20_000_000,
  };
  const fallback = evaluateUpgrade({ ...common, timeValueCoinsPerHour: 20_000_000 });
  const measured = evaluateUpgrade({ ...common, timeValueCoinsPerHour: 30_000_000, timeValueSource: 'player_baseline' });
  assert.equal(fallback.fortuneEquivalent, measured.fortuneEquivalent);
  assert.equal(fallback.cost, 40_000_000);
  assert.equal(measured.cost, 60_000_000);
  assert.ok(measured.payback > fallback.payback);
});
