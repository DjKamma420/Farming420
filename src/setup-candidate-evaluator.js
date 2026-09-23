import { ACTIVITY_MODE, normalizeActivityMode, setupIdForActivity } from './activity-mode.js';
import { computeStatTotals } from './computed-stats.js';
import { applySnapshotToProgress } from './snapshot-apply.js';
import { normalizeSetups } from './setups.js';

export const SETUP_CANDIDATE_EVALUATOR_VERSION = 1;

const STAT_FIELDS = Object.freeze([
  'globalFortune',
  'cropFortune',
  'pestFortune',
  'effectiveFortune',
  'overbloom',
  'bonusPestChance',
]);

function cloned(value) {
  return structuredClone(value ?? {});
}

function normalizedState(state) {
  const next = cloned(state);
  next.profile ||= {};
  next.profile.levels ||= {};
  next.profile.owned ||= {};
  next.profile.manualGain ||= {};
  next.profile.cropProgress ||= {};
  next.profile.toolProgress ||= {};
  next.profile.vacuumProgress ||= {};
  next.profile.autoApplied ||= {};
  return next;
}

function setupForPhase(state, phase) {
  state.profile ||= {};
  const setups = normalizeSetups(state.profile.setups);
  const targetId = setupIdForActivity(phase);
  if (setups.list.some(setup => setup.id === targetId)) setups.activeId = targetId;
  state.profile.setups = setups;
  return setups.activeId;
}

function activateCandidate(state, candidate) {
  state.profile ||= {};
  const setups = normalizeSetups(state.profile.setups);
  const setup = cloned(candidate?.setup);
  if (!setup?.id) return null;

  const index = setups.list.findIndex(row => row.id === setup.id);
  if (index >= 0) setups.list[index] = setup;
  else setups.list.push(setup);
  setups.activeId = setup.id;
  state.profile.setups = setups;
  return setup.id;
}

function incompleteParts(totals) {
  const rows = [];
  for (const [axis, entries] of Object.entries(totals?.incomplete || {})) {
    for (const entry of Array.isArray(entries) ? entries : []) {
      rows.push({ axis, id: entry?.id || null, reason: entry?.reason || 'incomplete' });
    }
  }
  return rows;
}

function statDelta(before, after) {
  return Object.freeze(Object.fromEntries(STAT_FIELDS.map(field => [
    field,
    Number(after?.[field] || 0) - Number(before?.[field] || 0),
  ])));
}

function freshStatus(value) {
  return value === 'AUTO' || value === 'DERIVED' || value === 'MANUAL' || value === 'EXTERNAL';
}

function candidateFreshness(candidate) {
  const sourceStatus = candidate?.sourceStatus || {};
  const itemsFresh = freshStatus(sourceStatus.items);
  const petsFresh = freshStatus(sourceStatus.pets);
  return Object.freeze({
    items: sourceStatus.items || 'UNKNOWN',
    pets: sourceStatus.pets || 'UNKNOWN',
    fresh: itemsFresh && petsFresh,
  });
}

function uniqueReasons(values) {
  return [...new Set(values.filter(Boolean))];
}

/**
 * Evaluates one already-enumerated owned setup candidate as a complete state.
 *
 * This function deliberately does not rank candidates. It swaps the whole
 * wearable/pet setup into a cloned state, re-runs the same profile-derived gear
 * logic used by the live app, and then compares complete stat totals against the
 * stored setup for the same activity phase.
 */
export function evaluateSetupCandidate(state, candidate, options = {}) {
  const phase = normalizeActivityMode(options.phase || candidate?.phase || ACTIVITY_MODE.FARM);
  const cropId = options.cropId || state?.selectedCrop || 'melon';
  const activeContextScope = options.activeContextScope ?? null;
  const snapshot = options.snapshot ?? state?.profile?.normalizedSnapshot ?? null;
  const beforeState = normalizedState(state);
  const beforeSetupId = setupForPhase(beforeState, phase);
  const beforeApply = applySnapshotToProgress(beforeState, snapshot || {});
  const beforeTotals = computeStatTotals(beforeState, cropId, phase, activeContextScope);

  const afterState = normalizedState(state);
  setupForPhase(afterState, phase);
  const afterSetupId = activateCandidate(afterState, candidate);
  const afterApply = applySnapshotToProgress(afterState, snapshot || {});
  const afterTotals = computeStatTotals(afterState, cropId, phase, activeContextScope);

  const freshness = candidateFreshness(candidate);
  const beforeIncomplete = incompleteParts(beforeTotals);
  const afterIncomplete = incompleteParts(afterTotals);
  const reasons = [];

  if (!candidate || typeof candidate !== 'object') reasons.push('candidate is missing');
  if (candidate?.valid === false) reasons.push('candidate violates setup constraints');
  if (!candidate?.wearableComplete) reasons.push('candidate does not contain a complete observed armor/equipment loadout');
  if (!freshness.fresh) reasons.push('candidate ownership is not currently verified by fresh item and pet profile data');
  if (!snapshot) reasons.push('normalized profile snapshot is unavailable');
  if (!afterSetupId) reasons.push('candidate setup is unavailable');
  if (beforeIncomplete.length) reasons.push('current phase setup has incomplete stat mechanics');
  if (afterIncomplete.length) reasons.push('candidate setup has incomplete stat mechanics');
  if (beforeApply.skipped.length) reasons.push(...beforeApply.skipped);
  if (afterApply.skipped.length) reasons.push(...afterApply.skipped);

  return Object.freeze({
    version: SETUP_CANDIDATE_EVALUATOR_VERSION,
    candidateId: candidate?.id || null,
    phase,
    cropId,
    activeContextScope,
    currentSetupId: beforeSetupId,
    candidateSetupId: afterSetupId,
    requiredHandItemKind: candidate?.requiredHandItemKind || null,
    legal: candidate?.valid !== false,
    wearableComplete: Boolean(candidate?.wearableComplete),
    currentObserved: Boolean(candidate?.currentObserved),
    freshness,
    before: Object.freeze({
      totals: beforeTotals,
      incomplete: Object.freeze(beforeIncomplete),
      applied: Object.freeze(beforeApply.applied),
      skipped: Object.freeze(beforeApply.skipped),
    }),
    after: Object.freeze({
      totals: afterTotals,
      incomplete: Object.freeze(afterIncomplete),
      applied: Object.freeze(afterApply.applied),
      skipped: Object.freeze(afterApply.skipped),
    }),
    delta: statDelta(beforeTotals, afterTotals),
    complete: reasons.length === 0,
    reasons: Object.freeze(uniqueReasons(reasons)),
  });
}

/**
 * Batch evaluation preserves enumeration order. A later objective-specific
 * layer may rank only complete evaluations with a verified common objective.
 */
export function evaluateSetupCandidates(state, candidates, options = {}) {
  return Object.freeze((Array.isArray(candidates) ? candidates : [])
    .map(candidate => evaluateSetupCandidate(state, candidate, options)));
}
