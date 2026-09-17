/**
 * A Jacob's contest score from the measurements the planner already has.
 *
 * `src/jacob-contest-model.js` shipped with the brackets, the 20-minute
 * duration, the personal-best Fortune table and Anita's accessory tiers, all
 * sourced -- and no caller. Meanwhile the planner's "Collection / Contest" mode
 * ranked upgrades by a keyword match on the word "contest", which is a text
 * search dressed as a model.
 *
 * The inputs are the same ones the profit baseline collects: breaks per second,
 * uptime, and the crop's own drop count from `farming-mechanics-data.js`. So a
 * player who measured their farm once gets a contest estimate for free.
 *
 * What this does not do is guess a medal. The model says why itself: a crop
 * score cannot determine a percentile, because the bracket depends on everyone
 * else's scores that hour. The brackets are shown as what they are -- the
 * reward table -- and the estimate is shown as a collection total.
 */
import { cropModel } from './farming-mechanics-data.js';
import {
  JACOB_CONTEST_DURATION_SECONDS,
  JACOB_PARTICIPATION_COLLECTION,
  estimateJacobContestScore,
  personalBestCropFortune,
} from './jacob-contest-model.js';

function positive(value) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}

function ratioFromPercent(value) {
  const percent = positive(value);
  return percent == null ? null : Math.max(0, Math.min(1, percent / 100));
}

/**
 * Plain words for a model `missing` path.
 *
 * `directFarming.baseUnitsPerBreak` is never the player's to supply -- it comes
 * from the crop model -- so when it is missing the crop is the thing to name,
 * not the field.
 */
const MISSING_WORDS = Object.freeze({
  'directFarming.breaksPerSecond': 'how many crops you break per second',
  'directFarming.uptimeRatio': 'how much of the contest you actually farm',
  'directFarming.baseUnitsPerBreak': 'a verified drop count for this crop',
  'directFarming.farmingFortune': 'your Farming Fortune',
  'directFarming.cropFortune': 'your Crop Fortune for this crop',
  'directFarming.contestCropFortune': 'your contest-only Crop Fortune',
  durationSeconds: 'the contest length',
});

export function describeContestMissing(path) {
  return MISSING_WORDS[String(path || '')] || 'a value the contest model still needs';
}

/**
 * The estimate, or what it is still missing.
 *
 * `contestCropFortune` defaults to 0 rather than being treated as unknown: a
 * player with no Anita accessory and no personal best genuinely has none, and
 * leaving it unknown would block the whole estimate over a value that is
 * legitimately zero for most profiles. A personal best raises it, and that is
 * read from the profile rather than asked for.
 */
export function contestEstimate({
  cropId = null,
  measured = {},
  stats = {},
  personalBest = null,
} = {}) {
  const model = cropModel(cropId);
  const baseUnitsPerBreak = model?.baseDrop?.expected ?? null;
  const contestFortune = personalBest == null
    ? 0
    : (personalBestCropFortune(cropId, personalBest) ?? 0);

  const result = estimateJacobContestScore({
    durationSeconds: JACOB_CONTEST_DURATION_SECONDS,
    directFarming: {
      breaksPerSecond: positive(measured.breaksPerSecond),
      baseUnitsPerBreak: positive(baseUnitsPerBreak),
      farmingFortune: Number(stats.farmingFortune ?? 0),
      cropFortune: Number(stats.cropFortune ?? 0),
      contestCropFortune: contestFortune,
      uptimeRatio: ratioFromPercent(measured.uptimePercent),
    },
  });

  return {
    complete: result.complete,
    expectedCollection: result.complete ? Math.round(result.expectedCollection) : null,
    participationReached: result.participationReached,
    participationThreshold: JACOB_PARTICIPATION_COLLECTION,
    durationSeconds: JACOB_CONTEST_DURATION_SECONDS,
    contestCropFortune: contestFortune,
    cropKnown: Boolean(model),
    cropDataStatus: model?.baseDrop?.status ?? 'UNKNOWN',
    missing: [...new Set(result.missing.map(describeContestMissing))],
    // The model's own words, kept rather than paraphrased.
    bracketReason: result.bracketReason,
  };
}
