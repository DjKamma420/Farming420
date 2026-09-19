/**
 * Accessory rarity and Recombobulator rules used by the Accessories page.
 *
 * Source verified 2026-09-18:
 * - Recombobulator 3000 raises an item's rarity by one tier and can only be applied once.
 *
 * Enrichments are intentionally not modeled: their stats are not relevant to
 * Farming420's farming progression/calculation surface.
 */
export const ACCESSORY_CAPABILITIES_VERIFIED = '2026-09-18';

export const ACCESSORY_CAPABILITY_SOURCES = Object.freeze({
  recombobulator: 'https://hypixel.net/threads/a-list-of-everything-a-recombobulator-3000-does.5965625/',
});

const NEXT_RARITY = Object.freeze({
  COMMON: 'UNCOMMON',
  UNCOMMON: 'RARE',
  RARE: 'EPIC',
  EPIC: 'LEGENDARY',
  LEGENDARY: 'MYTHIC',
  MYTHIC: 'DIVINE',
  SPECIAL: 'VERY SPECIAL',
});

export function accessoryEffectiveRarity(accessory, itemState = {}) {
  const base = String(accessory?.rarity || '').trim().toUpperCase();
  if (!base || !itemState?.recombobulated) return base || null;
  return NEXT_RARITY[base] || base;
}

/**
 * The official item resource wins when it explicitly disables recombobulation.
 * Known Farming accessories otherwise use the normal accessory rule.
 */
export function canRecombobulateAccessory(accessory, catalogItem = null) {
  if (!accessory?.itemId) return false;
  const exactCatalogItem = catalogItem
    && String(catalogItem.id || '').trim().toUpperCase() === String(accessory.itemId).trim().toUpperCase();
  if (exactCatalogItem && catalogItem.canRecombobulate === false) return false;
  if (exactCatalogItem && catalogItem.canRecombobulate === true) return true;
  return true;
}

export function accessoryCapabilityState(accessory, itemState = {}, catalogItem = null) {
  const baseRarity = String(accessory?.rarity || '').trim().toUpperCase() || null;
  return {
    baseRarity,
    effectiveRarity: accessoryEffectiveRarity(accessory, itemState),
    canRecombobulate: canRecombobulateAccessory(accessory, catalogItem),
  };
}

export function accessoryStateFromSnapshot(snapshot, itemId) {
  const wanted = String(itemId || '').trim().toUpperCase();
  if (!wanted) return null;
  const items = Array.isArray(snapshot?.items) ? snapshot.items : [];
  const item = items.find(entry => String(entry?.skyblockId || '').trim().toUpperCase() === wanted);
  if (!item) return null;
  return {
    recombobulated: Number(item.recombobulated || 0) >= 1,
    source: 'hypixel-sync',
  };
}
