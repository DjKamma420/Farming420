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

/** A key lookup that does not care how the serialiser cased the name. */
function pick(source, ...names) {
  const object = plainObject(source);
  if (!object) return undefined;
  for (const name of names) {
    if (object[name] !== undefined) return object[name];
  }
  const wanted = names.map(name => name.toLowerCase());
  for (const [key, value] of Object.entries(object)) {
    if (wanted.includes(key.toLowerCase())) return value;
  }
  return undefined;
}

function asList(value) {
  return Array.isArray(value) ? value : [];
}

/**
 * Every place a head's texture is known to sit, tried in turn.
 *
 * The original reader knew exactly one shape,
 * `SkullOwner.Properties.textures[].Value`, and returned null for anything
 * else. That is not a safe assumption: Minecraft 1.20.5 replaced `SkullOwner`
 * with a `profile` data component whose properties are a list of
 * `{name: 'textures', value: '<base64>'}` -- lowercase `value` -- and different
 * serialisers along the way case these keys differently. A reader that knows
 * one shape reports "this item is not a head" for every head it does not
 * recognise, and the whole gear grid then falls back to silhouettes and letter
 * badges with nothing to say why.
 *
 * So each known shape is tried and the first texture wins. Unknown shapes still
 * return null, which remains the correct answer for the many items that really
 * are not heads.
 */
function textureCandidates(tag) {
  const root = plainObject(tag);
  if (!root) return [];
  const out = [];

  const owner = pick(root, 'SkullOwner', 'skullOwner', 'skullowner');
  const profile = pick(root, 'profile')
    ?? pick(pick(root, 'components'), 'minecraft:profile', 'profile');

  for (const holder of [owner, profile]) {
    const properties = pick(holder, 'Properties', 'properties');

    // Shape A: { textures: [ { Value } ] }
    for (const entry of asList(pick(properties, 'textures'))) {
      out.push(pick(entry, 'Value', 'value'));
    }

    // Shape B: properties is itself a list of { name, value } pairs.
    for (const entry of asList(properties)) {
      const name = firstString(pick(entry, 'name', 'Name'));
      if (!name || name.toLowerCase() !== 'textures') continue;
      out.push(pick(entry, 'value', 'Value'));
    }

    // Shape C: the url or the bare id carried directly.
    const direct = pick(holder, 'url', 'Url', 'texture', 'Texture');
    if (direct) out.push(direct);
  }

  return out.filter(Boolean);
}

/**
 * Reads the skull texture id out of a decoded Minecraft item.
 *
 * Returns null for everything that is not a head, which is most items, so the
 * caller falls back to the resource pack and then to a placeholder.
 */
export function skullTextureFromTag(tag) {
  for (const candidate of textureCandidates(tag)) {
    const id = textureIdFromProperty(candidate) || textureIdFromUrl(candidate);
    if (id) return id;
    // A bare hash, with no URL and no base64 wrapper around it.
    const bare = firstString(candidate);
    if (bare && /^[0-9a-f]{32,64}$/i.test(bare)) return bare.toLowerCase();
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
