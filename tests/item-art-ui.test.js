import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

import {
  activeSetupFromStoredState,
  catalogItemForSetupArt,
  catalogRenderedIconForSetupArt,
  itemForSetupSlot,
  setupItemAsset,
} from '../src/item-art-ui.js';
import { exactSetupItemArt } from '../src/setup-item-art-map.js';

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
      physicalSetCount: 3,
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

test('held Pet Item fallback is generated only from an exact catalog item id', () => {
  const catalog = [
    { id: 'POIGNANT_LUCKY_CLOVER', name: 'Poignant Lucky Clover', category: 'PET_ITEM' },
    { id: 'HELIANTHUS_BOOTS', name: 'Poignant Lucky Clover', category: 'BOOTS' },
  ];
  assert.equal(
    catalogRenderedIconForSetupArt(catalog, 'POIGNANT_LUCKY_CLOVER'),
    'https://skyah.net/icons/items/poignant_lucky_clover.webp',
  );
  assert.equal(catalogRenderedIconForSetupArt(catalog, 'HELIANTHUS_BOOTS'), null);
  assert.equal(catalogRenderedIconForSetupArt(catalog, 'Poignant Lucky Clover'), null);
});

test('manual equipment ids use their exact head model before the letter fallback', () => {
  const source = readFileSync(new URL('../src/item-art-ui.js', import.meta.url), 'utf8');
  assert.match(source, /knownSkyblockHeadTexture\(itemId\)/);
  assert.match(source, /const skull = skullNode\(textureId, item, \(\) => showCatalogOrLetterFallback/);
  assert.match(source, /knownSkyblockRenderedIcon\(itemId\)/);
  assert.match(source, /armorItemSvgMarkup\(descriptor\.item\)/);
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


test('verified helmet exceptions use normal inventory icons instead of custom 3D/generated models', () => {
  assert.deepEqual(exactSetupItemArt('HELIANTHUS_HELMET'), {
    kind: 'rendered',
    iconUrl: 'https://skyah.net/icons/items/helianthus_helmet.webp',
  });
  assert.deepEqual(exactSetupItemArt('FARM_SUIT_HELMET'), {
    kind: 'rendered',
    iconUrl: 'https://skyah.net/icons/items/farm_suit_helmet.webp',
  });
  assert.deepEqual(exactSetupItemArt('FARMHAND_HELMET'), {
    kind: 'rendered',
    iconUrl: 'https://skyah.net/icons/items/farm_suit_helmet.webp',
  });
  assert.equal(exactSetupItemArt('FARM_ARMOR_HELMET')?.iconUrl, 'https://skyah.net/icons/items/hay_block.webp');
  assert.equal(exactSetupItemArt('PUMPKIN_HELMET')?.iconUrl, 'https://skyah.net/icons/items/pumpkin_helmet.webp');
  assert.equal(exactSetupItemArt('SPROUT_HELMET')?.iconUrl, 'https://skyah.net/icons/items/pumpkin_helmet.webp');
  assert.equal(exactSetupItemArt('MELON_HELMET')?.iconUrl, 'https://skyah.net/icons/items/melon_helmet.webp');
  assert.equal(exactSetupItemArt('TATER_HELMET')?.iconUrl, 'https://skyah.net/icons/items/melon_helmet.webp');
  assert.equal(exactSetupItemArt('HELIANTHUS_CHESTPLATE'), null);
});

test('exact setup item-id art controls the intended portrait route before generic fallbacks', () => {
  const source = readFileSync(new URL('../src/item-art-ui.js', import.meta.url), 'utf8');
  const mappedLookup = source.indexOf('const mappedArt = exactSetupItemArt(itemId)');
  const mappedRender = source.indexOf('if (mappedArt) {', mappedLookup);
  assert.ok(mappedLookup >= 0);
  assert.ok(mappedRender > mappedLookup);
  assert.match(source, /exactSetupArtNode\(itemId, item/);
  assert.match(source, /descriptor\.kind === 'voxel-head'/);
  assert.match(source, /voxelHeadNode\(descriptor\.textureId, item, onError\)/);
  assert.match(source, /descriptor\.kind === 'rendered'/);
  assert.match(source, /remoteIconNode\(descriptor\.iconUrl \|\| knownSkyblockRenderedIcon\(itemId\), item, onError\)/);
});


test('all farming pet types have deterministic exact head portraits', () => {
  const petIds = [
    'BEE',
    'CHICKEN',
    'ELEPHANT',
    'HEDGEHOG',
    'MOOSHROOM_COW',
    'MOSQUITO',
    'ORCHID_MANTIS',
    'PIG',
    'RABBIT',
    'ROSE_DRAGON',
    'SLUG',
  ];
  for (const id of petIds) {
    const art = exactSetupItemArt(id);
    assert.equal(art?.kind, 'head', `${id} should resolve to a head`);
    assert.match(art?.textureId || '', /^[0-9a-f]{32,64}$/);
  }
  assert.equal(exactSetupItemArt('PET'), null);
});

test('farming Bandanas have exact local head portraits before the catalog loads', () => {
  assert.deepEqual(exactSetupItemArt('YELLOW_BANDANA'), {
    kind: 'head',
    textureId: '799d16737b4f2633f9e7c4538992115c107928a9a01abff407c0297194bd6867',
  });
  assert.deepEqual(exactSetupItemArt('GREEN_BANDANA'), {
    kind: 'head',
    textureId: '3521cccdbb892dff183d97bbdb12f2671e0cd12b945b8fca211a7065359a03a5',
  });
  assert.deepEqual(exactSetupItemArt('BROWN_BANDANA'), {
    kind: 'head',
    textureId: '674e061e6d853822bbad56d079357c248c9a40de494f20eae0078a0a02ef0da7',
  });
});

test('catalog Pet Item icon fallback is below exact setup art and exact catalog skins', () => {
  const source = readFileSync(new URL('../src/item-art-ui.js', import.meta.url), 'utf8');
  const mappedRender = source.indexOf('if (mappedArt) {');
  const catalogTexture = source.indexOf('const catalogTexture =');
  const petItemRemote = source.indexOf('catalogRenderedIconForSetupArt(itemCatalog, itemId)');
  assert.ok(mappedRender >= 0);
  assert.ok(catalogTexture >= 0 && petItemRemote > catalogTexture);
  assert.match(source, /if \(renderedIconUrl\) return remoteIconNode\(renderedIconUrl, item, onError\)/);
});


test('voxel fallback helmets still use a real three-face cube when their normal icon is unavailable', () => {
  const source = readFileSync(new URL('../src/item-art-ui.js', import.meta.url), 'utf8');
  const css = readFileSync(new URL('../src/item-art-ui.css', import.meta.url), 'utf8');
  assert.match(source, /function voxelHeadNode/);
  assert.match(source, /\['front', 'right', 'top'\]/);
  assert.match(source, /\['base', 'hat'\]/);
  assert.match(source, /setup-voxel-head-cube/);
  assert.match(css, /transform-style:\s*preserve-3d/);
  assert.match(css, /setup-voxel-front[^\n]*translateZ\(15px\)/);
  assert.match(css, /setup-voxel-right[^\n]*rotateY\(90deg\) translateZ\(15px\)/);
  assert.match(css, /setup-voxel-top[^\n]*rotateX\(90deg\) translateZ\(15px\)/);
});

test('Poignant Lucky Clover has deterministic rendered Pet Item art', () => {
  assert.deepEqual(exactSetupItemArt('POIGNANT_LUCKY_CLOVER'), {
    kind: 'rendered',
    iconUrl: 'https://skyah.net/icons/items/poignant_lucky_clover.webp',
  });
});


test('setup armor art does not reintroduce generated SVG armor silhouettes', () => {
  const source = readFileSync(new URL('../src/item-art-ui.js', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /armorItemSvgMarkup/);
  assert.match(source, /knownSkyblockRenderedIcon\(itemId\)/);
  assert.match(source, /Do not invent a hand-drawn armor silhouette/);
});

test('any catalog-backed player-head helmet uses the 3D voxel renderer', () => {
  const source = readFileSync(new URL('../src/item-art-ui.js', import.meta.url), 'utf8');
  assert.match(source, /const helmetTextureId = slotId === 'helmet'/);
  assert.match(source, /validCatalogTexture/);
  assert.match(source, /if \(helmetTextureId && !mappedArt\)/);
  assert.match(source, /voxelHeadNode\(helmetTextureId, item/);
});


test('Farmhand setup icon corrects only the stale brown rendered asset', () => {
  const css = readFileSync(new URL('../src/item-art-ui.css', import.meta.url), 'utf8');
  assert.match(css, /farm_suit_helmet\.webp/);
  assert.match(css, /saturate\(4\.6\)/);
  assert.match(css, /brightness\(1\.5\)/);
});
