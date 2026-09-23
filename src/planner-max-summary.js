import { CROPS, UPGRADES } from './data.js';
import { isVacuumItemEntry } from './activity-mode.js';
import { toolKeyForCropId } from './migrations.js';
import { plannerProgressBucket } from './planner-activity-context.js';
import { resolveUpgradeCost } from './upgrade-cost-resolution.js';
import { UPGRADE_COSTS } from './upgrade-costs.js';
import { upgradePriceSummary } from './upgrade-price-summary.js';

const DUPLICATE_EFFECT_IDS = new Set([
  'equipment-reforge-thorny-on-full-mythic-equipment-overbloom',
]);

function cropApplies(item, crop) {
  return !item?.cropScope || item.cropScope === 'Any' || item.cropScope === crop?.name;
}

export function farmingMaxItemEligible(item) {
  if (!item?.id || item.status !== 'ACTIVE') return false;
  if (!(Number(item.max) > 0)) return false;
  if (!item.section) return false;
  if (item.section === 'buffs') return false;
  if (String(item.id).startsWith('temporary-')) return false;

  // Reforge alternatives on the same physical farming tool cannot be added
  // together into one "maxed" target. Keep those choices in the planner,
  // but outside the cumulative maxing meter until a setup-specific target
  // selects one concrete route.
  if (item.category === 'Tool Reforge') return false;

  // Several rows describe another stat from the exact same purchase. The cost
  // table records that relationship explicitly; count the physical purchase
  // once instead of inflating both completion and remaining cost.
  if (UPGRADE_COSTS[item.id]?.includedIn) return false;
  if (DUPLICATE_EFFECT_IDS.has(item.id)) return false;

  return true;
}

function targetCropIds(state, item, crops) {
  const fallbackCropId = state?.selectedCrop || crops[0]?.id || 'melon';
  if (isVacuumItemEntry(item)) return [fallbackCropId];

  const eligibleCrops = crops.filter(crop => cropApplies(item, crop));
  if (item.section === 'crops') return eligibleCrops.map(crop => crop.id);

  if (item.section === 'tools') {
    const byTool = new Map();
    for (const crop of eligibleCrops) {
      const key = toolKeyForCropId(crop.id);
      if (!byTool.has(key)) byTool.set(key, crop.id);
    }
    return [...byTool.values()];
  }

  return [fallbackCropId];
}

function earnedFallback(summary, store, item, resolveCost) {
  const remaining = Math.max(0, Number(summary.maxLevel || 0) - Number(summary.currentLevel || 0));
  let earned = Math.max(0, Number(summary.remainingEarnedSteps || 0));
  let unknown = Math.max(0, Number(summary.remainingUnknownSteps || 0));

  // Whole-entry progression rows such as Farming Skill and Farming Tool level
  // are researched as EARNED routes rather than per-level price rows. The
  // price summary correctly refuses to invent per-level coin prices, so convert
  // that all-unknown remainder into earned progress for the maxing meter.
  if (
    remaining > 0
    && earned === 0
    && unknown === remaining
    && summary.costToMaxCoins == null
    && resolveCost(store, item.id)?.acquisitionMode === 'EARNED'
  ) {
    earned = remaining;
    unknown = 0;
  }

  return { earned, unknown };
}

export function plannerMaxSummary(state, {
  items = UPGRADES,
  crops = CROPS,
  summarizePrice = upgradePriceSummary,
  resolveCost = resolveUpgradeCost,
} = {}) {
  let knownCostCoins = 0;
  let currentSteps = 0;
  let totalSteps = 0;
  let maxedTargets = 0;
  let trackedTargets = 0;
  let remainingEarnedSteps = 0;
  let remainingUnknownPriceSteps = 0;

  for (const item of items.filter(farmingMaxItemEligible)) {
    for (const cropId of targetCropIds(state, item, crops)) {
      const store = plannerProgressBucket(state, item, cropId);
      const summary = summarizePrice(store, item);
      const currentLevel = Math.max(0, Number(summary.currentLevel || 0));
      const maxLevel = Math.max(1, Number(summary.maxLevel || item.max || 1));

      trackedTargets += 1;
      currentSteps += Math.min(maxLevel, currentLevel);
      totalSteps += maxLevel;
      if (currentLevel >= maxLevel) maxedTargets += 1;

      const coins = Number(summary.costToMaxCoins);
      if (Number.isFinite(coins) && coins > 0) knownCostCoins += coins;

      const fallback = earnedFallback(summary, store, item, resolveCost);
      remainingEarnedSteps += fallback.earned;
      remainingUnknownPriceSteps += fallback.unknown;
    }
  }

  const completionPercent = totalSteps > 0
    ? Math.max(0, Math.min(100, (currentSteps / totalSteps) * 100))
    : 100;

  return Object.freeze({
    knownCostCoins,
    costComplete: remainingUnknownPriceSteps === 0,
    completionPercent,
    currentSteps,
    totalSteps,
    maxedTargets,
    trackedTargets,
    remainingEarnedSteps,
    remainingUnknownPriceSteps,
  });
}
