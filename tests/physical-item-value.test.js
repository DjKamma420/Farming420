import assert from 'node:assert/strict';
import test from 'node:test';
import {
  physicalItemBuildValue,
  physicalItemValueComponents,
} from '../src/physical-item-value.js';

function quoteFor(prices) {
  return descriptor => {
    const coinsPerUnit = prices[descriptor.itemTag];
    return coinsPerUnit ? { ...descriptor, coinsPerUnit } : null;
  };
}

test('physical item build value includes base item, reforge, recomb, enchants and gems', () => {
  const item = {
    skyblockId: 'HELIANTHUS_HELMET',
    displayName: 'Helianthus Helmet',
    reforge: 'mantid',
    recombobulated: true,
    enchantments: { pesterminator: 6, sunset: 5 },
    gems: ['PERFECT PERIDOT'],
  };
  const result = physicalItemBuildValue('helmet', item, {
    readQuote: quoteFor({
      HELIANTHUS_HELMET: 10_000_000,
      MANTID_CLAW: 2_000_000,
      RECOMBOBULATOR_3000: 8_000_000,
      PESTHUNTING_GUIDE: 3_000_000,
      ENCHANTMENT_SUNSET_5: 4_000_000,
      PERFECT_PERIDOT_GEM: 5_000_000,
    }),
  });

  assert.equal(result.complete, true);
  assert.equal(result.totalCoins, 32_000_000);
  assert.deepEqual(
    result.priced.map(row => row.itemTag),
    [
      'HELIANTHUS_HELMET',
      'MANTID_CLAW',
      'RECOMBOBULATOR_3000',
      'PESTHUNTING_GUIDE',
      'ENCHANTMENT_SUNSET_5',
      'PERFECT_PERIDOT_GEM',
    ],
  );
});

test('replacement value freshness is limited by the oldest priced component', () => {
  const item = {
    skyblockId: 'HELIANTHUS_HELMET',
    displayName: 'Helianthus Helmet',
    recombobulated: true,
    enchantments: {},
    gems: [],
  };
  const result = physicalItemBuildValue('helmet', item, {
    readQuote: descriptor => ({
      ...descriptor,
      coinsPerUnit: 1_000_000,
      computedAtMs: descriptor.itemTag === 'HELIANTHUS_HELMET' ? 2_000 : 1_000,
    }),
  });
  assert.equal(result.computedAtMs, 1_000);
});

test('missing component prices make the build value a lower bound instead of silently zero', () => {
  const item = {
    skyblockId: 'BLOSSOM_NECKLACE',
    displayName: 'Blossom Necklace',
    reforge: 'rooted',
    recombobulated: true,
    enchantments: {},
    gems: [],
  };
  const result = physicalItemBuildValue('equipment1', item, {
    readQuote: quoteFor({
      BLOSSOM_NECKLACE: 10_000_000,
      RECOMBOBULATOR_3000: 8_000_000,
    }),
  });
  assert.equal(result.complete, false);
  assert.equal(result.totalCoins, 18_000_000);
  assert.ok(result.missing.some(row => row.itemTag === 'BURROWING_SPORES'));
});

test('intrinsic Celebration Pufferfish Thorns V is not charged as a separately bought enchant', () => {
  const item = {
    skyblockId: 'PUFFERFISH_HAT_CELEBRATION',
    displayName: 'Century Pufferfish Hat',
    enchantments: { thorns: 5 },
    gems: [],
  };
  const tags = physicalItemValueComponents('helmet', item).map(row => row.itemTag);
  assert.deepEqual(tags, ['PUFFERFISH_HAT_CELEBRATION']);
});

test('pets use the explicit PET market tag while held pet items use their exact item id', () => {
  assert.equal(
    physicalItemValueComponents('pet', { skyblockId: 'ROSE_DRAGON', displayName: 'Rose Dragon Pet' })[0].itemTag,
    'PET_ROSE_DRAGON',
  );
  assert.equal(
    physicalItemValueComponents('petItem', { skyblockId: 'GREEN_BANDANA', displayName: 'Green Bandana' })[0].itemTag,
    'GREEN_BANDANA',
  );
});
