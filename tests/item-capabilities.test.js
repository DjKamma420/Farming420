import assert from 'node:assert/strict';
import test from 'node:test';

import {
  FARMING_REFORGES_BY_FAMILY,
  VACUUM_REFORGE_EFFECT_ENTRY_IDS,
  applyVacuumReforge,
  canRecombobulateItem,
  catalogItemForSetupItem,
  gemValuesForSlotType,
  itemCapabilities,
  reforgeOptionsForItem,
  selectedVacuumReforge,
} from '../src/item-capabilities.js';

const catalog = [
  { id: 'CROPIE_HELMET', name: 'Cropie Helmet', category: 'HELMET', gemstoneSlots: [{ index: 0, slotType: 'PERIDOT' }], cannotReforge: false, canRecombobulate: null },
  { id: 'FERMENTO_HELMET', name: 'Fermento Helmet', category: 'HELMET', gemstoneSlots: [{ index: 0, slotType: 'PERIDOT' }, { index: 1, slotType: 'PERIDOT' }], cannotReforge: false, canRecombobulate: null },
  { id: 'FARMHAND_HELMET', name: 'Farmhand Helmet', category: 'HELMET', gemstoneSlots: [], cannotReforge: false, canRecombobulate: null },
  { id: 'BLOSSOM_NECKLACE', name: 'Blossom Necklace', category: 'NECKLACE', gemstoneSlots: [], cannotReforge: false, canRecombobulate: null },
  { id: 'LOCKED_ITEM', name: 'Locked Item', category: 'HELMET', gemstoneSlots: [{ index: 0, slotType: 'PERIDOT' }], cannotReforge: true, canRecombobulate: false },
];

test('setup items resolve by exact SkyBlock id before display name', () => {
  const item = catalogItemForSetupItem(catalog, { skyblockId: 'CROPIE_HELMET', displayName: 'Mossy Cropie Helmet' });
  assert.equal(item?.id, 'CROPIE_HELMET');
  assert.equal(catalogItemForSetupItem(catalog, { displayName: 'Cropie Helmet' })?.id, 'CROPIE_HELMET');
  assert.equal(catalogItemForSetupItem(catalog, { displayName: 'Cropie' }), null, 'fuzzy matches are forbidden');
});

test('armor and equipment reforges stay in their own farming families', () => {
  const armor = reforgeOptionsForItem('helmet', catalog[0]).map(option => option.id);
  const equipment = reforgeOptionsForItem('equipment1', catalog[3]).map(option => option.id);
  assert.deepEqual(armor, ['bustling', 'mossy', 'mantid', 'sunny']);
  assert.deepEqual(equipment, ['blooming', 'rooted', 'squeaky', 'thorny', 'lunar']);
  assert.equal(armor.includes('beady'), false);
  assert.equal(armor.includes('rooted'), false);
  assert.equal(equipment.includes('bountiful'), false);
  assert.deepEqual(FARMING_REFORGES_BY_FAMILY.vacuum.map(option => option.id), ['beady', 'buzzing']);
  assert.deepEqual(FARMING_REFORGES_BY_FAMILY['farming-tool'].map(option => option.id), ['bountiful', 'blessed', 'earthy', 'deep-fried', 'overpriced']);
});

test('Vacuum reforges are exclusive and Beady scoring follows the selected reforge', () => {
  const beadyEntry = VACUUM_REFORGE_EFFECT_ENTRY_IDS.beady;
  const bucket = { levels: { [beadyEntry]: 1 }, owned: { [beadyEntry]: true } };
  assert.equal(selectedVacuumReforge(bucket), 'beady', 'legacy Beady state remains readable');

  applyVacuumReforge(bucket, 'buzzing');
  assert.equal(bucket.reforge, 'buzzing');
  assert.equal(bucket.levels[beadyEntry], undefined);
  assert.equal(bucket.owned[beadyEntry], undefined);
  assert.equal(selectedVacuumReforge(bucket), 'buzzing');

  applyVacuumReforge(bucket, 'beady');
  assert.equal(bucket.reforge, 'beady');
  assert.equal(bucket.levels[beadyEntry], 1);
  assert.equal(bucket.owned[beadyEntry], true);
});

test('cannot_reforge and can_recombobulate false are authoritative', () => {
  assert.deepEqual(reforgeOptionsForItem('helmet', catalog[4]), []);
  assert.equal(canRecombobulateItem('helmet', catalog[4]), false);
});

test('known armor and equipment default to recombobulatable unless explicitly forbidden', () => {
  assert.equal(canRecombobulateItem('helmet', catalog[0]), true);
  assert.equal(canRecombobulateItem('equipment1', catalog[3]), true);
  assert.equal(canRecombobulateItem('pet', catalog[3]), false);
});

test('gemstone controls are generated from the concrete item sockets only', () => {
  const cropie = itemCapabilities('helmet', { skyblockId: 'CROPIE_HELMET' }, catalog);
  const fermento = itemCapabilities('helmet', { skyblockId: 'FERMENTO_HELMET' }, catalog);
  const farmhand = itemCapabilities('helmet', { skyblockId: 'FARMHAND_HELMET' }, catalog);
  const blossom = itemCapabilities('equipment1', { skyblockId: 'BLOSSOM_NECKLACE' }, catalog);
  assert.equal(cropie.gemstoneSlots.length, 1);
  assert.equal(fermento.gemstoneSlots.length, 2);
  assert.equal(farmhand.gemstoneSlots.length, 0);
  assert.equal(blossom.gemstoneSlots.length, 0);
});

test('a Peridot socket never offers unrelated gemstones', () => {
  const values = gemValuesForSlotType('PERIDOT');
  assert.deepEqual(values, ['ROUGH PERIDOT', 'FLAWED PERIDOT', 'FINE PERIDOT', 'FLAWLESS PERIDOT', 'PERFECT PERIDOT']);
  assert.equal(values.some(value => value.includes('JASPER')), false);
});

test('current grouped sockets include Onyx and Opal where Hypixel allows them', () => {
  const combat = gemValuesForSlotType('COMBAT');
  const defensive = gemValuesForSlotType('DEFENSIVE');
  assert.equal(combat.includes('PERFECT ONYX'), true);
  assert.equal(combat.includes('PERFECT OPAL'), true);
  assert.equal(defensive.includes('PERFECT OPAL'), true);
  assert.equal(defensive.some(value => value.includes('ONYX')), false);
  assert.equal(combat.some(value => value.includes('PERIDOT')), false);
});

test('unknown/manual item does not inherit generic upgrades', () => {
  const capabilities = itemCapabilities('helmet', { displayName: 'Something Typed By Hand' }, catalog);
  assert.equal(capabilities.known, false);
  assert.equal(capabilities.canReforge, false);
  assert.equal(capabilities.canRecombobulate, false);
  assert.deepEqual(capabilities.gemstoneSlots, []);
});
