import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

import {
  FACE_OFFSET,
  HAT_OFFSET,
  HEAD_SIZE,
  KNOWN_FARMING_EQUIPMENT_HEAD_TEXTURES,
  SKIN_SHEET_WIDTH,
  TEXTURE_HOST,
  headLayerGeometry,
  knownSkyblockHeadTexture,
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

test('current farming armor and equipment ids have exact verified head models', () => {
  const expected = {
    CROPIE_HELMET: 'e4bacb96734e244b9f7331d453e686fa2e32522a411aa568f960e741d74b3289',
    FERMENTO_HELMET: '5086ddbe960f33480ca229da7402391ab417d32ebb21770430ea610de5801fe3',
    HELIANTHUS_HELMET: '46e48a6eff318dcda57d5d76a9b2656be25973e3d472b6d2e446a8e60f60a78a',
    MELON_HELMET: '8208669e699d6f0d3a77f74b2b27228ce51b9359678d26f9c3408764b2e779aa',
    PUMPKIN_HELMET: '2f92489725093d51dd18a259382fa0207a20a94495883d9f4b1fd97a8a11b9f0',
    SQUASH_HELMET: 'de1087c0c519a9a1dcee4325410b19a1be4855eac5a662ae1b523329f90faecd',
    ENCHANTED_JACK_O_LANTERN: '8a06221ca4a7355f34098692e4da691fef06abac0bf9041d573a13d62cc3091',
    PUFFERFISH_HAT: '44f7f2203e3a850b6c83dce47fd6714a62e4d7648c16ed1fd9dc8168ab3c484f',
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
  assert.equal(knownSkyblockHeadTexture('PUFFERFISH_HELMET'), expected.PUFFERFISH_HAT, 'legacy pufferfish id remains renderable');
  assert.equal(knownSkyblockHeadTexture('NOT_REAL'), null);
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

test('the page allows Mojang skins and the exact external item renderer as image sources', () => {
  const indexHtml = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const csp = indexHtml.match(/Content-Security-Policy"\s+content="([^"]+)"/)?.[1] ?? '';
  const imgSrc = csp.match(/img-src ([^;]+)/)?.[1] ?? '';
  assert.match(imgSrc, /https:\/\/textures\.minecraft\.net/);
  assert.match(imgSrc, /https:\/\/sky\.shiiyu\.moe/);
  // Displaying is all that is needed. Neither image host is fetched through JS,
  // so neither belongs in connect-src.
  const connectSrc = csp.match(/connect-src ([^;]+)/)?.[1] ?? '';
  assert.doesNotMatch(connectSrc, /textures\.minecraft\.net/);
  assert.doesNotMatch(connectSrc, /sky\.shiiyu\.moe/);
});
