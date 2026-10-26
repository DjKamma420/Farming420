/**
 * Exact setup-card art for items whose Minecraft model is known from the item
 * definition and must not depend on a third-party rendered-icon endpoint.
 *
 * Keyed only by the canonical setup identity. Physical gear uses its SkyBlock
 * item id. Pets use their pet type because Hypixel stores every pet item under
 * the generic PET id, while the profile API exposes the concrete type instead.
 * Reforges such as Mossy never change the identity, so every phase renders the
 * same physical item model.
 */
import { knownSkyblockHeadTexture } from './skull-art.js';

export const EXACT_SETUP_ITEM_ART = Object.freeze({
  // Reuse the canonical physical equipment skins instead of preferring a
  // third-party rendered necklace icon in one phase and a head in another.
  ...Object.fromEntries(['NECKLACE','CLOAK','BELT','GLOVES'].map(slot => {
    const id = `PESTHUNTERS_${slot}`;
    return [id, Object.freeze({ kind: 'head', textureId: knownSkyblockHeadTexture(id) })];
  })),
  // Farming pet heads from current NEU item NBT, verified 2026-09-28
  // against commit 392fd5db2afc4f5020eb9bd379d140a1f6df2011.
  BEE: Object.freeze({ kind: 'head', textureId: '9c72c132073ec5a058218d6fbfb4a9970652ced9214d53f4f614b3902fd99a7a' }),
  CHICKEN: Object.freeze({ kind: 'head', textureId: 'c6e573262297df2bfa81562498a22a90478e5c96e80d05885d87084de24d2b18' }),
  ELEPHANT: Object.freeze({ kind: 'head', textureId: '4ef8efea450632d2753a38a23a4f1502a8a685f6e99bf69205ec04420fd64f6' }),
  HEDGEHOG: Object.freeze({ kind: 'head', textureId: '5f5e835c116e8e200e2e06aa593cab8f1a9f8c40e7f005a9c76f12e24f4c6370' }),
  MOOSHROOM_COW: Object.freeze({ kind: 'head', textureId: '47f1bc3fa91cd86cf4ba7745586d67207b58e7cf27bdf7a717780843785bf9b5' }),
  MOSQUITO: Object.freeze({ kind: 'head', textureId: '52a9fe05bc663efcd12e56a3ccc5ec035bf577b78708548b6f4ffcf1d30eccfe' }),
  ORCHID_MANTIS: Object.freeze({ kind: 'head', textureId: '36903a9520564c22bc66b05d2161b23e54ff961284e63e684065ae0781c9cd97' }),
  PIG: Object.freeze({ kind: 'head', textureId: '621668ef7cb79dd9c22ce3d1f3f4cb6e2559893b6df4a469514e667c16aa4' }),
  RABBIT: Object.freeze({ kind: 'head', textureId: '63438555e899bd9a051a95dbea49eb2ecfa52a69dbba8998f3673819e277fdf5' }),
  ROSE_DRAGON: Object.freeze({ kind: 'head', textureId: '9b7c3de075a2bb238ef51431206b10d586cb2a5b1cc41fe851cc5f0b02d357c7' }),
  SLUG: Object.freeze({ kind: 'head', textureId: '7a79d0fd677b54530961117ef84adc206e2cc5045c1344d61d776bf8ac2fe1ba' }),

  // Farming-relevant held pet items that are themselves player heads. These
  // render immediately even before the async Hypixel item catalog is available.
  YELLOW_BANDANA: Object.freeze({ kind: 'head', textureId: '799d16737b4f2633f9e7c4538992115c107928a9a01abff407c0297194bd6867' }),
  GREEN_BANDANA: Object.freeze({ kind: 'head', textureId: '3521cccdbb892dff183d97bbdb12f2671e0cd12b945b8fca211a7065359a03a5' }),
  BROWN_BANDANA: Object.freeze({ kind: 'head', textureId: '674e061e6d853822bbad56d079357c248c9a40de494f20eae0078a0a02ef0da7' }),
  POIGNANT_LUCKY_CLOVER: Object.freeze({
    kind: 'rendered',
    iconUrl: 'https://skyah.net/icons/items/poignant_lucky_clover.webp',
  }),

  // Current farming helmets whose generic/legacy icon route is wrong or
  // incomplete. These values come from current NEU item overlays.
  FARM_SUIT_HELMET: Object.freeze({
    // Use the real inventory icon shape. The CSS art layer applies the verified
    // #FDE862 leather dye instead of showing SkyAH's stale brown default.
    kind: 'rendered',
    iconUrl: 'https://skyah.net/icons/items/farm_suit_helmet.webp',
  }),
  FARMHAND_HELMET: Object.freeze({
    kind: 'rendered',
    iconUrl: 'https://skyah.net/icons/items/farm_suit_helmet.webp',
  }),
  FARM_ARMOR_HELMET: Object.freeze({
    kind: 'rendered',
    iconUrl: 'https://skyah.net/icons/items/hay_block.webp',
  }),
  HAYMAKER_HELMET: Object.freeze({
    kind: 'rendered',
    iconUrl: 'https://skyah.net/icons/items/hay_block.webp',
  }),
  PUMPKIN_HELMET: Object.freeze({
    kind: 'rendered',
    iconUrl: 'https://skyah.net/icons/items/pumpkin_helmet.webp',
  }),
  SPROUT_HELMET: Object.freeze({
    kind: 'rendered',
    iconUrl: 'https://skyah.net/icons/items/pumpkin_helmet.webp',
  }),
  MELON_HELMET: Object.freeze({
    kind: 'rendered',
    iconUrl: 'https://skyah.net/icons/items/melon_helmet.webp',
  }),
  TATER_HELMET: Object.freeze({
    kind: 'rendered',
    iconUrl: 'https://skyah.net/icons/items/melon_helmet.webp',
  }),
  HELIANTHUS_HELMET: Object.freeze({
    // Deliberately use the same normal rendered-item route as Fermento.
    // The local CSS player-head cube was visibly different from the target UI.
    kind: 'rendered',
    iconUrl: 'https://skyah.net/icons/items/helianthus_helmet.webp',
  }),
});

export function exactSetupItemArt(skyblockId) {
  const id = String(skyblockId || '').trim().toUpperCase().replace(/^PESTHUNTER_/, 'PESTHUNTERS_');
  return id ? EXACT_SETUP_ITEM_ART[id] || null : null;
}
