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

const SECTION_LABELS = Object.freeze({
  account: 'Account',
  accessories: 'Accessories',
  crops: 'Crops',
  tools: 'Tools',
  chips: 'Garden Chips',
  gear: 'Gear',
  pets: 'Pets',
  shards: 'Attribute Shards',
  pests: 'Pests',
});

function cropApplies(item, crop) {
  return !item?.cropScope || item.cropScope === 'Any' || item.cropScope === crop?.name;
}

function oldestTimestamp(current, candidate) {
  const value = Number(candidate);
  if (!Number.isFinite(value) || value <= 0) return current;
  if (current == null) return value;
  return Math.min(current, value);
}

function completionPercent(currentSteps, totalSteps) {
  return totalSteps > 0
    ? Math.max(0, Math.min(100, (currentSteps / totalSteps) * 100))
    : 100;
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

function targetScopes(state, item, crops) {
  const fallbackCropId = state?.selectedCrop || crops[0]?.id || 'melon';
  if (isVacuumItemEntry(item)) return [{ cropId: fallbackCropId, scopeLabel: null }];

  const eligibleCrops = crops.filter(crop => cropApplies(item, crop));
  if (item.section === 'crops') {
    return eligibleCrops.map(crop => ({ cropId: crop.id, scopeLabel: crop.name }));
  }

  if (item.section === 'tools') {
    const byTool = new Map();
    for (const crop of eligibleCrops) {
      const key = toolKeyForCropId(crop.id);
      const existing = byTool.get(key);
      if (existing) existing.names.push(crop.name);
      else byTool.set(key, { cropId: crop.id, names: [crop.name] });
    }
    return [...byTool.values()].map(entry => ({
      cropId: entry.cropId,
      scopeLabel: entry.names.join(' / '),
    }));
  }

  return [{ cropId: fallbackCropId, scopeLabel: null }];
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

function sectionAccumulator(sectionId) {
  return {
    id: sectionId,
    label: SECTION_LABELS[sectionId] || sectionId || 'Other',
    knownCostCoins: 0,
    knownCostComputedAtMs: null,
    currentSteps: 0,
    totalSteps: 0,
    maxedTargets: 0,
    trackedTargets: 0,
    remainingEarnedSteps: 0,
    remainingUnknownPriceSteps: 0,
  };
}

function finalizeSection(row) {
  return Object.freeze({
    ...row,
    costComplete: row.remainingUnknownPriceSteps === 0,
    completionPercent: completionPercent(row.currentSteps, row.totalSteps),
  });
}

export function plannerMaxSummary(state, {
  items = UPGRADES,
  crops = CROPS,
  summarizePrice = upgradePriceSummary,
  resolveCost = resolveUpgradeCost,
} = {}) {
  let knownCostCoins = 0;
  let knownCostComputedAtMs = null;
  let currentSteps = 0;
  let totalSteps = 0;
  let maxedTargets = 0;
  let trackedTargets = 0;
  let remainingEarnedSteps = 0;
  let remainingUnknownPriceSteps = 0;
  const sections = new Map();
  const unknownPriceTargets = [];

  for (const item of items.filter(farmingMaxItemEligible)) {
    for (const scope of targetScopes(state, item, crops)) {
      const store = plannerProgressBucket(state, item, scope.cropId);
      const summary = summarizePrice(store, item);
      const currentLevel = Math.max(0, Number(summary.currentLevel || 0));
      const maxLevel = Math.max(1, Number(summary.maxLevel || item.max || 1));
      const section = sections.get(item.section) || sectionAccumulator(item.section);
      const fallback = earnedFallback(summary, store, item, resolveCost);
      const coins = Number(summary.costToMaxCoins);

      trackedTargets += 1;
      currentSteps += Math.min(maxLevel, currentLevel);
      totalSteps += maxLevel;
      if (currentLevel >= maxLevel) maxedTargets += 1;

      section.trackedTargets += 1;
      section.currentSteps += Math.min(maxLevel, currentLevel);
      section.totalSteps += maxLevel;
      if (currentLevel >= maxLevel) section.maxedTargets += 1;

      if (Number.isFinite(coins) && coins > 0) {
        knownCostCoins += coins;
        section.knownCostCoins += coins;
        knownCostComputedAtMs = oldestTimestamp(knownCostComputedAtMs, summary.costToMaxComputedAtMs);
        section.knownCostComputedAtMs = oldestTimestamp(
          section.knownCostComputedAtMs,
          summary.costToMaxComputedAtMs,
        );
      }

      remainingEarnedSteps += fallback.earned;
      remainingUnknownPriceSteps += fallback.unknown;
      section.remainingEarnedSteps += fallback.earned;
      section.remainingUnknownPriceSteps += fallback.unknown;

      if (fallback.unknown > 0) {
        unknownPriceTargets.push(Object.freeze({
          itemId: item.id,
          itemName: item.name,
          sectionId: item.section,
          sectionLabel: section.label,
          scopeLabel: scope.scopeLabel,
          unknownSteps: fallback.unknown,
        }));
      }

      sections.set(item.section, section);
    }
  }

  const breakdown = [...sections.values()]
    .map(finalizeSection)
    .sort((a, b) => {
      const aIncomplete = a.remainingUnknownPriceSteps > 0 ? 0 : 1;
      const bIncomplete = b.remainingUnknownPriceSteps > 0 ? 0 : 1;
      if (aIncomplete !== bIncomplete) return aIncomplete - bIncomplete;
      if (a.completionPercent !== b.completionPercent) return a.completionPercent - b.completionPercent;
      return a.label.localeCompare(b.label);
    });

  return Object.freeze({
    knownCostCoins,
    knownCostComputedAtMs,
    costComplete: remainingUnknownPriceSteps === 0,
    completionPercent: completionPercent(currentSteps, totalSteps),
    currentSteps,
    totalSteps,
    maxedTargets,
    trackedTargets,
    remainingEarnedSteps,
    remainingUnknownPriceSteps,
    breakdown: Object.freeze(breakdown),
    unknownPriceTargets: Object.freeze(unknownPriceTargets),
  });
}
