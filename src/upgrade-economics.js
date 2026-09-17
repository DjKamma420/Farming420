export const INTERNET_FARMING_TIME_VALUE_COINS_PER_HOUR = 20_000_000;

function finiteNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function nonNegative(value) {
  return Math.max(0, finiteNumber(value));
}

/**
 * BUYABLE route cost.
 *
 * The result may be negative when replacing an asset releases more capital than
 * the new state consumes. This is intentional and must not be clamped away.
 */
export function buyableNetCost({
  purchasePriceCoins = 0,
  applicationFeesCoins = 0,
  consumedInputMarketValueCoins = 0,
  switchingCostCoins = 0,
  saleProceedsReplacedAssetsCoins = 0,
} = {}) {
  return nonNegative(purchasePriceCoins)
    + nonNegative(applicationFeesCoins)
    + nonNegative(consumedInputMarketValueCoins)
    + nonNegative(switchingCostCoins)
    - nonNegative(saleProceedsReplacedAssetsCoins);
}

/**
 * EARNED route cost.
 *
 * Active grind time is valued by its opportunity cost. Liquid incidental profit
 * earned during the required grind offsets that opportunity cost, but cannot
 * make the time component negative.
 */
export function earnedNetCost({
  directCoinCost = 0,
  consumedTradeableInputMarketValueCoins = 0,
  activeGrindHours = 0,
  timeValueCoinsPerHour = INTERNET_FARMING_TIME_VALUE_COINS_PER_HOUR,
  incidentalGrindProfitCoinsPerHour = 0,
} = {}) {
  const grindHours = nonNegative(activeGrindHours);
  const opportunityRate = Math.max(
    0,
    nonNegative(timeValueCoinsPerHour) - nonNegative(incidentalGrindProfitCoinsPerHour),
  );

  return nonNegative(directCoinCost)
    + nonNegative(consumedTradeableInputMarketValueCoins)
    + grindHours * opportunityRate;
}

/**
 * Universal recurring economic gain after the mechanics engine has simulated
 * the complete legal before/after states.
 */
export function recurringGainCoinsPerHour({
  beforeNetCoinsPerHour = 0,
  afterNetCoinsPerHour = 0,
} = {}) {
  return finiteNumber(afterNetCoinsPerHour) - finiteNumber(beforeNetCoinsPerHour);
}

export function paybackHoursFromCost({
  acquisitionCostCoins = 0,
  recurringGainCoinsPerHour: recurringGain = 0,
} = {}) {
  const gain = finiteNumber(recurringGain);
  const cost = finiteNumber(acquisitionCostCoins);

  if (gain <= 0) return null;
  if (cost <= 0) return 0;
  return cost / gain;
}

export function gainPerMillionCost({
  acquisitionCostCoins = 0,
  recurringGainCoinsPerHour: recurringGain = 0,
} = {}) {
  const gain = finiteNumber(recurringGain);
  const cost = finiteNumber(acquisitionCostCoins);
  if (gain <= 0 || cost <= 0) return null;
  return gain / (cost / 1_000_000);
}

function baseEvaluation({
  acquisitionMode,
  acquisitionCostCoins,
  beforeNetCoinsPerHour,
  afterNetCoinsPerHour,
}) {
  const gain = recurringGainCoinsPerHour({
    beforeNetCoinsPerHour,
    afterNetCoinsPerHour,
  });

  return {
    acquisitionMode,
    acquisitionCostCoins,
    beforeNetCoinsPerHour: finiteNumber(beforeNetCoinsPerHour),
    afterNetCoinsPerHour: finiteNumber(afterNetCoinsPerHour),
    recurringGainCoinsPerHour: gain,
    paybackHours: paybackHoursFromCost({ acquisitionCostCoins, recurringGainCoinsPerHour: gain }),
    gainPerMillionCost: gainPerMillionCost({ acquisitionCostCoins, recurringGainCoinsPerHour: gain }),
  };
}

export function evaluateBuyableUpgrade({
  beforeNetCoinsPerHour = 0,
  afterNetCoinsPerHour = 0,
  purchasePriceCoins = 0,
  applicationFeesCoins = 0,
  consumedInputMarketValueCoins = 0,
  switchingCostCoins = 0,
  saleProceedsReplacedAssetsCoins = 0,
} = {}) {
  const acquisitionCostCoins = buyableNetCost({
    purchasePriceCoins,
    applicationFeesCoins,
    consumedInputMarketValueCoins,
    switchingCostCoins,
    saleProceedsReplacedAssetsCoins,
  });

  return {
    ...baseEvaluation({
      acquisitionMode: 'BUYABLE',
      acquisitionCostCoins,
      beforeNetCoinsPerHour,
      afterNetCoinsPerHour,
    }),
    costLabel: 'BUYABLE — market/direct coin cost',
  };
}

export function evaluateEarnedUpgrade({
  beforeNetCoinsPerHour = 0,
  afterNetCoinsPerHour = 0,
  directCoinCost = 0,
  consumedTradeableInputMarketValueCoins = 0,
  activeGrindHours = 0,
  passiveWaitHours = 0,
  marketWaitHours = 0,
  timeValueCoinsPerHour = INTERNET_FARMING_TIME_VALUE_COINS_PER_HOUR,
  timeValueSource = 'internet_benchmark',
  incidentalGrindProfitCoinsPerHour = 0,
} = {}) {
  const acquisitionCostCoins = earnedNetCost({
    directCoinCost,
    consumedTradeableInputMarketValueCoins,
    activeGrindHours,
    timeValueCoinsPerHour,
    incidentalGrindProfitCoinsPerHour,
  });

  return {
    ...baseEvaluation({
      acquisitionMode: 'EARNED',
      acquisitionCostCoins,
      beforeNetCoinsPerHour,
      afterNetCoinsPerHour,
    }),
    costLabel: 'EARNED — time converted to coins',
    activeGrindHours: nonNegative(activeGrindHours),
    passiveWaitHours: nonNegative(passiveWaitHours),
    marketWaitHours: nonNegative(marketWaitHours),
    timeValueCoinsPerHour: nonNegative(timeValueCoinsPerHour),
    timeValueSource,
    incidentalGrindProfitCoinsPerHour: nonNegative(incidentalGrindProfitCoinsPerHour),
  };
}
