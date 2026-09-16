/**
 * Item art for the gear a resource pack cannot supply.
 *
 * Hypixel's official pack only carries textures it overrides. Farming armour,
 * equipment and pets are not among them: in the game they are player heads, and
 * their picture is a Minecraft skin served from Mojang's texture host. The
 * reference to it travels inside the item's own NBT, so a synced profile already
 * carries everything needed to show the real thing.
 *
 * This module is pure. It reads the reference, validates it, and describes where
 * the head sits inside the skin; nothing here touches the DOM or the network.
 */

export const TEXTURE_HOST = 'https://textures.minecraft.net';

/**
 * A skin is laid out on a 64-wide sheet. The face occupies an 8x8 square, and
 * the hat is a second 8x8 square drawn over it. Both sit at the same
 * coordinates in the legacy 64x32 sheet and the modern 64x64 one, so one set of
 * offsets covers either.
 */
export const SKIN_SHEET_WIDTH = 64;
export const HEAD_SIZE = 8;
export const FACE_OFFSET = Object.freeze({ x: 8, y: 8 });
export const HAT_OFFSET = Object.freeze({ x: 40, y: 8 });

function firstString(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

/**
 * The texture id, from a `.../texture/<id>` URL.
 *
 * Validated rather than trusted. This id is interpolated into a URL the page
 * then loads, so anything that is not a plain lowercase hex id is refused: the
 * app must never turn a field from a remote payload into an arbitrary request.
 */
export function textureIdFromUrl(url) {
  const value = firstString(url);
  if (!value) return null;
  const match = value.match(/\/texture\/([0-9a-f]{32,64})$/i);
  return match ? match[1].toLowerCase() : null;
}

/** The base64 property Mojang stores on a skull, decoded to its texture id. */
export function textureIdFromProperty(encodedValue) {
  const value = firstString(encodedValue);
  if (!value) return null;
  let json;
  try {
    // A skull property is base64 JSON. A malformed one is simply not a texture.
    const decoded = typeof atob === 'function'
      ? atob(value)
      : Buffer.from(value, 'base64').toString('binary');
    json = JSON.parse(decoded);
  } catch {
    return null;
  }
  return textureIdFromUrl(json?.textures?.SKIN?.url);
}

function plainObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : null;
}

/**
 * Reads the skull texture id out of a decoded Minecraft item.
 *
 * Returns null for everything that is not a head, which is most items, so the
 * caller falls back to the resource pack and then to a placeholder.
 */
export function skullTextureFromTag(tag) {
  const owner = plainObject(plainObject(tag)?.SkullOwner);
  const properties = plainObject(owner?.Properties);
  const textures = Array.isArray(properties?.textures) ? properties.textures : [];
  for (const entry of textures) {
    const id = textureIdFromProperty(plainObject(entry)?.Value);
    if (id) return id;
  }
  return null;
}

export function skullTextureUrl(textureId) {
  const id = firstString(textureId);
  if (!id || !/^[0-9a-f]{32,64}$/.test(id)) return null;
  return `${TEXTURE_HOST}/texture/${id}`;
}

/**
 * Where to put the sheet so that one 8x8 square fills a box of `size` pixels.
 *
 * Returned as numbers rather than a style string so the caller can apply them
 * through the CSSOM: the page's Content Security Policy drops inline style
 * attributes, and a head that silently rendered as the whole skin would be the
 * result of forgetting that.
 */
export function headLayerGeometry(size, offset = FACE_OFFSET) {
  const box = Math.max(1, Number(size) || 1);
  const scale = box / HEAD_SIZE;
  return {
    backgroundSize: SKIN_SHEET_WIDTH * scale,
    offsetX: -offset.x * scale,
    offsetY: -offset.y * scale,
  };
}
