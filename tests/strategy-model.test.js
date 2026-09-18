import test from 'node:test';
import assert from 'node:assert/strict';

import { DROP_SCALING } from '../src/profit-engine.js';
import {
  STRATEGY_CONTEXT,
  STRATEGY_OBJECTIVE,
  evaluateStrategyScenario,
  rankStrategyScenarios,
  strategyCandidateApplies,
} from '../src/strategy-model.js';

test('crop and context restrictions prevent irrelevant strategy candidates', () => {
  const candidate = {
    contexts: [STRATEGY_CONTEXT.HARVEST_FEAST],
    crops: ['melon'],
  };
  assert.equal(strategyCandidateApplies(candidate, { context: STRATEGY_CONTEXT.HARVEST_FEAST, crop: 'melon' }), true);
  assert.equal(strategyCandidateApplies(candidate, { context: STRATEGY_CONTEXT.NORMAL_CROP, crop: 'melon' }), false);
  assert.equal(strategyCandidateApplies(candidate, { context: STRATEGY_CONTEXT.HARVEST_FEAST, crop: 'wheat' }), false);
});

test('coin strategy uses the complete profit engine result', () => {
  const scenario = evaluateStrategyScenario({
    id: 'normal-melon',
    context: STRATEGY_CONTEXT.NORMAL_CROP,
    crop: 'melon',
    profitInput: {
      throughput: { breaksPerSecond: 10, baseFarmingUptimeRatio: 1 },
      normalDrops: [{
        id: 'melon',
        baseUnitsPerBreak: 1,
        unitValueCoins: 2,
        scaling: DROP_SCALING.NONE,
      }],
    },
  });

  assert.equal(scenario.objective, STRATEGY_OBJECTIVE.NET_COINS_PER_HOUR);
  assert.equal(scenario.complete, true);
  assert.equal(scenario.objectiveValue, 72_000);
});

test('contest strategy requires explicit contest score instead of converting profit', () => {
  const incomplete = evaluateStrategyScenario({
    context: STRATEGY_CONTEXT.JACOB_CONTEST,
    profitInput: {
      throughput: { breaksPerSecond: 10, baseFarmingUptimeRatio: 1 },
      normalDrops: [{ id: 'crop', baseUnitsPerBreak: 1, unitValueCoins: 1, scaling: DROP_SCALING.NONE }],
    },
  });
  assert.equal(incomplete.objective, STRATEGY_OBJECTIVE.CONTEST_SCORE);
  assert.equal(incomplete.complete, false);

  const complete = evaluateStrategyScenario({
    context: STRATEGY_CONTEXT.JACOB_CONTEST,
    metrics: { contestScore: 123_456 },
  });
  assert.equal(complete.complete, true);
  assert.equal(complete.objectiveValue, 123_456);
});

test('absent explicit strategy metrics never become measured zero', () => {
  const cases = [
    [STRATEGY_OBJECTIVE.CONTEST_SCORE, 'contestScore'],
    [STRATEGY_OBJECTIVE.FARMING_XP_PER_HOUR, 'farmingXpPerHour'],
    [STRATEGY_OBJECTIVE.TOOL_XP_PER_HOUR, 'toolXpPerHour'],
    [STRATEGY_OBJECTIVE.PROGRESSION_PER_HOUR, 'progressionPerHour'],
  ];

  for (const [objective, metric] of cases) {
    for (const absent of [null, undefined, '']) {
      const scenario = evaluateStrategyScenario({ objective, metrics: { [metric]: absent } });
      assert.equal(scenario.complete, false, `${metric}=${String(absent)} must remain unknown`);
      assert.equal(scenario.objectiveValue, null);
    }

    const measuredZero = evaluateStrategyScenario({ objective, metrics: { [metric]: 0 } });
    assert.equal(measuredZero.complete, true, `${metric}=0 is an explicit measurement`);
    assert.equal(measuredZero.objectiveValue, 0);
  }
});

test('pet cardinality violations invalidate impossible simultaneous strategy state', () => {
  const scenario = evaluateStrategyScenario({
    context: STRATEGY_CONTEXT.NORMAL_CROP,
    metrics: {},
    objective: STRATEGY_OBJECTIVE.PROGRESSION_PER_HOUR,
    petStrategy: {
      phases: [{ activePets: ['Elephant', 'Mooshroom Cow'] }],
    },
  });
  assert.equal(scenario.complete, false);
  assert.ok(scenario.violations.some(violation => violation.type === 'active-pet-cardinality' || violation.type === 'pet-strategy'));
});

test('ranker does not give incomplete scenarios a fabricated numeric score', () => {
  const rows = rankStrategyScenarios([
    {
      id: 'missing',
      context: STRATEGY_CONTEXT.NORMAL_CROP,
      profitInput: {
        throughput: { breaksPerSecond: 10, baseFarmingUptimeRatio: 1 },
        normalDrops: [{ id: 'crop', baseUnitsPerBreak: 1, unitValueCoins: 1 }],
      },
    },
    {
      id: 'known',
      context: STRATEGY_CONTEXT.NORMAL_CROP,
      profitInput: {
        throughput: { breaksPerSecond: 1, baseFarmingUptimeRatio: 1 },
        normalDrops: [{ id: 'crop', baseUnitsPerBreak: 1, unitValueCoins: 1, scaling: DROP_SCALING.NONE }],
      },
    },
  ]);

  assert.equal(rows[0].id, 'known');
  assert.equal(rows[1].id, 'missing');
  assert.equal(rows[1].objectiveValue, null);
});
