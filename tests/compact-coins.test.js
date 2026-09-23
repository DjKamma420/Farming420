import assert from 'node:assert/strict';
import test from 'node:test';
import { compactCoinNumber, formatApproxCoins } from '../src/compact-coins.js';

test('coin values use compact k/m/b suffixes', () => {
  assert.equal(compactCoinNumber(999), '999');
  assert.equal(compactCoinNumber(1_000), '1k');
  assert.equal(compactCoinNumber(12_500), '12.5k');
  assert.equal(compactCoinNumber(1_250_000), '1.25m');
  assert.equal(compactCoinNumber(125_000_000), '125m');
  assert.equal(compactCoinNumber(1_250_000_000), '1.25b');
  assert.equal(formatApproxCoins(1_250_000), '~1.25m Coins');
});

test('invalid values remain unavailable instead of becoming zero coins', () => {
  assert.equal(compactCoinNumber(null), null);
  assert.equal(compactCoinNumber(undefined), null);
  assert.equal(compactCoinNumber(Number.NaN), null);
});
