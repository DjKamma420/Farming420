export const FARMING_REFORGES_VERIFIED = '2026-09-16';

export const HARVEST_FEAST_SOURCE = 'https://hypixel.net/threads/hypixel-skyblock-0-24-4-harvest-feast-event-fossil-essence-shop-and-more.6089392/';
export const FARMING_REFORGE_GUIDE_SOURCE = 'https://hypixel.net/threads/new-farming-reforges-introduction-and-blessed-vs-bountiful.6092239/';
export const HARVEST_FEAST_RARE_CROP_SOURCE = 'https://hypixel.net/threads/march-31-harvest-feast-event.6080784/';

export const FARMING_TOOL_REFORGES = Object.freeze([
  Object.freeze({
    id: 'bountiful',
    name: 'Bountiful',
    stone: 'Golden Ball',
    purpose: 'normal-coins',
    summary: 'Normal crop-profit reforge. Prefer this when the value comes from the crop output itself rather than Feast RARE CROPS.',
    source: HARVEST_FEAST_SOURCE,
    lastVerified: FARMING_REFORGES_VERIFIED,
  }),
  Object.freeze({
    id: 'blessed',
    name: 'Blessed',
    stone: 'Blessed Fruit',
    purpose: 'xp-collection',
    summary: 'Farming XP and collection-focused reforge. The current reforge bonus can drop Enchanted Crops while farming.',
    source: HARVEST_FEAST_SOURCE,
    lastVerified: FARMING_REFORGES_VERIFIED,
  }),
  Object.freeze({
    id: 'overpriced',
    name: 'Overpriced',
    stone: 'Overpriced Drink',
    purpose: 'rare-crops',
    summary: 'Overbloom-focused reforge for Feast RARE CROPS. Its value is conditional on the current crop being in season and on the value of its RARE CROP.',
    source: FARMING_REFORGE_GUIDE_SOURCE,
    lastVerified: FARMING_REFORGES_VERIFIED,
  }),
  Object.freeze({
    id: 'deep-fried',
    name: 'Deep Fried',
    stone: 'Hashbrown',
    purpose: 'seasoning',
    summary: 'Harvest Feast specialization for Seasoning and Feast milestone progress.',
    source: FARMING_REFORGE_GUIDE_SOURCE,
    lastVerified: FARMING_REFORGES_VERIFIED,
  }),
  Object.freeze({
    id: 'earthy',
    name: 'Earthy',
    stone: 'Large Walnut',
    purpose: 'sowdust',
    summary: 'Sowdust-focused reforge for Greenhouse progression. Hypixel documents a +5% Sowdust reforge bonus.',
    source: HARVEST_FEAST_SOURCE,
    lastVerified: FARMING_REFORGES_VERIFIED,
  }),
]);

const CROP_IDS = Object.freeze([
  'wheat',
  'carrot',
  'potato',
  'pumpkin',
  'melon',
  'mushroom',
  'cactus',
  'sugar-cane',
  'cocoa-beans',
  'nether-wart',
  'sunflower',
  'moonflower',
  'wild-rose',
]);

function recommendationRecord(cropId) {
  return Object.freeze({
    cropId,
    normalCoins: 'bountiful',
    normalCoinsReason: 'Use for ordinary crop-profit farming when Feast RARE CROPS are not the target.',
    feastRareCropCoins: 'overpriced',
    feastRareCropReason: 'Use only when this crop is in season and RARE-CROP value is the target.',
    collection: 'blessed',
    collectionReason: 'Use when collection progress matters more than direct crop-sale profit.',
    xp: 'blessed',
    xpReason: 'Use when Farming XP is the objective.',
    rareCrops: 'overpriced',
    rareCropsReason: 'Overpriced is the Overbloom/RARE-CROP specialization.',
    feastSeasoning: 'deep-fried',
    feastSeasoningReason: 'Deep Fried is the Feast milestone and Seasoning specialization.',
    sowdust: 'earthy',
    sowdustReason: 'Earthy is the dedicated Sowdust specialization.',
    feastRareCropEligible: true,
    source: HARVEST_FEAST_RARE_CROP_SOURCE,
    mechanicsSource: cropId === 'sunflower' || cropId === 'moonflower' || cropId === 'wild-rose'
      ? HARVEST_FEAST_RARE_CROP_SOURCE
      : HARVEST_FEAST_SOURCE,
    lastVerified: FARMING_REFORGES_VERIFIED,
  });
}

export const CROP_REFORGE_RECOMMENDATIONS = Object.freeze(Object.fromEntries(
  CROP_IDS.map(cropId => [cropId, recommendationRecord(cropId)]),
));

export function reforgeById(id) {
  const key = String(id || '').trim().toLowerCase();
  return FARMING_TOOL_REFORGES.find(reforge => reforge.id === key) || null;
}

export function cropReforgeRecommendations(cropId) {
  const key = String(cropId || '').trim().toLowerCase();
  return CROP_REFORGE_RECOMMENDATIONS[key] || recommendationRecord(key);
}

export function recommendationLabels(cropId) {
  const rec = cropReforgeRecommendations(cropId);
  return [
    { goal: 'Normal crop coins', reforge: rec.normalCoins, reason: rec.normalCoinsReason },
    { goal: 'Feast RARE-CROP coins', reforge: rec.feastRareCropCoins, reason: rec.feastRareCropReason, conditional: 'crop must be in season' },
    { goal: 'Collection', reforge: rec.collection, reason: rec.collectionReason },
    { goal: 'Farming XP', reforge: rec.xp, reason: rec.xpReason },
    { goal: 'RARE CROPS / Overbloom', reforge: rec.rareCrops, reason: rec.rareCropsReason, conditional: 'crop must be in season' },
    { goal: 'Feast Seasoning', reforge: rec.feastSeasoning, reason: rec.feastSeasoningReason },
    { goal: 'Sowdust', reforge: rec.sowdust, reason: rec.sowdustReason },
  ];
}
