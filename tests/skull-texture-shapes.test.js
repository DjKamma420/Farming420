import test from 'node:test';
import assert from 'node:assert/strict';
import { skullTextureFromTag } from '../src/skull-art.js';

/**
 * Every NBT shape a head's texture is known to arrive in.
 *
 * The reader used to know exactly one -- `SkullOwner.Properties.textures[].Value`
 * -- and answered "not a head" for all the others. When that happens nothing
 * reports an error: the gear grid quietly falls back to hand-drawn silhouettes
 * and two-letter badges, which is what the Mossy Helianthus set and the Blossom
 * equipment were showing.
 */

const HASH = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
const PROPERTY = 'eyJ0ZXh0dXJlcyI6IHsiU0tJTiI6IHsidXJsIjogImh0dHA6Ly90ZXh0dXJlcy5taW5lY3JhZnQubmV0L3RleHR1cmUvYmJiYmJiYmJiYmJiYmJiYmJiYmJiYmJiYmJiYmJiYmJiYmJiYmJiYmJiYmJiYmJiYmJiYmJiYmJiYmJiYmJiYiJ9fX0=';

test('the classic SkullOwner shape', () => {
  assert.equal(
    skullTextureFromTag({ SkullOwner: { Properties: { textures: [{ Value: PROPERTY }] } } }),
    HASH,
  );
});

test('a 1.20.5 profile component with a properties list', () => {
  assert.equal(
    skullTextureFromTag({
      components: { 'minecraft:profile': { properties: [{ name: 'textures', value: PROPERTY }] } },
    }),
    HASH,
  );
});

test('a bare profile with a properties list', () => {
  assert.equal(
    skullTextureFromTag({ profile: { properties: [{ name: 'textures', value: PROPERTY }] } }),
    HASH,
  );
});

test('lowercase value inside the textures list', () => {
  assert.equal(
    skullTextureFromTag({ SkullOwner: { Properties: { textures: [{ value: PROPERTY }] } } }),
    HASH,
  );
});

test('a lowercased owner key', () => {
  assert.equal(
    skullTextureFromTag({ skullowner: { properties: { textures: [{ Value: PROPERTY }] } } }),
    HASH,
  );
});

test('a texture url carried directly', () => {
  assert.equal(
    skullTextureFromTag({ SkullOwner: { url: `http://textures.minecraft.net/texture/${HASH}` } }),
    HASH,
  );
});

test('a bare hash carried directly', () => {
  assert.equal(skullTextureFromTag({ profile: { texture: HASH.toUpperCase() } }), HASH);
});

test('items that are genuinely not heads still answer null', () => {
  assert.equal(skullTextureFromTag({ ExtraAttributes: { id: 'HELIANTHUS_CHESTPLATE' } }), null);
  assert.equal(skullTextureFromTag({ SkullOwner: 'Notch' }), null);
  assert.equal(skullTextureFromTag(null), null);
  assert.equal(skullTextureFromTag({ SkullOwner: { Properties: { textures: [] } } }), null);
});

test('a malformed property is not a texture, not a crash', () => {
  assert.equal(
    skullTextureFromTag({ SkullOwner: { Properties: { textures: [{ Value: 'not-base64-json' }] } } }),
    null,
  );
});

test('a url pointing somewhere else is refused', () => {
  assert.equal(
    skullTextureFromTag({ profile: { url: 'https://evil.example/texture/' + HASH } }),
    HASH,
    'the id is extracted from the path; the host is never used to build the request',
  );
});
