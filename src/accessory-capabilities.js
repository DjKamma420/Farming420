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
  pestDropSystem: 'https://hypixel.net/threads/skyblock-patch-notes-0-19-7-garden-pests.5537683/',
  pestOverbloomUpdate: 'https://hypixel.net/threads/pest-farming-nerf.6097800/',
});

export const ACCESSORY_ENRICHMENTS = Object.freeze([
  Object.freeze({ id: 'speed', name: 'Speed', stat: 'speed', amount: 1, bonus: '+1 Speed', farmingRelevant: true }),
  Object.freeze({ id: 'intelligence', name: 'Intelligence', stat: 'intelligence', amount: 2, bonus: '+2 Intelligence', farmingRelevant: false }),
  Object.freeze({ id: 'critical_damage', name: 'Critical Damage', stat: 'criticalDamage', amount: 1, bonus: '+1 Crit Damage', farmingRelevant: false }),
  Object.freeze({ id: 'critical_chance', name: 'Critical Chance', stat: 'criticalChance', amount: 1, bonus: '+1 Crit Chance', farmingRelevant: false }),
  Object.freeze({ id: 'strength', name: 'Strength', stat: 'strength', amount: 1, bonus: '+1 Strength', farmingRelevant: false }),
  Object.freeze({ id: 'defense', name: 'Defense', stat: 'defense', amount: 1, bonus: '+1 Defense', farmingRelevant: false }),
  Object.freeze({ id: 'health', name: 'Health', stat: 'health', amount: 3, bonus: '+3 Health', farmingRelevant: false }),
  Object.freeze({ id: 'magic_find', name: 'Magic Find', stat: 'magicFind', amount: 0.5, bonus: '+0.5 Magic Find', farmingRelevant: false }),
  Object.freeze({ id: 'attack_speed', name: 'Attack Speed', stat: 'attackSpeed', amount: 0.5, bonus: '+0.5 Bonus Attack Speed', farmingRelevant: false }),
  Object.freeze({ id: 'ferocity', name: 'Ferocity', stat: 'ferocity', amount: 0.3, bonus: '+0.3 Ferocity', farmingRelevant: false }),
  Object.freeze({ id: 'sea_creature_chance', name: 'Sea Creature Chance', stat: 'seaCreatureChance', amount: 0.3, bonus: '+0.3 Sea Creature Chance', farmingRelevant: false }),
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


const ENRICHMENT_BY_ID = new Map(ACCESSORY_ENRICHMENTS.map(entry => [entry.id, entry]));

/**
 * Aggregate every enrichment found in the complete Accessory Bag snapshot.
 * This deliberately does not restrict itself to the Farming accessory catalogue:
 * combat/fishing/mining accessories can still carry a Speed enrichment that
 * matters while farming.
 */
export function enrichmentTotalsFromSnapshot(snapshot) {
  const items = Array.isArray(snapshot?.items) ? snapshot.items : [];
  const counts = {};
  const bonuses = {};
  let enrichedAccessories = 0;
  const seenExactIds = new Set();

  for (const item of items) {
    if (String(item?.container || '') !== 'talisman_bag') continue;
    const itemId = String(item?.skyblockId || '').trim().toUpperCase();
    if (itemId && seenExactIds.has(itemId)) continue;

    const enrichmentId = normalizeAccessoryEnrichment(item?.talismanEnrichment);
    if (!enrichmentId) continue;
    if (itemId) seenExactIds.add(itemId);

    const enrichment = ENRICHMENT_BY_ID.get(enrichmentId);
    if (!enrichment) continue;
    counts[enrichmentId] = (counts[enrichmentId] || 0) + 1;
    bonuses[enrichment.stat] = (bonuses[enrichment.stat] || 0) + enrichment.amount;
    enrichedAccessories += 1;
  }

  return { counts, bonuses, enrichedAccessories };
}

export function manualFarmingAccessoryEnrichmentTotals(accessoryItems, snapshot = null) {
  const counts = {};
  const bonuses = {};
  let enrichedAccessories = 0;
  const snapshotIds = new Set(
    (Array.isArray(snapshot?.items) ? snapshot.items : [])
      .filter(item => String(item?.container || '') === 'talisman_bag')
      .map(item => String(item?.skyblockId || '').trim().toUpperCase())
      .filter(Boolean),
  );

  for (const [itemId, itemState] of Object.entries(accessoryItems || {})) {
    if (itemState?.source === 'hypixel-sync') continue;
    if (snapshotIds.has(String(itemId).trim().toUpperCase())) continue;
    const enrichmentId = normalizeAccessoryEnrichment(itemState?.enrichment);
    if (!enrichmentId) continue;
    const enrichment = ENRICHMENT_BY_ID.get(enrichmentId);
    if (!enrichment) continue;
    counts[enrichmentId] = (counts[enrichmentId] || 0) + 1;
    bonuses[enrichment.stat] = (bonuses[enrichment.stat] || 0) + enrichment.amount;
    enrichedAccessories += 1;
  }

  return { counts, bonuses, enrichedAccessories };
}

export function farmingEnrichmentSummary(profile) {
  const snapshot = profile?.normalizedSnapshot || null;
  const synced = enrichmentTotalsFromSnapshot(snapshot);
  const manualKnown = manualFarmingAccessoryEnrichmentTotals(profile?.accessoryItems, snapshot);
  const detectedSpeed = Number(synced.bonuses.speed || 0) + Number(manualKnown.bonuses.speed || 0);
  const overrideRaw = profile?.enrichmentSpeedOverride;
  const hasOverride = overrideRaw !== null && overrideRaw !== undefined && String(overrideRaw).trim() !== '';
  const override = hasOverride ? Math.max(0, Number(overrideRaw) || 0) : null;
  const counts = { ...synced.counts };
  for (const [id, value] of Object.entries(manualKnown.counts)) counts[id] = (counts[id] || 0) + value;

  return {
    speed: override ?? detectedSpeed,
    detectedSpeed,
    override,
    hasOverride,
    counts,
    syncedEnrichedAccessories: synced.enrichedAccessories,
    manualKnownEnrichedAccessories: manualKnown.enrichedAccessories,
    hasAccessoryBagData: (Array.isArray(snapshot?.items) ? snapshot.items : []).some(item => String(item?.container || '') === 'talisman_bag'),
  };
}
