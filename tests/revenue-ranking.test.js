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
