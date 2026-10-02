import { GARDEN_VACUUM_ITEMS } from './exact-farming-items.js';
import { vacuumPhysicalStats } from './vacuum-state.js';
import { DROP_SCALING } from './profit-engine.js';
import { finiteNonNegative } from './finite-number.js';

export const PEST_MECHANICS_DATA_VERSION = 1;

const SOURCE = Object.freeze({
  pestCurrent: 'https://hypixel-skyblock.fandom.com/wiki/Pest',
  bonusPestChance: 'https://hypixel-skyblock.fandom.com/wiki/Bonus_Pest_Chance',
  pestWaresDay3: 'https://hypixel.net/threads/nov-13th-pesthunters-wares-chocolate-factory-additions-crimson-qol-and-more.5801731/',
  feastMay14: 'https://hypixel.net/threads/may-14-harvest-feast-changes.6096831/',
  // The official wiki closed in July 2026; the community wiki carries this
  // page and is already the repository's cited source for it.
  vacuums: 'https://hypixelskyblock.minecraft.wiki/w/Vacuums',
});

export const ACTIVE_PEST_SPAWN = Object.freeze({
  status: 'ACTIVE',
  baseProbabilityPerCropBreak: 0.002,
  gardenLevelRequired: 5,
  basePestsPerSuccessfulSpawn: 1,
  gardenPestCap: 8,
  fortunePenaltyStartsAtPestCount: 4,
  source: SOURCE.pestCurrent,
});

export const VACUUMS = Object.freeze(Object.fromEntries(GARDEN_VACUUM_ITEMS.map(record => [record.id, Object.freeze({
  name: record.name, damagePerPull: record.baseDamage, rarity: record.rarity,
  tracker: record.tier > 1, stereoHarmony: record.tier === 5,
})])));

export const PESTS = Object.freeze({
  fly: Object.freeze({ cropId: 'wheat', baseItemId: 'ENCHANTED_WHEAT', baseQuantity: 1, fortunePerExtraUnit: null, historicalFortunePerExtraUnit: 35, status: 'VERIFY', sourceDate: '2024-11-13', confidence: 'HISTORICAL_ALPHA', source: SOURCE.pestWaresDay3 }),
  rat: Object.freeze({ cropId: 'pumpkin', baseItemId: 'ENCHANTED_PUMPKIN', baseQuantity: 1, fortunePerExtraUnit: null, historicalFortunePerExtraUnit: 35, status: 'VERIFY', sourceDate: '2024-11-13', confidence: 'HISTORICAL_ALPHA', source: SOURCE.pestWaresDay3 }),
  slug: Object.freeze({ cropId: 'mushroom', baseItemId: 'ENCHANTED_MUSHROOM', baseQuantity: 1, fortunePerExtraUnit: null, historicalFortunePerExtraUnit: 35, status: 'VERIFY', sourceDate: '2024-11-13', confidence: 'HISTORICAL_ALPHA', source: SOURCE.pestWaresDay3, notes: 'Red/Brown mushroom outcome is pest-state dependent.' }),
  mite: Object.freeze({ cropId: 'cactus', baseItemId: 'ENCHANTED_CACTUS_GREEN', baseQuantity: 2, fortunePerExtraUnit: null, historicalFortunePerExtraUnit: 17.5, status: 'VERIFY', sourceDate: '2024-11-13', confidence: 'HISTORICAL_ALPHA', source: SOURCE.pestWaresDay3 }),
  mosquito: Object.freeze({ cropId: 'sugar-cane', baseItemId: 'ENCHANTED_SUGAR', baseQuantity: 2, fortunePerExtraUnit: null, historicalFortunePerExtraUnit: 17.5, status: 'VERIFY', sourceDate: '2024-11-13', confidence: 'HISTORICAL_ALPHA', source: SOURCE.pestWaresDay3 }),
  moth: Object.freeze({ cropId: 'cocoa-beans', baseItemId: 'ENCHANTED_COCOA', baseQuantity: 3, fortunePerExtraUnit: null, historicalFortunePerExtraUnit: 12, status: 'VERIFY', sourceDate: '2024-11-13', confidence: 'HISTORICAL_ALPHA', source: SOURCE.pestWaresDay3 }),
  beetle: Object.freeze({ cropId: 'nether-wart', baseItemId: 'ENCHANTED_NETHER_STALK', baseQuantity: 3, fortunePerExtraUnit: null, historicalFortunePerExtraUnit: 12, status: 'VERIFY', sourceDate: '2024-11-13', confidence: 'HISTORICAL_ALPHA', source: SOURCE.pestWaresDay3 }),
  cricket: Object.freeze({ cropId: 'carrot', baseItemId: 'ENCHANTED_CARROT', baseQuantity: 3, fortunePerExtraUnit: null, historicalFortunePerExtraUnit: 10.5, status: 'VERIFY', sourceDate: '2024-11-13', confidence: 'HISTORICAL_ALPHA', source: SOURCE.pestWaresDay3 }),
  locust: Object.freeze({ cropId: 'potato', baseItemId: 'ENCHANTED_POTATO', baseQuantity: 3, fortunePerExtraUnit: null, historicalFortunePerExtraUnit: 10.5, status: 'VERIFY', sourceDate: '2024-11-13', confidence: 'HISTORICAL_ALPHA', source: SOURCE.pestWaresDay3 }),
  earthworm: Object.freeze({ cropId: 'melon', baseItemId: 'ENCHANTED_MELON', baseQuantity: 5, fortunePerExtraUnit: null, historicalFortunePerExtraUnit: 7, status: 'VERIFY', sourceDate: '2024-11-13', confidence: 'HISTORICAL_ALPHA', source: SOURCE.pestWaresDay3 }),
  dragonfly: Object.freeze({ cropId: 'sunflower', baseItemId: 'ENCHANTED_SUNFLOWER', baseQuantity: 2, fortunePerExtraUnit: null, status: 'VERIFY', notes: 'Greenhouse pest exists; exact live scaling divisor still needs a first-party/current table.' }),
  firefly: Object.freeze({ cropId: 'moonflower', baseItemId: 'ENCHANTED_MOONFLOWER', baseQuantity: 2, fortunePerExtraUnit: null, status: 'VERIFY', notes: 'Greenhouse pest exists; exact live scaling divisor still needs a first-party/current table.' }),
  'praying-mantis': Object.freeze({ cropId: 'wild-rose', baseItemId: 'ENCHANTED_WILD_ROSE', baseQuantity: 2, fortunePerExtraUnit: null, status: 'VERIFY', notes: 'Greenhouse pest exists; exact live scaling divisor still needs a first-party/current table.' }),
  'field-mouse': Object.freeze({ cropId: null, baseItemId: null, baseQuantity: null, fortunePerExtraUnit: null, status: 'SPECIAL', notes: 'Random crop behavior; do not model as a normal crop-specific pest.' }),
});

/** Expected pests from a successful spawn event. */
export function expectedPestsPerSpawnFromBonusPestChance(bonusPestChance) {
  const value = finiteNonNegative(bonusPestChance);
  if (value === null) return null;
  return 1 + Math.floor(value / 100) + (value % 100) / 100;
}

/**
 * Build the spawn part consumed by profit-engine.js.
 * `spawnProbabilityMultiplier` is explicit so Spray/Repellent/event modifiers
 * are never guessed by this module.
 */
export function activePestSpawnInput({
  bonusPestChance,
  handlingSecondsPerPest,
  spawnProbabilityMultiplier = 1,
  spawnOpportunitiesPerBreak = 1,
} = {}) {
  const pestsPerSpawnExpected = expectedPestsPerSpawnFromBonusPestChance(bonusPestChance);
  const multiplier = finiteNonNegative(spawnProbabilityMultiplier);
  return {
    spawnProbability: multiplier !== null
      ? ACTIVE_PEST_SPAWN.baseProbabilityPerCropBreak * multiplier
      : null,
    spawnOpportunitiesPerBreak,
    pestsPerSpawnExpected,
    handlingSecondsPerPest,
  };
}

/**
 * Guaranteed crop-drop expectation requires a verified current divisor.
 * The historical 2024 Alpha divisors are retained as evidence, not live formulas.
 */
export function expectedGuaranteedPestCropQuantity(pestId, { farmingFortune, cropFortune } = {}) {
  const pest = PESTS[pestId];
  if (!pest || pest.status !== 'VERIFIED' || !Number.isFinite(pest.fortunePerExtraUnit)) return null;
  const global = finiteNonNegative(farmingFortune);
  const crop = finiteNonNegative(cropFortune);
  if (global === null || crop === null) return null;
  return pest.baseQuantity + (global + crop) / pest.fortunePerExtraUnit;
}

export function guaranteedPestCropDropInput(pestId, stats = {}, unitValueCoins = null) {
  const pest = PESTS[pestId];
  if (!pest) return null;
  return {
    id: `${pestId}-guaranteed-crop`,
    baseProbability: 1,
    rollsPerPest: 1,
    expectedQuantity: expectedGuaranteedPestCropQuantity(pestId, stats),
    unitValueCoins,
    scaling: DROP_SCALING.NONE,
    dataStatus: pest.status,
    source: SOURCE.pestWaresDay3,
  };
}

/**
 * Since 2026-05-14, non-guaranteed Pest drops scale with Overbloom rather than
 * Farming Fortune. `pestOverbloom` is an additive context-only Overbloom axis.
 */
export function pestRngDropInput({ id, baseProbability, expectedQuantity = 1, unitValueCoins = null, source = SOURCE.feastMay14 } = {}) {
  return {
    id,
    baseProbability,
    rollsPerPest: 1,
    expectedQuantity,
    unitValueCoins,
    scaling: DROP_SCALING.PEST_OVERBLOOM,
    source,
  };
}

export function feastPestRareCropDropInput(pestId, unitValueCoins = null) {
  const pest = PESTS[pestId];
  if (!pest) return null;
  const fieldMouse = pestId === 'field-mouse';
  return {
    id: fieldMouse ? 'field-mouse-feast-rare-crop' : `${pestId}-feast-rare-crop`,
    baseProbability: fieldMouse ? 0.30 : 0.15,
    rollsPerPest: 1,
    expectedQuantity: 1,
    unitValueCoins,
    scaling: DROP_SCALING.PEST_OVERBLOOM,
    inSeasonOnly: true,
    randomInSeasonCrop: fieldMouse,
    source: SOURCE.feastMay14,
  };
}

/** Ideal damage-unit count only. Travel, latency and pull frequency are unknown. */
export function idealVacuumPullCount(vacuumOrBucket, pestHealth = 600) {
  const bucket = typeof vacuumOrBucket === 'string' ? { skyblockId: vacuumOrBucket } : vacuumOrBucket;
  const stats = vacuumPhysicalStats(bucket);
  const health = finiteNonNegative(pestHealth);
  if (!stats.selected || health === null || !(stats.damage > 0)) return null;
  return Math.ceil(health / stats.damage);
}

/** @deprecated No sourced damage-unit cadence or real handling duration exists. */
export function idealVacuumKillSeconds() { return null; }

export function pestDataCoverage() {
  const normal = Object.entries(PESTS).filter(([id]) => id !== 'field-mouse');
  return Object.freeze({
    totalCropPests: normal.length,
    guaranteedDropFormulaVerified: normal.filter(([, pest]) => pest.status === 'VERIFIED').length,
    unresolvedGuaranteedDropFormulaIds: normal.filter(([, pest]) => pest.status !== 'VERIFIED').map(([id]) => id),
    vacuumTiers: Object.keys(VACUUMS).length,
  });
}

export const PEST_SOURCE_NOTES = Object.freeze({
  guaranteedCropDropSource: SOURCE.pestWaresDay3,
  spawnAndHealthSource: SOURCE.pestCurrent,
  bonusPestChanceSource: SOURCE.bonusPestChance,
  currentRngScalingSource: SOURCE.feastMay14,
  vacuumSource: SOURCE.vacuums,
  warning: 'Community Pest pages can still show the pre-2026-05-14 Farming-Fortune RNG formula. The official May 14 patch supersedes it for non-guaranteed Pest drops.',
});
