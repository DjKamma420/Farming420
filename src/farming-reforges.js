export const FARMING_REFORGES_VERIFIED = '2026-09-16';

export const FARMING_REFORGE_SOURCE = 'https://hypixel.net/threads/new-farming-reforges-introduction-and-blessed-vs-bountiful.6092239/';
export const HARVEST_FEAST_SOURCE = 'https://hypixel.net/threads/hypixel-skyblock-0-26-1-new-player-improvements-harvest-feast-changes-healing-revamp-and-more.6127383/';

export const FARMING_TOOL_REFORGES = Object.freeze([
  Object.freeze({
    id: 'bountiful',
    name: 'Bountiful',
    stone: 'Golden Ball',
    purpose: 'coins',
    summary: 'General money reforge. Adds coins per crop and remains the default recommendation for normal crop-profit farming.',
    source: FARMING_REFORGE_SOURCE,
    lastVerified: FARMING_REFORGES_VERIFIED,
  }),
  Object.freeze({
    id: 'blessed',
    name: 'Blessed',
    stone: 'Blessed Fruit',
    purpose: 'xp-collection',
    summary: 'Use when Farming XP or normal crop collection matters more than direct coin output.',
    source: FARMING_REFORGE_SOURCE,
    lastVerified: FARMING_REFORGES_VERIFIED,
  }),
  Object.freeze({
    id: 'overpriced',
    name: 'Overpriced',
    stone: 'Overpriced Drink',
    purpose: 'rare-crops',
    summary: 'Rare-crop and Greenhouse reforge. Current 0.26.1 also changed the Overpriced Drink recipe.',
    source: HARVEST_FEAST_SOURCE,
    lastVerified: FARMING_REFORGES_VERIFIED,
  }),
  Object.freeze({
    id: 'deep-fried',
    name: 'Deep Fried',
    stone: 'Hashbrown',
    purpose: 'seasoning',
    summary: 'Harvest Feast specialization for Seasoning and Feast milestone progress.',
    source: FARMING_REFORGE_SOURCE,
    lastVerified: FARMING_REFORGES_VERIFIED,
  }),
  Object.freeze({
    id: 'earthy',
    name: 'Earthy',
    stone: 'Large Walnut',
    purpose: 'sowdust',
    summary: 'Sowdust-focused reforge, useful while Greenhouse progression is the goal.',
    source: FARMING_REFORGE_SOURCE,
    lastVerified: FARMING_REFORGES_VERIFIED,
  }),
]);

export function reforgeById(id) {
  const key = String(id || '').trim().toLowerCase();
  return FARMING_TOOL_REFORGES.find(reforge => reforge.id === key) || null;
}

export function cropReforgeRecommendations(cropId) {
  String(cropId || '').trim().toLowerCase();
  return Object.freeze({
    money: 'bountiful',
    collection: 'blessed',
    xp: 'blessed',
    rareCrops: 'overpriced',
    feastSeasoning: 'deep-fried',
    sowdust: 'earthy',
  });
}

export function recommendationLabels(cropId) {
  const rec = cropReforgeRecommendations(cropId);
  return [
    { goal: 'Money', reforge: rec.money },
    { goal: 'Collection', reforge: rec.collection },
    { goal: 'Farming XP', reforge: rec.xp },
    { goal: 'Rare Crops / Greenhouse', reforge: rec.rareCrops },
    { goal: 'Feast Seasoning', reforge: rec.feastSeasoning },
    { goal: 'Sowdust', reforge: rec.sowdust },
  ];
}
