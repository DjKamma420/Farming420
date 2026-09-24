import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const planner = readFileSync(new URL('../src/revenue-planner.js', import.meta.url), 'utf8');

test('planner maxing panel exposes freshness, section breakdown and concrete price gaps', () => {
  assert.match(planner, /marketAverageTimestampLabel/);
  assert.match(planner, /Show maxing breakdown and missing price data/);
  assert.match(planner, /Price gaps blocking an exact total/);
  assert.match(planner, /summary\.breakdown\.map/);
  assert.match(planner, /summary\.unknownPriceTargets\.slice/);
  assert.match(planner, /remainingUnknownPriceSteps/);
  assert.match(planner, /knownCostComputedAtMs/);
});

test('planner keeps unknown maxing prices explicit instead of presenting a false exact total', () => {
  assert.match(planner, /Price incomplete/);
  assert.match(planner, /≥ \$\{compactCoins\(summary\.knownCostCoins\)\} Coins/);
  assert.match(planner, /Unknown market routes stay visibly incomplete instead of being treated as free/);
});
