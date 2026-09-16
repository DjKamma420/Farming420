import { UPGRADES } from './data.js';

/**
 * Selectable options for the setup editor.
 *
 * Rule 1 forbids inventing an item, reforge or enchantment list, so nothing
 * here is written from memory. Every option carries where it came from:
 *
 * - `official`  — the keyless `/v2/resources/skyblock/items` resource
 * - `profile`   — found on the player's own synced items
 * - `app-data`  — named by an entry in `src/data.js`, which cites its source
 * - `manual`    — typed by the player
 *
 * Free text is always accepted, so a missing catalogue row never blocks anyone.
 */

export const OPTION_SOURCE = Object.freeze({
  OFFICIAL: 'official',
  PROFILE: 'profile',
  APP_DATA: 'app-data',
  MANUAL: 'manual',
});

export const CATALOG_STORAGE_KEY = 'farming420-item-catalog';
/** The resource is static reference data; a day-old copy is fine. */
export const CATALOG_MAX_AGE_MS = 24 * 60 * 60 * 1000;

/** Slot id -> the item categories the official resource uses for it. */
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

function stringOrNull(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed || null;
}

/**
 * Reduces the official resource to what the picker needs.
 *
 * The exact response shape cannot be verified from this repository's test
 * environment, so parsing is tolerant: an entry without a usable id and name is
 * skipped rather than guessed at, and an unrecognised payload yields an empty
 * catalogue, which makes the editor fall back to free text instead of breaking.
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
    });
  }
  return reduced;
}

/** Items the official resource lists for one slot, sorted by name. */
export function itemsForSlot(catalog, slotId) {
  const categories = SLOT_CATEGORIES[slotId];
  if (!categories || !Array.isArray(catalog)) return [];
  const wanted = new Set(categories);
  return catalog
    .filter(item => item.category && wanted.has(item.category))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** True when this slot has no official category to filter by (pets). */
export function slotHasOfficialCategory(slotId) {
  return Boolean(SLOT_CATEGORIES[slotId]);
}

function optionsFrom(values, source) {
  return [...new Set(values.filter(Boolean))].sort().map(value => ({ value, source }));
}

function decodedItemsOf(snapshot) {
  return Array.isArray(snapshot?.items) ? snapshot.items : [];
}

/**
 * Reforge names the app can offer.
 *
 * `src/data.js` names several reforges in its entry titles, and each of those
 * entries cites a source, so they are quotable. Anything else comes from the
 * player's own items.
 */
export function reforgeOptions(snapshot) {
  // Read from the entry ids, which are uniformly `<scope>-reforge-<name>-...`.
  // Display names are not uniform: "Blessed reforge" but "Beady - Pest-only ...".
  const fromData = UPGRADES
    .map(entry => /-reforge-([a-z0-9]+)(?:-|$)/.exec(entry.id)?.[1])
    .filter(Boolean);
  const fromProfile = decodedItemsOf(snapshot).map(item => stringOrNull(item?.reforge)?.toLowerCase());
  return dedupeBySource([
    ...optionsFrom(fromProfile, OPTION_SOURCE.PROFILE),
    ...optionsFrom(fromData, OPTION_SOURCE.APP_DATA),
  ]);
}

/** Enchantment ids the app can offer, from the player's items first. */
export function enchantmentOptions(snapshot) {
  const fromProfile = decodedItemsOf(snapshot)
    .flatMap(item => Object.keys(item?.enchantments || {}))
    .map(key => key.toLowerCase());
  return dedupeBySource(optionsFrom(fromProfile, OPTION_SOURCE.PROFILE));
}

/** Gemstone strings the app can offer, from the player's items. */
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

/** Keeps the first occurrence of a value, so the better-grounded source wins. */
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
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

export function readCachedCatalog() {
  try {
    const raw = storage()?.getItem(CATALOG_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed?.items) || !parsed.fetchedAt) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeCachedCatalog(items, fetchedAt = new Date().toISOString()) {
  try {
    storage()?.setItem(CATALOG_STORAGE_KEY, JSON.stringify({ fetchedAt, items }));
  } catch {
    // A full storage quota must not break the editor; it just loses the cache.
  }
}

export function catalogIsStale(cached, now = Date.now()) {
  if (!cached?.fetchedAt) return true;
  const age = now - Date.parse(cached.fetchedAt);
  return !Number.isFinite(age) || age > CATALOG_MAX_AGE_MS;
}

/**
 * Loads the official item resource, using the cached copy when it is fresh.
 * A failure is reported rather than thrown: the editor stays usable on free
 * text alone.
 *
 * @returns {Promise<{items: object[], fetchedAt: string|null, fromCache: boolean, error: string|null}>}
 */
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
    // A stale cache still beats an empty picker.
    return {
      items: cached?.items || [],
      fetchedAt: cached?.fetchedAt || null,
      fromCache: Boolean(cached),
      error: `The official item list could not be loaded: ${error.message}`,
    };
  }
}
