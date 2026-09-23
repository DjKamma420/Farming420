import assert from 'node:assert/strict';
import test from 'node:test';
import {
  farmingShardMarket,
  shardsForAttributeLevel,
  shardsForAttributeStep,
  shardsRemainingToMax,
} from '../src/shard-price-model.js';

test('Legendary shard level 10 represents 24 total shards', () => {
  assert.equal(shardsForAttributeLevel('attribute-shard-galaxy-fish-shard', 10), 24);
  assert.equal(shardsForAttributeStep('attribute-shard-galaxy-fish-shard', 10), 5);
});

test('Epic and Uncommon Farming shards use their real cumulative level quantities', () => {
  assert.equal(shardsForAttributeLevel('attribute-shard-firefly-or-lunar-moth-shard', 10), 32);
  assert.equal(shardsForAttributeLevel('attribute-shard-cricket-pest-fortune', 10), 64);
  assert.equal(shardsForAttributeStep('attribute-shard-cricket-pest-fortune', 2), 2);
  assert.equal(shardsRemainingToMax('attribute-shard-cricket-pest-fortune', 7), 36);
});

test('renamed shards keep explicit current-market aliases instead of guessing by display name', () => {
  assert.deepEqual([...farmingShardMarket('attribute-shard-earthworm-shard-formerly-termite').itemTags], ['SHARD_TERMITE']);
  assert.deepEqual([...farmingShardMarket('attribute-shard-field-mouse-shard-pest-overbloom').itemTags], ['SHARD_PEST']);
});

test('the day/night shard row exposes two explicit alternative market items', () => {
  assert.deepEqual(
    [...farmingShardMarket('attribute-shard-firefly-or-lunar-moth-shard').itemTags],
    ['SHARD_FIREFLY', 'SHARD_LUNAR_MOTH'],
  );
});
