export const HYPIXEL_PACKS_ENDPOINT = 'https://api.hypixel.net/v2/resources/packs';
export const SKYBLOCK_PACK_ID = 'SkyBlock';

/**
 * Picks the newest usable SkyBlock resource-pack variant from Hypixel's public
 * resource endpoint. No pack URL is hard-coded: Hypixel updates this pack
 * frequently, so callers must resolve it from the API and cache with its hash.
 */
export function selectSkyBlockResourcePack(payload) {
  const packs = Array.isArray(payload?.packs) ? payload.packs : [];
  const pack = packs.find(entry => entry?.id === SKYBLOCK_PACK_ID);
  if (!pack || !Array.isArray(pack.versions) || !pack.versions.length) return null;

  const versions = pack.versions
    .filter(version => typeof version?.url === 'string' && /^https:\/\/resourcepacks\.hypixel\.net\//.test(version.url))
    .map(version => ({
      packFormat: Number(version.packFormat),
      hash: typeof version.hash === 'string' ? version.hash : null,
      url: version.url,
    }))
    .filter(version => Number.isFinite(version.packFormat));
  if (!versions.length) return null;

  versions.sort((a, b) => b.packFormat - a.packFormat);
  return {
    id: SKYBLOCK_PACK_ID,
    deployId: typeof pack.deployId === 'string' ? pack.deployId : null,
    lastUpdated: Number.isFinite(Number(pack.lastUpdated)) ? Number(pack.lastUpdated) : null,
    ...versions[0],
  };
}

/**
 * Metadata only. Rendering/extraction is deliberately a separate pipeline:
 * browser code should not repeatedly download a multi-megabyte zip per item.
 */
export async function loadSkyBlockResourcePack({ fetchImpl = globalThis.fetch } = {}) {
  if (typeof fetchImpl !== 'function') return { pack: null, error: 'No fetch implementation is available.' };
  try {
    const response = await fetchImpl(HYPIXEL_PACKS_ENDPOINT, { headers: { accept: 'application/json' } });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const pack = selectSkyBlockResourcePack(await response.json());
    if (!pack) throw new Error('No usable SkyBlock resource pack was returned.');
    return { pack, error: null };
  } catch (error) {
    return { pack: null, error: `The official SkyBlock resource pack could not be resolved: ${error.message}` };
  }
}
