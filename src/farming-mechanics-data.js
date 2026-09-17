import { DROP_SCALING } from './profit-engine.js';

export const FARMING_MECHANICS_DATA_VERSION = 2;

const SOURCE = Object.freeze({
  farmingFortune: 'https://hypixel-skyblock.fandom.com/wiki/Farming_Fortune',
  greenhouseRelease: 'https://hypixel.net/threads/hypixel-skyblock-0-24-the-greenhouse.6027542/',
  harvestFeast: 'https://hypixel.net/threads/hypixel-skyblock-0-24-4-harvest-feast-event-fossil-essence-shop-and-more.6089392/',
  harvestFeastMay5: 'https://hypixel.net/threads/may-5-skyblock-patch-notes.6094300/',
  harvestFeastMay14: 'https://hypixel.net/threads/may-14-harvest-feast-changes.6096831/',
  pumpkin: 'https://hypixel-skyblock.fandom.com/wiki/Pumpkin',
  melon: 'https://hypixel-skyblock.fandom.com/wiki/Melon',
  cactus: 'https://hypixel-skyblock.fandom.com/wiki/Cactus',
});

function fixed(value, source, status = 'VERIFIED') {
  return Object.freeze({ kind: 'fixed', min: value, max: value, expected: value, status, source });
}

function range(min, max, expected, source, status = 'VERIFIED') {
  return Object.freeze({ kind: 'range', min, max, expected, status, source });
}

function unresolved(reason, source = null) {
  return Object.freeze({ kind: 'unresolved', min: null, max: null, expected: null, status: 'VERIFY', reason, source });
}

/**
 * Active-farming crop output model.
 *
 * The calculator must use baseDrop.expected, never invent a value for entries
 * marked VERIFY. Farming Fortune + the active crop-specific Fortune are then
 * applied as the combined Fortune multiplier in profit-engine.js.
 */
export const ACTIVE_CROP_MODELS = Object.freeze({
  wheat: Object.freeze({
    id: 'wheat', itemId: 'WHEAT', fortuneStat: 'wheatFortune', activeFarmable: true,
    baseDrop: unresolved('Exact live SkyBlock base units per mature crop break still require a direct source/measurement.'),
  }),
  carrot: Object.freeze({
    id: 'carrot', itemId: 'CARROT_ITEM', fortuneStat: 'carrotFortune', activeFarmable: true,
    baseDrop: unresolved('Vanilla crop has variable output; exact SkyBlock expected base units are not yet source-verified.'),
  }),
  potato: Object.freeze({
    id: 'potato', itemId: 'POTATO_ITEM', fortuneStat: 'potatoFortune', activeFarmable: true,
    baseDrop: unresolved('Vanilla crop has variable output; exact SkyBlock expected base units are not yet source-verified.'),
  }),
  pumpkin: Object.freeze({
    id: 'pumpkin', itemId: 'PUMPKIN', fortuneStat: 'pumpkinFortune', activeFarmable: true,
    baseDrop: fixed(1, SOURCE.pumpkin),
  }),
  melon: Object.freeze({
    id: 'melon', itemId: 'MELON', fortuneStat: 'melonSliceFortune', activeFarmable: true,
    baseDrop: range(3, 7, 5, SOURCE.melon),
    notes: 'Silk Touch is a separate non-Fortune path and must not be used for normal Garden profit scoring.',
  }),
  mushroom: Object.freeze({
    id: 'mushroom', itemId: 'RED_MUSHROOM/BROWN_MUSHROOM', fortuneStat: 'mushroomFortune', activeFarmable: true,
    baseDrop: unresolved('Garden mushroom layouts can break mushroom blocks/crops differently; keep measured expected units explicit.'),
  }),
  cactus: Object.freeze({
    id: 'cactus', itemId: 'CACTUS', fortuneStat: 'cactusFortune', activeFarmable: true,
    baseDrop: fixed(1, SOURCE.cactus),
  }),
  'sugar-cane': Object.freeze({
    id: 'sugar-cane', itemId: 'SUGAR_CANE', fortuneStat: 'sugarCaneFortune', activeFarmable: true,
    baseDrop: unresolved('Exact live Garden base units per valid broken cane block still require direct source/measurement.'),
  }),
  'cocoa-beans': Object.freeze({
    id: 'cocoa-beans', itemId: 'INK_SACK:3', fortuneStat: 'cocoaBeansFortune', activeFarmable: true,
    baseDrop: unresolved('Mature cocoa output is variable in vanilla; exact SkyBlock expected base units remain source-verified separately.'),
  }),
  'nether-wart': Object.freeze({
    id: 'nether-wart', itemId: 'NETHER_STALK', fortuneStat: 'netherWartFortune', activeFarmable: true,
    baseDrop: unresolved('Mature wart output is variable; do not substitute minion averages for player-break output.'),
  }),
  sunflower: Object.freeze({
    id: 'sunflower', itemId: 'SUNFLOWER', fortuneStat: 'sunflowerFortune', activeFarmable: true,
    baseDrop: unresolved('Custom crop added in 0.24; exact player-break base quantity is not stated in the release notes.', SOURCE.greenhouseRelease),
  }),
  moonflower: Object.freeze({
    id: 'moonflower', itemId: 'MOONFLOWER', fortuneStat: 'moonflowerFortune', activeFarmable: true,
    baseDrop: unresolved('Custom crop added in 0.24; exact player-break base quantity is not stated in the release notes.', SOURCE.greenhouseRelease),
  }),
  'wild-rose': Object.freeze({
    id: 'wild-rose', itemId: 'WILD_ROSE', fortuneStat: 'wildRoseFortune', activeFarmable: true,
    baseDrop: unresolved('Custom crop added in 0.24; exact player-break base quantity is not stated in the release notes.', SOURCE.greenhouseRelease),
  }),
});

export const HARVEST_FEAST_RARE_CROPS = Object.freeze({
  wheat: Object.freeze({ name: 'Cornucopia', itemId: 'CORNUCOPIA' }),
  carrot: Object.freeze({ name: 'Carrot Zest', itemId: 'CARROT_ZEST' }),
  potato: Object.freeze({ name: 'Deepfries', itemId: 'DEEPFRIES' }),
  pumpkin: Object.freeze({ name: 'Aggourdian', itemId: 'AGGOURDIAN' }),
  'sugar-cane': Object.freeze({ name: 'Cane Knot', itemId: 'CANE_KNOT' }),
  melon: Object.freeze({ name: 'Melon Juice', itemId: 'MELON_JUICE' }),
  cactus: Object.freeze({ name: 'Cactus Flower', itemId: 'CACTUS_FLOWER' }),
  'cocoa-beans': Object.freeze({ name: 'Designer Coffee Beans', itemId: 'DESIGNER_COFFEE_BEANS' }),
  mushroom: Object.freeze({ name: 'Feastfungus', itemId: 'FEASTFUNGUS' }),
  'nether-wart': Object.freeze({ name: 'Botroot', itemId: 'BOTROOT' }),
  sunflower: Object.freeze({ name: 'Salted Sunflower Seeds', itemId: 'SALTED_SUNFLOWER_SEEDS' }),
  moonflower: Object.freeze({ name: 'Crystalized Moonlight', itemId: 'CRYSTALIZED_MOONLIGHT' }),
  'wild-rose': Object.freeze({ name: 'Floral Gelatin', itemId: 'FLORAL_GELATIN' }),
});

/**
 * Current Harvest Feast drop rules.
 *
 * Seasoning and the crop-specific material are RARE CROPS. Overbloom scales
 * their base probability multiplicatively: P = base * (1 + Overbloom / 100).
 * Seasoning has no market item because it is donated automatically.
 */
export const HARVEST_FEAST_MODEL = Object.freeze({
  status: 'ACTIVE',
  verified: '2026-09-17',
  source: SOURCE.harvestFeast,
  seasoning: Object.freeze({
    id: 'harvest-feast-seasoning',
    name: 'Seasoning',
    baseProbability: 1 / 2250,
    rollsPerBreak: 1,
    expectedQuantity: 1,
    scaling: DROP_SCALING.OVERBLOOM,
    inSeasonOnly: true,
    physicalItem: false,
    automaticDonation: true,
    grandFeastKernelPerDrop: 1,
  }),
  cropMaterial: Object.freeze({
    baseProbability: 1 / 18000,
    rollsPerBreak: 1,
    expectedQuantity: 1,
    scaling: DROP_SCALING.OVERBLOOM,
    inSeasonOnly: true,
    physicalItem: true,
  }),
  grandFeast: Object.freeze({
    replacesHarvestFeast: true,
    seasoningAlsoDropsKernel: true,
  }),
  modifiers: Object.freeze({
    overbloomPerFeastEnchantLevel: 2,
    luckyCloverOverbloom: 3,
    poignantLuckyCloverOverbloom: 7,
    freshlyBakedAccessoryOwnOverbloomDoubledDuringFeast: true,
    may5Source: SOURCE.harvestFeastMay5,
  }),
});

export function cropModel(cropId) {
  return ACTIVE_CROP_MODELS[cropId] || null;
}

export function cropNormalDropInput(cropId, unitValueCoins) {
  const model = cropModel(cropId);
  if (!model) return null;
  return {
    id: `${cropId}-base-crop`,
    baseUnitsPerBreak: model.baseDrop.expected,
    unitValueCoins,
    scaling: DROP_SCALING.COMBINED_FORTUNE,
    dataStatus: model.baseDrop.status,
    source: model.baseDrop.source || null,
  };
}

export function harvestFeastRareCropInputs(cropId, options = {}) {
  const crop = HARVEST_FEAST_RARE_CROPS[cropId];
  if (!crop) return [];

  const rows = [];
  if (options.includeSeasoning !== false) {
    rows.push({
      ...HARVEST_FEAST_MODEL.seasoning,
      unitValueCoins: options.seasoningValueCoins ?? null,
      objective: 'donation-progression',
      source: SOURCE.harvestFeast,
    });
  }

  rows.push({
    id: `harvest-feast-${cropId}`,
    name: crop.name,
    itemId: crop.itemId,
    ...HARVEST_FEAST_MODEL.cropMaterial,
    unitValueCoins: options.cropMaterialValueCoins ?? null,
    objective: 'coins-or-crafting',
    source: SOURCE.harvestFeast,
  });
  return rows;
}

export function expectedRareCropProbability(baseProbability, overbloom) {
  const base = Number(baseProbability);
  const stat = Number(overbloom);
  if (!Number.isFinite(base) || base < 0 || base > 1 || !Number.isFinite(stat) || stat < 0) return null;
  return base * (1 + stat / 100);
}

export function cropModelCoverage() {
  const rows = Object.values(ACTIVE_CROP_MODELS);
  const verified = rows.filter(row => row.baseDrop.status === 'VERIFIED').length;
  return Object.freeze({
    total: rows.length,
    verified,
    needsVerification: rows.length - verified,
    unresolvedCropIds: rows.filter(row => row.baseDrop.status !== 'VERIFIED').map(row => row.id),
  });
}
