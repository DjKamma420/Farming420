import assert from 'node:assert/strict';
import test from 'node:test';

import { decodeBase64, decodeHypixelInventory, parseNbt } from '../src/nbt.js';
import { farmingInventoryBase64, farmingInventoryNbt } from './nbt-fixture.js';

test('the NBT parser reads the item list and nested ExtraAttributes', () => {
  const root = parseNbt(farmingInventoryNbt());
  assert.equal(root.name, '');
  assert.equal(root.value.i.length, 2);
  const item = root.value.i[0];
  assert.equal(item.Count, 1);
  assert.equal(item.id, 290);
  assert.equal(item.tag.ExtraAttributes.id, 'THEORETICAL_HOE_WHEAT_3');
  assert.equal(item.tag.ExtraAttributes.modifier, 'blessed');
  assert.equal(item.tag.ExtraAttributes.enchantments.cultivating, 10);
  assert.equal(item.tag.ExtraAttributes.farmed_cultivating, 12_345_678);
});

test('a Hypixel-style Base64 gzip inventory decodes without dependencies', async () => {
  const items = await decodeHypixelInventory(farmingInventoryBase64());
  assert.equal(items.length, 2);
  assert.equal(items[0].tag.ExtraAttributes.gems.PERIDOT_0, 'PERFECT');
});

test('invalid Base64 is rejected', () => {
  assert.throws(() => decodeBase64('not base64 ***'), /valid Base64/);
});

test('truncated NBT is rejected instead of returning partial item data', () => {
  const bytes = farmingInventoryNbt();
  assert.throws(() => parseNbt(bytes.slice(0, bytes.length - 3)), /ended unexpectedly/);
});
