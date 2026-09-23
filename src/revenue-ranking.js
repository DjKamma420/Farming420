import {
  coinsPerEffectiveFortune,
  marginalCoinsPerHour,
  overbloomToFortuneEquivalent,
  paybackHours,
} from './effective-gain.js';
import {
  INTERNET_FARMING_TIME_VALUE_COINS_PER_HOUR,
  earnedNetCost,
} from './upgrade-economics.js';

function finiteNonNegative(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, number) : 0;
}

function knownNonNegative(value) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : null;
}

export function statDeltas(item, gain) {
  const value = finiteNonNegative(gain);
  const metric = String(item?.metric || '').toLowerCase();
  const searchable = `${item?.name || ''} ${item?.notes || ''} ${item?.attribute || ''}`.toLowerCase();

  if (metric.includes('crop yield')) return { deltaFortune: value, deltaOverbloom: 0, modeled: 'fortune' };
  if (metric.includes('overbloom')) return { deltaFortune: 0, deltaOverbloom: value, modeled: 'overbloom' };
  if (metric.includes('rare crop') && searchable.includes('overbloom')) {
    return { deltaFortune: 0, deltaOverbloom: value, modeled: 'overbloom' };
  }
  return { deltaFortune: 0, deltaOverbloom: 0, modeled: null };
}

export function evaluateUpgrade({
  item,
  gain = 0,
  costCoins = 0,
  acquisitionMode = 'BUYABLE',
  costKind = 'acquisition',
  directCoinCost = 0,
  activeGrindHours = null,
  timeValueCoinsPerHour = INTERNET_FARMING_TIME_VALUE_COINS_PER_HOUR,
  timeValueSource = 'internet_benchmark',
  incidentalGrindProfitCoinsPerHour = 0,
  currentFortune = 0,
  currentOverbloom = 0,
  fortuneBase = 100,
  normalCropCoinsPerHour = 0,
  rareCropCoinsPerHour = 0,
} = {}) {
  const deltas = statDeltas(item, gain);
  const normal = finiteNonNegative(normalCropCoinsPerHour);
  const rare = finiteNonNegative(rareCropCoinsPerHour);
  const economicsReady = normal > 0 || rare > 0;
  const route = acquisitionMode === 'EARNED'
    ? 'EARNED'
    : acquisitionMode === 'UNKNOWN' ? 'UNKNOWN' : 'BUYABLE';
  const recurringConsumable = costKind === 'recurring-consumable';

  let cost = 0;
  let costKnown = false;
  let grindHours = null;
  if (route === 'BUYABLE') {
    const buyCost = knownNonNegative(costCoins);
    costKnown = buyCost !== null && buyCost > 0;
    cost = costKnown ? buyCost : 0;
  } else if (route === 'EARNED') {
    grindHours = knownNonNegative(activeGrindHours);
    if (grindHours !== null) {
      costKnown = true;
      cost = earnedNetCost({
        directCoinCost,
        activeGrindHours: grindHours,
        timeValueCoinsPerHour,
        incidentalGrindProfitCoinsPerHour,
      });
    }
  }

  const marginalCoinsHour = deltas.modeled && economicsReady
    ? marginalCoinsPerHour({
        ...deltas,
        currentFortune,
        currentOverbloom,
        fortuneBase,
        normalCropCoinsPerHour: normal,
        rareCropCoinsPerHour: rare,
      })
    : null;

  const overbloomEquivalent = deltas.deltaOverbloom > 0
    ? overbloomToFortuneEquivalent({
        deltaOverbloom: deltas.deltaOverbloom,
        currentFortune,
        currentOverbloom,
        fortuneBase,
        normalCropCoinsPerHour: normal,
        rareCropCoinsPerHour: rare,
      })
    : 0;

  const fortuneEquivalent = deltas.deltaFortune + (overbloomEquivalent ?? 0);
  return {
    ...deltas,
    gain: finiteNonNegative(gain),
    acquisitionMode: route,
    costKind,
    cost,
    costKnown,
    activeGrindHours: grindHours,
    directCoinCost: finiteNonNegative(directCoinCost),
    timeValueCoinsPerHour: route === 'EARNED' ? finiteNonNegative(timeValueCoinsPerHour) : null,
    timeValueSource: route === 'EARNED' ? timeValueSource : null,
    fortuneBase: finiteNonNegative(fortuneBase) || 100,
    economicsReady,
    marginalCoinsHour,
    fortuneEquivalent,
    payback: !recurringConsumable && costKnown && marginalCoinsHour !== null
      ? paybackHours({ costCoins: cost, marginalCoinsHour })
      : null,
    coinsPerEffectiveFortune: !recurringConsumable && costKnown
      ? coinsPerEffectiveFortune({ costCoins: cost, deltaFortuneEquivalent: fortuneEquivalent })
      : null,
  };
}

export function rankEvaluatedUpgrades(rows) {
  return [...rows].sort((a, b) => {
    const aPayback = Number.isFinite(a.payback) ? a.payback : null;
    const bPayback = Number.isFinite(b.payback) ? b.payback : null;
    if (aPayback !== null && bPayback !== null && aPayback !== bPayback) return aPayback - bPayback;
    if (aPayback !== null) return -1;
    if (bPayback !== null) return 1;

    const aMarginal = Number.isFinite(a.marginalCoinsHour) ? a.marginalCoinsHour : -1;
    const bMarginal = Number.isFinite(b.marginalCoinsHour) ? b.marginalCoinsHour : -1;
    if (aMarginal !== bMarginal) return bMarginal - aMarginal;

    // No baseline means no payback and no marginal profit, but the researched
    // cost table still answers "what do I pay per point of Farming Fortune",
    // and that question needs no Coins/h at all. A row without a resolved
    // acquisition cost is not cheap, it is unknown, so it sorts behind every
    // costed BUYABLE or EARNED row instead of ahead of them.
    const aPerFortune = Number.isFinite(a.coinsPerEffectiveFortune) && a.coinsPerEffectiveFortune > 0
      ? a.coinsPerEffectiveFortune : null;
    const bPerFortune = Number.isFinite(b.coinsPerEffectiveFortune) && b.coinsPerEffectiveFortune > 0
      ? b.coinsPerEffectiveFortune : null;
    if (aPerFortune !== null && bPerFortune !== null && aPerFortune !== bPerFortune) return aPerFortune - bPerFortune;
    if (aPerFortune !== null && bPerFortune === null) return -1;
    if (bPerFortune !== null && aPerFortune === null) return 1;

    if (a.fortuneEquivalent !== b.fortuneEquivalent) return b.fortuneEquivalent - a.fortuneEquivalent;
    return String(a.item?.name || '').localeCompare(String(b.item?.name || ''));
  });
}
