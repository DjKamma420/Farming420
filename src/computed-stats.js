import './runtime-data-patches.js';
import { CROPS, UPGRADES } from './data.js';
import { toolKeyForCropId } from './migrations.js';
import { mooshroomCowContribution } from './mooshroom-cow.js';
import {
  activityModeForState,
  isPestVacuumEntry,
  itemAppliesToActivity,
} from './activity-mode.js';

export const COMPUTED_STATS_VERSION = 3;

export const STAT_AXIS = Object.freeze({
  GLOBAL_FORTUNE: 'globalFortune',
  CROP_FORTUNE: 'cropFortune',
  PEST_FORTUNE: 'pestFortune',
  OVERBLOOM: 'overbloom',
  BONUS_PEST_CHANCE: 'bonusPestChance',
});

// snapshot-apply writes these dynamic gear totals into manualGain. Most are
// complete totals; Green Thumb is the one exception: its stored dynamic value
// is the per-enchant-level gain and has to be multiplied by the summed levels.
const AUTO_DYNAMIC_TOTAL = Object.freeze({
  'armor-helianthus-armor-base-stats': 'total',
  'armor-helianthus-feast-set-bonus': 'total',
  'armor-reforge-mossy-on-full-armor': 'total',
  'armor-gem-perfect-peridot-on-full-armor': 'total',
  'equipment-reforge-rooted-on-full-equipment': 'total',
  'equipment-enchant-green-thumb-v-on-equipment': 'per-level',
});

function cropName(cropId) {
  return CROPS.find(crop => crop.id === cropId)?.name || cropId;
}

function progressBucket(profile, item, cropId) {
  if (item.section === 'crops') return profile.cropProgress?.[cropId] || {};
  if (item.section === 'tools') return profile.toolProgress?.[toolKeyForCropId(cropId)] || {};
  return profile;
}

function scopeKey(item, cropId) {
  if (item.section === 'crops') return `crop:${cropId}`;
  if (item.section === 'tools') return `tool:${toolKeyForCropId(cropId)}`;
  return 'account';
}

function configuredLevel(profile, item, cropId) {
  const store = progressBucket(profile, item, cropId);
  const max = Math.max(1, Number(item.max || 1));
  const raw = Number(store.levels?.[item.id] || 0);
  if (Number.isFinite(raw) && raw > 0) return Math.min(max, raw);
  return store.owned?.[item.id] ? 1 : 0;
}

function appliesToCrop(item, cropId) {
  return item.cropScope === 'Any' || item.cropScope === cropName(cropId);
}

export function statAxisFor(item) {
  const metric = String(item?.metric || '').toLowerCase();
  if (metric.includes('overbloom') || metric === 'rare crops') return STAT_AXIS.OVERBLOOM;
  if (metric.includes('pest spawn') || metric.includes('bonus pest chance')) return STAT_AXIS.BONUS_PEST_CHANCE;
  if (metric !== 'crop yield') return null;
  if (isPestVacuumEntry(item)) return STAT_AXIS.PEST_FORTUNE;
  if (item.section === 'crops' || item.section === 'tools' || item.cropScope !== 'Any') return STAT_AXIS.CROP_FORTUNE;
  return STAT_AXIS.GLOBAL_FORTUNE;
}

function contributionFor(state, item, cropId, mode = null) {
  const profile = state?.profile || {};
  if (!appliesToCrop(item, cropId)) return null;
  if (mode && !itemAppliesToActivity(item, mode)) return null;
  const axis = statAxisFor(item);
  if (!axis) return null;

  const level = configuredLevel(profile, item, cropId);
  if (level <= 0) return null;

  if (item.status !== 'ACTIVE') {
    return { axis, value: 0, incomplete: true, id: item.id, reason: 'not verified' };
  }

  // Sunset is represented with a zero generic step because the same enchant
  // also has a night Visitor-Cooldown effect. For the Overbloom axis the day
  // contribution is exactly +1 per summed enchant level.
  if (item.id === 'armor-enchant-sunset-v-day-overbloom') {
    return { axis, value: level, incomplete: false, id: item.id };
  }

  const dynamicMode = AUTO_DYNAMIC_TOTAL[item.id];
  if (dynamicMode) {
    const store = progressBucket(profile, item, cropId);
    const marker = profile.autoApplied?.[scopeKey(item, cropId)]?.[item.id];
    const dynamic = Number(store.manualGain?.[item.id]);
    if (marker?.manualGain !== undefined && Number.isFinite(dynamic) && dynamic >= 0) {
      return {
        axis,
        value: dynamicMode === 'per-level' ? dynamic * level : dynamic,
        incomplete: false,
        id: item.id,
      };
    }
    return { axis, value: 0, incomplete: true, id: item.id, reason: 'dynamic setup value unavailable' };
  }

  const step = Number(item.stepGain);
  if (Number.isFinite(step) && step > 0) {
    return { axis, value: step * level, incomplete: false, id: item.id };
  }

  return { axis, value: 0, incomplete: true, id: item.id, reason: 'total formula not modeled yet' };
}

export function computeTotalsFromEntries(state, entries, cropId = state?.selectedCrop || 'melon', mode = null) {
  const totals = {
    globalFortune: 0,
    cropFortune: 0,
    pestFortune: 0,
    effectiveFortune: 0,
    overbloom: 0,
    bonusPestChance: 0,
    incomplete: {
      globalFortune: [],
      cropFortune: [],
      pestFortune: [],
      overbloom: [],
      bonusPestChance: [],
    },
  };

  for (const item of entries) {
    const part = contributionFor(state, item, cropId, mode);
    if (!part) continue;
    totals[part.axis] += part.value;
    if (part.incomplete) totals.incomplete[part.axis].push({ id: part.id, reason: part.reason });
  }

  totals.effectiveFortune = totals.globalFortune + totals.cropFortune + totals.pestFortune;
  return totals;
}

function applyDerivedMechanics(state, totals) {
  const cow = mooshroomCowContribution(state);
  totals.derived = {
    strength: state?.profile?.inputs?.strength ?? null,
    mooshroomCow: cow,
  };

  if (cow.active) {
    totals.globalFortune += cow.value;
    if (cow.incomplete) {
      totals.incomplete.globalFortune.push({
        id: 'derived-mooshroom-cow',
        reason: cow.reasons.join('; '),
      });
    }
  }

  totals.effectiveFortune = totals.globalFortune + totals.cropFortune + totals.pestFortune;
  return totals;
}

export function computeStatTotals(state, cropId = state?.selectedCrop || 'melon', mode = activityModeForState(state)) {
  return applyDerivedMechanics(state, computeTotalsFromEntries(state, UPGRADES, cropId, mode));
}

export function computedStatsSnapshot(state, mode = activityModeForState(state)) {
  const selectedCrop = state?.selectedCrop || 'melon';
  const byCrop = {};
  for (const crop of CROPS) byCrop[crop.id] = computeStatTotals(state, crop.id, mode);
  return {
    version: COMPUTED_STATS_VERSION,
    activityMode: mode,
    selectedCrop,
    strength: state?.profile?.inputs?.strength ?? null,
    mooshroomCow: byCrop[selectedCrop]?.derived?.mooshroomCow || null,
    globalFortune: byCrop[selectedCrop]?.globalFortune || 0,
    cropFortuneByCrop: Object.fromEntries(CROPS.map(crop => [crop.id, byCrop[crop.id].cropFortune])),
    pestFortuneByCrop: Object.fromEntries(CROPS.map(crop => [crop.id, byCrop[crop.id].pestFortune])),
    effectiveFortuneByCrop: Object.fromEntries(CROPS.map(crop => [crop.id, byCrop[crop.id].effectiveFortune])),
    overbloomByCrop: Object.fromEntries(CROPS.map(crop => [crop.id, byCrop[crop.id].overbloom])),
    bonusPestChanceByCrop: Object.fromEntries(CROPS.map(crop => [crop.id, byCrop[crop.id].bonusPestChance])),
    incompleteByCrop: Object.fromEntries(CROPS.map(crop => [crop.id, byCrop[crop.id].incomplete])),
  };
}

export function applyComputedStatsToState(state) {
  state.profile ||= {};
  state.profile.cropFortune ||= {};
  state.profile.plannerEconomics ||= {};

  const snapshot = computedStatsSnapshot(state);
  state.profile.globalFortune = snapshot.globalFortune;
  for (const crop of CROPS) {
    state.profile.cropFortune[crop.id] = snapshot.cropFortuneByCrop[crop.id];
    state.profile.plannerEconomics[crop.id] ||= {};
    state.profile.plannerEconomics[crop.id].overbloom = snapshot.overbloomByCrop[crop.id];
    state.profile.plannerEconomics[crop.id].pestFortune = snapshot.pestFortuneByCrop[crop.id];
    state.profile.plannerEconomics[crop.id].activityMode = snapshot.activityMode;
  }
  state.profile.computedStats = snapshot;
  return snapshot;
}
