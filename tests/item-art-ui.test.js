import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

import {
  activeSetupFromStoredState,
  catalogItemForSetupArt,
  itemForSetupSlot,
  setupItemAsset,
} from '../src/item-art-ui.js';

const manifest = {
  schemaVersion: 1,
  pack: { id: 'SkyBlock', hash: 'pack-hash' },
  items: {
    melon_dicer_3: {
      source: 'island_relevant/garden/melon_dicer_3',
      texture: 'textures/item/melon_dicer_3.png',
    },
  },
};

const state = {
  profile: {
    setups: {
      activeId: 'normal',
      shareFarmingKillingPet: false,
      list: [
        {
          id: 'normal',
          slots: {
            helmet: { skyblockId: 'MELON_DICER_3', displayName: 'Melon Dicer 3.0' },
            chestplate: { skyblockId: null, displayName: 'Manual Item' },
          },
        },
        { id: 'pest', slots: { helmet: { skyblockId: 'OTHER', displayName: 'Other Helmet' } } },
        { id: 'pest-kill', slots: { pet: { skyblockId: 'HEDGEHOG', displayName: 'Hedgehog Pet' } } },
      ],
    },
  },
};

test('setup art lookup follows the active effective setup', () => {
  assert.equal(activeSetupFromStoredState(state).id, 'normal');
  assert.equal(itemForSetupSlot(state, 'helmet').skyblockId, 'MELON_DICER_3');
  assert.equal(itemForSetupSlot(state, 'boots'), null);
});

test('Killing art inherits FF gear but keeps the Killing pet', () => {
  const killingState = structuredClone(state);
  killingState.profile.setups.activeId = 'pest-kill';

  assert.equal(activeSetupFromStoredState(killingState).slots.helmet.skyblockId, 'MELON_DICER_3');
  assert.equal(itemForSetupSlot(killingState, 'helmet', 'pest-kill').skyblockId, 'MELON_DICER_3');
  assert.equal(itemForSetupSlot(killingState, 'pet', 'pest-kill').skyblockId, 'HEDGEHOG');
  assert.equal(itemForSetupSlot(killingState, 'helmet', 'pest').skyblockId, 'OTHER');
});

test('setup art resolves from exact skyblockId and never display-name guesses', () => {
  assert.deepEqual(setupItemAsset(manifest, state, 'helmet'), {
    key: 'melon_dicer_3',
    textureUrl: './assets/hypixel-pack/textures/item/melon_dicer_3.png',
    source: 'island_relevant/garden/melon_dicer_3',
    packHash: 'pack-hash',
  });
  assert.deepEqual(setupItemAsset(manifest, state, 'helmet', 'pest-kill'), {
    key: 'melon_dicer_3',
    textureUrl: './assets/hypixel-pack/textures/item/melon_dicer_3.png',
    source: 'island_relevant/garden/melon_dicer_3',
    packHash: 'pack-hash',
  });
  assert.equal(setupItemAsset(manifest, state, 'chestplate'), null);
});

test('rendering binds portraits to the card setup target and item id', () => {
  const source = readFileSync(new URL('../src/item-art-ui.js', import.meta.url), 'utf8');
  const app = readFileSync(new URL('../src/app.js', import.meta.url), 'utf8');
  assert.match(app, /data-skyblock-item-id/);
  assert.match(source, /slotCard\?\.dataset\.setupTarget/);
  assert.match(source, /slotCard\?\.dataset\.skyblockItemId/);
  assert.match(source, /dataset\.skyblockItemId/);
  assert.match(source, /itemAssetForSkyblockId\(manifestValue, itemId\)/);
  assert.match(source, /knownSkyblockHeadTexture\(itemId\)/);
  assert.doesNotMatch(source, /itemAssetForSkyblockId\(manifestValue, item\.displayName\)/);
});

test('official item catalog fallback is exact-id only', () => {
  const catalog = [
    { id: 'HELIANTHUS_CHESTPLATE', name: 'Helianthus Chestplate', category: 'CHESTPLATE' },
    { id: 'HELIANTHUS_BOOTS', name: 'Helianthus Boots', category: 'BOOTS' },
  ];
  assert.equal(catalogItemForSetupArt(catalog, 'helianthus_chestplate')?.id, 'HELIANTHUS_CHESTPLATE');
  assert.equal(catalogItemForSetupArt(catalog, 'helianthus')?.id, undefined);
  assert.equal(catalogItemForSetupArt(catalog, ''), null);
});

test('manual equipment ids use their exact head model before the letter fallback', () => {
  const source = readFileSync(new URL('../src/item-art-ui.js', import.meta.url), 'utf8');
  assert.match(source, /knownSkyblockHeadTexture\(itemId\)/);
  assert.match(source, /const skull = skullNode\(textureId, item, \(\) => showCatalogOrLetterFallback/);
  assert.match(source, /armorItemSvgMarkup/);
  assert.match(source, /loadItemCatalog/);
  assert.match(source, /document\.createElement\('img'\)/);
  assert.doesNotMatch(source, /style\.backgroundImage/);
});

test('head art renders before the optional pack manifest finishes loading', () => {
  const source = readFileSync(new URL('../src/item-art-ui.js', import.meta.url), 'utf8');
  const firstRender = source.indexOf('renderSetupItemArt({ root, rawState, manifestValue: manifest })');
  const manifestLoad = source.indexOf('const [loaded] = await Promise.all([ensureManifest(), ensureCatalog()])');
  assert.ok(firstRender >= 0 && manifestLoad > firstRender);
});

test('invalid or missing setup state degrades to no asset', () => {
  assert.equal(activeSetupFromStoredState({}), null);
  assert.equal(itemForSetupSlot({}, 'helmet'), null);
  assert.equal(setupItemAsset(manifest, {}, 'helmet'), null);
});


test('pack fallback is replaced after the async manifest becomes available', () => {
  const source = readFileSync(new URL('../src/item-art-ui.js', import.meta.url), 'utf8');
  assert.match(source, /sameKey && card\.classList\.contains\('has-official-item-art'\)/);
  assert.match(source, /if \(!asset\)[\s\S]*?has-item-art-fallback/);
  assert.match(source, /removeRenderedArt\(card\);[\s\S]*?const img = imageNode\(asset/);
  assert.doesNotMatch(
    source,
    /\(card\.classList\.contains\('has-official-item-art'\) \|\| card\.classList\.contains\('has-item-art-fallback'\)\)[\s\S]{0,120}renderedPackAsset/,
  );
});


test('core render explicitly announces the same in-memory state to setup art', () => {
  const app = readFileSync(new URL('../src/app.js', import.meta.url), 'utf8');
  assert.doesNotMatch(app, /import \{ applySetupItemArt \}/);
  assert.match(app, /new CustomEvent\('farming420:rendered'/);
  assert.match(app, /detail: \{ state \}/);
  const source = readFileSync(new URL('../src/item-art-ui.js', import.meta.url), 'utf8');
  assert.match(source, /addEventListener\('farming420:rendered'/);
  assert.match(source, /rawState: event\.detail\?\.state \|\| readState\(\)/);
});

test('setup art exposes an explicit render hook instead of depending only on observers', () => {
  const source = readFileSync(new URL('../src/item-art-ui.js', import.meta.url), 'utf8');
  assert.match(source, /export async function applySetupItemArt/);
  assert.match(source, /renderSetupItemArt\(\{ root, rawState, manifestValue: manifest \}\)/);
});


test('concurrent core renders share resource promises instead of dropping the newer portrait pass', () => {
  const source = readFileSync(new URL('../src/item-art-ui.js', import.meta.url), 'utf8');
  assert.match(source, /manifestPromise \|\|=/);
  assert.match(source, /catalogPromise \|\|=/);
  assert.doesNotMatch(source, /if \(applying/);
  assert.match(source, /Every caller paints its own current DOM/);
});
