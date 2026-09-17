import { DROP_SCALING } from './profit-engine.js';

export const PEST_MECHANICS_DATA_VERSION = 1;

const SOURCE = Object.freeze({
  pestCurrent: 'https://hypixel-skyblock.fandom.com/wiki/Pest',
  bonusPestChance: 'https://hypixel-skyblock.fandom.com/wiki/Bonus_Pest_Chance',
  pestWaresDay3: 'https://hypixel.net/threads/nov-13th-pesthunters-wares-chocolate-factory-additions-crimson-qol-and-more.5801731/',
  feastMay14: 'https://hypixel.net/threads/may-14-harvest-feast-changes.6096831/',
  vacuums: 'https://wiki.hypixel.net/Vacuums',
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

export const VACUUMS = Object.freeze({
  SKYMART_VACUUM: Object.freeze({ name: 'SkyMart Vacuum', damagePerSecond: 100, rarity: 'COMMON', tracker: false, stereoHarmony: false }),
  SKYMART_TURBO_VACUUM: Object.freeze({ name: 'SkyMart Turbo Vacuum', damagePerSecond: 120, rarity: 'UNCOMMON', tracker: true, stereoHarmony: false }),
  SKYMART_HYPER_VACUUM: Object.freeze({ name: 'SkyMart Hyper Vacuum', damagePerSecond: 150, rarity: 'RARE', tracker: true, stereoHarmony: false }),
  INFINI_VACUUM: Object.freeze({ name: 'InfiniVacuum™', damagePerSecond: 200, rarity: 'EPIC', tracker: true, stereoHarmony: false }),
  INFINI_VACUUM_HOOVERIUS: Object.freeze({ name: 'InfiniVacuum™ Hooverius', damagePerSecond: 250, rarity: 'LEGENDARY', tracker: true, stereoHarmony: true }),
});

export const PESTS = Object.freeze({
  fly: Object.freeze({ cropId: 'wheat', baseItemId: 'ENCHANTED_WHEAT', baseQuantity: 1, fortunePerExtraUnit: 35, status: 'VERIFIED' }),
  rat: Object.freeze({ cropId: 'pumpkin', baseItemId: 'ENCHANTED_PUMPKIN', baseQuantity: 1, fortunePerExtraUnit: 35, status: 'VERIFIED' }),
  slug: Object.freeze({ cropId: 'mushroom', baseItemId: 'ENCHANTED_MUSHROOM', baseQuantity: 1, fortunePerExtraUnit: 35, status: 'VERIFIED', notes: 'Red/Brown mushroom outcome is pest-state dependent.' }),
  mite: Object.freeze({ cropId: 'cactus', baseItemId: 'ENCHANTED_CACTUS_GREEN', baseQuantity: 2, fortunePerExtraUnit: 17.5, status: 'VERIFIED' }),
  mosquito: Object.freeze({ cropId: 'sugar-cane', baseItemId: 'ENCHANTED_SUGAR', baseQuantity: 2, fortunePerExtraUnit: 17.5, status: 'VERIFIED' }),
  moth: Object.freeze({ cropId: 'cocoa-beans', baseItemId: 'ENCHANTED_COCOA', baseQuantity: 3, fortunePerExtraUnit: 12, status: 'VERIFIED' }),
  beetle: Object.freeze({ cropId: 'nether-wart', baseItemId: 'ENCHANTED_NETHER_STALK', baseQuantity: 3, fortunePerExtraUnit: 12, status: 'VERIFIED' }),
  cricket: Object.freeze({ cropId: 'carrot', baseItemId: 'ENCHANTED_CARROT', baseQuantity: 3, fortunePerExtraUnit: 10.5, status: 'VERIFIED' }),
  locust: Object.freeze({ cropId: 'potato', baseItemId: 'ENCHANTED_POTATO', baseQuantity: 3, fortunePerExtraUnit: 10.5, status: 'VERIFIED' }),
  earthworm: Object.freeze({ cropId: 'melon', baseItemId: 'ENCHANTED_MELON', baseQuantity: 5, fortunePerExtraUnit: 7, status: 'VERIFIED' }),
  dragonfly: Object.freeze({ cropId: 'sunflower', baseItemId: 'ENCHANTED_SUNFLOWER', baseQuantity: 2, fortunePerExtraUnit: null, status: 'VERIFY', notes: 'Greenhouse pest exists; exact live scaling divisor still needs a first-party/current table.' }),
  firefly: Object.freeze({ cropId: 'moonflower', baseItemId: 'ENCHANTED_MOONFLOWER', baseQuantity: 2, fortunePerExtraUnit: null, status: 'VERIFY', notes: 'Greenhouse pest exists; exact live scaling divisor still needs a first-party/current table.' }),
  'praying-mantis': Object.freeze({ cropId: 'wild-rose', baseItemId: 'ENCHANTED_WILD_ROSE', baseQuantity: 2, fortunePerExtraUnit: null, status: 'VERIFY', notes: 'Greenhouse pest exists; exact live scaling divisor still needs a first-party/current table.' }),
  'field-mouse': Object.freeze({ cropId: null, baseItemId: null, baseQuantity: null, fortunePerExtraUnit: null, status: 'SPECIAL', notes: 'Random crop behavior; do not model as a normal crop-specific pest.' }),
});

/** Expected pests from a successful spawn event. */
export function expectedPestsPerSpawnFromBonusPestChance(bonusPestChance) {
  const value = Number(bonusPestChance);
  if (!Number.isFinite(value) || value < 0) return null;
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
  const multiplier = Number(spawnProbabilityMultiplier);
  return {
    spawnProbability: Number.isFinite(multiplier) && multiplier >= 0
      ? ACTIVE_PEST_SPAWN.baseProbabilityPerCropBreak * multiplier
      : null,
    spawnOpportunitiesPerBreak,
    pestsPerSpawnExpected,
    handlingSecondsPerPest,
  };
}

/**
 * Current guaranteed crop-drop expectation from a normal Pest.
 * Official Day-3 balancing defined base + Fortune/divisor and the current Pest
 * page still documents Farming + crop-specific Fortune as the relevant stats.
 */
export function expectedGuaranteedPestCropQuantity(pestId, { farmingFortune, cropFortune } = {}) {
  const pest = PESTS[pestId];
  if (!pest || pest.status !== 'VERIFIED' || !Number.isFinite(pest.fortunePerExtraUnit)) return null;
  const global = Number(farmingFortune);
  const crop = Number(cropFortune);
  if (!Number.isFinite(global) || global < 0 || !Number.isFinite(crop) || crop < 0) return null;
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

export function idealVacuumKillSeconds(vacuumId, pestHealth = 600) {
  const vacuum = VACUUMS[vacuumId];
  const health = Number(pestHealth);
  if (!vacuum || !Number.isFinite(health) || health < 0) return null;
  return health / vacuum.damagePerSecond;
}

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
