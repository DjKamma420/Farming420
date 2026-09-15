import assert from 'node:assert/strict';
import test from 'node:test';

import { normalizeDecodedItem, normalizeEncodedInventory } from '../src/item-normalizer.js';
import { farmingInventoryBase64 } from './nbt-fixture.js';

test('item normalization keeps raw farming-relevant item facts without calculating mechanics', () => {
  const item = normalizeDecodedItem({
    Count: 1,
    id: 290,
    Damage: 0,
    tag: {
      display: { Name: 'Hoe' },
      ExtraAttributes: {
        id: 'THEORETICAL_HOE_WHEAT_3',
        uuid: 'item-1',
        modifier: 'blessed',
        enchantments: { cultivating: 10, harvesting: 6 },
        gems: { PERIDOT_0: 'PERFECT' },
        attributes: { example: 4 },
        farming_for_dummies_count: 5,
        rarity_upgrades: 1,
        farmed_cultivating: 12345678,
        levelable_overclocks: 3,
      },
    },
  }, { container: 'inventory', slot: 4 });

  assert.equal(item.container, 'inventory');
  assert.equal(item.slot, 4);
  assert.equal(item.skyblockId, 'THEORETICAL_HOE_WHEAT_3');
  assert.equal(item.reforge, 'blessed');
  assert.deepEqual(item.enchantments, { cultivating: 10, harvesting: 6 });
  assert.deepEqual(item.gems, { PERIDOT_0: 'PERFECT' });
  assert.equal(item.farmingForDummies, 5);
  assert.equal(item.recombobulated, 1);
  assert.equal(item.cultivatingCounter, 12345678);
  assert.equal(item.overclockerLevel, 3);
});

test('encoded inventory normalization preserves generic enchantments and ignores empty slots', async () => {
  const items = await normalizeEncodedInventory(farmingInventoryBase64(), { container: 'inventory' });
  assert.equal(items.length, 1);
  assert.equal(items[0].slot, 0);
  assert.equal(items[0].displayName, '§6Euclid\'s Wheat Hoe');
  assert.equal(items[0].enchantments.turbo_wheat, 5);
  assert.equal(items[0].gems.PERIDOT_0, 'PERFECT');
});

test('unknown enchantment names are preserved instead of filtered by an app allowlist', () => {
  const item = normalizeDecodedItem({
    tag: { ExtraAttributes: { id: 'TEST_ITEM', enchantments: { future_farming_enchant: 7 } } },
  });
  assert.equal(item.enchantments.future_farming_enchant, 7);
});
