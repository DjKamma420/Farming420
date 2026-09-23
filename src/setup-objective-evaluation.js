import { ACTIVITY_MODE } from './activity-mode.js';
import { evaluateSetupCandidates } from './setup-candidate-evaluator.js';

export const SETUP_OBJECTIVE = Object.freeze({
  NORMAL_CROP: 'normal-crop',
  JACOB_CONTEST: 'jacob-contest',
  PEST_SPAWN: 'pest-spawn',
  PEST_KILL: 'pest-kill',
});

const OBJECTIVE_SPECS = Object.freeze({
  [SETUP_OBJECTIVE.NORMAL_CROP]: Object.freeze({
    id: SETUP_OBJECTIVE.NORMAL_CROP,
    label: 'Normal crop output',
    phase: ACTIVITY_MODE.FARM,
    activeContextScope: null,
    primary: Object.freeze(['effectiveFortune']),
    secondary: Object.freeze([]),
  }),
  [SETUP_OBJECTIVE.JACOB_CONTEST]: Object.freeze({
    id: SETUP_OBJECTIVE.JACOB_CONTEST,
    label: 'Jacob Contest collection',
    phase: ACTIVITY_MODE.FARM,
    activeContextScope: 'Jacob Contest',
    primary: Object.freeze(['effectiveFortune']),
    secondary: Object.freeze([]),
  }),
  [SETUP_OBJECTIVE.PEST_SPAWN]: Object.freeze({
    id: SETUP_OBJECTIVE.PEST_SPAWN,
    label: 'Pest spawning',
    phase: ACTIVITY_MODE.PEST_SPAWN,
    activeContextScope: null,
    // BPC and cooldown are co-primary. Farming Fortune only breaks an exact
    // tie on the spawn objective; it never compensates for worse BPC/CDR.
    primary: Object.freeze(['bonusPestChance', 'pestCooldownReductionPct']),
    secondary: Object.freeze(['effectiveFortune']),
  }),
  [SETUP_OBJECTIVE.PEST_KILL]: Object.freeze({
    id: SETUP_OBJECTIVE.PEST_KILL,
    label: 'Pest killing',
    phase: ACTIVITY_MODE.PEST_KILL,
    activeContextScope: null,
    // Pest Fortune and Overbloom affect different parts of the loot path.
    // Without a verified EV conversion they remain a Pareto pair.
    primary: Object.freeze(['pestFortune', 'overbloom']),
    secondary: Object.freeze([]),
  }),
});

function finiteStat(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function metricValue(evaluation, key) {
  return finiteStat(evaluation?.after?.totals?.[key]);
}

function allMetricsKnown(evaluation, spec) {
  return [...spec.primary, ...spec.secondary]
    .every(key => metricValue(evaluation, key) !== null);
}

export function setupObjectiveSpec(id) {
  return OBJECTIVE_SPECS[id] || OBJECTIVE_SPECS[SETUP_OBJECTIVE.NORMAL_CROP];
}

export function setupObjectiveForActivity(mode, { jacobContest = false } = {}) {
  if (mode === ACTIVITY_MODE.PEST_SPAWN) return SETUP_OBJECTIVE.PEST_SPAWN;
  if (mode === ACTIVITY_MODE.PEST_KILL || mode === ACTIVITY_MODE.PEST) return SETUP_OBJECTIVE.PEST_KILL;
  return jacobContest ? SETUP_OBJECTIVE.JACOB_CONTEST : SETUP_OBJECTIVE.NORMAL_CROP;
}

export function objectiveCandidateReady(evaluation, objective = SETUP_OBJECTIVE.NORMAL_CROP) {
  const spec = setupObjectiveSpec(objective);
  const after = evaluation?.after || {};
  return Boolean(
    evaluation?.legal
    && evaluation?.wearableComplete
    && evaluation?.freshness?.fresh
    && evaluation?.handItem?.observed
    && after?.wearableComplete
    && Array.isArray(after?.incomplete)
    && after.incomplete.length === 0
    && Array.isArray(after?.supportGaps)
    && after.supportGaps.length === 0
    && (!after?.petItem?.active || after.petItem.complete !== false)
    && allMetricsKnown(evaluation, spec)
  );
}

function vector(evaluation, keys) {
  return keys.map(key => metricValue(evaluation, key));
}

function dominatesVector(aValues, bValues) {
  if (!aValues.length || aValues.length !== bValues.length) return false;
  let strictlyBetter = false;
  for (let index = 0; index < aValues.length; index += 1) {
    if (aValues[index] < bValues[index]) return false;
    if (aValues[index] > bValues[index]) strictlyBetter = true;
  }
  return strictlyBetter;
}

function sameVector(aValues, bValues) {
  return aValues.length === bValues.length
    && aValues.every((value, index) => value === bValues[index]);
}

export function objectiveDominates(a, b, objective = SETUP_OBJECTIVE.NORMAL_CROP) {
  const spec = setupObjectiveSpec(objective);
  const aPrimary = vector(a, spec.primary);
  const bPrimary = vector(b, spec.primary);

  if (dominatesVector(aPrimary, bPrimary)) return true;
  if (!sameVector(aPrimary, bPrimary)) return false;

  if (!spec.secondary.length) return false;
  return dominatesVector(vector(a, spec.secondary), vector(b, spec.secondary));
}

function metricSnapshot(evaluation, spec) {
  return Object.freeze(Object.fromEntries(
    [...spec.primary, ...spec.secondary]
      .map(key => [key, metricValue(evaluation, key)]),
  ));
}

function allObjectiveMetricsEqual(rows, spec) {
  if (rows.length < 2) return true;
  const first = metricSnapshot(rows[0], spec);
  return rows.slice(1).every(row => {
    const current = metricSnapshot(row, spec);
    return Object.keys(first).every(key => first[key] === current[key]);
  });
}

export function analyzeSetupObjectiveEvaluations(
  evaluations,
  objective = SETUP_OBJECTIVE.NORMAL_CROP,
) {
  const spec = setupObjectiveSpec(objective);
  const rows = Array.isArray(evaluations) ? evaluations : [];
  const eligible = rows.filter(row => objectiveCandidateReady(row, spec.id));
  const frontier = eligible.filter(candidate =>
    !eligible.some(other =>
      other !== candidate && objectiveDominates(other, candidate, spec.id)));

  const status = frontier.length === 0
    ? 'unavailable'
    : frontier.length === 1
      ? 'clear'
      : allObjectiveMetricsEqual(frontier, spec) ? 'tie' : 'tradeoff';

  const recommendation = Object.freeze({
    status,
    candidateId: status === 'clear' ? frontier[0].candidateId : null,
    metrics: status === 'clear' ? metricSnapshot(frontier[0], spec) : null,
    frontierCandidateIds: Object.freeze(frontier.map(row => row.candidateId)),
  });

  const analyzedRows = rows.map(row => {
    const ready = objectiveCandidateReady(row, spec.id);
    const dominatedBy = ready
      ? eligible.filter(other => other !== row && objectiveDominates(other, row, spec.id))
        .map(other => other.candidateId)
      : [];
    return Object.freeze({
      evaluation: row,
      candidateId: row?.candidateId || null,
      eligible: ready,
      frontier: ready && dominatedBy.length === 0,
      dominatedBy: Object.freeze(dominatedBy),
      metrics: metricSnapshot(row, spec),
    });
  });

  return Object.freeze({
    objective: spec.id,
    label: spec.label,
    phase: spec.phase,
    activeContextScope: spec.activeContextScope,
    primaryMetrics: spec.primary,
    secondaryMetrics: spec.secondary,
    totalCount: rows.length,
    eligibleCount: eligible.length,
    frontierCount: frontier.length,
    rows: Object.freeze(analyzedRows),
    frontier: Object.freeze(frontier),
    recommendation,
  });
}

export function evaluateSetupObjective(state, candidates, {
  objective = SETUP_OBJECTIVE.NORMAL_CROP,
  ...evaluationOptions
} = {}) {
  const spec = setupObjectiveSpec(objective);
  const evaluations = evaluateSetupCandidates(state, candidates, {
    ...evaluationOptions,
    phase: spec.phase,
    activeContextScope: spec.activeContextScope,
  });
  return analyzeSetupObjectiveEvaluations(evaluations, spec.id);
}
