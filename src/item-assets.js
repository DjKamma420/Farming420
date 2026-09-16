export const ITEM_ASSET_MANIFEST_URL = './assets/hypixel-pack/manifest.json';
export const ITEM_ASSET_BASE_URL = './assets/hypixel-pack/';

function plainObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : null;
}

/**
 * Resource-pack item paths are lower-case. This normalization never falls back
 * to display names; it only derives a deterministic key from the real Hypixel
 * ExtraAttributes.id. A miss remains a miss.
 */
export function assetKeyForSkyblockId(skyblockId) {
  const value = typeof skyblockId === 'string' ? skyblockId.trim() : '';
  if (!value || !/^[A-Za-z0-9_./-]+$/.test(value)) return null;
  return value.toLowerCase();
}

export function validateItemAssetManifest(value) {
  const manifest = plainObject(value);
  if (!manifest || manifest.schemaVersion !== 1) return null;
  const pack = plainObject(manifest.pack);
  const items = plainObject(manifest.items);
  if (!pack || pack.id !== 'SkyBlock' || !items) return null;
  return manifest;
}

export function itemAssetForSkyblockId(manifestValue, skyblockId, baseUrl = ITEM_ASSET_BASE_URL) {
  const manifest = validateItemAssetManifest(manifestValue);
  const key = assetKeyForSkyblockId(skyblockId);
  if (!manifest || !key) return null;
  const record = plainObject(manifest.items[key]);
  if (!record) return null;
  const texture = typeof record.texture === 'string' ? record.texture : null;
  if (!texture || texture.startsWith('/') || texture.includes('..') || !texture.endsWith('.png')) return null;
  return {
    key,
    textureUrl: `${baseUrl}${texture}`,
    definition: typeof record.definition === 'string' ? record.definition : null,
    packHash: typeof manifest.pack.hash === 'string' ? manifest.pack.hash : null,
  };
}

let cachedManifest;

export async function loadItemAssetManifest({ fetchImpl = globalThis.fetch } = {}) {
  if (cachedManifest !== undefined) return cachedManifest;
  if (typeof fetchImpl !== 'function') return null;
  try {
    const response = await fetchImpl(ITEM_ASSET_MANIFEST_URL, { headers: { accept: 'application/json' } });
    if (!response.ok) return null;
    cachedManifest = validateItemAssetManifest(await response.json());
    return cachedManifest;
  } catch {
    return null;
  }
}

export function clearItemAssetManifestCacheForTests() {
  cachedManifest = undefined;
}
