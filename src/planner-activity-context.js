import { CROPS } from './data.js';
import { toolKeyForCropId } from './migrations.js';
import {
  ACTIVITY_MODE,
  activityModeForState,
  isVacuumItemEntry,
  itemAppliesToActivity,
  normalizeActivityMode,
} from './activity-mode.js';
import { computeStatTotals } from './computed-stats.js';

export const FORTUNE_BASE_BY_ACTIVITY = Object.freeze({
  [ACTIVITY_MODE.FARM]: 100,
  [ACTIVITY_MODE.PEST]: 600,
});

function ensureProfile(state) {
  state.profile ||= {};
  state.profile.levels ||= {};
  state.profile.owned ||= {};
  state.profile.costs ||= {};
  state.profile.grindHours ||= {};
  state.profile.manualGain ||= {};
  state.profile.cropProgress ||= {};
  state.profile.toolProgress ||= {};
  state.profile.vacuumProgress ||= {};
  state.profile.plannerEconomics ||= {};
  return state.profile;
}

function ensureProgressBucketShape(bucket) {
  bucket.levels ||= {};
  bucket.owned ||= {};
  bucket.costs ||= {};
  bucket.grindHours ||= {};
  bucket.manualGain ||= {};
  return bucket;
}

function cropName(cropId) {
  return CROPS.find(crop => crop.id === cropId)?.name || cropId;
}

export function plannerProgressBucket(state, item, cropId = state?.selectedCrop || 'melon') {
  const profile = ensureProfile(state);
  if (isVacuumItemEntry(item)) return ensureProgressBucketShape(profile.vacuumProgress);
  if (item?.section === 'crops') {
    profile.cropProgress[cropId] ||= {};
    return ensureProgressBucketShape(profile.cropProgress[cropId]);
  }
  if (item?.section === 'tools') {
    const key = toolKeyForCropId(cropId);
    profile.toolProgress[key] ||= {};
    return ensureProgressBucketShape(profile.toolProgress[key]);
  }
  return ensureProgressBucketShape(profile);
}

export function plannerItemApplies(state, item, cropId = state?.selectedCrop || 'melon') {
  const mode = activityModeForState(state);
  const cropScoped = item?.cropScope === 'Any' || item?.cropScope === cropName(cropId);
  return cropScoped && itemAppliesToActivity(item, mode);
}

export function plannerActivityContext(state, cropId = state?.selectedCrop || 'melon') {
  const mode = activityModeForState(state);
  const stats = computeStatTotals(state, cropId, mode);
  return {
    mode,
    stats,
    currentFortune: Number(stats.effectiveFortune || 0),
    currentOverbloom: Number(stats.overbloom || 0),
    fortuneBase: FORTUNE_BASE_BY_ACTIVITY[mode] || 100,
  };
}

/**
 * Revenue baselines are activity-specific. Older builds stored one flat pair
 * per crop, so migrate that pair once into whichever activity mode was active
 * when it was last written. The other mode deliberately starts empty rather
 * than inheriting a farming rate that describes a different loadout.
 */
export function plannerEconomicsRoot(state, cropId = state?.selectedCrop || 'melon') {
  const profile = ensureProfile(state);
  profile.plannerEconomics[cropId] ||= {};
  const root = profile.plannerEconomics[cropId];

  if (!root.byActivity || typeof root.byActivity !== 'object') {
    const legacyMode = normalizeActivityMode(root.activityMode);
    root.byActivity = {
      [ACTIVITY_MODE.FARM]: { normalCropCoinsPerHour: 0, rareCropCoinsPerHour: 0 },
      [ACTIVITY_MODE.PEST]: { normalCropCoinsPerHour: 0, rareCropCoinsPerHour: 0 },
    };
    root.byActivity[legacyMode] = {
      normalCropCoinsPerHour: Math.max(0, Number(root.normalCropCoinsPerHour || 0)),
      rareCropCoinsPerHour: Math.max(0, Number(root.rareCropCoinsPerHour || 0)),
    };
  }

  for (const mode of [ACTIVITY_MODE.FARM, ACTIVITY_MODE.PEST]) {
    root.byActivity[mode] ||= {};
    root.byActivity[mode].normalCropCoinsPerHour = Math.max(0, Number(root.byActivity[mode].normalCropCoinsPerHour || 0));
    root.byActivity[mode].rareCropCoinsPerHour = Math.max(0, Number(root.byActivity[mode].rareCropCoinsPerHour || 0));
  }
  return root;
}

export function plannerEconomicsBucket(state, cropId = state?.selectedCrop || 'melon', mode = activityModeForState(state)) {
  const normalized = normalizeActivityMode(mode);
  return plannerEconomicsRoot(state, cropId).byActivity[normalized];
}

export function setPlannerEconomicsValue(state, cropId, mode, key, value) {
  if (!['normalCropCoinsPerHour', 'rareCropCoinsPerHour'].includes(key)) return;
  const normalized = normalizeActivityMode(mode);
  const root = plannerEconomicsRoot(state, cropId);
  const number = Math.max(0, Number(value || 0));
  root.byActivity[normalized][key] = number;

  // Keep the flat fields as a compatibility mirror for modules/backups from
  // the pre-activity-aware planner. They always mirror one complete mode so a
  // legacy reader cannot combine Farm revenue with Pest revenue.
  root.normalCropCoinsPerHour = root.byActivity[normalized].normalCropCoinsPerHour;
  root.rareCropCoinsPerHour = root.byActivity[normalized].rareCropCoinsPerHour;
  root.activityMode = normalized;
}
