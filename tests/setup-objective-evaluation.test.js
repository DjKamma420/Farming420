import assert from 'node:assert/strict';
import test from 'node:test';

import { ACTIVITY_MODE } from '../src/activity-mode.js';
import {
  SETUP_OBJECTIVE,
  analyzeSetupObjectiveEvaluations,
  objectiveCandidateReady,
  objectiveDominates,
  setupObjectiveForActivity,
  setupObjectiveSpec,
} from '../src/setup-objective-evaluation.js';

function evaluation(id, totals, {
  ready = true,
  overallComplete = true,
} = {}) {
  return {
    candidateId: id,
    complete: overallComplete,
    legal: ready,
    wearableComplete: ready,
    freshness: { fresh: ready },
    handItem: { observed: ready },
    after: {
      wearableComplete: ready,
      incomplete: ready ? [] : [{ id: 'gap', reason: 'unknown' }],
      supportGaps: [],
      petItem: { active: false, complete: true },
      totals: {
        effectiveFortune: 0,
        pestFortune: 0,
        overbloom: 0,
        bonusPestChance: 0,
        pestCooldownReductionPct: 0,
        ...totals,
      },
    },
  };
}

test('objective mapping keeps Jacob separate from normal Farming and maps both Pest phases explicitly', () => {
  assert.equal(setupObjectiveForActivity(ACTIVITY_MODE.FARM), SETUP_OBJECTIVE.NORMAL_CROP);
  assert.equal(setupObjectiveForActivity(ACTIVITY_MODE.FARM, { jacobContest: true }), SETUP_OBJECTIVE.JACOB_CONTEST);
  assert.equal(setupObjectiveForActivity(ACTIVITY_MODE.PEST_SPAWN), SETUP_OBJECTIVE.PEST_SPAWN);
  assert.equal(setupObjectiveForActivity(ACTIVITY_MODE.PEST_KILL), SETUP_OBJECTIVE.PEST_KILL);
  assert.equal(setupObjectiveSpec(SETUP_OBJECTIVE.JACOB_CONTEST).activeContextScope, 'Jacob Contest');
});

test('normal crop objective has one clear winner by effective Farming output', () => {
  const result = analyzeSetupObjectiveEvaluations([
    evaluation('a', { effectiveFortune: 500 }),
    evaluation('b', { effectiveFortune: 550 }),
    evaluation('c', { effectiveFortune: 510 }),
  ], SETUP_OBJECTIVE.NORMAL_CROP);

  assert.equal(result.recommendation.status, 'clear');
  assert.equal(result.recommendation.candidateId, 'b');
  assert.deepEqual([...result.recommendation.frontierCandidateIds], ['b']);
});

test('overall before/after comparison may be incomplete while the candidate after-state is still objective-ready', () => {
  const row = evaluation('candidate', { effectiveFortune: 600 }, { overallComplete: false });
  assert.equal(row.complete, false);
  assert.equal(objectiveCandidateReady(row, SETUP_OBJECTIVE.NORMAL_CROP), true);
});

test('incomplete candidate states never win even with larger displayed stats', () => {
  const result = analyzeSetupObjectiveEvaluations([
    evaluation('known', { effectiveFortune: 500 }),
    evaluation('unknown', { effectiveFortune: 9999 }, { ready: false }),
  ], SETUP_OBJECTIVE.NORMAL_CROP);

  assert.equal(result.eligibleCount, 1);
  assert.equal(result.recommendation.candidateId, 'known');
});

test('spawning treats BPC and cooldown reduction as co-primary Pareto metrics', () => {
  const highBpc = evaluation('high-bpc', {
    bonusPestChance: 180,
    pestCooldownReductionPct: 45,
    effectiveFortune: 700,
  });
  const highCooldown = evaluation('high-cdr', {
    bonusPestChance: 160,
    pestCooldownReductionPct: 55,
    effectiveFortune: 900,
  });

  assert.equal(objectiveDominates(highBpc, highCooldown, SETUP_OBJECTIVE.PEST_SPAWN), false);
  assert.equal(objectiveDominates(highCooldown, highBpc, SETUP_OBJECTIVE.PEST_SPAWN), false);

  const result = analyzeSetupObjectiveEvaluations(
    [highBpc, highCooldown],
    SETUP_OBJECTIVE.PEST_SPAWN,
  );
  assert.equal(result.recommendation.status, 'tradeoff');
  assert.equal(result.frontierCount, 2);
  assert.equal(result.recommendation.candidateId, null);
});

test('spawning Fortune only breaks an exact BPC/CDR tie', () => {
  const lowerFortune = evaluation('lower-ff', {
    bonusPestChance: 180,
    pestCooldownReductionPct: 55,
    effectiveFortune: 500,
  });
  const higherFortune = evaluation('higher-ff', {
    bonusPestChance: 180,
    pestCooldownReductionPct: 55,
    effectiveFortune: 550,
  });
  const result = analyzeSetupObjectiveEvaluations(
    [lowerFortune, higherFortune],
    SETUP_OBJECTIVE.PEST_SPAWN,
  );

  assert.equal(result.recommendation.status, 'clear');
  assert.equal(result.recommendation.candidateId, 'higher-ff');
});

test('more Farming Fortune never compensates for a worse spawning primary vector', () => {
  const balanced = evaluation('balanced', {
    bonusPestChance: 180,
    pestCooldownReductionPct: 55,
    effectiveFortune: 400,
  });
  const worsePrimary = evaluation('ff-heavy', {
    bonusPestChance: 179,
    pestCooldownReductionPct: 54,
    effectiveFortune: 5000,
  });

  assert.equal(objectiveDominates(balanced, worsePrimary, SETUP_OBJECTIVE.PEST_SPAWN), true);
});

test('Pest Killing keeps Pest Fortune and Overbloom as an unresolved tradeoff without an invented EV conversion', () => {
  const fortune = evaluation('fortune', { pestFortune: 300, overbloom: 20 });
  const overbloom = evaluation('overbloom', { pestFortune: 250, overbloom: 40 });
  const result = analyzeSetupObjectiveEvaluations(
    [fortune, overbloom],
    SETUP_OBJECTIVE.PEST_KILL,
  );

  assert.equal(result.recommendation.status, 'tradeoff');
  assert.deepEqual(
    [...result.recommendation.frontierCandidateIds].sort(),
    ['fortune', 'overbloom'],
  );
});

test('identical objective vectors are reported as a tie rather than arbitrarily selecting one', () => {
  const result = analyzeSetupObjectiveEvaluations([
    evaluation('a', { effectiveFortune: 500 }),
    evaluation('b', { effectiveFortune: 500 }),
  ], SETUP_OBJECTIVE.NORMAL_CROP);

  assert.equal(result.recommendation.status, 'tie');
  assert.equal(result.recommendation.candidateId, null);
});
