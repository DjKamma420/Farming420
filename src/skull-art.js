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
 * (NotEnoughUpdates item repository, checked 2026-09-27).
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
  FRESHLY_BAKED_TALISMAN: '4aaebfd586cec00e36a4a2e72d8a4eba586ec9ed58e9c8eeee6725fe90eeb584',
  FRESHLY_BAKED_RING: '6b94d27ab760315e64dc73b881458be8643d7b73cfa5bc8c23d35628ccd513ac',
  FRESHLY_BAKED_ARTIFACT: 'd4e330e41bad63f7c65c8664efb6ec72b071e94831a01f1bb50fc10a22cd623e',
  FRESHLY_BAKED_RELIC: 'dd0b79b73bb9ca033f30aaca3dca296580ec6e98504e75b3d5f722af1dfc676c',
  FRESHLY_BAKED_HEIRLOOM: '4522ee39ce8989b4c3777a23514e0e97b31441717c779e9c2eed364206d2b56e',
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

export const KNOWN_ATTRIBUTE_SHARD_HEAD_TEXTURES = Object.freeze({
  'ATTRIBUTE_SHARD_FORTUNATE_FARMER;1': '9d90e777826a52461368e26d1b2e19bfa1ba582d602483e545f4124d0f731842',
  'ATTRIBUTE_SHARD_SOLAR_POWER;1': '4ce79e90adf34718f313ec24d6c6135b69b3788c618498446ccc83ca640c0b14',
  'ATTRIBUTE_SHARD_LUNAR_POWER;1': 'bee4fcc5aac27bdbb0be210df08b05bca5aebc89bf2821f608a55fd2cf0434be',
  'ATTRIBUTE_SHARD_ULTIMATE_DNA;1': '3c9285e8e922e1a3cbb91f712f35c6492b0019b38504fc6063e7b614aaf35d7b',
  'ATTRIBUTE_SHARD_INFILTRATION;1': '6403ba4027a333d8d2fd32ab59d1cfdbaa7d908d80d2381db2a69cbe65450ad8',
  'ATTRIBUTE_SHARD_CROP_BUG;1': '70a1e836bf1968b2eaa4837227a19204f17295d870ee9e754bd6b6d60ddbed3c',
  'ATTRIBUTE_SHARD_PEST_LUCK;1': 'f379e09252817314bd0b694f7d53b48af2c7fa8499109802a41bb294d2f93e3e',
  'ATTRIBUTE_SHARD_PEST_FORTUNE;1': 'a24c69f96ce556221e195c8ef2bfad71ebf7f95f5ae914a484a8d0ec21672674',
  'ATTRIBUTE_SHARD_BONUS_PEST_CHANCE;1': '2186bfad77fd8306d2937ef44e92bd6c433cdcc6d7c75eda85c621d6d94bfaaf',
  'ATTRIBUTE_SHARD_PEST_COOLDOWN;1': '65485c4b34e5b5470be94de100e61f7816f81bc5a11dfdf0eccf890172da5d0a',
  'ATTRIBUTE_SHARD_INSECT_POWER;1': '1e04bb6367caa4e88f5fd0ee80f0745d137a6060223dbbc42a16471fdf64bb83',
  'ATTRIBUTE_SHARD_SPRAYONATOR_SERENDIPITY;1': 'a8abb471db0ab78703011979dc8b40798a941f3a4dec3ec61cbeec2af8cffe8',
  'ATTRIBUTE_SHARD_GROOVY_RADAR;1': '5451c2b640d0b4f24089b074074b15183cdaff7d5915f7245416f385ec843407',
  'ATTRIBUTE_SHARD_ENCHANTED_FARMER;1': '52a9fe05bc663efcd12e56a3ccc5ec035bf577b78708548b6f4ffcf1d30eccfe',
  'ATTRIBUTE_SHARD_CROP_SPEED;1': '4b24a482a32db1ea78fb98060b0c2fa4a373cbd18a68edddeb7419455a59cda9',
  'ATTRIBUTE_SHARD_COMPOST_SPEED;1': '895aeec6b842ada8669f846d65bc49762597824ab944f22f45bf3bbb941abe6c',
  'ATTRIBUTE_SHARD_VISITOR_BAIT;1': 'aed02c6329a89f01a7b8523f67dc4b096bfff8961f11ba3384cd2fd60c2c189f',
  'ATTRIBUTE_SHARD_FANCY_VISIT;1': '1b944a5ecf2401d4826cf8380a3ad540e517dcd4461869092552043ec10fbfae',
  'ATTRIBUTE_SHARD_PRETTY_CLOTHES;1': '4fc6fc2af2c411fa698840dc46311ff26e92153ae2f4f6187b765de2323be2c8',
  'ATTRIBUTE_SHARD_VISITOR_HONEY;1': '763ac656e2ad477e81215d50cf578341985b9ee4073ee7f1d3ed5a8a6f4e6fc1',
  'ATTRIBUTE_SHARD_VISITOR_COMPOST;1': '3bab26ea1e954681e5fd82f73d015c53702121cc1cc218eba51cb7cfb1061abc',
  'ATTRIBUTE_SHARD_VISITOR_CHEESE;1': '70556d44c1a9cb5e49abe4db81d5b7750d8f018f3abd16efecb9e72ea8e8a7c8',
  'ATTRIBUTE_SHARD_VISITOR_PLANT;1': '34af0a707e649e70b1d71a3c19650d23cb6b8fa4aebdab3960c0464bab463d3f',
  'ATTRIBUTE_SHARD_VISITOR_DUNG;1': '9d2a5d91cc84f24ed354ad9ff6cc33f06c47128be03fb0896fb995f7a81540af',
  'ATTRIBUTE_SHARD_GARDEN_WISDOM;1': '254aff4c0b2dce3a672349cc0ee9e6f3a9deebe4b3556e84611eca250a7821bf',

  'ATTRIBUTE_SHARD_LIGHT_ELEMENTAL;1': '31c5de8f1dd0e14546429848b79d8f9720b0d4b4d1ba37a224fb96a3e8148dd7',
  'ATTRIBUTE_SHARD_STONE_ELEMENTAL;1': '12708998025a200c1e872e8a7ed7046d26c7e8d669322ed9e5b64eee3a9865f1',
  'ATTRIBUTE_SHARD_LIGHTNING_ELEMENTAL;1': '6294de8959d9bb49c0eda98eda370ea069f3ca683bf764e145171f8101a45d58',
  'ATTRIBUTE_SHARD_WIND_ELEMENTAL;1': '501048b64a7583503e5bbe679c8f3599be35b635212d8664af96e4e3c052b952',
  'ATTRIBUTE_SHARD_STORM_ELEMENTAL;1': '80634aee3d9ac83d819bd398b7723ca2ea664a1b26ec1c3a254d9b0ae22d8bf9',
  'ATTRIBUTE_SHARD_ECHO_OF_ELEMENTAL;1': '5bfd9642cdf3962a0ecd2b9c007295020538da732d597c59bbb820e389f9fc2a',
  'ATTRIBUTE_SHARD_UNLIMITED_POWER;1': '9174dc76a89a36717e64573b781c29bc69591fb9937c08b7b7781638c240d356',
  'ATTRIBUTE_SHARD_ALMIGHTY;1': '8ea18128ddff80781505a0b505d3a9bdae5b796032b1abcef5429a55ec638fb7',
  'ATTRIBUTE_SHARD_TUNING_BOX;1': '3964d404e2c623180e2377ab0b2d6ce0ea0188421999f589fd65d21a15363405',
  'ATTRIBUTE_SHARD_FILTER_UPGRADE;1': 'be6baf6431a9daa2ca604d5a3c26e9a761d5952f0817174a4fe0b764616e21ff',
  'ATTRIBUTE_SHARD_ECHO_OF_WISDOM;1': 'fe43f3bc9509f5bdfe6e3a85848a3029a33ed701d184a03b4282958e31eeaca1',
  'ATTRIBUTE_SHARD_QUEENLY_ECHO;1': '970945f2ca8eb7ba7f7a1be3ab085b9a4196db4975bf5a8f71c576aa8542a20c',
  'ATTRIBUTE_SHARD_ECHO_OF_ECHOES;1': '6c2927c9dda07ce66be0931be674c8eda84f2d9c10c87bd7e220e63e88f012d7',
});

export const KNOWN_FARMING_EQUIPMENT_RENDERED_ICONS = Object.freeze({
  // Exact rendered item icons, verified against the current item pages.
  // These bypass player-skin cropping on clients where that route renders blank.
  PESTHUNTER_BADGE: 'https://skyah.net/icons/items/pesthunter_badge.webp',
  PESTHUNTERS_NECKLACE: 'https://skyah.net/icons/items/pesthunters_necklace.webp',
  // SkyAH's Helianthus item pages use the underlying vanilla iron sprites for
  // these two pieces instead of a SkyBlock-id-specific icon path.
  HELIANTHUS_CHESTPLATE: 'https://skyah.net/icons/items/iron_chestplate.webp',
  HELIANTHUS_BOOTS: 'https://skyah.net/icons/items/iron_boots.webp',
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
  PUFFERFISH_HAT_CELEBRATION: 'PUFFERFISH_HAT',
});

const FARMING_ARMOR_RENDERED_PREFIX_ALIASES = Object.freeze([
  ['FARMHAND_', 'FARM_SUIT_'],
  ['HAYMAKER_', 'FARM_ARMOR_'],
  ['SPROUT_', 'PUMPKIN_'],
  ['TATER_', 'MELON_'],
]);

function renderedArmorItemId(id) {
  for (const [currentPrefix, assetPrefix] of FARMING_ARMOR_RENDERED_PREFIX_ALIASES) {
    if (id.startsWith(currentPrefix)) return assetPrefix + id.slice(currentPrefix.length);
  }
  return id;
}

export function knownSkyblockHeadTexture(skyblockId) {
  const raw = String(skyblockId || '').trim().toUpperCase();
  if (!raw) return null;
  const id = KNOWN_HEAD_ID_ALIASES[raw] || raw;
  const hash = KNOWN_ATTRIBUTE_SHARD_HEAD_TEXTURES[id]
    || KNOWN_FARMING_ACCESSORY_HEAD_TEXTURES[id]
    || KNOWN_FARMING_EQUIPMENT_HEAD_TEXTURES[id]
    || null;
  return hash && /^[0-9a-f]{32,64}$/.test(hash) ? hash : null;
}

export function knownSkyblockRenderedIcon(skyblockId) {
  const raw = String(skyblockId || '').trim().toUpperCase();
  if (!raw) return null;
  const aliased = KNOWN_HEAD_ID_ALIASES[raw] || raw;
  const id = renderedArmorItemId(aliased);
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
