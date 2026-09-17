import {
  coinsPerEffectiveFortune,
  marginalCoinsPerHour,
  overbloomToFortuneEquivalent,
  paybackHours,
} from './effective-gain.js';

function finiteNonNegative(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, number) : 0;
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
  currentFortune = 0,
  currentOverbloom = 0,
  normalCropCoinsPerHour = 0,
  rareCropCoinsPerHour = 0,
} = {}) {
  const deltas = statDeltas(item, gain);
  const normal = finiteNonNegative(normalCropCoinsPerHour);
  const rare = finiteNonNegative(rareCropCoinsPerHour);
  const economicsReady = normal > 0 || rare > 0;
  const cost = finiteNonNegative(costCoins);

  const marginalCoinsHour = deltas.modeled && economicsReady
    ? marginalCoinsPerHour({
        ...deltas,
        currentFortune,
        currentOverbloom,
        normalCropCoinsPerHour: normal,
        rareCropCoinsPerHour: rare,
      })
    : null;

  const overbloomEquivalent = deltas.deltaOverbloom > 0
    ? overbloomToFortuneEquivalent({
        deltaOverbloom: deltas.deltaOverbloom,
        currentFortune,
        currentOverbloom,
        normalCropCoinsPerHour: normal,
        rareCropCoinsPerHour: rare,
      })
    : 0;

  const fortuneEquivalent = deltas.deltaFortune + (overbloomEquivalent ?? 0);
  return {
    ...deltas,
    gain: finiteNonNegative(gain),
    cost,
    economicsReady,
    marginalCoinsHour,
    fortuneEquivalent,
    payback: cost > 0 && marginalCoinsHour !== null
      ? paybackHours({ costCoins: cost, marginalCoinsHour })
      : null,
    coinsPerEffectiveFortune: cost > 0
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
    // and that question needs no Coins/h at all. A row without a researched
    // cost is not cheap, it is unknown, so it sorts behind every priced row
    // instead of ahead of them.
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
