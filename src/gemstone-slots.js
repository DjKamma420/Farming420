export const GEMSTONE_SLOTS_VERIFIED = '2026-09-17';
export const TOOL_GEMSTONE_SOURCE = 'https://hypixel.net/threads/farming-tools-upgrade-milestones.6032473/';
export const PERIDOT_VALUES_SOURCE = 'https://hypixel.net/threads/list-of-item-in-skyblock-major-update.6123513/';

export const GEMSTONE_QUALITIES = Object.freeze(['ROUGH', 'FLAWED', 'FINE', 'FLAWLESS', 'PERFECT']);
export const TOOL_GEMSTONE_TYPES = Object.freeze(['PERIDOT']);
export const TOOL_GEMSTONE_SLOT_COUNT = 4;
export const GEMSTONE_RARITIES = Object.freeze(['COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY', 'MYTHIC']);

/** Current Greenhouse tool progression: 1 slot at level 1, 2 at 15, 3 at 25, 4 at 50. */
export function toolGemstoneSlotCountForLevel(level) {
  const value = Math.max(1, Math.min(50, Math.floor(Number(level) || 1)));
  if (value >= 50) return 4;
  if (value >= 25) return 3;
  if (value >= 15) return 2;
  return 1;
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
