import { UPGRADES } from './data.js';
import { FARMING_RELEVANT_PET_ITEMS, isFarmingRelevantPetItem } from './setup-pet-items.js';

/** Selectable options for the setup editor. */
export const OPTION_SOURCE = Object.freeze({
  OFFICIAL: 'official',
  PROFILE: 'profile',
  APP_DATA: 'app-data',
  MANUAL: 'manual',
});

// v5 invalidates pre-shard caches so the 0.27 Attribute Shard records (including
// their exact player-head skin metadata) are fetched again after deployment.
// v4 preserved official gemstone slot requirements/costs.
export const CATALOG_STORAGE_KEY = 'farming420-item-catalog-v5';
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
const EQUIPMENT_SLOT_IDS = new Set(['equipment1', 'equipment2', 'equipment3', 'equipment4']);
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
  'RANCHERS_BOOTS', 'FARMER_BOOTS', 'ENCHANTED_JACK_O_LANTERN',
  'PUFFERFISH_HAT', 'PUFFERFISH_HELMET', 'PUFFERFISH_HAT_CELEBRATION',
]);

const FARMING_EQUIPMENT_PREFIXES = Object.freeze([
  'LOTUS_', 'BLOSSOM_', 'PESTHUNTERS_',
  // Keep the old singular family token accepted for restored/manual data.
  'PESTHUNTER_',
]);
const FARMING_EQUIPMENT_NAME_PREFIXES = Object.freeze([
  // LOTUS_* was renamed to Peony in 2026; the internal ids deliberately stayed LOTUS_*.
  'lotus ', 'peony ', 'blossom ', 'pesthunter',
]);
const FARMING_STANDALONE_EQUIPMENT_IDS = new Set([
  'PEST_VEST', 'ZORROS_CAPE',
  // Historical Farming420 typo kept only for old saved profiles.
  'ZORRO_CAPE',
]);
const FARMING_STANDALONE_EQUIPMENT_NAMES = new Set([
  'pest vest', "zorro's cape", 'zorros cape',
]);

/**
 * Minimal local setup catalog used when the browser cannot persist or fetch the
 * official Hypixel item resource. Item identities, current display names and
 * base rarities were verified against NotEnoughUpdates/NotEnoughUpdates-REPO
 * commit 392fd5db2afc4f5020eb9bd379d140a1f6df2011 on 2026-09-28.
 *
 * Live official resource entries still win when available. The fallback keeps
 * the setup picker usable offline and in browsers where localStorage writes are
 * blocked; it is not a replacement for exact capability metadata.
 */
const FALLBACK_ARMOR_SET_SPECS = Object.freeze([
  Object.freeze({ idPrefix: 'FARM_SUIT', name: 'Farmhand', tier: 'COMMON' }),
  Object.freeze({ idPrefix: 'FARM_ARMOR', name: 'Haymaker', tier: 'COMMON' }),
  Object.freeze({ idPrefix: 'PUMPKIN', name: 'Sprout', tier: 'UNCOMMON' }),
  Object.freeze({ idPrefix: 'MELON', name: 'Tater', tier: 'UNCOMMON' }),
  Object.freeze({ idPrefix: 'CROPIE', name: 'Cropie', tier: 'UNCOMMON' }),
  Object.freeze({ idPrefix: 'SQUASH', name: 'Squash', tier: 'RARE' }),
  Object.freeze({ idPrefix: 'FERMENTO', name: 'Fermento', tier: 'EPIC' }),
  Object.freeze({ idPrefix: 'HELIANTHUS', name: 'Helianthus', tier: 'LEGENDARY' }),
]);

const FALLBACK_ARMOR_PIECES = Object.freeze([
  Object.freeze({ suffix: 'HELMET', category: 'HELMET', name: 'Helmet' }),
  Object.freeze({ suffix: 'CHESTPLATE', category: 'CHESTPLATE', name: 'Chestplate' }),
  Object.freeze({ suffix: 'LEGGINGS', category: 'LEGGINGS', name: 'Leggings' }),
  Object.freeze({ suffix: 'BOOTS', category: 'BOOTS', name: 'Boots' }),
]);

const FALLBACK_EQUIPMENT_ITEMS = Object.freeze([
  Object.freeze({ id: 'LOTUS_NECKLACE', name: 'Peony Necklace', category: 'NECKLACE', tier: 'RARE' }),
  Object.freeze({ id: 'LOTUS_CLOAK', name: 'Peony Cloak', category: 'CLOAK', tier: 'RARE' }),
  Object.freeze({ id: 'LOTUS_BELT', name: 'Peony Belt', category: 'BELT', tier: 'RARE' }),
  Object.freeze({ id: 'LOTUS_BRACELET', name: 'Peony Bracelet', category: 'BRACELET', tier: 'RARE' }),
  Object.freeze({ id: 'BLOSSOM_NECKLACE', name: 'Blossom Necklace', category: 'NECKLACE', tier: 'EPIC' }),
  Object.freeze({ id: 'BLOSSOM_CLOAK', name: 'Blossom Cloak', category: 'CLOAK', tier: 'EPIC' }),
  Object.freeze({ id: 'BLOSSOM_BELT', name: 'Blossom Belt', category: 'BELT', tier: 'EPIC' }),
  Object.freeze({ id: 'BLOSSOM_BRACELET', name: 'Blossom Bracelet', category: 'BRACELET', tier: 'EPIC' }),
  Object.freeze({ id: 'PESTHUNTERS_NECKLACE', name: "Pesthunter's Necklace", category: 'NECKLACE', tier: 'RARE' }),
  Object.freeze({ id: 'PESTHUNTERS_CLOAK', name: "Pesthunter's Cloak", category: 'CLOAK', tier: 'RARE' }),
  Object.freeze({ id: 'PESTHUNTERS_BELT', name: "Pesthunter's Belt", category: 'BELT', tier: 'RARE' }),
  Object.freeze({ id: 'PESTHUNTERS_GLOVES', name: "Pesthunter's Gloves", category: 'GLOVES', tier: 'RARE' }),
  Object.freeze({ id: 'PEST_VEST', name: 'Pest Vest', category: 'CLOAK', tier: 'EPIC' }),
  Object.freeze({ id: 'ZORROS_CAPE', name: "Zorro's Cape", category: 'CLOAK', tier: 'LEGENDARY' }),
]);

const FALLBACK_PET_ITEMS = Object.freeze(
  FARMING_RELEVANT_PET_ITEMS.map(item => Object.freeze({
    ...item,
    category: 'PET_ITEM',
  })),
);

export const FARMING_SETUP_FALLBACK_ITEMS = Object.freeze([
  ...FALLBACK_ARMOR_SET_SPECS.flatMap(set => FALLBACK_ARMOR_PIECES.map(piece => Object.freeze({
    id: `${set.idPrefix}_${piece.suffix}`,
    name: `${set.name} ${piece.name}`,
    category: piece.category,
    tier: set.tier,
  }))),
  Object.freeze({ id: 'RANCHERS_BOOTS', name: "Rancher's Boots", category: 'BOOTS', tier: 'EPIC' }),
  Object.freeze({ id: 'FARMER_BOOTS', name: 'Farmer Boots', category: 'BOOTS', tier: 'UNCOMMON' }),
  Object.freeze({ id: 'ENCHANTED_JACK_O_LANTERN', name: 'Lantern Helmet', category: 'HELMET', tier: 'UNCOMMON' }),
  Object.freeze({ id: 'PUFFERFISH_HAT', name: 'Pufferfish Hat', category: 'HELMET', tier: 'COMMON' }),
  Object.freeze({ id: 'PUFFERFISH_HAT_CELEBRATION', name: 'Pufferfish Hat', category: 'HELMET', tier: 'COMMON' }),
  ...FALLBACK_EQUIPMENT_ITEMS,
  ...FALLBACK_PET_ITEMS,
]);

export function mergeFarmingSetupCatalog(catalog) {
  const merged = new Map(FARMING_SETUP_FALLBACK_ITEMS.map(item => [item.id, item]));
  for (const item of Array.isArray(catalog) ? catalog : []) {
    if (!item || typeof item !== 'object') continue;
    const id = String(item.id || '').trim().toUpperCase();
    if (!id) continue;
    const fallback = merged.get(id);
    merged.set(id, fallback ? { ...fallback, ...item, id } : item);
  }
  return [...merged.values()];
}

export function intrinsicEnchantmentsForCatalogItem(item) {
  const id = String(item?.id || item?.skyblockId || '').trim().toUpperCase();
  // The Century/Raffle reward is a distinct Pufferfish Hat variant that comes
  // with Thorns V. The normal craftable PUFFERFISH_HAT must never inherit it.
  if (id === 'PUFFERFISH_HAT_CELEBRATION') return { thorns: 5 };
  return {};
}

export function isFarmingArmorCatalogItem(item) {
  if (!item || typeof item !== 'object') return false;
  const id = String(item.id || '').trim().toUpperCase();
  const name = String(item.name || '').trim().toLowerCase();
  if (FARMING_STANDALONE_ARMOR_IDS.has(id)) return true;
  if (FARMING_ARMOR_PREFIXES.some(prefix => id.startsWith(prefix))) return true;
  return FARMING_ARMOR_NAME_PREFIXES.some(prefix => name.startsWith(prefix));
}

export function isFarmingEquipmentCatalogItem(item) {
  if (!item || typeof item !== 'object') return false;
  const id = String(item.id || '').trim().toUpperCase();
  const name = String(item.name || '').trim().toLowerCase();
  const normalizedName = name.replace(/[’']/g, '');
  if (FARMING_STANDALONE_EQUIPMENT_IDS.has(id)) return true;
  if (FARMING_EQUIPMENT_PREFIXES.some(prefix => id.startsWith(prefix))) return true;
  if (FARMING_STANDALONE_EQUIPMENT_NAMES.has(name) || FARMING_STANDALONE_EQUIPMENT_NAMES.has(normalizedName)) return true;
  return FARMING_EQUIPMENT_NAME_PREFIXES.some(prefix => name.startsWith(prefix));
}

function stringOrNull(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed || null;
}

function finiteNumberOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function reducedRequirement(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const type = stringOrNull(raw.type)?.toUpperCase() || null;
  if (!type) return null;
  const requirement = { type };
  const dataKey = stringOrNull(raw.data_key);
  const operator = stringOrNull(raw.operator)?.toUpperCase() || null;
  if (dataKey) requirement.dataKey = dataKey;
  if (operator) requirement.operator = operator;
  if (raw.value !== undefined && raw.value !== null) requirement.value = String(raw.value);
  const level = finiteNumberOrNull(raw.level);
  if (level != null) requirement.level = level;
  const skill = stringOrNull(raw.skill)?.toUpperCase() || null;
  if (skill) requirement.skill = skill;
  return requirement;
}

function reducedCost(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const type = stringOrNull(raw.type)?.toUpperCase() || null;
  if (!type) return null;
  if (type === 'COINS') {
    const coins = finiteNumberOrNull(raw.coins);
    return coins == null ? null : { type, coins };
  }
  if (type === 'ITEM') {
    const itemId = stringOrNull(raw.item_id)?.toUpperCase() || null;
    const amount = finiteNumberOrNull(raw.amount);
    return itemId && amount != null ? { type, itemId, amount } : null;
  }
  return { type };
}

function reducedGemstoneSlots(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.map((slot, index) => {
    const slotType = stringOrNull(slot?.slot_type)?.toUpperCase() || null;
    if (!slotType) return null;
    return {
      index,
      slotType,
      requirements: Array.isArray(slot?.requirements) ? slot.requirements.map(reducedRequirement).filter(Boolean) : [],
      costs: Array.isArray(slot?.costs) ? slot.costs.map(reducedCost).filter(Boolean) : [],
    };
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
    .filter(item => !EQUIPMENT_SLOT_IDS.has(slotId) || isFarmingEquipmentCatalogItem(item))
    .filter(item => slotId !== 'petItem' || isFarmingRelevantPetItem(item))
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
