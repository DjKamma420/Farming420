import assert from 'node:assert/strict';
import test from 'node:test';

import {
  PET_STRATEGY_LIMITS,
  petRuleDecision,
  petRulePaybackHours,
  petStrategyViolations,
} from '../src/pet-strategy.js';

test('only one pet can be active in a strategy phase', () => {
  assert.equal(PET_STRATEGY_LIMITS.activePets, 1);
  const violations = petStrategyViolations({
    phases: [{ activePets: ['SLUG', 'HEDGEHOG'] }],
  });
  assert.equal(violations.length, 1);
  assert.equal(violations[0].type, 'active-pet-cardinality');
});

test('a pet item belongs to exactly one active pet', () => {
  assert.deepEqual(petStrategyViolations({
    phases: [{ pet: 'ELEPHANT', petItem: 'GREEN_BANDANA' }],
  }), []);

  const orphan = petStrategyViolations({ phases: [{ petItem: 'GREEN_BANDANA' }] });
  assert.equal(orphan[0].type, 'orphan-pet-item');
});

test('pet-rule payback uses marginal profit instead of raw stat gain', () => {
  assert.equal(petRulePaybackHours({ acquisitionCostCoins: 12_000_000, marginalCoinsPerHour: 600_000 }), 20);
  assert.equal(petRulePaybackHours({ acquisitionCostCoins: 12_000_000, marginalCoinsPerHour: 0 }), null);
});

test('pet-rule decision respects a caller-supplied payback horizon', () => {
  assert.deepEqual(petRuleDecision({
    acquisitionCostCoins: 12_000_000,
    marginalCoinsPerHour: 600_000,
    maxPaybackHours: 25,
  }), {
    recommend: true,
    paybackHours: 20,
    reason: 'within-payback-horizon',
  });

  assert.equal(petRuleDecision({
    acquisitionCostCoins: 12_000_000,
    marginalCoinsPerHour: 600_000,
    maxPaybackHours: 10,
  }).recommend, false);
});
