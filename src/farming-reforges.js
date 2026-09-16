export const FARMING_REFORGES_VERIFIED = '2026-09-16';

export const FARMING_REFORGE_SOURCE = 'https://hypixel.net/threads/new-farming-reforges-introduction-and-blessed-vs-bountiful.6092239/';
export const HARVEST_FEAST_SOURCE = 'https://hypixel.net/threads/hypixel-skyblock-0-26-1-new-player-improvements-harvest-feast-changes-healing-revamp-and-more.6127383/';
export const HARVEST_FEAST_RARE_CROP_SOURCE = 'https://hypixel.net/threads/march-31-harvest-feast-event.6080784/';

export const FARMING_TOOL_REFORGES = Object.freeze([
  Object.freeze({
    id: 'bountiful',
    name: 'Bountiful',
    stone: 'Golden Ball',
    purpose: 'normal-coins',
    summary: 'Normal crop-profit reforge. Use this when the value comes from selling the crop output itself rather than Feast RARE CROPS.',
    source: FARMING_REFORGE_SOURCE,
    lastVerified: FARMING_REFORGES_VERIFIED,
  }),
  Object.freeze({
    id: 'blessed',
    name: 'Blessed',
    stone: 'Blessed Fruit',
    purpose: 'xp-collection',
    summary: 'Farming XP and collection-focused reforge. Its bonus crop drops are not treated as an Overbloom-scaled RARE-CROP money source.',
    source: FARMING_REFORGE_SOURCE,
    lastVerified: FARMING_REFORGES_VERIFIED,
  }),
  Object.freeze({
    id: 'overpriced',
    name: 'Overpriced',
    stone: 'Overpriced Drink',
    purpose: 'rare-crops',
    summary: 'Overbloom-focused reforge for Feast RARE CROPS and other Overbloom-scaled crop drops. Its coin value depends on the current crop being in season and on live drop values.',
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
    summary: 'Sowdust-focused reforge for Greenhouse progression.',
    source: FARMING_REFORGE_SOURCE,
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

/**
 * Recommendations are stored per crop even when several currently share the
 * same result. This is deliberate: Feast rotations, live Bazaar prices and
 * crop-specific mechanics can change independently without returning to one
 * global recommendation table.
 *
 * `normalCoins` means normal crop output. `feastRareCropCoins` is conditional:
 * it only applies while that crop is in a Harvest/Grand Feast season (or when
 * the player otherwise values its Overbloom-scaled RARE CROP drops).
 */
export const CROP_REFORGE_RECOMMENDATIONS = Object.freeze(Object.fromEntries(
  CROP_IDS.map(cropId => [cropId, Object.freeze({
    normalCoins: 'bountiful',
    feastRareCropCoins: 'overpriced',
    collection: 'blessed',
    xp: 'blessed',
    rareCrops: 'overpriced',
    feastSeasoning: 'deep-fried',
    sowdust: 'earthy',
    source: cropId === 'sunflower' || cropId === 'moonflower' || cropId === 'wild-rose'
      ? HARVEST_FEAST_RARE_CROP_SOURCE
      : FARMING_REFORGE_SOURCE,
    lastVerified: FARMING_REFORGES_VERIFIED,
  })]),
));

export function reforgeById(id) {
  const key = String(id || '').trim().toLowerCase();
  return FARMING_TOOL_REFORGES.find(reforge => reforge.id === key) || null;
}

export function cropReforgeRecommendations(cropId) {
  const key = String(cropId || '').trim().toLowerCase();
  const rec = CROP_REFORGE_RECOMMENDATIONS[key];
  if (rec) return rec;
  return Object.freeze({
    normalCoins: 'bountiful',
    feastRareCropCoins: 'overpriced',
    collection: 'blessed',
    xp: 'blessed',
    rareCrops: 'overpriced',
    feastSeasoning: 'deep-fried',
    sowdust: 'earthy',
    source: FARMING_REFORGE_SOURCE,
    lastVerified: FARMING_REFORGES_VERIFIED,
  });
}

export function recommendationLabels(cropId) {
  const rec = cropReforgeRecommendations(cropId);
  return [
    { goal: 'Normal crop coins', reforge: rec.normalCoins },
    { goal: 'Feast RARE-CROP coins', reforge: rec.feastRareCropCoins, conditional: 'crop must be in season' },
    { goal: 'Collection', reforge: rec.collection },
    { goal: 'Farming XP', reforge: rec.xp },
    { goal: 'RARE CROPS / Overbloom', reforge: rec.rareCrops },
    { goal: 'Feast Seasoning', reforge: rec.feastSeasoning },
    { goal: 'Sowdust', reforge: rec.sowdust },
  ];
}
