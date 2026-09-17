import assert from 'node:assert/strict';
import test from 'node:test';

import { isFarmingArmorCatalogItem, itemsForSlot } from '../src/item-catalog.js';

const catalog = [
  { id: 'FARMHAND_HELMET', name: 'Farmhand Helmet', category: 'HELMET' },
  { id: 'HAYMAKER_CHESTPLATE', name: 'Haymaker Chestplate', category: 'CHESTPLATE' },
  { id: 'SPROUT_LEGGINGS', name: 'Sprout Leggings', category: 'LEGGINGS' },
  { id: 'TATER_BOOTS', name: 'Tater Boots', category: 'BOOTS' },
  { id: 'CROPIE_HELMET', name: 'Cropie Helmet', category: 'HELMET' },
  { id: 'SQUASH_HELMET', name: 'Squash Helmet', category: 'HELMET' },
  { id: 'FERMENTO_HELMET', name: 'Fermento Helmet', category: 'HELMET' },
  { id: 'HELIANTHUS_HELMET', name: 'Helianthus Helmet', category: 'HELMET' },
  { id: 'ENCHANTED_JACK_O_LANTERN', name: 'Lantern Helmet', category: 'HELMET' },
  { id: 'RANCHERS_BOOTS', name: "Rancher's Boots", category: 'BOOTS' },
  { id: 'FARMER_BOOTS', name: 'Farmer Boots', category: 'BOOTS' },
  { id: 'PUFFERFISH_HAT', name: 'Pufferfish Hat', category: 'HELMET' },
  { id: 'SUPERIOR_DRAGON_HELMET', name: 'Superior Dragon Helmet', category: 'HELMET' },
  { id: 'RABBIT_HELMET', name: 'Rabbit Helmet', category: 'HELMET' },
  { id: 'YOUNG_DRAGON_BOOTS', name: 'Young Dragon Boots', category: 'BOOTS' },
  { id: 'LOTUS_BRACELET', name: 'Lotus Bracelet', category: 'BRACELET' },
];

test('armor slots expose farming armor and farming-relevant standalone helmets/boots', () => {
  assert.deepEqual(itemsForSlot(catalog, 'helmet').map(item => item.id), [
    'CROPIE_HELMET',
    'FARMHAND_HELMET',
    'FERMENTO_HELMET',
    'HELIANTHUS_HELMET',
    'ENCHANTED_JACK_O_LANTERN',
    'PUFFERFISH_HAT',
    'SQUASH_HELMET',
  ]);
  assert.deepEqual(itemsForSlot(catalog, 'boots').map(item => item.id), [
    'FARMER_BOOTS',
    'RANCHERS_BOOTS',
    'TATER_BOOTS',
  ]);
});

test('Lantern Helmet is kept because it is farming-relevant and has two Peridot sockets', () => {
  assert.equal(isFarmingArmorCatalogItem({ id: 'ENCHANTED_JACK_O_LANTERN', name: 'Lantern Helmet' }), true);
});

test('combat and Rabbit armor are excluded from the farming picker', () => {
  assert.equal(isFarmingArmorCatalogItem({ id: 'SUPERIOR_DRAGON_HELMET', name: 'Superior Dragon Helmet' }), false);
  assert.equal(isFarmingArmorCatalogItem({ id: 'RABBIT_HELMET', name: 'Rabbit Helmet' }), false);
});

test('equipment categories are not narrowed by the armor filter', () => {
  assert.deepEqual(itemsForSlot(catalog, 'equipment4').map(item => item.id), ['LOTUS_BRACELET']);
});

test('legacy farming armor ids remain accepted after 0.26.1 renames', () => {
  for (const id of ['FARM_SUIT_HELMET', 'FARM_ARMOR_CHESTPLATE', 'PUMPKIN_LEGGINGS', 'MELON_BOOTS']) {
    assert.equal(isFarmingArmorCatalogItem({ id, name: id }), true, id);
  }
});
