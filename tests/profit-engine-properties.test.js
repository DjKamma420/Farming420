import test from 'node:test';
import assert from 'node:assert/strict';
import { DROP_SCALING, calculateFarmingProfit, evaluateProfitTransition } from '../src/profit-engine.js';

/**
 * Invariants, not examples.
 *
 * The example tests beside this file each pin one worked calculation, which is
 * the right way to check a formula but a poor way to find a bug: a wrong sign
 * or a dropped factor reproduces happily in the one case someone wrote down.
 * These assert properties that must hold for *every* input -- doubling prices
 * doubles revenue, more Fortune never earns less, an unknown never becomes a
 * number -- over a deterministic sweep of generated inputs.
 *
 * The generator is a seeded LCG rather than `Math.random`, so a failure names a
 * seed that reproduces it exactly instead of vanishing on the next run.
 */

function lcg(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

/** A complete, finite input: every field the engine needs is present. */
function makeInput(rand, overrides = {}) {
  const pick = (lo, hi) => lo + rand() * (hi - lo);
  return {
    throughput: { breaksPerSecond: pick(0.5, 20), baseFarmingUptimeRatio: pick(0.1, 1) },
    stats: {
      farmingFortune: Math.round(pick(0, 3000)),
      cropFortune: Math.round(pick(0, 2000)),
      overbloom: Math.round(pick(0, 500)),
    },
    normalDrops: [{
      id: 'crop',
      baseUnitsPerBreak: pick(0.5, 6),
      unitValueCoins: pick(0.1, 50),
      scaling: DROP_SCALING.COMBINED_FORTUNE,
    }],
    ...overrides,
  };
}

const SEEDS = [1, 7, 42, 1337, 90210, 2026, 555, 8675309];
const near = (a, b, tol = 1e-6) => Math.abs(a - b) <= tol * Math.max(1, Math.abs(a), Math.abs(b));

test('revenue is linear in unit price', () => {
  for (const seed of SEEDS) {
    const rand = lcg(seed);
    const base = makeInput(rand);
    const doubled = {
      ...base,
      normalDrops: base.normalDrops.map(d => ({ ...d, unitValueCoins: d.unitValueCoins * 2 })),
    };
    const a = calculateFarmingProfit(base);
    const b = calculateFarmingProfit(doubled);
    assert.ok(a.complete && b.complete, `seed ${seed}: input should be complete`);
    assert.ok(
      near(b.grossCoinsPerHour, a.grossCoinsPerHour * 2),
      `seed ${seed}: doubling price gave ${b.grossCoinsPerHour}, expected ${a.grossCoinsPerHour * 2}`,
    );
  }
});

test('more Fortune never earns less', () => {
  for (const seed of SEEDS) {
    const rand = lcg(seed);
    const base = makeInput(rand);
    let previous = -Infinity;
    for (const extra of [0, 1, 10, 100, 1000]) {
      const result = calculateFarmingProfit({
        ...base,
        stats: { ...base.stats, farmingFortune: base.stats.farmingFortune + extra },
      });
      assert.ok(
        result.grossCoinsPerHour >= previous,
        `seed ${seed}: +${extra} Fortune dropped revenue to ${result.grossCoinsPerHour}`,
      );
      previous = result.grossCoinsPerHour;
    }
  }
});

test('more throughput never earns less', () => {
  for (const seed of SEEDS) {
    const rand = lcg(seed);
    const base = makeInput(rand);
    const faster = {
      ...base,
      throughput: { ...base.throughput, breaksPerSecond: base.throughput.breaksPerSecond * 1.5 },
    };
    assert.ok(
      calculateFarmingProfit(faster).grossCoinsPerHour >= calculateFarmingProfit(base).grossCoinsPerHour,
      `seed ${seed}: farming faster earned less`,
    );
  }
});

test('a cost never raises net profit', () => {
  for (const seed of SEEDS) {
    const rand = lcg(seed);
    const base = makeInput(rand);
    const withCost = { ...base, costsPerHour: [{ id: 'spray', coinsPerHour: rand() * 10000 }] };
    const a = calculateFarmingProfit(base);
    const b = calculateFarmingProfit(withCost);
    if (!b.complete) continue;
    assert.ok(
      b.knownNetCoinsPerHour <= a.knownNetCoinsPerHour + 1e-9,
      `seed ${seed}: adding a cost raised net from ${a.knownNetCoinsPerHour} to ${b.knownNetCoinsPerHour}`,
    );
  }
});

test('no finite input produces NaN or Infinity anywhere', () => {
  for (const seed of SEEDS) {
    const rand = lcg(seed);
    const result = calculateFarmingProfit(makeInput(rand));
    const walk = (node, path) => {
      if (typeof node === 'number') {
        assert.ok(Number.isFinite(node), `seed ${seed}: ${path} is ${node}`);
      } else if (Array.isArray(node)) {
        node.forEach((child, i) => walk(child, `${path}[${i}]`));
      } else if (node && typeof node === 'object') {
        for (const [key, child] of Object.entries(node)) walk(child, `${path}.${key}`);
      }
    };
    walk(result, 'result');
  }
});

test('an unknown input is never reported as a net number', () => {
  // The invariant the whole app is built on: absent is not zero. Removing any
  // single required field must null the headline figure rather than let the
  // engine answer with what it happened to have.
  const holes = [
    ['stats.farmingFortune', i => { delete i.stats.farmingFortune; }],
    ['throughput.breaksPerSecond', i => { delete i.throughput.breaksPerSecond; }],
    ['normalDrops[0].unitValueCoins', i => { delete i.normalDrops[0].unitValueCoins; }],
    ['normalDrops[0].baseUnitsPerBreak', i => { delete i.normalDrops[0].baseUnitsPerBreak; }],
  ];
  for (const seed of SEEDS) {
    for (const [label, punch] of holes) {
      const input = makeInput(lcg(seed));
      punch(input);
      const result = calculateFarmingProfit(input);
      assert.equal(result.complete, false, `seed ${seed}: missing ${label} still reported complete`);
      assert.equal(result.netCoinsPerHour, null, `seed ${seed}: missing ${label} produced a net number`);
      assert.ok(result.missing.length > 0, `seed ${seed}: missing ${label} was not reported`);
    }
  }
});

test('payback scales linearly with cost and refuses a non-improvement', () => {
  for (const seed of SEEDS) {
    const rand = lcg(seed);
    const before = { netCoinsPerHour: rand() * 1e6 };
    const after = { netCoinsPerHour: before.netCoinsPerHour + 1000 + rand() * 1e5 };
    const cost = 1e6 + rand() * 1e7;

    const one = evaluateProfitTransition({ before, after, cost: { purchaseCostCoins: cost } });
    const two = evaluateProfitTransition({ before, after, cost: { purchaseCostCoins: cost * 2 } });
    assert.ok(
      near(two.paybackHours, one.paybackHours * 2),
      `seed ${seed}: doubling cost gave payback ${two.paybackHours}, expected ${one.paybackHours * 2}`,
    );

    // A downgrade can never pay itself back, however cheap it is.
    const worse = evaluateProfitTransition({
      before: after,
      after: before,
      cost: { purchaseCostCoins: 1 },
    });
    assert.equal(worse.paybackHours, null, `seed ${seed}: a downgrade reported a payback`);
  }
});
