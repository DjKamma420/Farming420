import test from 'node:test';
import assert from 'node:assert/strict';
import {
  relativeFortuneGain,
  relativeOverbloomGain,
  marginalCoinsPerHour,
  overbloomToFortuneEquivalent,
  coinsPerEffectiveFortune,
  paybackHours,
} from '../src/effective-gain.js';

test('fortune and overbloom use their own current-stat denominator', () => {
  assert.equal(relativeFortuneGain(10, 900), 0.01);
  assert.equal(relativeOverbloomGain(10, 100), 0.05);
});

test('marginal coins combines normal and rare revenue streams', () => {
  const gain = marginalCoinsPerHour({
    deltaFortune: 10,
    deltaOverbloom: 10,
    currentFortune: 900,
    currentOverbloom: 100,
    normalCropCoinsPerHour: 20_000_000,
    rareCropCoinsPerHour: 4_000_000,
  });
  assert.equal(gain, 400_000);
});

test('overbloom FF equivalent is revenue-aware instead of fixed', () => {
  const equivalent = overbloomToFortuneEquivalent({
    deltaOverbloom: 1,
    currentFortune: 900,
    currentOverbloom: 100,
    normalCropCoinsPerHour: 20_000_000,
    rareCropCoinsPerHour: 4_000_000,
  });
  assert.equal(equivalent, 1);

  const rareHeavy = overbloomToFortuneEquivalent({
    deltaOverbloom: 1,
    currentFortune: 900,
    currentOverbloom: 100,
    normalCropCoinsPerHour: 10_000_000,
    rareCropCoinsPerHour: 10_000_000,
  });
  assert.equal(rareHeavy, 5);
});

test('undefined FF equivalent is represented as null with no normal revenue', () => {
  assert.equal(overbloomToFortuneEquivalent({ rareCropCoinsPerHour: 1_000_000 }), null);
});

test('cost efficiency helpers avoid divide-by-zero fake rankings', () => {
  assert.equal(coinsPerEffectiveFortune({ costCoins: 5_000_000, deltaFortuneEquivalent: 5 }), 1_000_000);
  assert.equal(coinsPerEffectiveFortune({ costCoins: 5_000_000, deltaFortuneEquivalent: 0 }), null);
  assert.equal(paybackHours({ costCoins: 10_000_000, marginalCoinsHour: 2_000_000 }), 5);
  assert.equal(paybackHours({ costCoins: 10_000_000, marginalCoinsHour: 0 }), null);
});
