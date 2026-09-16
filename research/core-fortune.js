export const CORE_FORTUNE_VERIFIED = '2026-09-16';
export const CORE_FORTUNE_SOURCE = 'https://hypixelskyblock.minecraft.wiki/w/Farming_Fortune';

/**
 * Small, source-controlled verification slice for the mechanics that form the
 * additive Farming/Crop Fortune backbone. These values were checked against the
 * current community wiki on CORE_FORTUNE_VERIFIED. Entries that are nonlinear
 * keep their runtime stepGain at zero and store only the published maximum
 * reference here.
 *
 * This file is intentionally separate from src/data.js while the wider data
 * verification pass is still in progress. The test suite cross-checks every
 * entry below against src/data.js, so a later edit cannot silently drift from
 * the verified value.
 */
export const CORE_FORTUNE_FACTS = Object.freeze([
  Object.freeze({
    id: 'account-skill-farming-skill-level',
    max: 60,
    stepGain: 4,
    publishedMaximum: 240,
    source: CORE_FORTUNE_SOURCE,
    lastVerified: CORE_FORTUNE_VERIFIED,
  }),
  Object.freeze({
    id: 'anita-extra-farming-fortune-perk',
    max: 15,
    stepGain: 4,
    publishedMaximum: 60,
    source: CORE_FORTUNE_SOURCE,
    lastVerified: CORE_FORTUNE_VERIFIED,
  }),
  Object.freeze({
    id: 'account-upgrade-elizabeth-garden-farming-fortune',
    max: 10,
    stepGain: 4,
    publishedMaximum: 40,
    source: CORE_FORTUNE_SOURCE,
    lastVerified: CORE_FORTUNE_VERIFIED,
  }),
  Object.freeze({
    id: 'garden-garden-plots-unlocked',
    max: 24,
    stepGain: 3,
    publishedMaximum: 72,
    source: CORE_FORTUNE_SOURCE,
    lastVerified: CORE_FORTUNE_VERIFIED,
  }),
  Object.freeze({
    id: 'crop-progression-crop-upgrade-selected-crop',
    max: 9,
    stepGain: 5,
    publishedMaximum: 45,
    source: CORE_FORTUNE_SOURCE,
    lastVerified: CORE_FORTUNE_VERIFIED,
  }),
  Object.freeze({
    id: 'tool-tool-base-counter-fortune',
    max: 50,
    stepGain: 4,
    publishedMaximum: 200,
    source: CORE_FORTUNE_SOURCE,
    lastVerified: CORE_FORTUNE_VERIFIED,
  }),
  Object.freeze({
    id: 'tool-enchant-cultivating-x',
    max: 10,
    stepGain: 2,
    publishedMaximum: 20,
    source: CORE_FORTUNE_SOURCE,
    lastVerified: CORE_FORTUNE_VERIFIED,
  }),
  Object.freeze({
    id: 'tool-enchant-harvesting-vi',
    max: 6,
    stepGain: 12.5,
    publishedMaximum: 75,
    source: CORE_FORTUNE_SOURCE,
    lastVerified: CORE_FORTUNE_VERIFIED,
  }),
  Object.freeze({
    id: 'tool-enchant-turbo-crop',
    max: 7,
    stepGain: 5,
    publishedMaximum: 35,
    source: CORE_FORTUNE_SOURCE,
    lastVerified: CORE_FORTUNE_VERIFIED,
  }),
  Object.freeze({
    id: 'tool-enchant-dedication',
    max: 4,
    stepGain: 0,
    publishedMaximum: 92,
    nonlinear: true,
    source: CORE_FORTUNE_SOURCE,
    lastVerified: CORE_FORTUNE_VERIFIED,
  }),
  Object.freeze({
    id: 'tool-reforge-blessed-reforge',
    max: 1,
    stepGain: 20,
    publishedMaximum: 20,
    rarityReference: 'MYTHIC',
    source: CORE_FORTUNE_SOURCE,
    lastVerified: CORE_FORTUNE_VERIFIED,
  }),
  Object.freeze({
    id: 'tool-reforge-bountiful-reforge',
    max: 1,
    stepGain: 10,
    publishedMaximum: 10,
    rarityReference: 'MYTHIC',
    source: CORE_FORTUNE_SOURCE,
    lastVerified: CORE_FORTUNE_VERIFIED,
  }),
  Object.freeze({
    id: 'accessory-relic-of-power-perfect-peridot-effect',
    max: 1,
    stepGain: 5,
    publishedMaximum: 5,
    note: 'Perfect Peridot contributes half its normal Farming Fortune in a Relic of Power.',
    source: CORE_FORTUNE_SOURCE,
    lastVerified: CORE_FORTUNE_VERIFIED,
  }),
]);
