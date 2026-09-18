import assert from 'node:assert/strict';
import test from 'node:test';

import {
  exactItemRenderUrl,
  itemColorHex,
  skyCryptHeadRenderUrl,
  skyCryptItemRenderUrl,
  skyCryptLeatherRenderUrl,
} from '../src/exact-item-renderer.js';

const origin = 'https://example.invalid';

test('exact renderer validates item ids and head hashes before building urls', () => {
  assert.equal(skyCryptItemRenderUrl('HELIANTHUS_CHESTPLATE', origin), origin + '/api/item/HELIANTHUS_CHESTPLATE');
  assert.equal(skyCryptItemRenderUrl('../bad', origin), null);
  assert.equal(skyCryptHeadRenderUrl('a'.repeat(64), origin), origin + '/api/head/' + 'a'.repeat(64));
  assert.equal(skyCryptHeadRenderUrl('not-a-hash', origin), null);
});

test('Minecraft leather colour accepts NBT integer and Hypixel rgb text', () => {
  assert.equal(itemColorHex(16770305), 'ffe501');
  assert.equal(itemColorHex('255,229,1'), 'ffe501');
  assert.equal(itemColorHex('#FFE501'), 'ffe501');
  assert.equal(itemColorHex('999,0,0'), null);
});

test('instance dye colour renders through the exact leather endpoint', () => {
  const item = {
    skyblockId: 'HELIANTHUS_LEGGINGS',
    itemModel: 'minecraft:leather_leggings',
    displayColor: 16770305,
    color: '1,2,3',
  };
  assert.equal(skyCryptLeatherRenderUrl(item, origin), origin + '/api/leather/leggings/ffe501');
  assert.equal(exactItemRenderUrl(item, origin), origin + '/api/leather/leggings/ffe501');
});

test('a concrete head texture beats the generic SkyBlock item render', () => {
  const hash = 'b'.repeat(64);
  assert.equal(exactItemRenderUrl({
    skyblockId: 'HELIANTHUS_HELMET',
    skullTexture: hash,
  }, origin), origin + '/api/head/' + hash);
});

test('ordinary armor and gear resolve by exact SkyBlock id', () => {
  assert.equal(exactItemRenderUrl({
    id: 'HELIANTHUS_CHESTPLATE',
    material: 'IRON_CHESTPLATE',
  }, origin), origin + '/api/item/HELIANTHUS_CHESTPLATE');
});
