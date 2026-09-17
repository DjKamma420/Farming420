import { DROP_SCALING } from './profit-engine.js';

export const FARMING_MECHANICS_DATA_VERSION = 1;

const SOURCE = Object.freeze({
  farmingFortune: 'https://hypixel-skyblock.fandom.com/wiki/Farming_Fortune',
  greenhouseRelease: 'https://hypixel.net/threads/hypixel-skyblock-0-24-the-greenhouse.6027542/',
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
