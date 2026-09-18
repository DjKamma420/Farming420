export const SKYCRYPT_RENDER_ORIGIN = 'https://sky.shiiyu.moe';

const SKYBLOCK_ID = /^[A-Za-z0-9_:-]+$/;
const TEXTURE_HASH = /^[0-9a-f]{32,128}$/i;
const ARMOR_TYPES = new Set(['helmet', 'chestplate', 'leggings', 'boots']);

function byte(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0 || number > 255) return null;
  return Math.round(number);
}

function rgbHex(red, green, blue) {
  const parts = [byte(red), byte(green), byte(blue)];
  if (parts.some(value => value === null)) return null;
  return parts.map(value => value.toString(16).padStart(2, '0')).join('');
}

/**
 * Minecraft stores dyed leather colour as one 24-bit integer in item NBT.
 * Hypixel's item resource exposes default colours as "r,g,b". Accept both so
 * a synced item instance can override the catalogue default without guessing.
 */
export function itemColorHex(value) {
  if (Number.isInteger(value) && value >= 0 && value <= 0xffffff) {
    return value.toString(16).padStart(6, '0');
  }

  if (typeof value === 'string') {
    const text = value.trim();
    if (/^#?[0-9a-f]{6}$/i.test(text)) return text.replace('#', '').toLowerCase();
    if (/^\d+$/.test(text)) {
      const number = Number(text);
      if (Number.isInteger(number) && number >= 0 && number <= 0xffffff) {
        return number.toString(16).padStart(6, '0');
      }
    }
    const rgb = text.split(',').map(part => part.trim());
    if (rgb.length === 3) return rgbHex(...rgb);
  }

  if (Array.isArray(value) && value.length === 3) return rgbHex(...value);
  return null;
}

export function skyCryptHeadRenderUrl(textureId, origin = SKYCRYPT_RENDER_ORIGIN) {
  const hash = String(textureId || '').trim().toLowerCase();
  if (!TEXTURE_HASH.test(hash)) return null;
  return `${origin}/api/head/${hash}`;
}

export function skyCryptItemRenderUrl(itemId, origin = SKYCRYPT_RENDER_ORIGIN) {
  const id = String(itemId || '').trim();
  if (!id || !SKYBLOCK_ID.test(id)) return null;
  return `${origin}/api/item/${encodeURIComponent(id)}`;
}

function armorTypeFrom(item) {
  const model = String(item?.itemModel || item?.material || '').trim().toLowerCase().replace(/^minecraft:/, '');
  for (const type of ARMOR_TYPES) {
    if (model.endsWith(`_${type}`)) return type;
  }

  const category = String(item?.category || '').trim().toLowerCase();
  return ARMOR_TYPES.has(category) ? category : null;
}

function isLeatherArmor(item) {
  const model = String(item?.itemModel || item?.material || '').trim().toLowerCase().replace(/^minecraft:/, '');
  return model.startsWith('leather_') && ARMOR_TYPES.has(model.slice('leather_'.length));
}

export function skyCryptLeatherRenderUrl(item, origin = SKYCRYPT_RENDER_ORIGIN) {
  if (!isLeatherArmor(item)) return null;
  const type = armorTypeFrom(item);
  const color = itemColorHex(item?.displayColor ?? item?.color);
  if (!type || !color) return null;
  return `${origin}/api/leather/${type}/${color}`;
}

/**
 * Exact visual source for a concrete item instance.
 *
 * Instance-specific head textures and dyed leather take precedence. Otherwise
 * the stable SkyBlock id is handed to the same item renderer SkyCrypt uses for
 * its profile pages, which resolves the Hypixel pack, NEU model metadata and
 * vanilla Minecraft assets. This is presentation only; no game mechanic is
 * sourced from this service.
 */
export function exactItemRenderUrl(item, origin = SKYCRYPT_RENDER_ORIGIN) {
  if (!item || typeof item !== 'object') return null;

  const textureId = String(item.skullTexture || item.skin || '').trim();
  const head = skyCryptHeadRenderUrl(textureId, origin);
  if (head) return head;

  const leather = skyCryptLeatherRenderUrl(item, origin);
  if (leather && item.displayColor !== null && item.displayColor !== undefined) return leather;

  const itemId = item.skyblockId || item.id;
  const bySkyblockId = skyCryptItemRenderUrl(itemId, origin);
  if (bySkyblockId) return bySkyblockId;

  const model = String(item.itemModel || '').trim().replace(/^minecraft:/i, '');
  return skyCryptItemRenderUrl(model, origin);
}
