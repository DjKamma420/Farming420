export const GEMSTONE_SLOTS_VERIFIED = '2026-09-17';
export const TOOL_GEMSTONE_SOURCE = 'https://hypixel-skyblock.fandom.com/wiki/Module:Item/ApiData';
export const PERIDOT_VALUES_SOURCE = 'https://hypixel.net/threads/list-of-item-in-skyblock-major-update.6123513/';

export const GEMSTONE_QUALITIES = Object.freeze(['ROUGH', 'FLAWED', 'FINE', 'FLAWLESS', 'PERFECT']);
export const TOOL_GEMSTONE_TYPES = Object.freeze(['PERIDOT']);
export const TOOL_GEMSTONE_SLOT_COUNT = 4;
export const TOOL_GEMSTONE_LEVEL_THRESHOLDS = Object.freeze([5, 15, 25, 50]);
export const TOOL_GEMSTONE_MAX_BY_TIER = Object.freeze({ 1: 2, 2: 3, 3: 4 });
export const GEMSTONE_RARITIES = Object.freeze(['COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY', 'MYTHIC']);

/**
 * Official item definitions gate Peridot sockets at tool levels 5/15/25/50.
 * Mk. I defines only the first two sockets, Mk. II the first three and Mk. III
 * all four. A socket is usable only when both its level requirement and tool
 * tier exist.
 */
export function toolGemstoneSlotCountForLevel(level) {
  const value = Math.max(0, Math.min(50, Math.floor(Number(level) || 0)));
  return TOOL_GEMSTONE_LEVEL_THRESHOLDS.filter(required => value >= required).length;
}

export function toolGemstoneSlotCount(level, tier = 3) {
  const normalizedTier = Math.max(1, Math.min(3, Math.floor(Number(tier) || 1)));
  return Math.min(
    toolGemstoneSlotCountForLevel(level),
    TOOL_GEMSTONE_MAX_BY_TIER[normalizedTier] || 0,
  );
}

export const PERIDOT_FORTUNE = Object.freeze({
  ROUGH: Object.freeze([0.5, 1, 1.5, 2, 2.5, 3]),
  FLAWED: Object.freeze([1, 1.5, 2, 2.5, 3, 4]),
  FINE: Object.freeze([1.5, 2, 3, 4, 5, 6]),
  FLAWLESS: Object.freeze([2, 3, 4, 5, 6, 8]),
  PERFECT: Object.freeze([3, 4, 5, 6, 8, 10]),
});

export function emptyGemstoneSlot(index) {
  return { id: `slot-${Number(index) + 1}`, unlocked: false, unlockCostCoins: null, gem: null };
}

export function normalizeGemstoneSlot(raw, index) {
  const source = raw && typeof raw === 'object' ? raw : {};
  const gem = normalizeToolGem(source.gem);
  const cost = source.unlockCostCoins === '' || source.unlockCostCoins == null ? null : Math.max(0, Number(source.unlockCostCoins) || 0);
  return { id: `slot-${Number(index) + 1}`, unlocked: source.unlocked === true || Boolean(gem), unlockCostCoins: cost, gem };
}

export function normalizeToolGemstoneSlots(raw, count = TOOL_GEMSTONE_SLOT_COUNT) {
  const source = Array.isArray(raw) ? raw : [];
  const size = Math.max(0, Math.min(TOOL_GEMSTONE_SLOT_COUNT, Math.floor(Number(count) || 0)));
  return Array.from({ length: size }, (_, index) => normalizeGemstoneSlot(source[index], index));
}

export function normalizeToolGem(value) {
  if (!value) return null;
  const text = typeof value === 'string' ? value.trim().toUpperCase() : `${value.quality || ''} ${value.type || ''}`.trim().toUpperCase();
  const match = text.match(/^(ROUGH|FLAWED|FINE|FLAWLESS|PERFECT)\s+(PERIDOT)$/);
  return match ? `${match[1]} ${match[2]}` : null;
}

export function gemstoneQuality(value) {
  return normalizeToolGem(value)?.split(' ')[0] || null;
}

export function peridotFortune(value, rarity) {
  const quality = gemstoneQuality(value);
  const rarityIndex = GEMSTONE_RARITIES.indexOf(String(rarity || '').trim().toUpperCase());
  if (!quality || rarityIndex < 0) return null;
  return PERIDOT_FORTUNE[quality]?.[rarityIndex] ?? null;
}

export function toolGemstoneFortune(slots, rarity, count = TOOL_GEMSTONE_SLOT_COUNT) {
  let total = 0;
  for (const slot of normalizeToolGemstoneSlots(slots, count)) {
    if (!slot.unlocked || !slot.gem) continue;
    const value = peridotFortune(slot.gem, rarity);
    if (value == null) return null;
    total += value;
  }
  return total;
}

export function withGemstoneSlotUnlocked(slots, index, unlocked, count = TOOL_GEMSTONE_SLOT_COUNT) {
  const next = normalizeToolGemstoneSlots(slots, count);
  const slot = { ...next[index] };
  if (!slot?.id) return next;
  slot.unlocked = Boolean(unlocked);
  if (!slot.unlocked) slot.gem = null;
  next[index] = slot;
  return next;
}

export function withGemstoneSlotCost(slots, index, coins, count = TOOL_GEMSTONE_SLOT_COUNT) {
  const next = normalizeToolGemstoneSlots(slots, count);
  const slot = { ...next[index] };
  if (!slot?.id) return next;
  slot.unlockCostCoins = coins === '' || coins == null ? null : Math.max(0, Number(coins) || 0);
  next[index] = slot;
  return next;
}

export function withGemstone(slots, index, gem, count = TOOL_GEMSTONE_SLOT_COUNT) {
  const next = normalizeToolGemstoneSlots(slots, count);
  const slot = { ...next[index] };
  if (!slot?.id) return next;
  slot.gem = normalizeToolGem(gem);
  if (slot.gem) slot.unlocked = true;
  next[index] = slot;
  return next;
}

export function gemstoneUnlockCost(slots, count = TOOL_GEMSTONE_SLOT_COUNT) {
  return normalizeToolGemstoneSlots(slots, count).filter(slot => slot.unlocked).reduce((sum, slot) => sum + Number(slot.unlockCostCoins || 0), 0);
}

export function unlockedGemstoneSlots(slots, count = TOOL_GEMSTONE_SLOT_COUNT) {
  return normalizeToolGemstoneSlots(slots, count).filter(slot => slot.unlocked).length;
}

export function filledGemstoneSlots(slots, count = TOOL_GEMSTONE_SLOT_COUNT) {
  return normalizeToolGemstoneSlots(slots, count).filter(slot => slot.unlocked && slot.gem).length;
}
