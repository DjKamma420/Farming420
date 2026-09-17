export const PROFIT_ENGINE_VERSION = 1;

export const DROP_SCALING = Object.freeze({
  NONE: 'none',
  FARMING_FORTUNE: 'farming-fortune',
  CROP_FORTUNE: 'crop-fortune',
  COMBINED_FORTUNE: 'combined-fortune',
  PEST_FORTUNE: 'pest-fortune',
  OVERBLOOM: 'overbloom',
  PEST_OVERBLOOM: 'pest-overbloom',
});

function finite(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function nonNegative(value) {
  const number = finite(value);
  return number == null ? null : Math.max(0, number);
}

function boundedRatio(value) {
  const number = finite(value);
  return number == null ? null : Math.max(0, Math.min(1, number));
}

function pathLabel(prefix, index, id) {
  return `${prefix}[${id || index}]`;
}

function addMissing(missing, path, reason) {
  missing.push({ path, reason });
}

function requiredNonNegative(value, path, missing) {
  const number = nonNegative(value);
  if (number == null) addMissing(missing, path, 'required non-negative number is missing');
  return number;
}

function fortuneMultiplier(scaling, stats, path, missing) {
  switch (scaling) {
    case DROP_SCALING.NONE:
      return 1;
    case DROP_SCALING.FARMING_FORTUNE:
      return 1 + stats.farmingFortune / 100;
    case DROP_SCALING.CROP_FORTUNE:
      return 1 + stats.cropFortune / 100;
    case DROP_SCALING.COMBINED_FORTUNE:
      return 1 + (stats.farmingFortune + stats.cropFortune) / 100;
    case DROP_SCALING.PEST_FORTUNE:
      return 1 + stats.pestFortune / 100;
    default:
      addMissing(missing, `${path}.scaling`, 'drop scaling must be explicit');
      return null;
  }
}

function probabilityMultiplier(scaling, stats, path, missing) {
  switch (scaling) {
    case DROP_SCALING.NONE:
      return 1;
    case DROP_SCALING.OVERBLOOM:
      return 1 + stats.overbloom / 100;
    case DROP_SCALING.PEST_OVERBLOOM:
      return 1 + (stats.overbloom + stats.pestOverbloom) / 100;
    default:
      addMissing(missing, `${path}.scaling`, 'probability scaling must be none, overbloom, or pest-overbloom');
      return null;
  }
}

function probabilityFor(drop, stats, path, missing, warnings) {
  const baseProbability = requiredNonNegative(drop?.baseProbability, `${path}.baseProbability`, missing);
  const multiplier = probabilityMultiplier(drop?.scaling, stats, path, missing);
  if (baseProbability == null || multiplier == null) return null;
  if (baseProbability > 1) {
    addMissing(missing, `${path}.baseProbability`, 'probability must be expressed as a decimal in [0, 1]');
    return null;
  }

  const rawProbability = baseProbability * multiplier;
  if (rawProbability <= 1) return rawProbability;

  const cap = finite(drop?.probabilityCap);
  if (cap == null) {
    addMissing(missing, `${path}.probabilityCap`, 'scaled probability exceeds 1; exact cap/overflow behavior is required');
    return null;
  }
  if (cap < 0 || cap > 1) {
    addMissing(missing, `${path}.probabilityCap`, 'probability cap must be in [0, 1]');
    return null;
  }
  warnings.push({ path, reason: 'scaled probability reached the supplied cap' });
  return Math.min(rawProbability, cap);
}

function normalizeStats(input = {}) {
  return {
    farmingFortune: nonNegative(input.farmingFortune) ?? 0,
    cropFortune: nonNegative(input.cropFortune) ?? 0,
    pestFortune: nonNegative(input.pestFortune) ?? 0,
    overbloom: nonNegative(input.overbloom) ?? 0,
    pestOverbloom: nonNegative(input.pestOverbloom) ?? 0,
  };
}

function expectedPestsPerBreak(pest, missing) {
  if (!pest) return 0;
  const direct = nonNegative(pest.expectedPestsPerBreak);
  if (direct != null) return direct;

  const probability = finite(pest.spawnProbability);
  const opportunities = nonNegative(pest.spawnOpportunitiesPerBreak);
  const pestsPerSpawn = nonNegative(pest.pestsPerSpawnExpected);
  const anyDerivedField = probability != null || opportunities != null || pestsPerSpawn != null;
  if (!anyDerivedField) return null;

  if (probability == null || probability < 0 || probability > 1) {
    addMissing(missing, 'pest.spawnProbability', 'spawn probability must be a decimal in [0, 1]');
  }
  if (opportunities == null) addMissing(missing, 'pest.spawnOpportunitiesPerBreak', 'spawn opportunities per break are required');
  if (pestsPerSpawn == null) addMissing(missing, 'pest.pestsPerSpawnExpected', 'expected pests per successful spawn are required');
  if (probability == null || probability < 0 || probability > 1 || opportunities == null || pestsPerSpawn == null) return null;
  return probability * opportunities * pestsPerSpawn;
}

function throughputModel(input = {}, pest = null, missing = []) {
  const breaksPerSecond = requiredNonNegative(input.breaksPerSecond, 'throughput.breaksPerSecond', missing);
  const uptime = boundedRatio(input.baseFarmingUptimeRatio);
  if (uptime == null) addMissing(missing, 'throughput.baseFarmingUptimeRatio', 'baseline farming uptime ratio is required');
  if (breaksPerSecond == null || uptime == null) return null;

  const baselineFarmingSecondsPerHour = 3600 * uptime;
  if (!pest) {
    return {
      breaksPerSecond,
      baselineFarmingSecondsPerHour,
      pestHandlingSecondsPerHour: 0,
      effectiveFarmingSecondsPerHour: baselineFarmingSecondsPerHour,
      validBreaksPerHour: breaksPerSecond * baselineFarmingSecondsPerHour,
      pestsPerHour: 0,
    };
  }

  const handlingSecondsPerPest = requiredNonNegative(
    pest.handlingSecondsPerPest,
    'pest.handlingSecondsPerPest',
    missing,
  );
  if (handlingSecondsPerPest == null) return null;

  const fixedPestsPerHour = nonNegative(pest.fixedPestsPerHour);
  if (fixedPestsPerHour != null) {
    const handling = fixedPestsPerHour * handlingSecondsPerPest;
    const effectiveSeconds = Math.max(0, baselineFarmingSecondsPerHour - handling);
    return {
      breaksPerSecond,
      baselineFarmingSecondsPerHour,
      pestHandlingSecondsPerHour: Math.min(baselineFarmingSecondsPerHour, handling),
      effectiveFarmingSecondsPerHour: effectiveSeconds,
      validBreaksPerHour: breaksPerSecond * effectiveSeconds,
      pestsPerHour: fixedPestsPerHour,
    };
  }

  const pestsPerBreak = expectedPestsPerBreak(pest, missing);
  if (pestsPerBreak == null) {
    addMissing(missing, 'pest.spawnModel', 'provide fixedPestsPerHour or an exact per-break spawn model');
    return null;
  }

  // Pests are spawned by farming and handling pests removes farming time. Solve
  // the feedback loop directly instead of adding pest loot as free extra value:
  // seconds = baseline / (1 + breaks/s * pests/break * handling seconds/pest).
  const divisor = 1 + breaksPerSecond * pestsPerBreak * handlingSecondsPerPest;
  const effectiveSeconds = divisor > 0 ? baselineFarmingSecondsPerHour / divisor : 0;
  const validBreaksPerHour = breaksPerSecond * effectiveSeconds;
  const pestsPerHour = validBreaksPerHour * pestsPerBreak;
  const handling = pestsPerHour * handlingSecondsPerPest;

  return {
    breaksPerSecond,
    baselineFarmingSecondsPerHour,
    pestHandlingSecondsPerHour: handling,
    effectiveFarmingSecondsPerHour: effectiveSeconds,
    validBreaksPerHour,
    pestsPerHour,
    expectedPestsPerBreak: pestsPerBreak,
  };
}

function normalDropStreams(drops, validBreaksPerHour, stats, missing) {
  const rows = [];
  for (const [index, drop] of (Array.isArray(drops) ? drops : []).entries()) {
    const path = pathLabel('normalDrops', index, drop?.id);
    const baseUnits = requiredNonNegative(drop?.baseUnitsPerBreak, `${path}.baseUnitsPerBreak`, missing);
    const unitValue = requiredNonNegative(drop?.unitValueCoins, `${path}.unitValueCoins`, missing);
    const multiplier = fortuneMultiplier(drop?.scaling, stats, path, missing);
    if (baseUnits == null || unitValue == null || multiplier == null) continue;
    const expectedUnitsPerHour = validBreaksPerHour * baseUnits * multiplier;
    rows.push({
      id: drop?.id || `normal-${index}`,
      kind: 'normal-drop',
      scaling: drop.scaling,
      expectedUnitsPerHour,
      coinsPerHour: expectedUnitsPerHour * unitValue,
    });
  }
  return rows;
}

function rareDropStreams(drops, validBreaksPerHour, stats, missing, warnings) {
  const rows = [];
  for (const [index, drop] of (Array.isArray(drops) ? drops : []).entries()) {
    const path = pathLabel('rareDrops', index, drop?.id);
    const rollsPerBreak = requiredNonNegative(drop?.rollsPerBreak, `${path}.rollsPerBreak`, missing);
    const quantity = requiredNonNegative(drop?.expectedQuantity, `${path}.expectedQuantity`, missing);
    const unitValue = requiredNonNegative(drop?.unitValueCoins, `${path}.unitValueCoins`, missing);
    const probability = probabilityFor(drop, stats, path, missing, warnings);
    if (rollsPerBreak == null || quantity == null || unitValue == null || probability == null) continue;
    const eligibleRollsPerHour = validBreaksPerHour * rollsPerBreak;
    const expectedUnitsPerHour = eligibleRollsPerHour * probability * quantity;
    rows.push({
      id: drop?.id || `rare-${index}`,
      kind: 'rare-drop',
      scaling: drop.scaling,
      effectiveProbability: probability,
      eligibleRollsPerHour,
      expectedUnitsPerHour,
      coinsPerHour: expectedUnitsPerHour * unitValue,
    });
  }
  return rows;
}

function pestDropStreams(drops, pestsPerHour, stats, missing, warnings) {
  const rows = [];
  for (const [index, drop] of (Array.isArray(drops) ? drops : []).entries()) {
    const path = pathLabel('pest.drops', index, drop?.id);
    const rollsPerPest = requiredNonNegative(drop?.rollsPerPest, `${path}.rollsPerPest`, missing);
    const quantity = requiredNonNegative(drop?.expectedQuantity, `${path}.expectedQuantity`, missing);
    const unitValue = requiredNonNegative(drop?.unitValueCoins, `${path}.unitValueCoins`, missing);
    let probability = null;

    if ([DROP_SCALING.OVERBLOOM, DROP_SCALING.PEST_OVERBLOOM, DROP_SCALING.NONE].includes(drop?.scaling)) {
      probability = probabilityFor(drop, stats, path, missing, warnings);
    } else {
      const baseProbability = requiredNonNegative(drop?.baseProbability, `${path}.baseProbability`, missing);
      const multiplier = fortuneMultiplier(drop?.scaling, stats, path, missing);
      if (baseProbability != null && baseProbability <= 1 && multiplier != null) {
        probability = baseProbability * multiplier;
      } else if (baseProbability != null && baseProbability > 1) {
        addMissing(missing, `${path}.baseProbability`, 'probability must be expressed as a decimal in [0, 1]');
      }
    }

    if (rollsPerPest == null || quantity == null || unitValue == null || probability == null) continue;
    const eligibleRollsPerHour = pestsPerHour * rollsPerPest;
    const expectedUnitsPerHour = eligibleRollsPerHour * probability * quantity;
    rows.push({
      id: drop?.id || `pest-${index}`,
      kind: 'pest-drop',
      scaling: drop.scaling,
      effectiveProbability: probability,
      eligibleRollsPerHour,
      expectedUnitsPerHour,
      coinsPerHour: expectedUnitsPerHour * unitValue,
    });
  }
  return rows;
}

function costRows(input, missing) {
  const rows = [];
  if (input == null) return rows;
  if (typeof input === 'number') {
    const coinsPerHour = requiredNonNegative(input, 'costs', missing);
    if (coinsPerHour != null) rows.push({ id: 'costs', coinsPerHour });
    return rows;
  }
  for (const [index, cost] of (Array.isArray(input) ? input : []).entries()) {
    const path = pathLabel('costs', index, cost?.id);
    const coinsPerHour = requiredNonNegative(cost?.coinsPerHour, `${path}.coinsPerHour`, missing);
    if (coinsPerHour != null) rows.push({ id: cost?.id || `cost-${index}`, coinsPerHour });
  }
  return rows;
}

/**
 * Calculate farming profit only from explicit mechanics inputs.
 *
 * Unknown values never become zero silently. When any requested stream lacks a
 * required value, `complete` is false and `netCoinsPerHour` is null. The known
 * partial total remains available as `knownNetCoinsPerHour` for diagnostics.
 */
export function calculateFarmingProfit(input = {}) {
  const missing = [];
  const warnings = [];
  const stats = normalizeStats(input.stats);
  const throughput = throughputModel(input.throughput, input.pest || null, missing);
  if (!throughput) {
    return {
      version: PROFIT_ENGINE_VERSION,
      complete: false,
      missing,
      warnings,
      stats,
      throughput: null,
      streams: [],
      costs: [],
      grossCoinsPerHour: null,
      knownNetCoinsPerHour: null,
      netCoinsPerHour: null,
    };
  }

  const streams = [
    ...normalDropStreams(input.normalDrops, throughput.validBreaksPerHour, stats, missing),
    ...rareDropStreams(input.rareDrops, throughput.validBreaksPerHour, stats, missing, warnings),
    ...pestDropStreams(input.pest?.drops, throughput.pestsPerHour, stats, missing, warnings),
  ];
  const costs = costRows(input.costsPerHour, missing);
  const grossCoinsPerHour = streams.reduce((sum, row) => sum + row.coinsPerHour, 0);
  const totalCostsPerHour = costs.reduce((sum, row) => sum + row.coinsPerHour, 0);
  const knownNetCoinsPerHour = grossCoinsPerHour - totalCostsPerHour;
  const complete = missing.length === 0;

  return {
    version: PROFIT_ENGINE_VERSION,
    complete,
    missing,
    warnings,
    stats,
    throughput,
    streams,
    costs,
    grossCoinsPerHour,
    totalCostsPerHour,
    knownNetCoinsPerHour,
    netCoinsPerHour: complete ? knownNetCoinsPerHour : null,
  };
}

function transitionCost(input = {}) {
  return {
    purchaseCostCoins: nonNegative(input.purchaseCostCoins) ?? 0,
    applicationCostCoins: nonNegative(input.applicationCostCoins) ?? 0,
    nonRecoverableCostCoins: nonNegative(input.nonRecoverableCostCoins) ?? 0,
    expectedResaleRecoveredCoins: nonNegative(input.expectedResaleRecoveredCoins) ?? 0,
    activeGrindHours: nonNegative(input.activeGrindHours) ?? 0,
    passiveWaitHours: nonNegative(input.passiveWaitHours) ?? 0,
  };
}

/** Compare complete before/after states instead of scoring an isolated effect. */
export function evaluateProfitTransition({ before, after, cost } = {}) {
  const normalizedCost = transitionCost(cost);
  const cashRequiredCoins = normalizedCost.purchaseCostCoins
    + normalizedCost.applicationCostCoins
    + normalizedCost.nonRecoverableCostCoins;
  const netAcquisitionCostCoins = cashRequiredCoins - normalizedCost.expectedResaleRecoveredCoins;
  const beforeProfit = finite(before?.netCoinsPerHour);
  const afterProfit = finite(after?.netCoinsPerHour);
  const profitDeltaPerHour = beforeProfit == null || afterProfit == null
    ? null
    : afterProfit - beforeProfit;
  const paybackHours = profitDeltaPerHour != null && profitDeltaPerHour > 0
    ? Math.max(0, netAcquisitionCostCoins) / profitDeltaPerHour
    : null;

  return {
    complete: Boolean(before?.complete && after?.complete && profitDeltaPerHour != null),
    beforeNetCoinsPerHour: beforeProfit,
    afterNetCoinsPerHour: afterProfit,
    profitDeltaPerHour,
    cashRequiredCoins,
    netAcquisitionCostCoins,
    paybackHours,
    activeGrindHours: normalizedCost.activeGrindHours,
    passiveWaitHours: normalizedCost.passiveWaitHours,
  };
}
