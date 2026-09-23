import { effectiveSetupItemRarity } from './setup-rarity.js';

export const MOSSY_FORTUNE_BY_RARITY = Object.freeze({
  COMMON: 5,
  UNCOMMON: 10,
  RARE: 15,
  EPIC: 20,
  LEGENDARY: 25,
  MYTHIC: 30,
});

export const MANTID_FORTUNE_BY_RARITY = Object.freeze({
  COMMON: 2,
  UNCOMMON: 4,
  RARE: 6,
  EPIC: 8,
  LEGENDARY: 10,
  MYTHIC: 12,
});

export const MANTID_BPC_BY_RARITY = Object.freeze({
  COMMON: 0.5,
  UNCOMMON: 0.5,
  RARE: 1,
  EPIC: 1.5,
  LEGENDARY: 2,
  MYTHIC: 2.5,
});

export const MANTID_BPC_PER_RECENT_PEST_KILL = 0.25;
export const MANTID_BPC_DYNAMIC_CAP_PER_PIECE = 5;
export const HELIANTHUS_BPC_PER_PIECE = 20;

export const PERFECT_PERIDOT_FORTUNE_BY_RARITY = Object.freeze({
  COMMON: 3,
  UNCOMMON: 4,
  RARE: 5,
  EPIC: 6,
  LEGENDARY: 8,
  MYTHIC: 10,
});

const HELIANTHUS_BASE_BY_SLOT = Object.freeze({
  helmet: 35,
  chestplate: 40,
  leggings: 40,
  boots: 35,
});

const FEAST_BY_PIECES = Object.freeze({
  0: 0,
  1: 0,
  2: 25,
  3: 50,
  4: 75,
});

function clean(value) {
  return String(value ?? '').replace(/§[0-9a-fk-or]/gi, '').trim();
}

function normalizedName(piece) {
  return clean(piece?.displayName || piece?.name).toLowerCase();
}

export function armorSlotForPiece(piece) {
  const name = normalizedName(piece);
  if (name.includes('helmet')) return 'helmet';
  if (name.includes('chestplate')) return 'chestplate';
  if (name.includes('leggings')) return 'leggings';
  if (name.includes('boots')) return 'boots';
  return null;
}

export function isHelianthusArmorPiece(piece) {
  return normalizedName(piece).startsWith('helianthus ') && Boolean(armorSlotForPiece(piece));
}

export function distinctHelianthusSlots(pieces) {
  return new Set((pieces || []).filter(isHelianthusArmorPiece).map(armorSlotForPiece));
}

export function helianthusBaseFortune(pieces) {
  let total = 0;
  for (const slot of distinctHelianthusSlots(pieces)) total += HELIANTHUS_BASE_BY_SLOT[slot] || 0;
  return total;
}

export function helianthusPieceCount(pieces) {
  return distinctHelianthusSlots(pieces).size;
}

export function helianthusFeastFortune(pieces) {
  return FEAST_BY_PIECES[helianthusPieceCount(pieces)] || 0;
}

export function mossyFortuneForPiece(piece) {
  if (String(piece?.reforge || '').toLowerCase() !== 'mossy') return 0;
  const rarity = effectiveSetupItemRarity(piece);
  return Number(MOSSY_FORTUNE_BY_RARITY[rarity] || 0);
}

export function mossyFortuneForPieces(pieces) {
  return (pieces || []).reduce((sum, piece) => sum + mossyFortuneForPiece(piece), 0);
}

export function mossyPieceCount(pieces) {
  return (pieces || []).filter(piece => String(piece?.reforge || '').toLowerCase() === 'mossy').length;
}

export function mantidPieceCount(pieces) {
  return (pieces || []).filter(piece => String(piece?.reforge || '').toLowerCase() === 'mantid').length;
}

export function mantidFortuneForPiece(piece) {
  if (String(piece?.reforge || '').toLowerCase() !== 'mantid') return 0;
  const rarity = effectiveSetupItemRarity(piece);
  return Number(MANTID_FORTUNE_BY_RARITY[rarity] || 0);
}

export function mantidFortuneForPieces(pieces) {
  return (pieces || []).reduce((sum, piece) => sum + mantidFortuneForPiece(piece), 0);
}

export function mantidBaseBonusPestChanceForPiece(piece) {
  if (String(piece?.reforge || '').toLowerCase() !== 'mantid') return 0;
  const rarity = effectiveSetupItemRarity(piece);
  return Number(MANTID_BPC_BY_RARITY[rarity] || 0);
}

export function mantidBaseBonusPestChanceForPieces(pieces) {
  return (pieces || []).reduce((sum, piece) => sum + mantidBaseBonusPestChanceForPiece(piece), 0);
}

function nonNegativeNumberOrNull(value) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : null;
}

export function mantidRecentKillBonusPestChance(pieces, recentPestKills) {
  const count = mantidPieceCount(pieces);
  if (!count) return 0;
  const kills = nonNegativeNumberOrNull(recentPestKills);
  if (kills === null) return null;
  const perPiece = Math.min(
    MANTID_BPC_DYNAMIC_CAP_PER_PIECE,
    kills * MANTID_BPC_PER_RECENT_PEST_KILL,
  );
  return count * perPiece;
}

export function helianthusBaseBonusPestChance(pieces) {
  return helianthusPieceCount(pieces) * HELIANTHUS_BPC_PER_PIECE;
}

export function pesterminatorTotalLevel(pieces) {
  return (pieces || []).reduce((sum, piece) => {
    const level = Number(piece?.enchantments?.pesterminator || 0);
    if (!Number.isFinite(level) || level <= 0) return sum;
    return sum + Math.min(6, Math.floor(level));
  }, 0);
}

export function pesterminatorFortune(pieces) {
  return pesterminatorTotalLevel(pieces) * 2;
}

export function pesterminatorBonusPestChance(pieces) {
  return pesterminatorTotalLevel(pieces);
}

export function sunsetTotalLevel(pieces) {
  return (pieces || []).reduce((sum, piece) => {
    const level = Number(piece?.enchantments?.sunset || 0);
    if (!Number.isFinite(level) || level <= 0) return sum;
    return sum + Math.min(5, Math.floor(level));
  }, 0);
}

export function thornsTotalLevel(pieces) {
  return (pieces || []).reduce((sum, piece) => {
    const level = Number(piece?.enchantments?.thorns || 0);
    if (!Number.isFinite(level) || level <= 0) return sum;
    // Normal current enchanting stops at IV, but Century/Raffle Pufferfish Hats
    // legitimately carry Thorns V, so the runtime must preserve that event item.
    return sum + Math.min(5, Math.floor(level));
  }, 0);
}

function perfectPeridotCountOnPiece(piece) {
  const gems = piece?.gems;
  if (Array.isArray(gems)) {
    return gems.filter(entry => {
      const text = String(entry || '').toUpperCase();
      return text.includes('PERFECT') && text.includes('PERIDOT');
    }).length;
  }
  if (!gems || typeof gems !== 'object') return 0;
  let count = 0;
  for (const [slot, value] of Object.entries(gems)) {
    if (!slot.toUpperCase().includes('PERIDOT')) continue;
    const quality = typeof value === 'string' ? value : value?.quality;
    if (String(quality || '').toUpperCase() === 'PERFECT') count += 1;
  }
  return count;
}

export function perfectPeridotCountOnArmor(pieces) {
  return (pieces || []).reduce((sum, piece) => sum + perfectPeridotCountOnPiece(piece), 0);
}

export function perfectPeridotFortuneOnArmor(pieces) {
  return (pieces || []).reduce((sum, piece) => {
    const count = perfectPeridotCountOnPiece(piece);
    if (!count) return sum;
    const rarity = effectiveSetupItemRarity(piece);
    return sum + count * Number(PERFECT_PERIDOT_FORTUNE_BY_RARITY[rarity] || 0);
  }, 0);
}
