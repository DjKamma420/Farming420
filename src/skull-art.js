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


/**
 * Exact farming player-head models verified from current SkyBlock item NBT
 * (NotEnoughUpdates item repository, checked 2026-09-18).
 *
 * These are fallbacks for manually selected/saved items that only carry a
 * SkyBlock id. A live texture from the player's NBT or Hypixel item resource
 * still wins at the call site, so an upstream model change is not masked.
 */
export const KNOWN_FARMING_ACCESSORY_HEAD_TEXTURES = Object.freeze({
  CROPIE_TALISMAN: 'ac7d5520a73e1d6d785496b5f5af8c9e14b40d6f6ebd629231ddbce27d422214',
  SQUASH_RING: 'f881a38800a1c867d2a1a8a10c8543ae8a3b8a9a87c1ac58ba1e283bb0dc3d68',
  FERMENTO_ARTIFACT: 'e1add7231c97e77a169be764a41f981cc9f542aa8c6a1336d8be2d817211bbfd',
  HELIANTHUS_RELIC: '2e6c711f74f92bcbe486ec7e67810a16f0d1eaaac39b80d7a650cd81d611a2e7',
  ANITA_TALISMAN: 'bb8ec57b37fdf093fe66efe2ac070a8f5181949970a4458d56ec9701eded8cff',
  ANITA_RING: '59a1035bc6f00fddc8e0291c38319408babc84ae10648cb5258ed8b55d60e0c3',
  ANITA_ARTIFACT: '8feabdadd5f593771fa23c94fc6816091917371fd5a1c74723e716210d6e6efb',
  PESTHUNTER_BADGE: 'b4f1f0cf3adb4adc6b996ff9cb4e6d9d8912e0a5ab851c366c8abbdaf8b2ef04',
  PESTHUNTER_RING: '1d06b74d6bd02b795f7bcbf17ac3b77d3bc57b695a8d54a1770c76e84896c8f8',
  PESTHUNTER_ARTIFACT: 'b3aefd8bca236d315920d53bea1fe4892c8f1f308d6d57630677f059a3b0293f',
  PESTHUNTER_RELIC: '7b36c204f50a11f7fe22c1d16e6a85777b24b4ad316140c666295721214d1310',
  BIOANALYSIS_TALISMAN: '19ca2fedab02df448906b25f25f2df2c9b9c532ce48276447113dca6825e9e05',
  BIOANALYSIS_RING: '80b774ffeb5878d6e34e9f244642e4ee489fd1dc9a2da52b87e2ecc0449c22f9',
  BIOANALYSIS_ARTIFACT: 'e5f2e8e4f040d1dbef5a5369bd09db86a79b81a249547e458b3cc5997e24c0eb',
  COPPER_TALISMAN: '856cba11ca1258258e903f2586fe19ecf20f4a99ef5870347cf32c2ba76e59cf',
  COPPER_RING: 'f83a812525faf3499c3294634398b5e0e967489f2ee63e14490c1440553af065',
  COPPER_ARTIFACT: '2933e519fc6b29c930bf74d426a2f4888a9994fe2892c6d5585fd6a3a8e52689',
  ATMOSPHERIC_FILTER: 'd3cf5cd92c1ba0a7d7bb1f872ccdb951ca897d340040457a324271606c5bbc56',
  MAGIC_8_BALL: 'df2412d63dd2e0e232230abd04a8f726e51c93a72686c7dae1722c4677f9f548',
  POWER_RELIC: 'd8fdc87023cff26356477f2e097a2de83b550d88a6f1a877da4f95c4db11567f',
  AGARIMOO_ARTIFACT: '7f3130468ac480a427db13ad13e8ca8526b538ab7ad7d69fc9952f3c53aea8d1',
  FARMING_TALISMAN: 'ad7a30c82dba9f5a7befd6abc16089e29256e52e06f2a85f2461acd7a557c14a',
});

export const KNOWN_FARMING_EQUIPMENT_RENDERED_ICONS = Object.freeze({
  // Exact rendered item icon, verified against the current item page.
  // This bypasses player-skin cropping on clients where that route renders blank.
  PESTHUNTERS_NECKLACE: 'https://skyah.net/icons/items/pesthunters_necklace.webp',
});

const FARMING_ARMOR_RENDERED_ICON_PREFIXES = Object.freeze([
  'FARMHAND_', 'HAYMAKER_', 'SPROUT_', 'TATER_',
  'FARM_SUIT_', 'FARM_ARMOR_', 'PUMPKIN_', 'MELON_',
  'CROPIE_', 'SQUASH_', 'FERMENTO_', 'HELIANTHUS_',
]);

const FARMING_ARMOR_RENDERED_ICON_SUFFIXES = new Set([
  'HELMET', 'CHESTPLATE', 'LEGGINGS', 'BOOTS',
]);

const FARMING_STANDALONE_RENDERED_ICON_IDS = new Set([
  'RANCHERS_BOOTS',
  'FARMER_BOOTS',
  'ENCHANTED_JACK_O_LANTERN',
  'PUFFERFISH_HAT',
]);

function isKnownFarmingArmorRenderedIconId(id) {
  if (FARMING_STANDALONE_RENDERED_ICON_IDS.has(id)) return true;
  for (const prefix of FARMING_ARMOR_RENDERED_ICON_PREFIXES) {
    if (!id.startsWith(prefix)) continue;
    return FARMING_ARMOR_RENDERED_ICON_SUFFIXES.has(id.slice(prefix.length));
  }
  return false;
}

function skyAhRenderedIconUrl(id) {
  return `https://skyah.net/icons/items/${id.toLowerCase()}.webp`;
}

export const KNOWN_FARMING_EQUIPMENT_HEAD_TEXTURES = Object.freeze({
  LOTUS_NECKLACE: 'ad83aa25c11acfce7442ff0129fd70bb42ca0de63ba2115169966cc351f1716b',
  LOTUS_CLOAK: 'ee40d7762d2b7aed5d925d17f7b3c1451e709c2537a5546b1ce6e0d8ee2757d4',
  LOTUS_BELT: '4ce8d19b0163d1eadde563377394b05de63427c6e3f8a949e0dfa32bb20d7f2d',
  LOTUS_BRACELET: '5783279018cdddffa913abf3621d78f204405961f77fb96841d01b274f027cab',

  BLOSSOM_NECKLACE: '5e8e20f1534c2a9d940bac97c4c4b29b68db6a286ad9c92ae85aee78e0486043',
  BLOSSOM_CLOAK: '8453a8084b7773c1b2bb6213901da8cfb50de5e5d0c8c524ff4fad0e182ea68b',
  BLOSSOM_BELT: '718c48cbf371c2daf41fc22e5a9f8a35ee6a4bb2e8bc61d6b247009be49dd25b',
  BLOSSOM_BRACELET: 'ab1d8ff8f461340cd73c910aa6df299395f5e80ada49e430efa9c57f5bf755f4',

  PESTHUNTERS_NECKLACE: '93d176b1c9abfc536b20a611fe479304baf5f995f4da90d634144bc4a5243830',
  PESTHUNTERS_CLOAK: 'c7d2a356fa8f187af0b64f14015c4a31660549a59db8db1f014ecebf8b5cbb74',
  PESTHUNTERS_BELT: '9aa9661e2c6b10aa76a6e8212732a985f2c54630585f22d9819c831ea642db41',
  PESTHUNTERS_GLOVES: 'af2918861753fe19f28f66e8e998511f3490995abf0972a9391f00d8c530ed39',

  PEST_VEST: '68c942255b0fef311d72fcb723087309bca9084f8c4a2c0c03b5618687f83ae4',
  ZORROS_CAPE: '81f7226a927558d069a6ae343b4e089fbd60fc6037190097c7713208e988faae',
});

const KNOWN_HEAD_ID_ALIASES = Object.freeze({
  // Keep old manually saved Farming420 ids renderable after correcting the
  // historical singular id typo in the catalogue filter.
  PESTHUNTER_NECKLACE: 'PESTHUNTERS_NECKLACE',
  PESTHUNTER_CLOAK: 'PESTHUNTERS_CLOAK',
  PESTHUNTER_BELT: 'PESTHUNTERS_BELT',
  PESTHUNTER_GLOVES: 'PESTHUNTERS_GLOVES',
  ZORRO_CAPE: 'ZORROS_CAPE',
  PUFFERFISH_HELMET: 'PUFFERFISH_HAT',
});

export function knownSkyblockHeadTexture(skyblockId) {
  const raw = String(skyblockId || '').trim().toUpperCase();
  if (!raw) return null;
  const id = KNOWN_HEAD_ID_ALIASES[raw] || raw;
  const hash = KNOWN_FARMING_ACCESSORY_HEAD_TEXTURES[id] || KNOWN_FARMING_EQUIPMENT_HEAD_TEXTURES[id] || null;
  return hash && /^[0-9a-f]{64}$/.test(hash) ? hash : null;
}

export function knownSkyblockRenderedIcon(skyblockId) {
  const raw = String(skyblockId || '').trim().toUpperCase();
  if (!raw) return null;
  const id = KNOWN_HEAD_ID_ALIASES[raw] || raw;
  const explicit = KNOWN_FARMING_EQUIPMENT_RENDERED_ICONS[id] || null;
  if (explicit) {
    return /^https:\/\/skyah\.net\/icons\/items\/[a-z0-9_]+\.webp$/.test(explicit) ? explicit : null;
  }
  return isKnownFarmingArmorRenderedIconId(id) ? skyAhRenderedIconUrl(id) : null;
}

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
