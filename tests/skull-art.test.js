import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

import {
  FACE_OFFSET,
  HAT_OFFSET,
  HEAD_SIZE,
  SKIN_SHEET_WIDTH,
  TEXTURE_HOST,
  headLayerGeometry,
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
  // Displaying is all that is needed. The host sends no CORS header, so the
  // pixels are never read back, and it has no business in connect-src.
  assert.doesNotMatch(csp.match(/connect-src ([^;]+)/)?.[1] ?? '', /textures\.minecraft\.net/);
});
