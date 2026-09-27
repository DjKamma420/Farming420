export const INTERNET_FARMING_TIME_VALUE_COINS_PER_HOUR = 20_000_000;

function finiteOrNull(value) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function nonNegativeOrNull(value) {
  const number = finiteOrNull(value);
  return number === null ? null : Math.max(0, number);
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
  const values = [
    nonNegativeOrNull(purchasePriceCoins),
    nonNegativeOrNull(applicationFeesCoins),
    nonNegativeOrNull(consumedInputMarketValueCoins),
    nonNegativeOrNull(switchingCostCoins),
    nonNegativeOrNull(saleProceedsReplacedAssetsCoins),
  ];
  if (values.some(value => value === null)) return null;
  return values[0] + values[1] + values[2] + values[3] - values[4];
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
  const directCost = nonNegativeOrNull(directCoinCost);
  const consumedValue = nonNegativeOrNull(consumedTradeableInputMarketValueCoins);
  const grindHours = nonNegativeOrNull(activeGrindHours);
  const timeValue = nonNegativeOrNull(timeValueCoinsPerHour);
  const incidentalProfit = nonNegativeOrNull(incidentalGrindProfitCoinsPerHour);
  if ([directCost, consumedValue, grindHours, timeValue, incidentalProfit].some(value => value === null)) {
    return null;
  }

  const opportunityRate = Math.max(0, timeValue - incidentalProfit);
  return directCost + consumedValue + grindHours * opportunityRate;
}

/**
 * Universal recurring economic gain after the mechanics engine has simulated
 * the complete legal before/after states.
 */
export function recurringGainCoinsPerHour({
  beforeNetCoinsPerHour = 0,
  afterNetCoinsPerHour = 0,
} = {}) {
  const before = finiteOrNull(beforeNetCoinsPerHour);
  const after = finiteOrNull(afterNetCoinsPerHour);
  if (before === null || after === null) return null;
  return after - before;
}

export function paybackHoursFromCost({
  acquisitionCostCoins = 0,
  recurringGainCoinsPerHour: recurringGain = 0,
} = {}) {
  const gain = finiteOrNull(recurringGain);
  const cost = finiteOrNull(acquisitionCostCoins);

  if (gain === null || cost === null || gain <= 0) return null;
  if (cost <= 0) return 0;
  return cost / gain;
}

export function gainPerMillionCost({
  acquisitionCostCoins = 0,
  recurringGainCoinsPerHour: recurringGain = 0,
} = {}) {
  const gain = finiteOrNull(recurringGain);
  const cost = finiteOrNull(acquisitionCostCoins);
  if (gain === null || cost === null || gain <= 0 || cost <= 0) return null;
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
    beforeNetCoinsPerHour: finiteOrNull(beforeNetCoinsPerHour),
    afterNetCoinsPerHour: finiteOrNull(afterNetCoinsPerHour),
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
    activeGrindHours: nonNegativeOrNull(activeGrindHours),
    passiveWaitHours: nonNegativeOrNull(passiveWaitHours),
    marketWaitHours: nonNegativeOrNull(marketWaitHours),
    timeValueCoinsPerHour: nonNegativeOrNull(timeValueCoinsPerHour),
    timeValueSource,
    incidentalGrindProfitCoinsPerHour: nonNegativeOrNull(incidentalGrindProfitCoinsPerHour),
  };
}
