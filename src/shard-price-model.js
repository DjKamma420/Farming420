export const SHARD_CUMULATIVE_BY_RARITY = Object.freeze({
  COMMON: Object.freeze([0, 1, 4, 9, 15, 22, 30, 40, 54, 72, 96]),
  UNCOMMON: Object.freeze([0, 1, 3, 6, 10, 15, 21, 28, 36, 48, 64]),
  RARE: Object.freeze([0, 1, 3, 6, 9, 13, 17, 22, 28, 36, 48]),
  EPIC: Object.freeze([0, 1, 2, 4, 6, 9, 12, 16, 20, 25, 32]),
  LEGENDARY: Object.freeze([0, 1, 2, 3, 5, 7, 9, 12, 15, 19, 24]),
});

export const FARMING_SHARD_MARKET = Object.freeze({
  'attribute-shard-firefly-or-lunar-moth-shard': Object.freeze({
    rarity: 'EPIC',
    itemTags: Object.freeze(['SHARD_FIREFLY', 'SHARD_LUNAR_MOTH']),
  }),
  'attribute-shard-galaxy-fish-shard': Object.freeze({
    rarity: 'LEGENDARY',
    itemTags: Object.freeze(['SHARD_GALAXY_FISH']),
  }),
  'attribute-shard-earthworm-shard-formerly-termite': Object.freeze({
    rarity: 'UNCOMMON',
    itemTags: Object.freeze(['SHARD_TERMITE']),
  }),
  'attribute-shard-field-mouse-shard-pest-overbloom': Object.freeze({
    rarity: 'UNCOMMON',
    itemTags: Object.freeze(['SHARD_PEST']),
  }),
  'attribute-shard-cricket-pest-fortune': Object.freeze({
    rarity: 'UNCOMMON',
    itemTags: Object.freeze(['SHARD_CRICKET']),
  }),
  'attribute-shard-keeled-slug-bonus-pest-chance': Object.freeze({
    rarity: 'UNCOMMON',
    itemTags: Object.freeze(['SHARD_KEELED_SLUG']),
  }),
  'attribute-shard-rat-sprayonator-serendipity': Object.freeze({
    rarity: 'UNCOMMON',
    itemTags: Object.freeze(['SHARD_RAT']),
  }),
  'attribute-shard-mosquito-enchanted-farmer': Object.freeze({
    rarity: 'UNCOMMON',
    itemTags: Object.freeze(['SHARD_MOSQUITO']),
  }),
  'attribute-shard-mudworm-visitor-bait': Object.freeze({
    rarity: 'COMMON',
    itemTags: Object.freeze(['SHARD_MUDWORM']),
  }),
  'attribute-shard-invisibug-fancy-visit': Object.freeze({
    rarity: 'RARE',
    itemTags: Object.freeze(['SHARD_INVISIBUG']),
  }),
  'attribute-shard-ladybug-pretty-clothes': Object.freeze({
    rarity: 'RARE',
    itemTags: Object.freeze(['SHARD_LADYBUG']),
  }),
  'attribute-shard-dragonfly-garden-wisdom': Object.freeze({
    rarity: 'EPIC',
    itemTags: Object.freeze(['SHARD_DRAGONFLY']),
  }),
  'attribute-shard-moth-pest-cooldown': Object.freeze({
    rarity: 'UNCOMMON',
    itemTags: Object.freeze(['SHARD_MOTH']),
  }),
});

export function farmingShardMarket(itemId) {
  return FARMING_SHARD_MARKET[String(itemId || '')] || null;
}

export function shardsForAttributeLevel(itemId, level) {
  const record = farmingShardMarket(itemId);
  if (!record) return null;
  const table = SHARD_CUMULATIVE_BY_RARITY[record.rarity];
  const normalized = Math.max(0, Math.min(10, Math.floor(Number(level) || 0)));
  return table?.[normalized] ?? null;
}

export function shardsForAttributeStep(itemId, targetLevel) {
  const target = Math.max(1, Math.min(10, Math.floor(Number(targetLevel) || 0)));
  const atTarget = shardsForAttributeLevel(itemId, target);
  const before = shardsForAttributeLevel(itemId, target - 1);
  return atTarget == null || before == null ? null : atTarget - before;
}

export function shardsRemainingToMax(itemId, currentLevel) {
  const current = shardsForAttributeLevel(itemId, currentLevel);
  const maximum = shardsForAttributeLevel(itemId, 10);
  return current == null || maximum == null ? null : Math.max(0, maximum - current);
}
