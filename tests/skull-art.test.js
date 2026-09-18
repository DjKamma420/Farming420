import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

import {
  FACE_OFFSET,
  HAT_OFFSET,
  HEAD_SIZE,
  KNOWN_FARMING_ACCESSORY_HEAD_TEXTURES,
  KNOWN_FARMING_EQUIPMENT_HEAD_TEXTURES,
  KNOWN_FARMING_EQUIPMENT_RENDERED_ICONS,
  SKIN_SHEET_WIDTH,
  TEXTURE_HOST,
  headLayerGeometry,
  knownSkyblockHeadTexture,
  knownSkyblockRenderedIcon,
  skullTextureFromTag,
  skullTextureUrl,
  textureIdFromProperty,
  textureIdFromUrl,
} from '../src/skull-art.js';
import { normalizeDecodedItem } from '../src/item-normalizer.js';
import { itemRecordFromDecoded, createEmptyItem, normalizeSetups } from '../src/setups.js';

const ID = 'a3f2b1c4d5e6f708192a3b4c5d6e7f80';
const encode = value => Buffer.from(JSON.stringify(value)).toString('base64');
const property = url => encode({ textures: { SKIN: { url } } });

test('a texture id is read from the url the skull carries', () => {
  assert.equal(textureIdFromUrl(`http://textures.minecraft.net/texture/${ID}`), ID);
  assert.equal(textureIdFromUrl(`https://textures.minecraft.net/texture/${ID.toUpperCase()}`), ID);
  assert.equal(textureIdFromProperty(property(`http://textures.minecraft.net/texture/${ID}`)), ID);
});

test('current Farming accessory ids have exact verified head models', () => {
  const expected = {
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
  };
  assert.deepEqual(KNOWN_FARMING_ACCESSORY_HEAD_TEXTURES, expected);
  for (const [id, hash] of Object.entries(expected)) assert.equal(knownSkyblockHeadTexture(id), hash, id);
});

test('current farming equipment ids have exact verified head models', () => {
  const expected = {
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
  };
  assert.deepEqual(KNOWN_FARMING_EQUIPMENT_HEAD_TEXTURES, expected);
  for (const [id, hash] of Object.entries(expected)) {
    assert.equal(knownSkyblockHeadTexture(id), hash, id);
  }
  for (const suffix of ['NECKLACE', 'CLOAK', 'BELT', 'GLOVES']) {
    assert.equal(
      knownSkyblockHeadTexture(`PESTHUNTER_${suffix}`),
      expected[`PESTHUNTERS_${suffix}`],
      `old singular Pesthunter ${suffix.toLowerCase()} id remains renderable`,
    );
  }
  assert.equal(knownSkyblockHeadTexture('ZORRO_CAPE'), expected.ZORROS_CAPE, 'old saved typo remains renderable');
  assert.equal(knownSkyblockHeadTexture('NOT_REAL'), null);
});

test('Pesthunter necklace has an exact rendered item icon fallback', () => {
  assert.equal(
    KNOWN_FARMING_EQUIPMENT_RENDERED_ICONS.PESTHUNTERS_NECKLACE,
    'https://skyah.net/icons/items/pesthunters_necklace.webp',
  );
  assert.equal(
    knownSkyblockRenderedIcon('PESTHUNTERS_NECKLACE'),
    'https://skyah.net/icons/items/pesthunters_necklace.webp',
  );
  assert.equal(
    knownSkyblockRenderedIcon('PESTHUNTER_NECKLACE'),
    'https://skyah.net/icons/items/pesthunters_necklace.webp',
  );
  assert.equal(knownSkyblockRenderedIcon('NOT_REAL'), null);
});

test('anything that is not a plain hex id is refused', () => {
  // This id is interpolated into a URL the page then loads. A field from a
  // remote payload must never become an arbitrary request.
  assert.equal(textureIdFromUrl('https://evil.example/texture/abc'), null);
  assert.equal(textureIdFromUrl('http://textures.minecraft.net/texture/../../secret'), null);
  assert.equal(textureIdFromUrl(`http://textures.minecraft.net/texture/${ID}?x=1`), null);
  assert.equal(textureIdFromUrl('http://textures.minecraft.net/texture/nothex!!'), null);
  assert.equal(skullTextureUrl('../../evil'), null);
  assert.equal(skullTextureUrl('short'), null);
  assert.equal(skullTextureUrl(''), null);
  assert.equal(skullTextureUrl(ID), `${TEXTURE_HOST}/texture/${ID}`);
});

test('a malformed skull property is simply not a texture', () => {
  assert.equal(textureIdFromProperty('not base64 json'), null);
  assert.equal(textureIdFromProperty(encode({ textures: {} })), null);
  assert.equal(textureIdFromProperty(encode({ nope: true })), null);
  assert.equal(textureIdFromProperty(null), null);
});

test('the texture is found in the nested shape Minecraft actually stores', () => {
  const tag = {
    SkullOwner: {
      Id: 'whatever',
      Properties: { textures: [{ Value: property(`http://textures.minecraft.net/texture/${ID}`) }] },
    },
  };
  assert.equal(skullTextureFromTag(tag), ID);
  // Most items are not heads, and that has to be a quiet null so the caller can
  // fall back to the resource pack and then to a placeholder.
  assert.equal(skullTextureFromTag({ display: { Name: 'A Hoe' } }), null);
  assert.equal(skullTextureFromTag({ SkullOwner: {} }), null);
  assert.equal(skullTextureFromTag({ SkullOwner: { Properties: { textures: [] } } }), null);
  assert.equal(skullTextureFromTag(null), null);
});

test('one head square fills the box exactly, for either sheet height', () => {
  // A skin sheet is 64 wide; the head is an 8x8 square, so the sheet is drawn at
  // eight times the box and shifted so the wanted square lands on it.
  const face = headLayerGeometry(64, FACE_OFFSET);
  assert.equal(face.backgroundSize, SKIN_SHEET_WIDTH * (64 / HEAD_SIZE));
  assert.equal(face.offsetX, -64);
  assert.equal(face.offsetY, -64);

  const hat = headLayerGeometry(64, HAT_OFFSET);
  assert.equal(hat.offsetX, -HAT_OFFSET.x * (64 / HEAD_SIZE));
  assert.equal(hat.offsetY, face.offsetY, 'the hat sits at the same height as the face');

  // The offsets scale with the box, so the same geometry serves any size.
  assert.equal(headLayerGeometry(32, FACE_OFFSET).offsetX, -32);
});

test('a synced item carries its head through to the setup slot', () => {
  const decoded = normalizeDecodedItem({
    tag: {
      display: { Name: '§6Helianthus Helmet', Lore: ['§6§lLEGENDARY HELMET'] },
      ExtraAttributes: { id: 'HELIANTHUS_HELMET', modifier: 'mossy' },
      SkullOwner: {
        Properties: { textures: [{ Value: property(`http://textures.minecraft.net/texture/${ID}`) }] },
      },
    },
  }, { container: 'armor', slot: 3 });

  assert.equal(decoded.skullTexture, ID);
  assert.equal(itemRecordFromDecoded(decoded).skullTexture, ID);
  // An item that is not a head stores nothing rather than an empty string.
  assert.equal(normalizeDecodedItem({ tag: { ExtraAttributes: { id: 'MELON_DICER' } } }).skullTexture, null);
});

test('a setup saved before heads existed still loads', () => {
  const older = {
    modelVersion: 1,
    activeId: 'normal',
    list: [{ id: 'normal', name: 'Normal', slots: { helmet: { displayName: 'Old Helmet' } } }],
  };
  const helmet = normalizeSetups(older).list[0].slots.helmet;
  assert.equal(helmet.displayName, 'Old Helmet');
  assert.equal(helmet.skullTexture, null, 'the new field must be filled in, not left undefined');
  assert.ok('skullTexture' in createEmptyItem());
});

test('the art layer cannot add a second picture to the same slot', () => {
  // The failure this pins was reproduced in a browser: the observer that watches
  // for new cards saw its own insertion and ran again, without end, because the
  // guard looked for one kind of child rather than at the container.
  const source = readFileSync(new URL('../src/item-art-ui.js', import.meta.url), 'utf8');
  assert.match(source, /classList\.contains\('has-official-item-art'\)/);
  assert.doesNotMatch(source, /querySelector\('\.official-item-art'\)/);
  // A slot card contains its own portrait, so matching both put one picture in
  // the card and a second in the portrait inside it.
  assert.doesNotMatch(source, /querySelectorAll\('\.slot-card\[data-slot\]/);
});

test('the page is allowed to load head textures, and only from Mojang', () => {
  const indexHtml = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const csp = indexHtml.match(/Content-Security-Policy"\s+content="([^"]+)"/)?.[1] ?? '';
  const imgSrc = csp.match(/img-src ([^;]+)/)?.[1] ?? '';
  assert.match(imgSrc, /https:\/\/textures\.minecraft\.net/);
  assert.match(imgSrc, /https:\/\/skyah\.net/);
  // Displaying is all that is needed. The host sends no CORS header, so the
  // pixels are never read back, and it has no business in connect-src.
  assert.doesNotMatch(csp.match(/connect-src ([^;]+)/)?.[1] ?? '', /textures\.minecraft\.net/);
});
