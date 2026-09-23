import './runtime-data-patches.js';
import './vacuum-data-patches.js';
import { CROPS, UPGRADES } from './data.js';
import { toolKeyForCropId } from './migrations.js';
import { mooshroomCowContribution } from './mooshroom-cow.js';
import { VACUUM_REFORGE_EFFECT_ENTRY_IDS, selectedVacuumReforge } from './item-capabilities.js';
import { vacuumPeridotFortune } from './vacuum-state.js';
import { TOOL_GEM_ENTRY_ID, toolGemstoneContribution } from './tool-gemstone-contribution.js';
import {
  ACTIVITY_MODE,
  activityModeForState,
  isPestVacuumEntry,
  isVacuumItemEntry,
  itemAppliesToActivity,
} from './activity-mode.js';
import { activeSetup } from './setups.js';
import { gardenLevelFromExperience } from './garden-level.js';
import { setupPetItemContribution } from './setup-pet-items.js';

export const COMPUTED_STATS_VERSION = 10;

const SETUP_LOCAL_PET_ITEM_ENTRY_IDS = new Set([
  'pet-item-green-bandana',
  'pet-item-lucky-clover-poignant-lucky-clover',
]);

export const STAT_AXIS = Object.freeze({
  GLOBAL_FORTUNE: 'globalFortune',
  CROP_FORTUNE: 'cropFortune',
  PEST_FORTUNE: 'pestFortune',
  OVERBLOOM: 'overbloom',
  BONUS_PEST_CHANCE: 'bonusPestChance',
});

const AUTO_DYNAMIC_TOTAL = Object.freeze({
  'armor-helianthus-armor-base-stats': 'total',
  'armor-helianthus-feast-set-bonus': 'total',
  'armor-reforge-mossy-on-full-armor': 'total',
  'armor-gem-perfect-peridot-on-full-armor': 'total',
  'equipment-reforge-rooted-on-full-equipment': 'total',
  'equipment-reforge-thorny-on-full-mythic-equipment-ff': 'total',
  'equipment-reforge-thorny-on-full-mythic-equipment-overbloom': 'total',
  'equipment-reforge-thorny-thorns-overbloom': 'total',
  'equipment-enchant-green-thumb-v-on-equipment': 'per-level',
});

function cropName(cropId) {
  return CROPS.find(crop => crop.id === cropId)?.name || cropId;
}

function progressBucket(profile, item, cropId) {
  if (isVacuumItemEntry(item)) return profile.vacuumProgress || {};
  if (item.section === 'crops') return profile.cropProgress?.[cropId] || {};
  if (item.section === 'tools') return profile.toolProgress?.[toolKeyForCropId(cropId)] || {};
  return profile;
}

function scopeKey(item, cropId) {
  if (isVacuumItemEntry(item)) return 'vacuum';
  if (item.section === 'crops') return `crop:${cropId}`;
  if (item.section === 'tools') return `tool:${toolKeyForCropId(cropId)}`;
  return 'account';
}

function configuredLevel(profile, item, cropId) {
  const store = progressBucket(profile, item, cropId);

  // Vacuum reforges are mutually exclusive. An explicit current reforge wins
  // over stale legacy `owned`/`levels` flags from older builds. Legacy profiles
  // without `vacuumProgress.reforge` continue to read their old Beady flag.
  if (item.id === VACUUM_REFORGE_EFFECT_ENTRY_IDS.beady && store.reforge) {
    return selectedVacuumReforge(store) === 'beady' ? 1 : 0;
  }

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

function contributionFor(state, item, cropId, mode = null, activeContextScope = null) {
  const profile = state?.profile || {};
  if (!appliesToCrop(item, cropId)) return null;
  const axis = statAxisFor(item);
  if (!axis) return null;

  if (mode && !itemAppliesToActivity(item, mode, activeContextScope)) return null;
  // BPC is a spawn-phase stat. Keeping it out of Farming/Killing totals prevents
  // the old two-set model from making those loadouts look better than they are.
  if (mode && axis === STAT_AXIS.BONUS_PEST_CHANCE && mode !== ACTIVITY_MODE.PEST_SPAWN) return null;

  // The old single Perfect-Peridot row was only a placeholder. The physical
  // tool editor now stores every socket separately, including quality, unlock
  // state and rarity scaling; counting this row as well would double-count and
  // would keep the obsolete fixed +30 assumption alive.
  if (item.id === TOOL_GEM_ENTRY_ID) return null;

  // Pet items belong to exactly one active pet/setup. The planner rows remain
  // useful as upgrade records, but their stats must never be applied as
  // account-global toggles.
  if (SETUP_LOCAL_PET_ITEM_ENTRY_IDS.has(item.id)) return null;

  const level = configuredLevel(profile, item, cropId);
  if (level <= 0) return null;

  if (item.status !== 'ACTIVE') {
    return { axis, value: 0, incomplete: true, id: item.id, reason: 'not verified' };
  }

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

export function computeTotalsFromEntries(state, entries, cropId = state?.selectedCrop || 'melon', mode = null, activeContextScope = null) {
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
    sourceCount: {
      globalFortune: 0,
      cropFortune: 0,
      pestFortune: 0,
      overbloom: 0,
      bonusPestChance: 0,
    },
  };

  for (const item of entries) {
    const part = contributionFor(state, item, cropId, mode, activeContextScope);
    if (!part) continue;
    totals[part.axis] += part.value;
    totals.sourceCount[part.axis] += 1;
    if (part.incomplete) totals.incomplete[part.axis].push({ id: part.id, reason: part.reason });
  }

  totals.effectiveFortune = totals.globalFortune + totals.cropFortune + totals.pestFortune;
  return totals;
}

function setupPetItemForState(state, mode, derivedContext = {}) {
  const setup = state?.profile?.setups ? activeSetup(state.profile.setups) : null;
  const snapshot = state?.profile?.normalizedSnapshot || {};
  const contribution = setupPetItemContribution(setup?.slots?.petItem || null, {
    gardenLevel: snapshot?.garden?.level
      ?? gardenLevelFromExperience(snapshot?.garden?.experience),
    eligiblePestBestiaryTiers: derivedContext?.eligiblePestBestiaryTiers ?? null,
  });
  const active = contribution.activityScope === 'any'
    || (contribution.activityScope === 'pest-spawn' && mode === ACTIVITY_MODE.PEST_SPAWN);
  return Object.freeze({
    ...contribution,
    active,
    reasons: Object.freeze(active ? [...contribution.reasons] : []),
  });
}

function petItemIncompleteAxis(contribution) {
  if (contribution?.id === 'BROWN_BANDANA') return STAT_AXIS.BONUS_PEST_CHANCE;
  if (contribution?.id === 'POIGNANT_LUCKY_CLOVER') return STAT_AXIS.OVERBLOOM;
  return STAT_AXIS.GLOBAL_FORTUNE;
}

function applySetupPetItem(totals, contribution) {
  if (!contribution?.active) return totals;

  const globalFortune = Number(contribution.globalFortune || 0);
  const overbloom = Number(contribution.overbloom || 0);
  const bonusPestChance = Number(contribution.bonusPestChance || 0);

  if (globalFortune) {
    totals.globalFortune += globalFortune;
    totals.sourceCount.globalFortune += 1;
  }
  if (overbloom) {
    totals.overbloom += overbloom;
    totals.sourceCount.overbloom += 1;
  }
  if (bonusPestChance) {
    totals.bonusPestChance += bonusPestChance;
    totals.sourceCount.bonusPestChance += 1;
  }
  if (!contribution.complete) {
    const axis = petItemIncompleteAxis(contribution);
    for (const reason of contribution.reasons) {
      totals.incomplete[axis].push({
        id: `setup-pet-item:${contribution.id || 'unknown'}`,
        reason,
      });
    }
  }
  return totals;
}

function applyDerivedMechanics(state, totals, mode, cropId, derivedContext = {}) {
  const cow = mooshroomCowContribution(state);
  const setupPetItem = setupPetItemForState(state, mode, derivedContext);
  const vacuumPeridot = mode === ACTIVITY_MODE.PEST_KILL
    ? vacuumPeridotFortune(state?.profile?.vacuumProgress || {})
    : 0;
  const toolPeridot = (mode === ACTIVITY_MODE.FARM || mode === ACTIVITY_MODE.PEST_SPAWN)
    ? toolGemstoneContribution(state, cropId)
    : { active: false, value: 0, incomplete: false, filled: 0, available: 0 };
  totals.derived = {
    strength: state?.profile?.inputs?.strength ?? null,
    mooshroomCow: cow,
    setupPetItem,
    vacuumPeridotFortune: vacuumPeridot,
    toolPeridotFortune: toolPeridot,
  };

  if (cow.active) {
    totals.globalFortune += cow.value;
    totals.sourceCount.globalFortune += 1;
    if (cow.incomplete) {
      totals.incomplete.globalFortune.push({
        id: 'derived-mooshroom-cow',
        reason: cow.reasons.join('; '),
      });
    }
  }

  if (vacuumPeridot > 0) {
    totals.pestFortune += vacuumPeridot;
    totals.sourceCount.pestFortune += 1;
  }

  // A Farming Tool belongs to one crop/tool bucket. Peridot is technically
  // Farming Fortune, but its contribution is active only while that physical
  // crop tool is selected, so it lives on this crop's effective Fortune axis.
  if (toolPeridot.active) {
    totals.cropFortune += toolPeridot.value;
    totals.sourceCount.cropFortune += 1;
    if (toolPeridot.incomplete) {
      totals.incomplete.cropFortune.push({
        id: TOOL_GEM_ENTRY_ID,
        reason: toolPeridot.reason,
      });
    }
  }

  applySetupPetItem(totals, setupPetItem);
  totals.effectiveFortune = totals.globalFortune + totals.cropFortune + totals.pestFortune;
  return totals;
}

export function computeStatTotals(
  state,
  cropId = state?.selectedCrop || 'melon',
  mode = activityModeForState(state),
  activeContextScope = null,
  derivedContext = {},
) {
  return applyDerivedMechanics(
    state,
    computeTotalsFromEntries(state, UPGRADES, cropId, mode, activeContextScope),
    mode,
    cropId,
    derivedContext,
  );
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
    sourceCountByCrop: Object.fromEntries(CROPS.map(crop => [crop.id, byCrop[crop.id].sourceCount])),
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
