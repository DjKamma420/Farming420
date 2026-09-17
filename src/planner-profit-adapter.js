import { calculateFarmingProfit, DROP_SCALING, evaluateProfitTransition } from './profit-engine.js';
import { cropModel, cropNormalDropInput, harvestFeastRareCropInputs } from './farming-mechanics-data.js';
import { statDeltas } from './revenue-ranking.js';

export const PLANNER_PROFIT_ADAPTER_VERSION = 1;
export const PLANNER_PROFIT_MODE = Object.freeze({
  SOURCE_DRIVEN: 'source-driven',
  OBSERVED_CALIBRATED: 'observed-calibrated',
});

// Deliberately tiny synthetic chance used only to calibrate an observed RARE
// CROP Coins/h stream. Keeping it tiny avoids invented probability caps when an
// Overbloom upgrade is compared. It is not a claim about any in-game drop rate.
const OBSERVED_RARE_CALIBRATION_PROBABILITY = 1e-6;

function finiteOrNull(value) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function nonNegativeOrNull(value) {
  const number = finiteOrNull(value);
  return number == null || number < 0 ? null : number;
}

function explicitCost(costCoins) {
  const value = nonNegativeOrNull(costCoins);
  return Object.freeze({ known: value != null, coins: value });
}

function transitionWithKnownCost(before, after, costCoins) {
  const cost = explicitCost(costCoins);
  const raw = evaluateProfitTransition({
    before,
    after,
    cost: { purchaseCostCoins: cost.coins ?? 0 },
  });
  return Object.freeze({
    ...raw,
    costKnown: cost.known,
    cashRequiredCoins: cost.known ? raw.cashRequiredCoins : null,
    netAcquisitionCostCoins: cost.known ? raw.netAcquisitionCostCoins : null,
    paybackHours: cost.known ? raw.paybackHours : null,
  });
}

function applyStatDeltas(stats, deltas) {
  const next = { ...(stats || {}) };
  if (deltas.deltaFortune > 0) {
    const current = nonNegativeOrNull(next.farmingFortune);
    next.farmingFortune = current == null ? null : current + deltas.deltaFortune;
  }
  if (deltas.deltaOverbloom > 0) {
    const current = nonNegativeOrNull(next.overbloom);
    next.overbloom = current == null ? null : current + deltas.deltaOverbloom;
  }
  return next;
}

/** Build an exact-mechanics crop model from verified runtime data. */
export function sourceDrivenCropInput({
  cropId,
  stats,
  breaksPerSecond,
  baseFarmingUptimeRatio,
  cropUnitValueCoins,
  harvestFeastActive = false,
  harvestFeastCropMaterialValueCoins = null,
  costsPerHour = [],
} = {}) {
  const model = cropModel(cropId);
  const normal = model ? cropNormalDropInput(cropId, finiteOrNull(cropUnitValueCoins)) : null;
  const rareDrops = harvestFeastActive
    ? harvestFeastRareCropInputs(cropId, {
        includeSeasoning: false,
        cropMaterialValueCoins: finiteOrNull(harvestFeastCropMaterialValueCoins),
      })
    : [];

  return Object.freeze({
    mode: PLANNER_PROFIT_MODE.SOURCE_DRIVEN,
    cropId: cropId || null,
    cropDataStatus: model?.baseDrop?.status || 'UNKNOWN',
    cropDataReason: model?.baseDrop?.reason || null,
    engineInput: Object.freeze({
      stats: { ...(stats || {}) },
      throughput: { breaksPerSecond, baseFarmingUptimeRatio },
      normalDrops: normal ? [normal] : [],
      rareDrops,
      costsPerHour,
    }),
  });
}

export function calculateSourceDrivenCropProfit(input = {}) {
  const built = sourceDrivenCropInput(input);
  const result = calculateFarmingProfit(built.engineInput);
  return Object.freeze({
    mode: built.mode,
    cropId: built.cropId,
    cropDataStatus: built.cropDataStatus,
    cropDataReason: built.cropDataReason,
    ...result,
  });
}

export function evaluateSourceDrivenUpgrade({ baseline, item, gain, costCoins } = {}) {
  const built = sourceDrivenCropInput(baseline || {});
  const deltas = statDeltas(item, gain);
  if (!deltas.modeled) {
    return Object.freeze({
      mode: PLANNER_PROFIT_MODE.SOURCE_DRIVEN,
      modeled: null,
      gain: nonNegativeOrNull(gain),
      before: calculateFarmingProfit(built.engineInput),
      after: null,
      transition: null,
    });
  }

  const before = calculateFarmingProfit(built.engineInput);
  const afterInput = {
    ...built.engineInput,
    stats: applyStatDeltas(built.engineInput.stats, deltas),
  };
  const after = calculateFarmingProfit(afterInput);
  return Object.freeze({
    mode: PLANNER_PROFIT_MODE.SOURCE_DRIVEN,
    modeled: deltas.modeled,
    gain: nonNegativeOrNull(gain),
    deltas: Object.freeze(deltas),
    before,
    after,
    transition: transitionWithKnownCost(before, after, costCoins),
    cropDataStatus: built.cropDataStatus,
    cropDataReason: built.cropDataReason,
  });
}

function observedBaselineEngineInput({ normalCropCoinsPerHour, rareCropCoinsPerHour, currentFortune, currentOverbloom } = {}) {
  const normal = nonNegativeOrNull(normalCropCoinsPerHour);
  const rare = nonNegativeOrNull(rareCropCoinsPerHour);
  const fortune = nonNegativeOrNull(currentFortune);
  const overbloom = nonNegativeOrNull(currentOverbloom);
  const missing = [];

  if (normal != null && fortune == null) missing.push('currentFortune');
  if (rare != null && overbloom == null) missing.push('currentOverbloom');

  const normalDrops = [];
  if (normal != null) {
    normalDrops.push({
      id: 'observed-normal-crop',
      baseUnitsPerBreak: 1,
      unitValueCoins: fortune == null ? null : normal / (1 + fortune / 100),
      scaling: DROP_SCALING.FARMING_FORTUNE,
      calibrationOnly: true,
    });
  }

  const rareDrops = [];
  if (rare != null) {
    const overbloomMultiplier = overbloom == null ? null : 1 + overbloom / 100;
    rareDrops.push({
      id: 'observed-rare-crop',
      baseProbability: OBSERVED_RARE_CALIBRATION_PROBABILITY,
      rollsPerBreak: 1,
      expectedQuantity: 1,
      unitValueCoins: overbloomMultiplier == null
        ? null
        : rare / (OBSERVED_RARE_CALIBRATION_PROBABILITY * overbloomMultiplier),
      scaling: DROP_SCALING.OVERBLOOM,
      calibrationOnly: true,
    });
  }

  return Object.freeze({
    ready: normal != null || rare != null,
    missing: Object.freeze(missing),
    engineInput: Object.freeze({
      stats: {
        // In calibrated mode currentFortune is intentionally treated as one
        // combined Fortune axis; the observed stream already encodes the user's
        // real setup and is not claiming a source split between global/crop FF.
        farmingFortune: fortune,
        cropFortune: 0,
        overbloom,
      },
      // Exactly one synthetic eligible roll per hour. This keeps the observed
      // Coins/h baseline numerically stable while profit-engine performs the
      // before/after scaling.
      throughput: { breaksPerSecond: 1 / 3600, baseFarmingUptimeRatio: 1 },
      normalDrops,
      rareDrops,
    }),
  });
}

export function calculateObservedBaselineProfit(input = {}) {
  const built = observedBaselineEngineInput(input);
  const result = calculateFarmingProfit(built.engineInput);
  const missing = [
    ...built.missing.map(path => ({ path, reason: 'required to calibrate the observed Coins/h baseline' })),
    ...result.missing,
  ];
  return Object.freeze({
    mode: PLANNER_PROFIT_MODE.OBSERVED_CALIBRATED,
    ready: built.ready,
    calibrationOnly: true,
    ...result,
    complete: built.ready && missing.length === 0 && result.complete,
    missing: Object.freeze(missing),
    netCoinsPerHour: built.ready && missing.length === 0 ? result.netCoinsPerHour : null,
  });
}

export function evaluateObservedBaselineUpgrade({ baseline, item, gain, costCoins } = {}) {
  const built = observedBaselineEngineInput(baseline || {});
  const deltas = statDeltas(item, gain);
  const beforeRaw = calculateFarmingProfit(built.engineInput);
  const beforeMissing = [
    ...built.missing.map(path => ({ path, reason: 'required to calibrate the observed Coins/h baseline' })),
    ...beforeRaw.missing,
  ];
  const before = {
    ...beforeRaw,
    complete: built.ready && beforeMissing.length === 0 && beforeRaw.complete,
    netCoinsPerHour: built.ready && beforeMissing.length === 0 ? beforeRaw.netCoinsPerHour : null,
    missing: beforeMissing,
  };

  if (!deltas.modeled) {
    return Object.freeze({
      mode: PLANNER_PROFIT_MODE.OBSERVED_CALIBRATED,
      ready: built.ready,
      calibrationOnly: true,
      modeled: null,
      gain: nonNegativeOrNull(gain),
      before: Object.freeze(before),
      after: null,
      transition: null,
    });
  }

  const afterInput = {
    ...built.engineInput,
    stats: applyStatDeltas(built.engineInput.stats, deltas),
  };
  const afterRaw = calculateFarmingProfit(afterInput);
  const after = {
    ...afterRaw,
    complete: built.ready && built.missing.length === 0 && afterRaw.complete,
    netCoinsPerHour: built.ready && built.missing.length === 0 ? afterRaw.netCoinsPerHour : null,
  };
  const transition = transitionWithKnownCost(before, after, costCoins);

  return Object.freeze({
    mode: PLANNER_PROFIT_MODE.OBSERVED_CALIBRATED,
    ready: built.ready,
    calibrationOnly: true,
    modeled: deltas.modeled,
    gain: nonNegativeOrNull(gain),
    deltas: Object.freeze(deltas),
    before: Object.freeze(before),
    after: Object.freeze(after),
    transition,
  });
}
