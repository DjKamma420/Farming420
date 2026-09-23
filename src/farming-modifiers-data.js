export const FARMING_MODIFIERS_DATA_VERSION = 1;

const SOURCE = Object.freeze({
  greenhouseRelease: 'https://hypixel.net/threads/hypixel-skyblock-0-24-the-greenhouse.6027542/',
  gardenChips: 'https://hypixel-skyblock.fandom.com/wiki/Garden_Chips',
  farmingFortune: 'https://hypixel-skyblock.fandom.com/wiki/Farming_Fortune',
  cropFever: 'https://hypixel-skyblock.fandom.com/wiki/Crop_Fever',
  overbloom: 'https://hypixel-skyblock.fandom.com/wiki/Overbloom',
  bonusPestChance: 'https://hypixel-skyblock.fandom.com/wiki/Bonus_Pest_Chance',
  current027Report: 'https://hypixel.net/threads/random-farming-nerfs-not-mentioned-in-patch-notes.6128320/',
  current027ShardReport: 'https://hypixel.net/threads/outdated-more-farming-nerfs-on-alpha-including-math.6132043/',
});

export const CHIP_LEVEL_CAP = Object.freeze({ RARE: 10, EPIC: 15, LEGENDARY: 20 });

function effect(axis, rates, extra = {}) {
  return Object.freeze({ axis, rates: Object.freeze({ ...rates }), ...extra });
}

/**
 * Garden Chips are account-wide permanent upgrades after redemption.
 *
 * ACTIVE values are suitable for direct calculator use. VERIFY_0_27 means the
 * effect changed around 0.27 and the exact live rarity curve is not fully
 * documented; callers must not fill missing rarity rates by inference.
 */
export const GARDEN_CHIPS = Object.freeze({
  verminVaporizer: Object.freeze({
    id: 'vermin-vaporizer', itemId: 'VERMIN_VAPORIZER_GARDEN_CHIP', name: 'Vermin Vaporizer Chip',
    status: 'ACTIVE', effect: effect('bonusPestChance', { RARE: 3, EPIC: 4, LEGENDARY: 5 }),
    source: SOURCE.bonusPestChance,
  }),
  synthesis: Object.freeze({
    id: 'synthesis', itemId: 'SYNTHESIS_GARDEN_CHIP', name: 'Synthesis Chip',
    status: 'ACTIVE', effect: effect('cropAnalyzerBaseCopperPercent', { RARE: 1, EPIC: 1.5, LEGENDARY: 2 }),
    source: SOURCE.gardenChips,
  }),
  sowledge: Object.freeze({
    id: 'sowledge', itemId: 'SOWLEDGE_GARDEN_CHIP', name: 'Sowledge Chip',
    status: 'ACTIVE', effect: effect('farmingWisdom', { RARE: 1, EPIC: 1.25, LEGENDARY: 1.5 }),
    source: SOURCE.gardenChips,
  }),
  mechamind: Object.freeze({
    id: 'mechamind', itemId: 'MECHAMIND_GARDEN_CHIP', name: 'Mechamind Chip',
    status: 'ACTIVE', effect: effect('farmingToolXpPercent', { RARE: 1.5, EPIC: 2, LEGENDARY: 2.5 }),
    source: SOURCE.gardenChips,
  }),
  hypercharge: Object.freeze({
    id: 'hypercharge', itemId: 'HYPERCHARGE_GARDEN_CHIP', name: 'Hypercharge Chip',
    status: 'ACTIVE', effect: effect('temporaryFarmingFortuneStrengthPercent', { RARE: 3, EPIC: 4, LEGENDARY: 5 }),
    source: SOURCE.gardenChips,
  }),
  evergreen: Object.freeze({
    id: 'evergreen', itemId: 'EVERGREEN_GARDEN_CHIP', name: 'Evergreen Chip',
    status: 'ACTIVE', effect: effect('greenhouseBaseCropYieldPercent', { RARE: 2, EPIC: 2.5, LEGENDARY: 3 }),
    source: SOURCE.gardenChips,
  }),
  overdrive: Object.freeze({
    id: 'overdrive', itemId: 'OVERDRIVE_GARDEN_CHIP', name: 'Overdrive Chip',
    status: 'ACTIVE', effect: effect('activeContestCropFortune', { RARE: 5, EPIC: 6, LEGENDARY: 7 }, { context: 'jacob-contest' }),
    source: SOURCE.gardenChips,
  }),
  cropshot: Object.freeze({
    id: 'cropshot', itemId: 'CROPSHOT_GARDEN_CHIP', tutorialItemId: 'TUTORIAL_GARDEN_CHIP', name: 'Cropshot Chip',
    status: 'VERIFY_0_27',
    effect: effect('farmingFortune', { RARE: 3, EPIC: null, LEGENDARY: null }, {
      currentReportedLegendaryLevel20Total: 60,
      pre027Rates: Object.freeze({ RARE: 3, EPIC: 4, LEGENDARY: 5 }),
      reason: '0.27 live reports show the maxed chip changed from +100 to +60 FF; exact post-change EPIC/LEGENDARY per-level lore needs direct live item/profile verification.',
    }),
    source: SOURCE.current027Report,
  }),
  quickdraw: Object.freeze({
    id: 'quickdraw', itemId: 'QUICKDRAW_GARDEN_CHIP', name: 'Quickdraw Chip',
    status: 'ACTIVE', effect: effect('visitorArrivalTimeReductionPercent', { RARE: 1.5, EPIC: 2, LEGENDARY: 2.5 }),
    source: SOURCE.gardenChips,
  }),
  rarefinder: Object.freeze({
    id: 'rarefinder', itemId: 'RAREFINDER_CHIP', name: 'Rarefinder Chip',
    status: 'ACTIVE', effect: effect('overbloom', { RARE: 2, EPIC: 2.5, LEGENDARY: 3 }),
    baseDropProbabilityPerCropBreak: 0.0000015,
    source: SOURCE.gardenChips,
  }),
});

export function gardenChipEffect(chipId, { level, rarity } = {}) {
  const chip = Object.values(GARDEN_CHIPS).find(row => row.id === chipId || row.itemId === chipId);
  const normalizedRarity = String(rarity || '').toUpperCase();
  const numericLevel = Number(level);
  if (!chip || !CHIP_LEVEL_CAP[normalizedRarity] || !Number.isFinite(numericLevel)) return null;
  if (numericLevel < 0 || numericLevel > CHIP_LEVEL_CAP[normalizedRarity]) return null;
  const perLevel = chip.effect.rates[normalizedRarity];
  if (!Number.isFinite(perLevel)) return null;
  return numericLevel * perLevel;
}

export function maxGardenChipEffect(chipId, rarity = 'LEGENDARY') {
  const normalizedRarity = String(rarity).toUpperCase();
  return gardenChipEffect(chipId, { level: CHIP_LEVEL_CAP[normalizedRarity], rarity: normalizedRarity });
}

/**
 * Temporary farming modifiers that can materially affect active profit.
 * Hypercharge only amplifies rows explicitly marked hyperchargeEligible=true.
 * A null value means the current live magnitude/interaction remains unresolved.
 */
export const TEMPORARY_FARMING_MODIFIERS = Object.freeze({
  cropFever: Object.freeze({
    id: 'crop-fever', name: 'Crop Fever', status: 'ACTIVE', source: SOURCE.cropFever,
    triggerProbabilityPerBreakPerEnchantLevel: 0.00001,
    maxEnchantLevel: 5,
    durationSeconds: 60,
    effects: Object.freeze({ farmingFortune: 100, overbloom: 15 }),
    hyperchargeEligible: true,
  }),
  chocolateCenturyCake: Object.freeze({
    id: 'chocolate-century-cake', name: 'Chocolate Century Cake', status: 'ACTIVE', source: SOURCE.farmingFortune,
    effects: Object.freeze({ farmingFortune: 5 }), hyperchargeEligible: true,
  }),
  pesthunterPhillip: Object.freeze({
    id: 'pesthunter-phillip', name: 'Pesthunter Phillip', status: 'ACTIVE_REPORTED_0_27', source: SOURCE.current027Report,
    durationSeconds: 1800,
    currentPestCostForFullBuff: 80,
    effects: Object.freeze({ farmingFortune: 200 }),
    hyperchargeEligible: true,
  }),
  atmosphericFilter: Object.freeze({
    id: 'atmospheric-filter', name: 'Atmospheric Filter', status: 'ACTIVE', source: SOURCE.farmingFortune,
    condition: 'spring', effects: Object.freeze({ farmingFortune: 25 }), hyperchargeEligible: true,
  }),
  magic8Ball: Object.freeze({
    id: 'magic-8-ball', name: 'Magic 8 Ball', status: 'VERIFY', source: SOURCE.farmingFortune,
    condition: 'selected-season', effects: Object.freeze({ farmingFortune: 25 }), hyperchargeEligible: true,
    reason: 'Community wiki still flags the Hypercharge interaction as requiring confirmation.',
  }),
  refinedDarkCacaoTruffle: Object.freeze({
    id: 'refined-dark-cacao-truffle', name: 'Refined Dark Cacao Truffle', status: 'ACTIVE_REPORTED_0_27', source: SOURCE.current027Report,
    effects: Object.freeze({ cocoaBeansFortune: 30 }),
    hyperchargeEligible: false,
    notes: '0.27 reports changed the truffle from global Farming Fortune to Cocoa Beans Fortune; do not feed it into global FF.',
  }),
});

export function hyperchargedFarmingFortune(baseFarmingFortune, hyperchargePercent) {
  const base = Number(baseFarmingFortune);
  const percent = Number(hyperchargePercent);
  if (!Number.isFinite(base) || !Number.isFinite(percent) || base < 0 || percent < 0) return null;
  return base * (1 + percent / 100);
}

export function temporaryModifierEffect(modifierId, { hyperchargePercent = 0 } = {}) {
  const row = Object.values(TEMPORARY_FARMING_MODIFIERS).find(entry => entry.id === modifierId);
  if (!row) return null;
  const effects = { ...row.effects };
  if (row.hyperchargeEligible && Number.isFinite(effects.farmingFortune)) {
    effects.farmingFortune = hyperchargedFarmingFortune(effects.farmingFortune, hyperchargePercent);
  }
  return Object.freeze(effects);
}

/**
 * Farming-relevant shards observed in the 0.27 line. These effects were
 * under-documented in official patch notes, so ACTIVE_REPORTED rows must retain
 * provenance and should be replaceable by direct live profile/item decoding.
 */
export const FARMING_SHARDS_027 = Object.freeze({
  fieldMouse: Object.freeze({ id: 'field-mouse', name: 'Field Mouse Shard', status: 'ACTIVE_REPORTED_0_27', source: SOURCE.current027Report, effects: Object.freeze({ pestOverbloom: 5 }) }),
  cricket: Object.freeze({ id: 'cricket', name: 'Cricket Shard', status: 'ACTIVE_REPORTED_0_27', source: SOURCE.current027ShardReport, effects: Object.freeze({ farmingFortuneOnPests: 50 }) }),
  fly: Object.freeze({ id: 'fly', name: 'Fly Shard', status: 'ACTIVE_REPORTED_0_27', source: SOURCE.current027ShardReport, effects: Object.freeze({ farmingFortune: 25 }) }),
  keeledSlug: Object.freeze({ id: 'keeled-slug', name: 'Keeled Slug Shard', status: 'ACTIVE_REPORTED_0_27', source: SOURCE.current027ShardReport, effects: Object.freeze({ bonusPestChance: 10 }) }),
  moth: Object.freeze({ id: 'moth', name: 'Moth Shard', status: 'ACTIVE_REPORTED_0_27', source: SOURCE.current027ShardReport, effects: Object.freeze({ pestSpawnCooldownSeconds: -5 }) }),
  rat: Object.freeze({ id: 'rat', name: 'Rat Shard', status: 'ACTIVE_REPORTED_0_27', source: SOURCE.current027ShardReport, effects: Object.freeze({ extraSprayonatorMaterialChance: 0.10 }) }),
  mosquito: Object.freeze({ id: 'mosquito', name: 'Mosquito Shard', status: 'ACTIVE_REPORTED_0_27', source: SOURCE.current027ShardReport, effects: Object.freeze({ enchantedCropDropProbabilityPerBreak: 0.0001 }) }),
  mudworm: Object.freeze({ id: 'mudworm', name: 'Mudworm Shard', status: 'ACTIVE_REPORTED_0_27', source: SOURCE.current027ShardReport, effects: Object.freeze({ visitorArrivalTimeReductionPercent: 10 }), interactionStatus: 'VERIFY_STACKING' }),
  ladybug: Object.freeze({ id: 'ladybug', name: 'Ladybug Shard', status: 'ACTIVE', source: 'https://hypixel-skyblock.fandom.com/wiki/Attributes/List/Rare', effects: Object.freeze({ visitorCopperPercent: 10 }) }),
  locust: Object.freeze({ id: 'locust', name: 'Locust Shard', status: 'ACTIVE_REPORTED_0_27', source: SOURCE.current027ShardReport, effects: Object.freeze({ cropGrowth: 10 }) }),
  timestalkClone: Object.freeze({ id: 'timestalk-clone', name: 'Timestalk Clone Shard', status: 'ACTIVE_REPORTED_0_27', source: SOURCE.current027ShardReport, effects: Object.freeze({ greenhouseGrowthSpeedPercent: 5 }), interactionStatus: 'VERIFY_STACKING' }),
  mite: Object.freeze({ id: 'mite', name: 'Mite Shard', status: 'ACTIVE_REPORTED_0_27', source: SOURCE.current027ShardReport, effects: Object.freeze({ atmosphericFilterStrengthPercent: 20 }) }),
});

export function farmingModifierCoverage() {
  const chips = Object.values(GARDEN_CHIPS);
  const temporary = Object.values(TEMPORARY_FARMING_MODIFIERS);
  const shards = Object.values(FARMING_SHARDS_027);
  return Object.freeze({
    chips: chips.length,
    chipsDirectlyScoreable: chips.filter(row => Object.values(row.effect.rates).every(Number.isFinite)).length,
    chipsNeedLiveVerification: chips.filter(row => row.status.includes('VERIFY')).map(row => row.id),
    temporary: temporary.length,
    temporaryNeedVerification: temporary.filter(row => row.status.includes('VERIFY')).map(row => row.id),
    shards: shards.length,
    shardInteractionVerification: shards.filter(row => row.interactionStatus?.includes('VERIFY')).map(row => row.id),
  });
}
