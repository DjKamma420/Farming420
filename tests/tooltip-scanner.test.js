import assert from 'node:assert/strict';
import test from 'node:test';

import { mergeScanIntoItem, parseSkyBlockTooltip } from '../src/tooltip-scanner.js';

test('a farming tool tooltip yields name, reforge, farming enchants and gems', () => {
  const scan = parseSkyBlockTooltip(`
Bountiful Euclid's Wheat Hoe
Farming Fortune: +205
Cultivating X
Dedication IV
Harvesting VI
Turbo-Wheat VII
PERFECT PERIDOT
LEGENDARY HOE
`, { reforgeCandidates: ['Bountiful', 'Blessed'] });

  assert.equal(scan.displayName, "Euclid's Wheat Hoe");
  assert.equal(scan.reforge, 'bountiful');
  assert.equal(scan.rarity, 'LEGENDARY');
  assert.deepEqual(scan.enchantments, {
    cultivating: 10,
    dedication: 4,
    harvesting: 6,
    turbo_wheat: 7,
  });
  assert.deepEqual(scan.gems, ['PERFECT PERIDOT']);
  assert.equal(scan.recombobulated, null);
});

test('armor farming enchants are parsed without turning stat lines into enchants', () => {
  const scan = parseSkyBlockTooltip(`
Mossy Helianthus Chestplate
Health: +250
Defense: +150
Farming Fortune: +60
Pesterminator VI
MYTHIC CHESTPLATE
`, { reforgeCandidates: ['Mossy'] });

  assert.equal(scan.displayName, 'Helianthus Chestplate');
  assert.deepEqual(scan.enchantments, { pesterminator: 6 });
  assert.equal(scan.rarity, 'MYTHIC');
});

test('unknown lines and invisible recombobulator state are not guessed', () => {
  const scan = parseSkyBlockTooltip(`
Helianthus Boots
Some Future Enchant X
MYTHIC BOOTS
`);

  assert.deepEqual(scan.enchantments, {});
  assert.equal(scan.recombobulated, null);
  assert.ok(scan.warnings.some(message => message.includes('left unchanged')));
});

test('an explicit recombobulator marker may update the item', () => {
  const scan = parseSkyBlockTooltip(`
Mossy Helianthus Helmet
Recombobulated
Pesterminator VI
MYTHIC HELMET
`, { reforgeCandidates: ['Mossy'] });
  const merged = mergeScanIntoItem({
    displayName: '',
    skyblockId: null,
    reforge: null,
    enchantments: {},
    gems: [],
    recombobulated: false,
  }, scan, {
    catalog: [{ id: 'HELIANTHUS_HELMET', name: 'Helianthus Helmet' }],
  });

  assert.equal(merged.skyblockId, 'HELIANTHUS_HELMET');
  assert.equal(merged.reforge, 'mossy');
  assert.equal(merged.recombobulated, true);
  assert.deepEqual(merged.enchantments, { pesterminator: 6 });
});

test('scanner merges recognized fields while preserving existing unrecognized data', () => {
  const scan = parseSkyBlockTooltip(`
Helianthus Leggings
Pesterminator VI
MYTHIC LEGGINGS
`);
  const merged = mergeScanIntoItem({
    displayName: 'Old Name',
    reforge: 'mossy',
    enchantments: { growth: 7 },
    gems: ['PERFECT PERIDOT'],
    recombobulated: true,
  }, scan);

  assert.equal(merged.reforge, 'mossy');
  assert.equal(merged.recombobulated, true);
  assert.deepEqual(merged.enchantments, { growth: 7, pesterminator: 6 });
  assert.deepEqual(merged.gems, ['PERFECT PERIDOT']);
});
