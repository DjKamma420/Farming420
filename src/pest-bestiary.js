/**
 * Eligible Pest Bestiary tiers used by Brown Bandana.
 *
 * Current Pest families are sourced from the maintained Pest page. Individual
 * family pages verify the Bestiary bracket/tier thresholds. Zombuddy and
 * Timestalk Clone are deliberately absent because Brown Bandana ignores them.
 */
export const PEST_BESTIARY_VERIFIED = '2026-09-23';
export const PEST_BESTIARY_SOURCE = 'https://hypixelskyblock.minecraft.wiki/w/Pest';
export const BROWN_BANDANA_SOURCE = 'https://hypixelskyblock.minecraft.wiki/w/Brown_Bandana';

export const PEST_BESTIARY_THRESHOLDS = Object.freeze({
  6: Object.freeze([1, 2, 3, 5, 7, 9, 14, 17, 21, 25, 50, 80, 125, 175, 250]),
  7: Object.freeze([1, 2, 3, 5, 7, 9, 11, 14, 17, 20, 30, 40, 55, 75, 100]),
});

export const ELIGIBLE_PEST_BESTIARY_FAMILIES = Object.freeze([
  Object.freeze({ key: 'pest_fly_1', name: 'Fly', bracket: 6, source: 'https://hypixelskyblock.minecraft.wiki/w/Fly' }),
  Object.freeze({ key: 'pest_cricket_1', name: 'Cricket', bracket: 6, source: 'https://hypixelskyblock.minecraft.wiki/w/Cricket' }),
  Object.freeze({ key: 'pest_locust_1', name: 'Locust', bracket: 6, source: 'https://hypixelskyblock.minecraft.wiki/w/Locust' }),
  Object.freeze({ key: 'pest_rat_1', name: 'Rat', bracket: 6, source: 'https://hypixelskyblock.minecraft.wiki/w/Rat' }),
  Object.freeze({ key: 'pest_mosquito_1', name: 'Mosquito', bracket: 6, source: 'https://hypixelskyblock.minecraft.wiki/w/Mosquito' }),
  Object.freeze({ key: 'pest_worm_1', name: 'Earthworm', bracket: 6, source: 'https://hypixelskyblock.minecraft.wiki/w/Earthworm' }),
  Object.freeze({ key: 'pest_mite_1', name: 'Mite', bracket: 6, source: 'https://hypixelskyblock.minecraft.wiki/w/Mite' }),
  Object.freeze({ key: 'pest_moth_1', name: 'Moth', bracket: 6, source: 'https://hypixelskyblock.minecraft.wiki/w/Moth' }),
  Object.freeze({ key: 'pest_slug_1', name: 'Slug', bracket: 6, source: 'https://hypixelskyblock.minecraft.wiki/w/Slug' }),
  Object.freeze({ key: 'pest_beetle_1', name: 'Beetle', bracket: 6, source: 'https://hypixelskyblock.minecraft.wiki/w/Beetle' }),
  Object.freeze({ key: 'pest_dragonfly_1', name: 'Dragonfly', bracket: 6, source: 'https://hypixelskyblock.minecraft.wiki/w/Dragonfly' }),
  Object.freeze({ key: 'pest_firefly_1', name: 'Firefly', bracket: 6, source: 'https://hypixelskyblock.minecraft.wiki/w/Firefly' }),
  Object.freeze({ key: 'pest_praying_mantis_1', name: 'Praying Mantis', bracket: 6, source: 'https://hypixelskyblock.minecraft.wiki/w/Praying_Mantis' }),
  Object.freeze({ key: 'pest_lunar_moth_1', name: 'Lunar Moth', bracket: 7, source: 'https://hypixelskyblock.minecraft.wiki/w/Lunar_Moth' }),
  Object.freeze({ key: 'pest_mouse_1', name: 'Field Mouse', bracket: 7, source: 'https://hypixelskyblock.minecraft.wiki/w/Field_Mouse' }),
]);

function nonNegativeInteger(value) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) return null;
  return Math.floor(number);
}

function normalizedKillsMap(kills) {
  if (!kills || typeof kills !== 'object' || Array.isArray(kills)) return null;
  return new Map(Object.entries(kills).map(([key, value]) => [String(key).trim().toLowerCase(), value]));
}

export function pestBestiaryTierFromKills(kills, bracket) {
  const count = nonNegativeInteger(kills);
  const thresholds = PEST_BESTIARY_THRESHOLDS[Number(bracket)];
  if (count === null || !thresholds) return null;
  let tier = 0;
  for (const threshold of thresholds) {
    if (count < threshold) break;
    tier += 1;
  }
  return tier;
}

/**
 * Hypixel's bestiary.kills object is a sparse counter map. Once that container
 * is present, an omitted Pest family has no recorded kills and therefore tier
 * zero. A missing kills container remains unknown rather than becoming zero.
 */
export function eligiblePestBestiaryFromKills(kills) {
  const map = normalizedKillsMap(kills);
  if (!map) {
    return Object.freeze({
      complete: false,
      tierTotal: null,
      maxTierTotal: ELIGIBLE_PEST_BESTIARY_FAMILIES.length * 15,
      familyTiers: Object.freeze({}),
      reasons: Object.freeze(['Bestiary kill counters are unavailable']),
      source: PEST_BESTIARY_SOURCE,
      lastVerified: PEST_BESTIARY_VERIFIED,
    });
  }

  const familyTiers = {};
  const reasons = [];
  let tierTotal = 0;

  for (const family of ELIGIBLE_PEST_BESTIARY_FAMILIES) {
    const rawKills = map.has(family.key) ? map.get(family.key) : 0;
    const tier = pestBestiaryTierFromKills(rawKills, family.bracket);
    if (tier === null) {
      reasons.push(`Invalid Bestiary kill counter for ${family.name}`);
      continue;
    }
    familyTiers[family.key] = tier;
    tierTotal += tier;
  }

  return Object.freeze({
    complete: reasons.length === 0,
    tierTotal: reasons.length === 0 ? tierTotal : null,
    maxTierTotal: ELIGIBLE_PEST_BESTIARY_FAMILIES.length * 15,
    familyTiers: Object.freeze(familyTiers),
    reasons: Object.freeze(reasons),
    source: PEST_BESTIARY_SOURCE,
    lastVerified: PEST_BESTIARY_VERIFIED,
  });
}
