import test from 'node:test';
import assert from 'node:assert/strict';

import {
  ITEM_MODEL_SOURCE,
  auditFarmingItemModelCoverage,
  isFarmingPhysicalCatalogItem,
  itemModelSource,
} from '../src/item-model-coverage.js';

test('farming physical catalog filter includes modern tools, vacuums, armor, and equipment', () => {
  assert.equal(isFarmingPhysicalCatalogItem({ id: 'PUMPKIN_DICER_3', name: 'Pumpkin Dicer', category: 'HOE' }), true);
  assert.equal(isFarmingPhysicalCatalogItem({ id: 'INFINI_VACUUM', name: 'InfiniVacuum', category: 'VACUUM' }), true);
  assert.equal(isFarmingPhysicalCatalogItem({ id: 'HELIANTHUS_HELMET', name: 'Helianthus Helmet', category: 'HELMET' }), true);
  assert.equal(isFarmingPhysicalCatalogItem({ id: 'BLOSSOM_CLOAK', name: 'Blossom Cloak', category: 'CLOAK' }), true);
  assert.equal(isFarmingPhysicalCatalogItem({ id: 'ASPECT_OF_THE_END', name: 'Aspect of the End', category: 'SWORD' }), false);
});

test('official skin is preferred over pack and material fallbacks', () => {
  const source = itemModelSource({
    id: 'BLOSSOM_CLOAK',
    name: 'Blossom Cloak',
    material: 'PLAYER_HEAD',
    skin: 'a'.repeat(64),
  }, {
    schemaVersion: 1,
    pack: { id: 'SkyBlock', hash: 'test' },
    items: { bachelors_rose: { texture: 'assets/test.png' } },
  });
  assert.equal(source.source, ITEM_MODEL_SOURCE.OFFICIAL_SKIN);
});

test('armor material beats a same-set ingredient stand-in', () => {
  const manifest = {
    schemaVersion: 1,
    pack: { id: 'SkyBlock', hash: 'test' },
    items: { helianthus: { texture: 'assets/helianthus.png' } },
  };
  const source = itemModelSource({
    id: 'HELIANTHUS_HELMET',
    name: 'Helianthus Helmet',
    category: 'HELMET',
    material: 'LEATHER_HELMET',
  }, manifest);
  assert.equal(source.source, ITEM_MODEL_SOURCE.VANILLA_MATERIAL);
  assert.equal(source.material, 'LEATHER_HELMET');
});

test('coverage audit exposes unresolved farming items instead of hiding them', () => {
  const audit = auditFarmingItemModelCoverage([
    { id: 'HELIANTHUS_HELMET', name: 'Helianthus Helmet', category: 'HELMET', material: 'LEATHER_HELMET' },
    { id: 'BLOSSOM_CLOAK', name: 'Blossom Cloak', category: 'CLOAK', skin: 'b'.repeat(64) },
    { id: 'PUMPKIN_DICER_3', name: 'Pumpkin Dicer', category: 'HOE' },
  ]);

  assert.equal(audit.total, 3);
  assert.equal(audit.bySource[ITEM_MODEL_SOURCE.VANILLA_MATERIAL], 1);
  assert.equal(audit.bySource[ITEM_MODEL_SOURCE.OFFICIAL_SKIN], 1);
  assert.equal(audit.unresolvedCount, 1);
  assert.equal(audit.unresolved[0].id, 'PUMPKIN_DICER_3');
});
