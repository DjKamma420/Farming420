/**
 * Exact setup-card art for items whose Minecraft model is known from the item
 * definition and must not depend on a third-party rendered-icon endpoint.
 *
 * Keyed only by the canonical SkyBlock item id. Reforges such as Mossy never
 * change this id, so every phase renders the same physical item model.
 */
export const EXACT_SETUP_ITEM_ART = Object.freeze({
  HELIANTHUS_HELMET: Object.freeze({
    kind: 'head',
    // NEU item NBT: ItemModel minecraft:player_head.
    textureId: '46e48a6eff318dcda57d5d76a9b2656be25973e3d472b6d2e446a8e60f60a78a',
  }),
  HELIANTHUS_CHESTPLATE: Object.freeze({
    kind: 'armor',
    item: Object.freeze({
      id: 'HELIANTHUS_CHESTPLATE',
      name: 'Helianthus Chestplate',
      category: 'CHESTPLATE',
      material: 'IRON_CHESTPLATE',
      color: null,
    }),
  }),
  HELIANTHUS_LEGGINGS: Object.freeze({
    kind: 'armor',
    item: Object.freeze({
      id: 'HELIANTHUS_LEGGINGS',
      name: 'Helianthus Leggings',
      category: 'LEGGINGS',
      material: 'LEATHER_LEGGINGS',
      // NEU dyed_color 16770305 = RGB 255,229,1.
      color: '255,229,1',
    }),
  }),
  HELIANTHUS_BOOTS: Object.freeze({
    kind: 'armor',
    item: Object.freeze({
      id: 'HELIANTHUS_BOOTS',
      name: 'Helianthus Boots',
      category: 'BOOTS',
      material: 'IRON_BOOTS',
      color: null,
    }),
  }),
});

export function exactSetupItemArt(skyblockId) {
  const id = String(skyblockId || '').trim().toUpperCase();
  return id ? EXACT_SETUP_ITEM_ART[id] || null : null;
}
