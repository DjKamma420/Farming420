import { toolKeyForCropId } from './migrations.js';
import { TOOL_TIER_CHAIN, highestChainTier } from './progression-chains.js';
import { deriveRarity } from './tool-rarity.js';
import { filledGemstoneSlots, toolGemstoneFortune, toolGemstoneSlotCount } from './gemstone-slots.js';

export const TOOL_GEM_ENTRY_ID = 'tool-gem-perfect-peridot-on-farming-tool';
export const TOOL_LEVEL_ENTRY_ID = 'tool-tool-base-counter-fortune';
export const TOOL_RECOMB_ENTRY_ID = 'tool-recombobulator-effect-on-tool-stats';

const BASE_RARITY_BY_TIER = Object.freeze({
  1: 'UNCOMMON',
  2: 'RARE',
  3: 'EPIC',
});

function entryLevel(bucket, id) {
  const level = Number(bucket?.levels?.[id] || 0);
  if (Number.isFinite(level) && level > 0) return level;
  return bucket?.owned?.[id] === true ? 1 : 0;
}

/**
 * Pure calculator contribution for the physical Farming Tool's Peridot slots.
 *
 * The workspace stores each socket in `bucket.gemSlots`. Older builds also had
 * one synthetic +30 upgrade row; that row is intentionally ignored by the
 * caller because real Peridot value depends on every slot's quality and on the
 * tool's current rarity.
 */
export function toolGemstoneContribution(state, cropId) {
  const bucket = state?.profile?.toolProgress?.[toolKeyForCropId(cropId)] || {};
  const stored = Array.isArray(bucket.gemSlots) ? bucket.gemSlots : [];
  const filled = stored.filter(slot => slot?.gem).length;
  const legacySelected = entryLevel(bucket, TOOL_GEM_ENTRY_ID) > 0;

  if (!filled) {
    return legacySelected
      ? { active: true, value: 0, incomplete: true, filled: 0, available: 0, reason: 'legacy one-shot tool gemstone state requires per-slot selection' }
      : { active: false, value: 0, incomplete: false, filled: 0, available: 0, reason: null };
  }

  const toolLevel = entryLevel(bucket, TOOL_LEVEL_ENTRY_ID);
  const tier = highestChainTier(bucket, TOOL_TIER_CHAIN);
  const available = toolGemstoneSlotCount(toolLevel, tier);
  const baseRarity = BASE_RARITY_BY_TIER[tier] || null;
  const rarity = deriveRarity({
    base: baseRarity,
    recombobulated: entryLevel(bucket, TOOL_RECOMB_ENTRY_ID) > 0,
    canRecombobulate: true,
  }) || String(bucket.toolRarity || '').trim().toUpperCase() || null;

  if (!rarity) {
    return { active: true, value: 0, incomplete: true, filled, available, reason: 'tool rarity unavailable for Peridot scaling' };
  }

  const value = toolGemstoneFortune(stored, rarity, available);
  if (value == null) {
    return { active: true, value: 0, incomplete: true, filled, available, reason: 'tool gemstone quality or rarity is not modeled' };
  }

  return {
    active: filledGemstoneSlots(stored, available) > 0,
    value,
    incomplete: false,
    filled: filledGemstoneSlots(stored, available),
    available,
    rarity,
    reason: null,
  };
}
