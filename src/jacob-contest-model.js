export const JACOB_CONTEST_MODEL_VERSION = 1;
export const JACOB_CONTEST_DURATION_SECONDS = 20 * 60;
export const JACOB_CONTEST_INTERVAL_SECONDS = 60 * 60;
export const JACOB_CONTEST_CROPS_PER_EVENT = 3;
export const JACOB_PARTICIPATION_COLLECTION = 100;

export const JACOB_SOURCES = Object.freeze({
  original: 'https://hypixel.net/threads/0-9-11-city-project-farm-merchants-dwelling.3502250/',
  pestUpdate: 'https://hypixel.net/threads/skyblock-patch-notes-0-19-7-garden-pests.5537683/',
  greenhouse: 'https://hypixel.net/threads/hypixel-skyblock-0-24-the-greenhouse.6027542/',
  betterMayors: 'https://hypixel.net/threads/june-3-better-mayors.5646904/',
  personalBests: 'https://hypixel-skyblock.fandom.com/wiki/Anita',
  anitaAccessory: 'https://hypixel-skyblock.fandom.com/wiki/Anita%27s_Artifact',
  officialGardenApi: 'https://api.hypixel.net/',
});

/** Current medal brackets. Lower percentile is better. */
export const JACOB_BRACKETS = Object.freeze([
  Object.freeze({ id: 'diamond', label: 'Diamond', topPercent: 2, jacobTickets: 35, carnivalTickets: 3, medals: Object.freeze({ gold: 1, silver: 1, bronze: 0 }), turboBook: true }),
  Object.freeze({ id: 'platinum', label: 'Platinum', topPercent: 5, jacobTickets: 30, carnivalTickets: 2, medals: Object.freeze({ gold: 1, silver: 0, bronze: 1 }), turboBook: true }),
  Object.freeze({ id: 'gold', label: 'Gold', topPercent: 10, jacobTickets: 25, carnivalTickets: 2, medals: Object.freeze({ gold: 1, silver: 0, bronze: 0 }), turboBook: true }),
  Object.freeze({ id: 'silver', label: 'Silver', topPercent: 30, jacobTickets: 15, carnivalTickets: 1, medals: Object.freeze({ gold: 0, silver: 1, bronze: 0 }), turboBook: true }),
  Object.freeze({ id: 'bronze', label: 'Bronze', topPercent: 60, jacobTickets: 10, carnivalTickets: 1, medals: Object.freeze({ gold: 0, silver: 0, bronze: 1 }), turboBook: true }),
]);

export const JACOB_PARTICIPATION_REWARD = Object.freeze({
  id: 'participation', label: 'Participation', topPercent: 100, jacobTickets: 1, carnivalTickets: 0,
  medals: Object.freeze({ gold: 0, silver: 0, bronze: 0 }), turboBook: false,
});

/** Crops collected for +0.1 permanent crop fortune from Anita Personal Bests. */
export const JACOB_PERSONAL_BEST_UNITS_PER_TENTH_FORTUNE = Object.freeze({
  wheat: 1_000,
  carrot: 3_000,
  potato: 3_000,
  pumpkin: 1_000,
  melon: 5_000,
  mushroom: 1_000,
  cactus: 2_000,
  'sugar-cane': 2_000,
  'nether-wart': 3_000,
  'cocoa-beans': 3_000,
  sunflower: 2_000,
  moonflower: 2_000,
  'wild-rose': 2_000,
});

export const ANITA_ACCESSORY_CONTEST_CROP_FORTUNE = Object.freeze({
  talisman: 5,
  ring: 15,
  artifact: 25,
});

function cropKey(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, '-')
    .replace(/-+/g, '-');
}

function finiteNonNegative(value) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : null;
}

export function personalBestCropFortune(crop, personalBestScore) {
  const divisor = JACOB_PERSONAL_BEST_UNITS_PER_TENTH_FORTUNE[cropKey(crop)];
  const score = finiteNonNegative(personalBestScore);
  if (!divisor || score == null) return null;
  return Math.min(100, (score / divisor) * 0.1);
}

export function personalBestScoreForFortune(crop, cropFortune) {
  const divisor = JACOB_PERSONAL_BEST_UNITS_PER_TENTH_FORTUNE[cropKey(crop)];
  const fortune = finiteNonNegative(cropFortune);
  if (!divisor || fortune == null) return null;
  return Math.min(100, fortune) / 0.1 * divisor;
}

/**
 * Converts a finalized placement percentile to a reward bracket.
 * This intentionally does not predict a percentile from a raw crop score.
 */
export function jacobBracketFromFinalPercentile(percentile, collected = JACOB_PARTICIPATION_COLLECTION) {
  const pct = finiteNonNegative(percentile);
  const score = finiteNonNegative(collected);
  if (pct == null || pct > 100 || score == null || score < JACOB_PARTICIPATION_COLLECTION) return null;
  return JACOB_BRACKETS.find(row => pct <= row.topPercent) || JACOB_PARTICIPATION_REWARD;
}

export function jacobRewardForBracket(bracketId) {
  const id = String(bracketId || '').trim().toLowerCase();
  return JACOB_BRACKETS.find(row => row.id === id) || (id === 'participation' ? JACOB_PARTICIPATION_REWARD : null);
}

function sumExplicitCollectionStreams(streams, missing) {
  let total = 0;
  const included = [];
  for (let index = 0; index < (Array.isArray(streams) ? streams.length : 0); index += 1) {
    const stream = streams[index] || {};
    const units = finiteNonNegative(stream.units);
    if (units == null) {
      missing.push(`collectionStreams[${index}].units`);
      continue;
    }
    total += units;
    included.push(Object.freeze({ id: stream.id || `stream-${index + 1}`, units, source: stream.source || 'explicit' }));
  }
  return { total, included };
}

/**
 * Estimates Jacob collection from direct farming plus explicit additional
 * collection streams (for example pre-spawned Pest drops or Greenhouse harvest).
 *
 * All quantities are expectations. Missing direct-farm inputs make the result
 * incomplete; extra streams are never fabricated. Callers must pass explicit
 * zeroes for known-absent contest Fortune and known full uptime.
 */
export function estimateJacobContestScore(input = {}) {
  const missing = [];
  const direct = input.directFarming || null;
  let directUnits = 0;
  let directComplete = true;
  let directDetails = null;

  if (direct) {
    const breaksPerSecond = finiteNonNegative(direct.breaksPerSecond);
    const baseUnitsPerBreak = finiteNonNegative(direct.baseUnitsPerBreak);
    const farmingFortune = finiteNonNegative(direct.farmingFortune);
    const cropFortune = finiteNonNegative(direct.cropFortune);
    const contestCropFortune = finiteNonNegative(direct.contestCropFortune);
    const uptimeRatio = Number(direct.uptimeRatio);
    const durationSeconds = finiteNonNegative(input.durationSeconds ?? JACOB_CONTEST_DURATION_SECONDS);

    if (breaksPerSecond == null) missing.push('directFarming.breaksPerSecond');
    if (baseUnitsPerBreak == null) missing.push('directFarming.baseUnitsPerBreak');
    if (farmingFortune == null) missing.push('directFarming.farmingFortune');
    if (cropFortune == null) missing.push('directFarming.cropFortune');
    if (contestCropFortune == null) missing.push('directFarming.contestCropFortune');
    if (!Number.isFinite(uptimeRatio) || uptimeRatio < 0 || uptimeRatio > 1) missing.push('directFarming.uptimeRatio');
    if (durationSeconds == null) missing.push('durationSeconds');

    directComplete = missing.length === 0;
    if (directComplete) {
      const fortune = farmingFortune + cropFortune + contestCropFortune;
      const validBreaks = breaksPerSecond * durationSeconds * uptimeRatio;
      const multiplier = 1 + fortune / 100;
      directUnits = validBreaks * baseUnitsPerBreak * multiplier;
      directDetails = Object.freeze({ validBreaks, fortune, multiplier, baseUnitsPerBreak, durationSeconds, uptimeRatio });
    }
  }

  const extra = sumExplicitCollectionStreams(input.collectionStreams, missing);
  const complete = directComplete && missing.length === 0;
  return Object.freeze({
    complete,
    expectedCollection: complete ? directUnits + extra.total : null,
    directCollection: direct && complete ? directUnits : direct ? null : 0,
    explicitCollection: extra.total,
    includedStreams: Object.freeze(extra.included),
    direct: directDetails,
    missing: Object.freeze([...new Set(missing)]),
    participationReached: complete ? directUnits + extra.total >= JACOB_PARTICIPATION_COLLECTION : null,
    bracket: null,
    bracketReason: 'A crop score alone cannot determine a live/final percentile bracket. Supply a finalized percentile separately.',
  });
}

export function compareJacobContestScores(before, after) {
  const left = Number(before?.expectedCollection);
  const right = Number(after?.expectedCollection);
  if (before?.complete !== true || after?.complete !== true || !Number.isFinite(left) || !Number.isFinite(right)) {
    return Object.freeze({ complete: false, deltaCollection: null, relativeGain: null });
  }
  return Object.freeze({
    complete: true,
    deltaCollection: right - left,
    relativeGain: left > 0 ? (right - left) / left : null,
  });
}

export function anitaContestCropFortune(accessoryTier, isSelectedCrop) {
  if (isSelectedCrop !== true) return isSelectedCrop === false ? 0 : null;
  const value = ANITA_ACCESSORY_CONTEST_CROP_FORTUNE[String(accessoryTier || '').trim().toLowerCase()];
  return Number.isFinite(value) ? value : null;
}
