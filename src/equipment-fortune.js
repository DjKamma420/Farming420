import {
  GREEN_THUMB_FORTUNE_PER_LEVEL_PER_UNIQUE_VISITOR,
  ROOTED_FORTUNE_BY_RARITY,
  THORNY_FORTUNE_BY_RARITY,
  THORNY_OVERBLOOM_BY_RARITY,
  THORNY_OVERBLOOM_PER_ARMOR_THORNS_TIER,
} from '../research/equipment-fortune.js';
import { effectiveSetupItemRarity } from './setup-rarity.js';

const BLOSSOM_NAMES = Object.freeze([
  'blossom necklace',
  'blossom cloak',
  'blossom belt',
  'blossom bracelet',
]);

export const SQUEAKY_FORTUNE_BY_RARITY = Object.freeze({
  COMMON: 2,
  UNCOMMON: 4,
  RARE: 6,
  EPIC: 8,
  LEGENDARY: 10,
  MYTHIC: 12,
});

export const SQUEAKY_BPC_BY_RARITY = Object.freeze({
  COMMON: 0.5,
  UNCOMMON: 0.5,
  RARE: 1,
  EPIC: 1.5,
  LEGENDARY: 2,
  MYTHIC: 2.5,
});

export const SQUEAKY_COOLDOWN_REDUCTION_PCT_PER_PIECE = 2.5;

const PESTHUNTER_IDS = Object.freeze(new Set([
  'PESTHUNTERS_NECKLACE',
  'PESTHUNTERS_CLOAK',
  'PESTHUNTERS_BELT',
  'PESTHUNTERS_GLOVES',
]));
export const PEST_VEST_ID = 'PEST_VEST';
const PESTHUNTER_BPC_PER_PIECE = 5;
const PESTHUNTER_COOLDOWN_REDUCTION_PCT_PER_PIECE = 10;
const PEST_VEST_BPC = 10;
const PEST_VEST_COOLDOWN_REDUCTION_PCT = 15;
const ERADICATOR_FORTUNE_BY_PIECES = Object.freeze({ 0: 0, 1: 0, 2: 50, 3: 75, 4: 100 });

function clean(value) {
  return String(value ?? '').replace(/§[0-9a-fk-or]/gi, '').trim();
}

function normalizeName(value) {
  return clean(value).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

export function isBlossomPiece(piece) {
  const name = normalizeName(piece?.displayName || piece?.name);
  return BLOSSOM_NAMES.includes(name);
}

export function blossomPieceCount(pieces) {
  return (pieces || []).filter(isBlossomPiece).length;
}

export function blossomBaseFortune(pieces) {
  return blossomPieceCount(pieces) * 7;
}

function normalizedSkyblockId(piece) {
  return String(piece?.skyblockId || '').trim().toUpperCase();
}

export function isPesthunterPiece(piece) {
  const id = normalizedSkyblockId(piece);
  if (PESTHUNTER_IDS.has(id)) return true;
  const name = normalizeName(piece?.displayName || piece?.name);
  return name.startsWith('pesthunter s ') || name.startsWith('pesthunters ');
}

export function isPestVest(piece) {
  if (normalizedSkyblockId(piece) === PEST_VEST_ID) return true;
  return normalizeName(piece?.displayName || piece?.name) === 'pest vest';
}

export function isPestEquipmentPiece(piece) {
  return isPesthunterPiece(piece) || isPestVest(piece);
}

export function pesthunterPieceCount(pieces) {
  return (pieces || []).filter(isPesthunterPiece).length;
}

export function pestEquipmentBaseBonusPestChance(pieces) {
  return (pieces || []).reduce((sum, piece) => {
    if (isPestVest(piece)) return sum + PEST_VEST_BPC;
    if (isPesthunterPiece(piece)) return sum + PESTHUNTER_BPC_PER_PIECE;
    return sum;
  }, 0);
}

export function pestEquipmentBaseCooldownReductionPct(pieces) {
  return (pieces || []).reduce((sum, piece) => {
    if (isPestVest(piece)) return sum + PEST_VEST_COOLDOWN_REDUCTION_PCT;
    if (isPesthunterPiece(piece)) return sum + PESTHUNTER_COOLDOWN_REDUCTION_PCT_PER_PIECE;
    return sum;
  }, 0);
}

export function pesthunterEradicatorFortune(pieces) {
  return ERADICATOR_FORTUNE_BY_PIECES[pesthunterPieceCount(pieces)] || 0;
}

export function squeakyPieceCount(pieces) {
  return (pieces || []).filter(piece => String(piece?.reforge || '').toLowerCase() === 'squeaky').length;
}

export function squeakyFortuneForPiece(piece) {
  if (String(piece?.reforge || '').toLowerCase() !== 'squeaky') return 0;
  const rarity = effectiveSetupItemRarity(piece);
  return Number(SQUEAKY_FORTUNE_BY_RARITY[rarity] || 0);
}

export function squeakyFortuneForPieces(pieces) {
  return (pieces || []).reduce((sum, piece) => sum + squeakyFortuneForPiece(piece), 0);
}

export function squeakyBaseBonusPestChanceForPiece(piece) {
  if (String(piece?.reforge || '').toLowerCase() !== 'squeaky') return 0;
  const rarity = effectiveSetupItemRarity(piece);
  return Number(SQUEAKY_BPC_BY_RARITY[rarity] || 0);
}

export function squeakyBaseBonusPestChanceForPieces(pieces) {
  return (pieces || []).reduce((sum, piece) => sum + squeakyBaseBonusPestChanceForPiece(piece), 0);
}

export function squeakyCooldownReductionPct(pieces) {
  return squeakyPieceCount(pieces) * SQUEAKY_COOLDOWN_REDUCTION_PCT_PER_PIECE;
}

export function rootedFortuneForPiece(piece) {
  if (String(piece?.reforge || '').toLowerCase() !== 'rooted') return 0;
  const rarity = effectiveSetupItemRarity(piece);
  return Number(ROOTED_FORTUNE_BY_RARITY[rarity] || 0);
}

export function rootedFortuneForPieces(pieces) {
  return (pieces || []).reduce((sum, piece) => sum + rootedFortuneForPiece(piece), 0);
}

export function thornyPieceCount(pieces) {
  return (pieces || []).filter(piece => String(piece?.reforge || '').toLowerCase() === 'thorny').length;
}

export function thornyFortuneForPiece(piece) {
  if (String(piece?.reforge || '').toLowerCase() !== 'thorny') return 0;
  const rarity = effectiveSetupItemRarity(piece);
  return Number(THORNY_FORTUNE_BY_RARITY[rarity] || 0);
}

export function thornyFortuneForPieces(pieces) {
  return (pieces || []).reduce((sum, piece) => sum + thornyFortuneForPiece(piece), 0);
}

export function thornyBaseOverbloomForPiece(piece) {
  if (String(piece?.reforge || '').toLowerCase() !== 'thorny') return 0;
  const rarity = effectiveSetupItemRarity(piece);
  return Number(THORNY_OVERBLOOM_BY_RARITY[rarity] || 0);
}

export function thornyBaseOverbloomForPieces(pieces) {
  return (pieces || []).reduce((sum, piece) => sum + thornyBaseOverbloomForPiece(piece), 0);
}

export function thornyArmorBonusOverbloom(equipmentPieces, totalArmorThornsTier) {
  const thornsTiers = Math.max(0, Number(totalArmorThornsTier) || 0);
  const value = thornyPieceCount(equipmentPieces)
    * thornsTiers
    * THORNY_OVERBLOOM_PER_ARMOR_THORNS_TIER;
  // Keep decimal stat totals stable for storage/tests instead of exposing
  // floating-point artifacts such as 6.800000000000001.
  return Math.round(value * 1e10) / 1e10;
}

export function greenThumbTotalLevel(pieces) {
  return (pieces || []).reduce((sum, piece) => {
    const level = Number(piece?.enchantments?.green_thumb || 0);
    if (!Number.isFinite(level) || level <= 0) return sum;
    return sum + Math.min(5, Math.floor(level));
  }, 0);
}

function visitorCountOrNull(value) {
  if (value === null || value === undefined || value === '') return null;
  const visitors = Number(value);
  return Number.isFinite(visitors) && visitors >= 0 ? visitors : null;
}

export function greenThumbFortune(pieces, uniqueVisitors) {
  const visitors = visitorCountOrNull(uniqueVisitors);
  if (visitors === null) return null;
  return greenThumbTotalLevel(pieces)
    * visitors
    * GREEN_THUMB_FORTUNE_PER_LEVEL_PER_UNIQUE_VISITOR;
}

/** The next +1 Green Thumb level on one equipped piece adds this much FF. */
export function greenThumbMarginalPerLevel(uniqueVisitors) {
  const visitors = visitorCountOrNull(uniqueVisitors);
  if (visitors === null) return null;
  return visitors * GREEN_THUMB_FORTUNE_PER_LEVEL_PER_UNIQUE_VISITOR;
}

export function minimumGreenThumbLevel(pieces) {
  if (!Array.isArray(pieces) || !pieces.length) return 0;
  const levels = pieces.map(piece => Number(piece?.enchantments?.green_thumb || 0));
  if (levels.some(level => level <= 0)) return 0;
  return Math.min(...levels);
}
