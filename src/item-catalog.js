import { UPGRADES } from './data.js';

/** Selectable options for the setup editor. */
export const OPTION_SOURCE = Object.freeze({
  OFFICIAL: 'official',
  PROFILE: 'profile',
  APP_DATA: 'app-data',
  MANUAL: 'manual',
});

// v3 adds the item-level capability fields used by the setup editor. Bumping the
// key deliberately prevents an old cache from making every item look generic.
export const CATALOG_STORAGE_KEY = 'farming420-item-catalog-v3';
export const CATALOG_MAX_AGE_MS = 24 * 60 * 60 * 1000;

const SLOT_CATEGORIES = Object.freeze({
  helmet: ['HELMET'],
  chestplate: ['CHESTPLATE'],
  leggings: ['LEGGINGS'],
  boots: ['BOOTS'],
  equipment1: ['NECKLACE'],
  equipment2: ['CLOAK'],
  equipment3: ['BELT'],
  equipment4: ['GLOVES', 'BRACELET'],
  petItem: ['PET_ITEM'],
});

const ARMOR_SLOT_IDS = new Set(['helmet', 'chestplate', 'leggings', 'boots']);
const FARMING_ARMOR_PREFIXES = Object.freeze([
  'FARMHAND_', 'HAYMAKER_', 'SPROUT_', 'TATER_', 'CROPIE_', 'SQUASH_', 'FERMENTO_', 'HELIANTHUS_',
  // Legacy names/ids are kept so restored pre-0.26.1 profiles still resolve.
  'FARM_SUIT_', 'FARM_ARMOR_', 'PUMPKIN_', 'MELON_',
]);
const FARMING_ARMOR_NAME_PREFIXES = Object.freeze([
  'farmhand ', 'haymaker ', 'sprout ', 'tater ', 'cropie ', 'squash ', 'fermento ', 'helianthus ',
  'farm suit ', 'farm armor ', 'pumpkin ', 'melon ',
]);
const FARMING_STANDALONE_ARMOR_IDS = new Set([
  'RANCHERS_BOOTS', 'FARMER_BOOTS', 'PUFFERFISH_HAT', 'PUFFERFISH_HELMET',
]);

export function isFarmingArmorCatalogItem(item) {
  if (!item || typeof item !== 'object') return false;
  const id = String(item.id || '').trim().toUpperCase();
  const name = String(item.name || '').trim().toLowerCase();
  if (FARMING_STANDALONE_ARMOR_IDS.has(id)) return true;
  if (FARMING_ARMOR_PREFIXES.some(prefix => id.startsWith(prefix))) return true;
  return FARMING_ARMOR_NAME_PREFIXES.some(prefix => name.startsWith(prefix));
}

function stringOrNull(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed || null;
}

function reducedGemstoneSlots(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.map((slot, index) => {
    const type = stringOrNull(slot?.slot_type)?.toUpperCase() || null;
    if (!type) return null;
    return { index, slotType: type };
  }).filter(Boolean);
}

/**
 * Reduces the official item resource without throwing away capability data.
 * `gemstone_slots`, `cannot_reforge` and `can_recombobulate` belong to the
 * concrete SkyBlock item. The UI must never infer those properties from the UI
 * slot (Helmet, Necklace, ...).
 */
export function reduceItemResource(payload) {
  const items = Array.isArray(payload?.items) ? payload.items : [];
  const reduced = [];
  for (const item of items) {
    const id = stringOrNull(item?.id);
    const name = stringOrNull(item?.name);
    if (!id || !name) continue;
    reduced.push({
      id,
      name,
      category: stringOrNull(item?.category)?.toUpperCase() || null,
      tier: stringOrNull(item?.tier)?.toUpperCase() || null,
      material: stringOrNull(item?.material)?.toUpperCase() || null,
      skin: stringOrNull(item?.skin)?.toLowerCase() || null,
      color: stringOrNull(item?.color) || null,
      gemstoneSlots: reducedGemstoneSlots(item?.gemstone_slots),
      cannotReforge: item?.cannot_reforge === true,
      canRecombobulate: item?.can_recombobulate === true
        ? true
        : item?.can_recombobulate === false ? false : null,
    });
  }
  return reduced;
}

export function itemsForSlot(catalog, slotId) {
  const categories = SLOT_CATEGORIES[slotId];
  if (!categories || !Array.isArray(catalog)) return [];
  const wanted = new Set(categories);
  return catalog
    .filter(item => item.category && wanted.has(item.category))
    .filter(item => !ARMOR_SLOT_IDS.has(slotId) || isFarmingArmorCatalogItem(item))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function slotHasOfficialCategory(slotId) {
  return Boolean(SLOT_CATEGORIES[slotId]);
}

function optionsFrom(values, source) {
  return [...new Set(values.filter(Boolean))].sort().map(value => ({ value, source }));
}
function decodedItemsOf(snapshot) {
  return Array.isArray(snapshot?.items) ? snapshot.items : [];
}

/** Legacy generic option list; item-aware UI uses item-capabilities.js. */
export function reforgeOptions(snapshot) {
  const fromData = UPGRADES
    .map(entry => /-reforge-([a-z0-9]+)(?:-|$)/.exec(entry.id)?.[1])
    .filter(Boolean);
  const fromProfile = decodedItemsOf(snapshot).map(item => stringOrNull(item?.reforge)?.toLowerCase());
  return dedupeBySource([
    ...optionsFrom(fromProfile, OPTION_SOURCE.PROFILE),
    ...optionsFrom(fromData, OPTION_SOURCE.APP_DATA),
  ]);
}

export function enchantmentOptions(snapshot) {
  const fromProfile = decodedItemsOf(snapshot)
    .flatMap(item => Object.keys(item?.enchantments || {}))
    .map(key => key.toLowerCase());
  return dedupeBySource(optionsFrom(fromProfile, OPTION_SOURCE.PROFILE));
}

export function gemOptions(snapshot) {
  const fromProfile = decodedItemsOf(snapshot).flatMap(item => {
    const gems = item?.gems;
    if (!gems || typeof gems !== 'object') return [];
    return Object.entries(gems).map(([slot, value]) => {
      const quality = typeof value === 'string' ? value : value?.quality;
      return quality ? `${String(quality).toUpperCase()} ${slot.replace(/_\d+$/, '').toUpperCase()}` : null;
    });
  });
  return dedupeBySource(optionsFrom(fromProfile, OPTION_SOURCE.PROFILE));
}

function dedupeBySource(options) {
  const seen = new Set();
  const result = [];
  for (const option of options) {
    if (seen.has(option.value)) continue;
    seen.add(option.value);
    result.push(option);
  }
  return result;
}

function storage() {
  try { return globalThis.localStorage ?? null; } catch { return null; }
}

export function readCachedCatalog() {
  try {
    const raw = storage()?.getItem(CATALOG_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed?.items) || !parsed.fetchedAt) return null;
    return parsed;
  } catch { return null; }
}

export function writeCachedCatalog(items, fetchedAt = new Date().toISOString()) {
  try { storage()?.setItem(CATALOG_STORAGE_KEY, JSON.stringify({ fetchedAt, items })); }
  catch { /* A full storage quota must not break the editor. */ }
}

export function catalogIsStale(cached, now = Date.now()) {
  if (!cached?.fetchedAt) return true;
  const age = now - Date.parse(cached.fetchedAt);
  return !Number.isFinite(age) || age > CATALOG_MAX_AGE_MS;
}

export async function loadItemCatalog({ fetchImpl, baseUrl = 'https://api.hypixel.net', force = false, now = Date.now() } = {}) {
  const cached = readCachedCatalog();
  if (!force && cached && !catalogIsStale(cached, now)) {
    return { items: cached.items, fetchedAt: cached.fetchedAt, fromCache: true, error: null };
  }
  const request = fetchImpl || globalThis.fetch;
  if (typeof request !== 'function') {
    return { items: cached?.items || [], fetchedAt: cached?.fetchedAt || null, fromCache: Boolean(cached), error: 'No fetch implementation is available.' };
  }
  try {
    const response = await request(`${baseUrl}/v2/resources/skyblock/items`, { headers: { accept: 'application/json' } });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const items = reduceItemResource(await response.json());
    if (!items.length) throw new Error('The item resource returned no recognisable entries.');
    const fetchedAt = new Date(now).toISOString();
    writeCachedCatalog(items, fetchedAt);
    return { items, fetchedAt, fromCache: false, error: null };
  } catch (error) {
    return {
      items: cached?.items || [],
      fetchedAt: cached?.fetchedAt || null,
      fromCache: Boolean(cached),
      error: `The official item list could not be loaded: ${error.message}`,
    };
  }
}
