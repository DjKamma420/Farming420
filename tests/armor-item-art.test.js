import test from 'node:test';
import assert from 'node:assert/strict';

import {
  armorItemSvgMarkup,
  armorPalette,
  armorSlotForItem,
  isArmorItem,
  parseArmorColor,
} from '../src/armor-item-art.js';

test('armor detection works from category, material, or SkyBlock id', () => {
  assert.equal(armorSlotForItem({ category: 'CHESTPLATE' }), 'CHESTPLATE');
  assert.equal(armorSlotForItem({ material: 'LEATHER_LEGGINGS' }), 'LEGGINGS');
  assert.equal(armorSlotForItem({ id: 'HELIANTHUS_BOOTS' }), 'BOOTS');
  assert.equal(isArmorItem({ id: 'FERMENTO_HELMET' }), true);
  assert.equal(isArmorItem({ id: 'FERMENTO_ARTIFACT' }), false);
});

test('official leather dye RGB is preserved as the armor base color', () => {
  const item = {
    id: 'CROPIE_CHESTPLATE',
    category: 'CHESTPLATE',
    material: 'LEATHER_CHESTPLATE',
    color: '122,41,0',
  };
  assert.deepEqual(parseArmorColor(item.color), [122, 41, 0]);
  assert.equal(armorPalette(item).base, '#7a2900');
  assert.match(armorItemSvgMarkup(item), /#7a2900/);
});

test('invalid dye data falls back to the vanilla material palette', () => {
  assert.equal(parseArmorColor('400,-2,wat'), null);
  assert.equal(
    armorPalette({ category: 'BOOTS', material: 'DIAMOND_BOOTS', color: 'bad' }).base,
    '#56e3e6',
  );
});

test('each armor slot emits a distinct pixel model', () => {
  const models = ['HELMET', 'CHESTPLATE', 'LEGGINGS', 'BOOTS']
    .map(category => armorItemSvgMarkup({ category, material: `LEATHER_${category}`, color: '106,156,27' }));
  assert.equal(new Set(models).size, 4);
  for (const model of models) {
    assert.match(model, /viewBox="0 0 16 16"/);
    assert.match(model, /shape-rendering="crispEdges"/);
    assert.match(model, /#6a9c1b/);
  }
});

test('non-armor items do not receive an armor model', () => {
  assert.equal(armorItemSvgMarkup({ id: 'FERMENTO', material: 'SKULL_ITEM' }), null);
  assert.equal(armorItemSvgMarkup(null), null);
});
