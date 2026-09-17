import { FARMING_TOOL_ITEM_IDS, GARDEN_VACUUM_ITEMS } from './exact-farming-items.js';
import { itemAssetForSkyblockId } from './item-assets.js';
import { isFarmingArmorCatalogItem, isFarmingEquipmentCatalogItem } from './item-catalog.js';
import { packArtKeyFor } from './pack-item-art.js';

export const ITEM_MODEL_SOURCE = Object.freeze({
  OFFICIAL_SKIN: 'official-skin',
  RESOURCE_PACK_ITEM: 'resource-pack-item',
  RESOURCE_PACK_SET: 'resource-pack-set',
  VANILLA_MATERIAL: 'vanilla-material',
  UNRESOLVED: 'unresolved',
});

const EXACT_FARMING_TOOL_IDS = new Set(
  Object.values(FARMING_TOOL_ITEM_IDS).flat().map(id => String(id).toUpperCase()),
);
const EXACT_VACUUM_IDS = new Set(GARDEN_VACUUM_ITEMS.map(item => item.id));

export function isFarmingPhysicalCatalogItem(item) {
  if (!item || typeof item !== 'object') return false;
  const id = String(item.id || '').trim().toUpperCase();
  return isFarmingArmorCatalogItem(item)
    || isFarmingEquipmentCatalogItem(item)
    || EXACT_FARMING_TOOL_IDS.has(id)
    || EXACT_VACUUM_IDS.has(id);
}

function validSkin(item) {
  return /^[0-9a-f]{32,128}$/i.test(String(item?.skin || '').trim());
}

/**
 * Resolve the strongest available model source without fuzzy display-name art.
 * The official item resource skin wins for heads, then exact pack art, then a
 * documented set representative, then the vanilla material model.
 */
export function itemModelSource(item, manifest = null) {
  if (!item || typeof item !== 'object') return { source: ITEM_MODEL_SOURCE.UNRESOLVED };
  if (validSkin(item)) {
    return { source: ITEM_MODEL_SOURCE.OFFICIAL_SKIN, skin: String(item.skin).toLowerCase() };
  }

  const exact = manifest ? itemAssetForSkyblockId(manifest, item.id, '') : null;
  if (exact) {
    return { source: ITEM_MODEL_SOURCE.RESOURCE_PACK_ITEM, packKey: exact.key, texture: exact.textureUrl };
  }

  const setKey = packArtKeyFor(item);
  const setAsset = setKey && manifest?.items?.[setKey];
  if (setAsset?.texture) {
    return { source: ITEM_MODEL_SOURCE.RESOURCE_PACK_SET, packKey: setKey, texture: setAsset.texture };
  }

  const material = String(item.material || '').trim().toUpperCase();
  if (material) return { source: ITEM_MODEL_SOURCE.VANILLA_MATERIAL, material };
  return { source: ITEM_MODEL_SOURCE.UNRESOLVED };
}

/**
 * Report every farming armor/equipment/tool/vacuum item whose picture/model can
 * or cannot be resolved. This makes art regressions measurable instead of
 * silently falling back to initials or generic silhouettes.
 */
export function auditFarmingItemModelCoverage(catalog, manifest = null) {
  const relevant = (Array.isArray(catalog) ? catalog : []).filter(isFarmingPhysicalCatalogItem);
  const records = relevant.map(item => ({
    id: item.id,
    name: item.name,
    category: item.category || null,
    ...itemModelSource(item, manifest),
  }));
  const unresolved = records.filter(record => record.source === ITEM_MODEL_SOURCE.UNRESOLVED);
  const bySource = Object.fromEntries(
    Object.values(ITEM_MODEL_SOURCE).map(source => [source, records.filter(record => record.source === source).length]),
  );
  return {
    total: records.length,
    resolved: records.length - unresolved.length,
    unresolvedCount: unresolved.length,
    bySource,
    unresolved,
    records,
  };
}
