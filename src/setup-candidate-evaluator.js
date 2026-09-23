import { ACTIVITY_MODE, normalizeActivityMode, setupIdForActivity, usesFarmingTool } from './activity-mode.js';
import { computeStatTotals } from './computed-stats.js';
import { applySnapshotToProgress, cropsForToolItem } from './snapshot-apply.js';
import { isHelianthusArmorPiece } from './armor-fortune.js';
import { isBlossomPiece } from './equipment-fortune.js';
import { activeSetup, normalizeSetups } from './setups.js';
import { GARDEN_VACUUM_ITEMS } from './exact-farming-items.js';
import { gardenLevelFromExperience } from './garden-level.js';
import { setupPetItemContribution } from './setup-pet-items.js';

export const SETUP_CANDIDATE_EVALUATOR_VERSION = 2;

const SETUP_LOCAL_PET_ITEM_ENTRY_IDS = Object.freeze([
  'pet-item-green-bandana',
  'pet-item-lucky-clover-poignant-lucky-clover',
]);

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

  // Pet items are mutually exclusive setup-local state. Historical/manual
  // account-level toggles must not leak into a complete candidate comparison.
  for (const id of SETUP_LOCAL_PET_ITEM_ENTRY_IDS) {
    delete next.profile.levels[id];
    delete next.profile.owned[id];
    delete next.profile.manualGain[id];
    delete next.profile.autoApplied?.account?.[id];
  }
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

const VACUUM_IDS = new Set(GARDEN_VACUUM_ITEMS.map(item => item.id));

function handItemObservation(snapshot, phase, cropId) {
  const items = Array.isArray(snapshot?.items) ? snapshot.items : [];
  if (usesFarmingTool(phase)) {
    const matches = items.filter(item => cropsForToolItem(item).includes(cropId));
    return Object.freeze({
      kind: 'farming-tool',
      observed: matches.length > 0,
      itemIds: Object.freeze(matches.map(item => item.skyblockId).filter(Boolean)),
    });
  }

  const matches = items.filter(item => VACUUM_IDS.has(String(item?.skyblockId || '').trim().toUpperCase()));
  return Object.freeze({
    kind: 'vacuum',
    observed: matches.length > 0,
    itemIds: Object.freeze(matches.map(item => item.skyblockId).filter(Boolean)),
  });
}

function uniqueReasons(values) {
  return [...new Set(values.filter(Boolean))];
}

function peridotQualityGaps(item, slotId) {
  const gems = Array.isArray(item?.gems) ? item.gems : [];
  return gems
    .map(value => String(value || '').toUpperCase())
    .filter(value => value.includes('PERIDOT') && !value.includes('PERFECT'))
    .map(value => `${slotId} uses ${value}; non-Perfect Peridot setup contribution is not modeled yet`);
}

function missingWearableSlots(setup) {
  const slots = setup?.slots || {};
  return [
    'helmet', 'chestplate', 'leggings', 'boots',
    'equipment1', 'equipment2', 'equipment3', 'equipment4',
  ].filter(slotId => !slots[slotId]);
}

function setupSupportGaps(setup) {
  const gaps = [];
  const slots = setup?.slots || {};

  for (const slotId of ['helmet', 'chestplate', 'leggings', 'boots']) {
    const item = slots[slotId];
    if (!item) continue;
    if (!isHelianthusArmorPiece(item)) {
      gaps.push(`${slotId} base Farming stats are not modeled for ${item.displayName || item.skyblockId || 'this armor item'}`);
    }
    const reforge = String(item.reforge || '').trim().toLowerCase();
    if (reforge && reforge !== 'mossy') {
      gaps.push(`${slotId} armor reforge ${reforge} is not modeled in setup evaluation`);
    }
    gaps.push(...peridotQualityGaps(item, slotId));
  }

  for (const slotId of ['equipment1', 'equipment2', 'equipment3', 'equipment4']) {
    const item = slots[slotId];
    if (!item) continue;
    if (!isBlossomPiece(item)) {
      gaps.push(`${slotId} base Farming stats are not modeled for ${item.displayName || item.skyblockId || 'this equipment item'}`);
    }
    const reforge = String(item.reforge || '').trim().toLowerCase();
    if (reforge && !['rooted', 'thorny'].includes(reforge)) {
      gaps.push(`${slotId} equipment reforge ${reforge} is not modeled in setup evaluation`);
    }
  }

  const pet = slots.pet;
  if (pet) {
    const petId = String(pet.skyblockId || '').trim().toUpperCase();
    if (petId !== 'MOOSHROOM_COW') {
      gaps.push(`${pet.displayName || petId || 'selected pet'} contribution is not modeled in computed setup stats`);
    }
  }
  return uniqueReasons(gaps);
}

function petItemContext(snapshot, options) {
  return {
    gardenLevel: snapshot?.garden?.level
      ?? gardenLevelFromExperience(snapshot?.garden?.experience),
    eligiblePestBestiaryTiers: options?.eligiblePestBestiaryTiers ?? null,
  };
}

function petItemForPhase(setup, snapshot, phase, options) {
  const contribution = setupPetItemContribution(
    setup?.slots?.petItem || null,
    petItemContext(snapshot, options),
  );
  const active = contribution.activityScope === 'any'
    || (contribution.activityScope === 'pest-spawn' && phase === ACTIVITY_MODE.PEST_SPAWN);
  return Object.freeze({
    ...contribution,
    active,
    reasons: Object.freeze(active ? [...contribution.reasons] : []),
  });
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
  const beforeSetup = activeSetup(beforeState.profile.setups);
  const beforeMissingSlots = missingWearableSlots(beforeSetup);
  const beforePetItem = petItemForPhase(beforeSetup, snapshot, phase, options);
  const beforeSupportGaps = uniqueReasons([
    ...setupSupportGaps(beforeSetup),
    ...beforePetItem.reasons,
  ]);
  beforeState.profile.normalizedSnapshot = snapshot || beforeState.profile.normalizedSnapshot || null;
  const beforeApply = applySnapshotToProgress(beforeState, snapshot || {});
  const beforeTotals = computeStatTotals(
    beforeState,
    cropId,
    phase,
    activeContextScope,
    { eligiblePestBestiaryTiers: options.eligiblePestBestiaryTiers ?? null },
  );

  const afterState = normalizedState(state);
  setupForPhase(afterState, phase);
  const afterSetupId = activateCandidate(afterState, candidate);
  const afterSetup = activeSetup(afterState.profile.setups);
  const afterMissingSlots = missingWearableSlots(afterSetup);
  const afterPetItem = petItemForPhase(afterSetup, snapshot, phase, options);
  const afterSupportGaps = uniqueReasons([
    ...setupSupportGaps(afterSetup),
    ...afterPetItem.reasons,
  ]);
  afterState.profile.normalizedSnapshot = snapshot || afterState.profile.normalizedSnapshot || null;
  const afterApply = applySnapshotToProgress(afterState, snapshot || {});
  const afterTotals = computeStatTotals(
    afterState,
    cropId,
    phase,
    activeContextScope,
    { eligiblePestBestiaryTiers: options.eligiblePestBestiaryTiers ?? null },
  );

  const freshness = candidateFreshness(candidate);
  const handItem = handItemObservation(snapshot || {}, phase, cropId);
  const beforeIncomplete = incompleteParts(beforeTotals);
  const afterIncomplete = incompleteParts(afterTotals);
  const reasons = [];

  if (!candidate || typeof candidate !== 'object') reasons.push('candidate is missing');
  if (candidate?.valid === false) reasons.push('candidate violates setup constraints');
  if (beforeMissingSlots.length) reasons.push('current phase setup does not contain a complete armor/equipment loadout');
  if (!candidate?.wearableComplete || afterMissingSlots.length) reasons.push('candidate does not contain a complete observed armor/equipment loadout');
  if (!freshness.fresh) reasons.push('candidate ownership is not currently verified by fresh item and pet profile data');
  if (!snapshot) reasons.push('normalized profile snapshot is unavailable');
  if (!afterSetupId) reasons.push('candidate setup is unavailable');
  if (!handItem.observed) reasons.push(`no observed ${handItem.kind} is available for this phase and crop`);
  if (beforeIncomplete.length) reasons.push('current phase setup has incomplete stat mechanics');
  if (afterIncomplete.length) reasons.push('candidate setup has incomplete stat mechanics');
  if (beforeSupportGaps.length) reasons.push(...beforeSupportGaps);
  if (afterSupportGaps.length) reasons.push(...afterSupportGaps);

  return Object.freeze({
    version: SETUP_CANDIDATE_EVALUATOR_VERSION,
    candidateId: candidate?.id || null,
    phase,
    cropId,
    activeContextScope,
    currentSetupId: beforeSetupId,
    candidateSetupId: afterSetupId,
    requiredHandItemKind: candidate?.requiredHandItemKind || null,
    handItem,
    legal: candidate?.valid !== false,
    wearableComplete: Boolean(candidate?.wearableComplete),
    currentObserved: Boolean(candidate?.currentObserved),
    freshness,
    before: Object.freeze({
      wearableComplete: beforeMissingSlots.length === 0,
      missingSlots: Object.freeze(beforeMissingSlots),
      totals: beforeTotals,
      incomplete: Object.freeze(beforeIncomplete),
      supportGaps: Object.freeze(beforeSupportGaps),
      petItem: beforePetItem,
      applied: Object.freeze(beforeApply.applied),
      skipped: Object.freeze(beforeApply.skipped),
    }),
    after: Object.freeze({
      wearableComplete: afterMissingSlots.length === 0,
      missingSlots: Object.freeze(afterMissingSlots),
      totals: afterTotals,
      incomplete: Object.freeze(afterIncomplete),
      supportGaps: Object.freeze(afterSupportGaps),
      petItem: afterPetItem,
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
