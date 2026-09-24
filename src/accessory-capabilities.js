/**
 * Farming-relevant accessory capability rules.
 *
 * Verified 2026-09-23:
 * - Recombobulator 3000 raises an item's rarity by one tier and can only be applied once.
 * - Enrichments work on LEGENDARY, MYTHIC, SPECIAL and VERY SPECIAL accessories.
 * - Strength Enrichment grants +1 Strength. This matters indirectly when
 *   Legendary Mooshroom Cow converts Strength into Farming Fortune.
 */
export const ACCESSORY_CAPABILITIES_VERIFIED = '2026-09-23';

export const ACCESSORY_CAPABILITY_SOURCES = Object.freeze({
  recombobulator: 'https://hypixel.net/threads/a-list-of-everything-a-recombobulator-3000-does.5965625/',
  enrichments: 'https://hypixelskyblock.minecraft.wiki/w/Enrichments',
  accessoryBag: 'https://hypixelskyblock.minecraft.wiki/w/Accessory_Bag',
  powerStones: 'https://hypixelskyblock.minecraft.wiki/w/Power_Stones',
});

export const ACCESSORY_ENRICHMENTS = Object.freeze({
  strength: Object.freeze({
    id: 'strength',
    name: 'Strength Enrichment',
    stat: 'strength',
    value: 1,
  }),
});

const ENRICHABLE_RARITIES = new Set(['LEGENDARY', 'MYTHIC', 'SPECIAL', 'VERY SPECIAL']);

const NEXT_RARITY = Object.freeze({
  COMMON: 'UNCOMMON',
  UNCOMMON: 'RARE',
  RARE: 'EPIC',
  EPIC: 'LEGENDARY',
  LEGENDARY: 'MYTHIC',
  MYTHIC: 'DIVINE',
  SPECIAL: 'VERY SPECIAL',
});

function normalizedEnrichment(value) {
  const id = String(value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '_');
  if (!id) return null;
  if (id === 'strength' || id === 'strength_enrichment') return 'strength';
  return id;
}

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

export function canEnrichAccessory(accessory, itemState = {}) {
  return ENRICHABLE_RARITIES.has(accessoryEffectiveRarity(accessory, itemState));
}

export function accessoryStrengthBonus(itemState = {}) {
  return normalizedEnrichment(itemState?.enrichment) === 'strength'
    ? ACCESSORY_ENRICHMENTS.strength.value
    : 0;
}

function locationsOf(item) {
  const explicit = Array.isArray(item?.locations) ? item.locations : [];
  if (explicit.length) return explicit;
  return item?.container ? [{ container: item.container, slot: item.slot ?? null }] : [];
}

function isInAccessoryBag(item) {
  return locationsOf(item).some(location => location?.container === 'talisman_bag');
}

export function strengthEnrichmentCountFromSnapshot(snapshot) {
  const items = Array.isArray(snapshot?.items) ? snapshot.items : [];
  return items.filter(item =>
    isInAccessoryBag(item)
    && normalizedEnrichment(item?.talismanEnrichment) === 'strength').length;
}

export function accessoryCapabilityState(accessory, itemState = {}, catalogItem = null) {
  const baseRarity = String(accessory?.rarity || '').trim().toUpperCase() || null;
  return {
    baseRarity,
    effectiveRarity: accessoryEffectiveRarity(accessory, itemState),
    canRecombobulate: canRecombobulateAccessory(accessory, catalogItem),
    canEnrich: canEnrichAccessory(accessory, itemState),
    enrichment: normalizedEnrichment(itemState?.enrichment),
    strengthBonus: accessoryStrengthBonus(itemState),
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
    enrichment: normalizedEnrichment(item.talismanEnrichment),
    source: 'hypixel-sync',
  };
}
