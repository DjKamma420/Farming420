/**
 * Crop Milestone derivation from Hypixel Garden resources_collected.
 *
 * The Garden API exposes cumulative collected amounts, not a ready-to-use total
 * milestone count. These current tier thresholds are mirrored from the
 * maintained Garden data used by BetterPV and verified against the current
 * 13-crop Garden set on 2026-09-23.
 */
export const CROP_MILESTONE_VERIFIED = '2026-09-23';
export const CROP_MILESTONE_API_SOURCE = 'https://api.hypixel.net/v2/skyblock/garden';
export const CROP_MILESTONE_THRESHOLD_SOURCE = 'https://github.com/Vyriv/BetterPV/blob/master/src/main/resources/assets/betterpv/data/garden.json';

const WHEAT = Object.freeze([0,30,80,160,360,710,1410,2910,5410,8910,13910,20410,28410,38410,58410,93410,143410,218410,318410,493410,743410,1118410,1518410,1968410,2618410,3418410,4218410,5018410,5818410,6618410,7418410,8218410,9018410,9818410,10618410,11418410,12218410,13018410,13818410,14618410,15418410,16218410,17018410,17818410,18618410,19418410,20218410]);
const CARROT = Object.freeze([0,100,250,500,1000,2000,4000,8500,17500,29500,44500,64500,89500,124500,194500,314500,494500,744500,1094500,1694500,2544500,3644500,5044500,6844500,9044500,11644500,14244500,16844500,19444500,22044500,24644500,27244500,29844500,32444500,35044500,37644500,40244500,42844500,45444500,48044500,50644500,53244500,55844500,58444500,61044500,63644500,66244500]);
const MELON = Object.freeze([0,150,400,800,1800,3550,7050,14550,27050,44550,69550,102050,142050,192050,292050,467050,717050,1092050,1592050,2467050,3717050,5592050,7592050,9842050,13092050,17092050,21092050,25092050,29092050,33092050,37092050,41092050,45092050,49092050,53092050,57092050,61092050,65092050,69092050,73092050,77092050,81092050,85092050,89092050,93092050,97092050,101092050]);
const CANE = Object.freeze([0,60,160,320,720,1420,2820,5820,10820,17820,27820,40820,56820,76820,116820,186820,286820,436820,636820,986820,1486820,2236820,3036820,3936820,5236820,6836820,8436820,10036820,11636820,13236820,14836820,16436820,18036820,19636820,21236820,22836820,24436820,26036820,27636820,29236820,30836820,32436820,34036820,35636820,37236820,38836820,40436820]);
const WART = Object.freeze([0,90,240,480,1080,2130,4230,8730,16230,26730,41730,61230,85230,115230,175230,280230,430230,655230,955230,1480230,2230230,3355230,4555230,5905230,7855230,10255230,12655230,15055230,17455230,19855230,22255230,24655230,27055230,29455230,31855230,34255230,36655230,39055230,41455230,43855230,46255230,48655230,51055230,53455230,55855230,58255230,60655230]);
const MOONFLOWER = Object.freeze([0,30,80,160,360,1060,1760,3260,5760,9260,14260,20760,28760,38760,58760,93760,143760,218760,318760,493760,743760,1118760,1518760,1968760,2618760,3418760,4218760,5018760,5818760,6618760,7418760,8218760,9018760,9818760,10618760,11418760,12218760,13018760,13818760,14618760,15418760,16218760,17018760,17818760,18618760,19418760,20218760]);

export const CROP_MILESTONE_DEFINITIONS = Object.freeze([
  Object.freeze({ id: 'wheat', apiKey: 'WHEAT', thresholds: WHEAT }),
  Object.freeze({ id: 'carrot', apiKey: 'CARROT_ITEM', thresholds: CARROT }),
  Object.freeze({ id: 'potato', apiKey: 'POTATO_ITEM', thresholds: CARROT }),
  Object.freeze({ id: 'pumpkin', apiKey: 'PUMPKIN', thresholds: WHEAT }),
  Object.freeze({ id: 'sugar-cane', apiKey: 'SUGAR_CANE', thresholds: CANE }),
  Object.freeze({ id: 'melon', apiKey: 'MELON', thresholds: MELON }),
  Object.freeze({ id: 'cactus', apiKey: 'CACTUS', thresholds: CANE }),
  Object.freeze({ id: 'cocoa-beans', apiKey: 'INK_SACK:3', thresholds: WART }),
  Object.freeze({ id: 'mushroom', apiKey: 'MUSHROOM_COLLECTION', thresholds: WHEAT }),
  Object.freeze({ id: 'nether-wart', apiKey: 'NETHER_STALK', thresholds: WART }),
  Object.freeze({ id: 'sunflower', apiKey: 'DOUBLE_PLANT', thresholds: WHEAT }),
  Object.freeze({ id: 'moonflower', apiKey: 'MOONFLOWER', thresholds: MOONFLOWER }),
  Object.freeze({ id: 'wild-rose', apiKey: 'WILD_ROSE', thresholds: CANE }),
]);

export const CROP_MILESTONE_MAX_TOTAL = CROP_MILESTONE_DEFINITIONS
  .reduce((sum, crop) => sum + crop.thresholds.length - 1, 0);

function collectedAmount(value) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : null;
}

export function cropMilestoneLevelFromCollected(amount, thresholds) {
  const collected = collectedAmount(amount);
  if (collected === null || !Array.isArray(thresholds) || thresholds.length < 2) return null;
  let tier = 0;
  for (let index = 1; index < thresholds.length; index += 1) {
    if (collected < thresholds[index]) break;
    tier = index;
  }
  return tier;
}

export function cropMilestonesFromResources(resourcesCollected) {
  if (!resourcesCollected || typeof resourcesCollected !== 'object' || Array.isArray(resourcesCollected)) {
    return Object.freeze({
      complete: false,
      total: null,
      maxTotal: CROP_MILESTONE_MAX_TOTAL,
      byCrop: Object.freeze({}),
      reasons: Object.freeze(['Garden resources_collected is unavailable']),
    });
  }

  const byCrop = {};
  const reasons = [];
  let total = 0;
  for (const crop of CROP_MILESTONE_DEFINITIONS) {
    const hasValue = Object.prototype.hasOwnProperty.call(resourcesCollected, crop.apiKey);
    const raw = hasValue ? resourcesCollected[crop.apiKey] : 0;
    const tier = cropMilestoneLevelFromCollected(raw, crop.thresholds);
    if (tier === null) {
      reasons.push(`Invalid resources_collected value for ${crop.apiKey}`);
      continue;
    }
    byCrop[crop.id] = tier;
    total += tier;
  }

  return Object.freeze({
    complete: reasons.length === 0,
    total: reasons.length === 0 ? total : null,
    maxTotal: CROP_MILESTONE_MAX_TOTAL,
    byCrop: Object.freeze(byCrop),
    reasons: Object.freeze(reasons),
  });
}
