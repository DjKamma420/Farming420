/**
 * Accessory rarity, Recombobulator and Enrichment rules used by the Accessories page.
 *
 * Sources verified 2026-09-18:
 * - Recombobulator 3000 raises an item's rarity by one tier and can only be applied once.
 * - Enrichments apply to LEGENDARY-or-higher eligible accessories, one enrichment per accessory.
 * - Enrichment stat values do not scale with accessory rarity.
 */
export const ACCESSORY_CAPABILITIES_VERIFIED = '2026-09-18';

export const ACCESSORY_CAPABILITY_SOURCES = Object.freeze({
  recombobulator: 'https://hypixel.net/threads/a-list-of-everything-a-recombobulator-3000-does.5965625/',
  enrichments: 'https://hypixel.net/threads/how-to-enrichments.5759931/',
  enrichmentCatalog: 'https://hypixel.net/threads/a-guide-on-what-to-buy-in-the-bits-shop-and-how-useful-the-items-are.4545881/',
});

export const ACCESSORY_ENRICHMENTS = Object.freeze([
  Object.freeze({ id: 'speed', name: 'Speed', bonus: '+1 Speed' }),
  Object.freeze({ id: 'intelligence', name: 'Intelligence', bonus: '+2 Intelligence' }),
  Object.freeze({ id: 'critical_damage', name: 'Critical Damage', bonus: '+1 Crit Damage' }),
  Object.freeze({ id: 'critical_chance', name: 'Critical Chance', bonus: '+1 Crit Chance' }),
  Object.freeze({ id: 'strength', name: 'Strength', bonus: '+1 Strength' }),
  Object.freeze({ id: 'defense', name: 'Defense', bonus: '+1 Defense' }),
  Object.freeze({ id: 'health', name: 'Health', bonus: '+3 Health' }),
  Object.freeze({ id: 'magic_find', name: 'Magic Find', bonus: '+0.5 Magic Find' }),
  Object.freeze({ id: 'attack_speed', name: 'Attack Speed', bonus: '+0.5 Bonus Attack Speed' }),
  Object.freeze({ id: 'ferocity', name: 'Ferocity', bonus: '+0.3 Ferocity' }),
  Object.freeze({ id: 'sea_creature_chance', name: 'Sea Creature Chance', bonus: '+0.3 Sea Creature Chance' }),
]);

const NEXT_RARITY = Object.freeze({
  COMMON: 'UNCOMMON',
  UNCOMMON: 'RARE',
  RARE: 'EPIC',
  EPIC: 'LEGENDARY',
  LEGENDARY: 'MYTHIC',
  MYTHIC: 'DIVINE',
  SPECIAL: 'VERY SPECIAL',
});

const ENRICHABLE_RARITIES = new Set(['LEGENDARY', 'MYTHIC', 'DIVINE', 'SPECIAL', 'VERY SPECIAL']);
const ENRICHMENT_IDS = new Set(ACCESSORY_ENRICHMENTS.map(entry => entry.id));
const ENRICHMENT_ALIASES = Object.freeze({
  crit_damage: 'critical_damage',
  crit_chance: 'critical_chance',
  bonus_attack_speed: 'attack_speed',
  sea_creature: 'sea_creature_chance',
  scc: 'sea_creature_chance',
  magicfind: 'magic_find',
});

export function normalizeAccessoryEnrichment(value) {
  const raw = String(value || '').trim().toLowerCase().replace(/[ -]+/g, '_');
  if (!raw) return null;
  const normalized = ENRICHMENT_ALIASES[raw] || raw;
  return ENRICHMENT_IDS.has(normalized) ? normalized : null;
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

export function accessoryCapabilityState(accessory, itemState = {}, catalogItem = null) {
  const baseRarity = String(accessory?.rarity || '').trim().toUpperCase() || null;
  const effectiveRarity = accessoryEffectiveRarity(accessory, itemState);
  const canRecombobulate = canRecombobulateAccessory(accessory, catalogItem);
  const canEnrich = canEnrichAccessory(accessory, itemState);
  return {
    baseRarity,
    effectiveRarity,
    canRecombobulate,
    canEnrich,
    enrichment: canEnrich ? normalizeAccessoryEnrichment(itemState?.enrichment) : null,
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
    enrichment: normalizeAccessoryEnrichment(item.talismanEnrichment),
    source: 'hypixel-sync',
  };
}
