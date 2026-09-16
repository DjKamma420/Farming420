import assert from 'node:assert/strict';
import test from 'node:test';

import {
  assetKeyForSkyblockId,
  clearItemAssetManifestCacheForTests,
  itemAssetForSkyblockId,
  loadItemAssetManifest,
  validateItemAssetManifest,
} from '../src/item-assets.js';

const manifest = {
  schemaVersion: 1,
  pack: { id: 'SkyBlock', hash: 'abc' },
  items: {
    melon_dicer_3: {
      definition: 'items/item/melon_dicer_3.json',
      texture: 'textures/item/melon_dicer_3.png',
    },
  },
};

test('asset lookup uses only the real SkyBlock id normalization', () => {
  assert.equal(assetKeyForSkyblockId(' MELON_DICER_3 '), 'melon_dicer_3');
  assert.equal(assetKeyForSkyblockId(''), null);
  assert.equal(assetKeyForSkyblockId('../escape'), null);
  assert.equal(assetKeyForSkyblockId('Melon Dicer 3.0'), null, 'display names are not silently used as ids');
});

test('a manifest hit resolves to a local official-pack texture', () => {
  assert.deepEqual(itemAssetForSkyblockId(manifest, 'MELON_DICER_3'), {
    key: 'melon_dicer_3',
    textureUrl: './assets/hypixel-pack/textures/item/melon_dicer_3.png',
    definition: 'items/item/melon_dicer_3.json',
    packHash: 'abc',
  });
});

test('a missing asset stays missing instead of guessing from another item', () => {
  assert.equal(itemAssetForSkyblockId(manifest, 'PUMPKIN_DICER'), null);
  assert.equal(itemAssetForSkyblockId(manifest, null), null);
});

test('unsafe texture paths and malformed manifests are rejected', () => {
  assert.equal(validateItemAssetManifest({}), null);
  assert.equal(validateItemAssetManifest({ schemaVersion: 1, pack: { id: 'Other' }, items: {} }), null);
  const unsafe = structuredClone(manifest);
  unsafe.items.melon_dicer_3.texture = '../secret.png';
  assert.equal(itemAssetForSkyblockId(unsafe, 'MELON_DICER_3'), null);
});

test('manifest loading caches a valid result and degrades cleanly on HTTP failure', async () => {
  clearItemAssetManifestCacheForTests();
  let calls = 0;
  const fetchImpl = async () => {
    calls += 1;
    return { ok: true, json: async () => manifest };
  };
  assert.equal(await loadItemAssetManifest({ fetchImpl }), manifest);
  assert.equal(await loadItemAssetManifest({ fetchImpl }), manifest);
  assert.equal(calls, 1);

  clearItemAssetManifestCacheForTests();
  assert.equal(await loadItemAssetManifest({ fetchImpl: async () => ({ ok: false }) }), null);
});
