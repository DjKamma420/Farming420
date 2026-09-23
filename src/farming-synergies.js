import { mooshroomStrengthFortune } from './mooshroom-cow.js';

export const FARMING_SYNERGY_VERIFIED = '2026-09-23';

export const FARMING_SYNERGY_SOURCES = Object.freeze({
  attributes: 'https://hypixelskyblock.minecraft.wiki/w/Attributes',
  enrichments: 'https://hypixelskyblock.minecraft.wiki/w/Enrichments',
  accessoryBag: 'https://hypixelskyblock.minecraft.wiki/w/Accessory_Bag',
  powerStones: 'https://hypixelskyblock.minecraft.wiki/w/Power_Stones',
});

export const ELEMENTAL_STRENGTH_SHARDS = Object.freeze([
  Object.freeze({ id: 'flash', name: 'Flash Shard', attribute: 'Light Elemental', rarity: 'COMMON', perLevelStrength: 1, maxLevel: 10 }),
  Object.freeze({ id: 'quake', name: 'Quake Shard', attribute: 'Stone Elemental', rarity: 'UNCOMMON', perLevelStrength: 1, maxLevel: 10 }),
  Object.freeze({ id: 'bolt', name: 'Bolt Shard', attribute: 'Lightning Elemental', rarity: 'RARE', perLevelStrength: 1, maxLevel: 10 }),
  Object.freeze({ id: 'aero', name: 'Aero Shard', attribute: 'Wind Elemental', rarity: 'EPIC', perLevelStrength: 1, maxLevel: 10 }),
  Object.freeze({ id: 'tempest', name: 'Tempest Shard', attribute: 'Storm Elemental', rarity: 'LEGENDARY', perLevelStrength: 1, maxLevel: 10 }),
]);

export const FARMING_SHARD_SYNERGIES = Object.freeze({
  echoOfElemental: Object.freeze({
    id: 'starborn',
    name: 'Starborn Shard',
    attribute: 'Echo of Elemental',
    maxLevel: 10,
    perLevelPercent: 2,
    target: 'other Elemental Family shard effects',
    farmingUse: 'Boosts all five Elemental Strength attributes, which can increase Legendary Mooshroom Cow Farming Fortune.',
  }),
  unlimitedPower: Object.freeze({
    id: 'jormung',
    name: 'Jormung Shard',
    attribute: 'Unlimited Power',
    maxLevel: 10,
    perLevelPercent: 0.1,
    target: 'Strength',
    farmingUse: 'Percentage Strength can increase Legendary Mooshroom Cow Farming Fortune.',
  }),
  almightyEcho: Object.freeze({
    id: 'molthorn',
    name: 'Molthorn Shard',
    attribute: 'Almighty Echo',
    maxLevel: 10,
    perLevelPercent: 5,
    target: '"Unlimited" Attributes',
    farmingUse: 'Boosts Jormung Unlimited Power and therefore its Strength contribution.',
  }),
  tuningBox: Object.freeze({
    id: 'hideonbox',
    name: 'Hideonbox Shard',
    attribute: 'Tuning Box',
    maxLevel: 10,
    perLevelTuningPoints: 1,
    target: 'Tuning Points',
    farmingUse: 'Can become extra Strength only when those Tuning Points are assigned to Strength.',
  }),
  filterUpgrade: Object.freeze({
    id: 'mite',
    name: 'Mite Shard',
    attribute: 'Filter Upgrade',
    maxLevel: 10,
    perLevelPercent: 2,
    target: 'Atmospheric Filter',
    farmingUse: 'Strengthens the active seasonal Atmospheric Filter effect by up to 20%.',
  }),
  echoOfWisdom: Object.freeze({
    id: 'wyvern',
    name: 'Wyvern Shard',
    attribute: 'Echo of Wisdom',
    maxLevel: 10,
    perLevelPercent: 2,
    target: 'Wisdom Attributes',
    farmingUse: 'Can strengthen farming Wisdom attributes such as Garden Wisdom; this affects XP rather than crop profit.',
  }),
  queenlyEcho: Object.freeze({
    id: 'queen-snake',
    name: 'Queen Snake Shard',
    attribute: 'Queenly Echo',
    maxLevel: 10,
    perLevelPercent: 5,
    target: '"Visitor" Attributes',
    farmingUse: 'Can strengthen visitor-focused attributes; keep this separate from Farming Fortune.',
  }),
  echoOfEchoes: Object.freeze({
    id: 'tiamat',
    name: 'Tiamat Shard',
    attribute: 'Echo of Echoes',
    maxLevel: 10,
    perLevelPercent: 5,
    target: '"Echo" Attributes',
    farmingUse: 'A higher-order shard booster. Farming420 records it but does not recursively guess stacking order without a verified rule.',
  }),
});

function level(value, cap = 10) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.max(0, Math.min(cap, Math.floor(number)));
}

export function elementalStrengthFromShardLevels(levels = {}, starbornLevel = 0) {
  const baseStrength = ELEMENTAL_STRENGTH_SHARDS.reduce(
    (sum, shard) => sum + level(levels?.[shard.id], shard.maxLevel) * shard.perLevelStrength,
    0,
  );
  const boostPercent = level(starbornLevel, FARMING_SHARD_SYNERGIES.echoOfElemental.maxLevel)
    * FARMING_SHARD_SYNERGIES.echoOfElemental.perLevelPercent;
  const effectiveStrength = baseStrength * (1 + boostPercent / 100);
  return Object.freeze({
    baseStrength,
    boostPercent,
    bonusStrength: effectiveStrength - baseStrength,
    effectiveStrength,
  });
}

export function nextElementalShardStrength(shardId, starbornLevel = 0) {
  const shard = ELEMENTAL_STRENGTH_SHARDS.find(row => row.id === shardId);
  if (!shard) return 0;
  const boostPercent = level(starbornLevel, FARMING_SHARD_SYNERGIES.echoOfElemental.maxLevel)
    * FARMING_SHARD_SYNERGIES.echoOfElemental.perLevelPercent;
  return shard.perLevelStrength * (1 + boostPercent / 100);
}

export function jormungStrengthPercent(jormungLevel = 0, molthornLevel = 0) {
  const basePercent = level(jormungLevel, FARMING_SHARD_SYNERGIES.unlimitedPower.maxLevel)
    * FARMING_SHARD_SYNERGIES.unlimitedPower.perLevelPercent;
  const unlimitedBoostPercent = level(molthornLevel, FARMING_SHARD_SYNERGIES.almightyEcho.maxLevel)
    * FARMING_SHARD_SYNERGIES.almightyEcho.perLevelPercent;
  return basePercent * (1 + unlimitedBoostPercent / 100);
}

export function cowFortuneDeltaForAddedStrength({
  currentStrength,
  addedStrength,
  cowLevel = 100,
  rarity = 'LEGENDARY',
} = {}) {
  const beforeStrength = Number(currentStrength);
  const delta = Number(addedStrength);
  if (!Number.isFinite(beforeStrength) || beforeStrength < 0 || !Number.isFinite(delta) || delta < 0) return null;
  const before = mooshroomStrengthFortune(beforeStrength, cowLevel, rarity);
  const after = mooshroomStrengthFortune(beforeStrength + delta, cowLevel, rarity);
  return Object.freeze({
    beforeStrength,
    afterStrength: beforeStrength + delta,
    addedStrength: delta,
    beforeFortune: before,
    afterFortune: after,
    deltaFortune: after - before,
  });
}

export function cowFortuneDeltaForStrengthPercentChange({
  currentStrength,
  currentPercent = 0,
  nextPercent = 0,
  cowLevel = 100,
  rarity = 'LEGENDARY',
} = {}) {
  const observed = Number(currentStrength);
  const current = Number(currentPercent);
  const next = Number(nextPercent);
  if (![observed, current, next].every(Number.isFinite) || observed < 0 || current < 0 || next < current) return null;
  const underlyingStrength = observed / (1 + current / 100);
  const nextStrength = underlyingStrength * (1 + next / 100);
  return cowFortuneDeltaForAddedStrength({
    currentStrength: observed,
    addedStrength: Math.max(0, nextStrength - observed),
    cowLevel,
    rarity,
  });
}

export function strengthUntilNextCowFortune(currentStrength, cowLevel = 100, rarity = 'LEGENDARY') {
  const strength = Number(currentStrength);
  if (!Number.isFinite(strength) || strength < 0 || String(rarity || '').toUpperCase() !== 'LEGENDARY') return null;
  const before = mooshroomStrengthFortune(strength, cowLevel, rarity);
  const requirement = 40 - (0.2 * Math.max(1, Math.min(100, Math.floor(Number(cowLevel) || 1))));
  const threshold = ((before + 1) * requirement) / 0.7;
  return Math.max(0, threshold - strength);
}
