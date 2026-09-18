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
  return thornyPieceCount(equipmentPieces)
    * thornsTiers
    * THORNY_OVERBLOOM_PER_ARMOR_THORNS_TIER;
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
