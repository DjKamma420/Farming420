import { ACTIVITY_MODE } from './activity-mode.js';
import { FARMING_CONTEXT, isHarvestFeastContext } from './farming-context.js';
import { MEASURED_FEAST_KEY, measuredBaseline } from './measured-baseline.js';

export const DASHBOARD_ECONOMICS_VERSION = 1;

export const DASHBOARD_REVENUE_STREAM = Object.freeze({
  NORMAL_CROP: 'normal-crop',
  FEAST_RARE_CROP: 'feast-rare-crop',
  PEST_SYSTEM: 'pest-system',
  EVENT_REWARDS: 'event-rewards',
});

export const DASHBOARD_STREAM_STATUS = Object.freeze({
  KNOWN: 'known',
  INCOMPLETE: 'incomplete',
  UNMODELLED: 'unmodelled',
});

function positive(value) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}

function sanitizedMeasurements(measured = {}) {
  // Throughput is the only player measurement accepted here. Coin values are
  // always injected by the market adapter so old backups cannot turn a manual
  // price into a Dashboard result.
  return {
    breaksPerSecond: measured.breaksPerSecond,
    uptimePercent: measured.uptimePercent,
  };
}

function revenueStream(id, label, status, coinsPerHour, note) {
  const normalizedCoins = coinsPerHour === null || coinsPerHour === undefined || coinsPerHour === ''
    ? null
    : Number(coinsPerHour);
  return Object.freeze({
    id,
    label,
    status,
    coinsPerHour: Number.isFinite(normalizedCoins) ? normalizedCoins : null,
    note,
  });
}

function requestedSupplementalStreams(mode, context) {
  const streams = [];
  if (mode === ACTIVITY_MODE.PEST_SPAWN) {
    streams.push(revenueStream(
      DASHBOARD_REVENUE_STREAM.PEST_SYSTEM,
      'Pest system',
      DASHBOARD_STREAM_STATUS.UNMODELLED,
      null,
      'Crop revenue is known separately. Pest spawn frequency, handling time and loot EV are not added until one verified end-to-end spawn model is available.',
    ));
  }
  if (context === FARMING_CONTEXT.GRAND_FEAST) {
    streams.push(revenueStream(
      DASHBOARD_REVENUE_STREAM.EVENT_REWARDS,
      'Grand Feast progression',
      DASHBOARD_STREAM_STATUS.UNMODELLED,
      null,
      'Kernel, Seasoning and progression rewards are not converted into Coins/h without a sourced reward model.',
    ));
  } else if (context === FARMING_CONTEXT.JACOB_CONTEST) {
    streams.push(revenueStream(
      DASHBOARD_REVENUE_STREAM.EVENT_REWARDS,
      "Jacob's Contest rewards",
      DASHBOARD_STREAM_STATUS.UNMODELLED,
      null,
      'Contest score and rewards stay separate until a sourced score-to-reward model is available.',
    ));
  }
  return streams;
}

/**
 * Build the Dashboard economics view from the same source-driven crop engine
 * used by the planner. This module owns no Farming Fortune formulas, setup
 * bonuses or market estimates. Those arrive as explicit inputs from the
 * computed-stat and market-price layers.
 *
 * Unknown streams remain visible and keep `complete` false. `knownCoinsPerHour`
 * is deliberately separate from `netCoinsPerHour` so the UI cannot present a
 * partial crop-only result as a complete Pest/event profit estimate.
 */
export function calculateDashboardEconomics({
  cropId,
  mode = ACTIVITY_MODE.FARM,
  context = FARMING_CONTEXT.NORMAL,
  measured = {},
  stats = {},
  cropUnitValueCoins = null,
  feastMaterialCoins = null,
} = {}) {
  const throughput = sanitizedMeasurements(measured);

  if (mode === ACTIVITY_MODE.PEST_KILL) {
    const streams = [revenueStream(
      DASHBOARD_REVENUE_STREAM.PEST_SYSTEM,
      'Pest loot',
      DASHBOARD_STREAM_STATUS.UNMODELLED,
      null,
      'Pest Killing needs verified Pest throughput, handling time and loot tables. Crop Coins/h is not substituted for Vacuum profit.',
    )];
    return Object.freeze({
      version: DASHBOARD_ECONOMICS_VERSION,
      complete: false,
      cropId,
      mode,
      context,
      stats,
      throughput: Object.freeze({ ...throughput, validBreaksPerHour: null }),
      streams: Object.freeze(streams),
      missing: Object.freeze([]),
      warnings: Object.freeze([]),
      knownCoinsPerHour: null,
      netCoinsPerHour: null,
      engineResult: null,
    });
  }

  const values = sanitizedMeasurements(measured);
  const cropPrice = positive(cropUnitValueCoins);
  if (cropPrice != null) values.coinsPerUnit = cropPrice;

  const feastActive = isHarvestFeastContext(context);
  const feastPrice = positive(feastMaterialCoins);
  if (feastActive && feastPrice != null) {
    values[MEASURED_FEAST_KEY] = true;
    values.feastMaterialCoins = feastPrice;
  }

  const axisComplete = axis => (stats.incomplete?.[axis]?.length || 0) === 0;
  const engineResult = measuredBaseline(values, {
    farmingFortune: axisComplete('globalFortune') ? stats.globalFortune : undefined,
    cropFortune: axisComplete('cropFortune') ? stats.cropFortune : undefined,
    overbloom: axisComplete('overbloom') ? stats.overbloom : undefined,
  }, cropId);

  const streams = [];
  const normalCoins = engineResult.normalCropCoinsPerHour;
  streams.push(revenueStream(
    DASHBOARD_REVENUE_STREAM.NORMAL_CROP,
    'Crop output',
    normalCoins == null ? DASHBOARD_STREAM_STATUS.INCOMPLETE : DASHBOARD_STREAM_STATUS.KNOWN,
    normalCoins,
    normalCoins == null
      ? 'Crop Coins/h needs verified crop drops, measured throughput, current calculated Fortune and a market value.'
      : 'Calculated from the selected crop, current calculated Fortune, measured throughput and the injected market value.',
  ));

  if (feastActive) {
    const feastCoins = engineResult.rareCropCoinsPerHour;
    streams.push(revenueStream(
      DASHBOARD_REVENUE_STREAM.FEAST_RARE_CROP,
      'Feast rare crops',
      feastCoins == null ? DASHBOARD_STREAM_STATUS.INCOMPLETE : DASHBOARD_STREAM_STATUS.KNOWN,
      feastCoins,
      feastCoins == null
        ? 'The Feast stream stays unknown until its sourced event model and market value are both available.'
        : 'Expected value from the sourced Feast rare-crop model, current Overbloom and the injected market value.',
    ));
  }

  streams.push(...requestedSupplementalStreams(mode, context));

  const normalKnown = normalCoins != null;
  const knownCoinsPerHour = normalKnown
    ? streams.reduce((sum, stream) => sum + (stream.coinsPerHour ?? 0), 0)
    : null;
  const complete = normalKnown && streams.every(stream => stream.status === DASHBOARD_STREAM_STATUS.KNOWN);

  return Object.freeze({
    version: DASHBOARD_ECONOMICS_VERSION,
    complete,
    cropId,
    mode,
    context,
    stats,
    throughput: Object.freeze({
      ...throughput,
      validBreaksPerHour: engineResult.validBreaksPerHour,
    }),
    streams: Object.freeze(streams),
    missing: Object.freeze([...engineResult.missing]),
    warnings: Object.freeze([...engineResult.warnings]),
    knownCoinsPerHour,
    netCoinsPerHour: complete ? knownCoinsPerHour : null,
    engineResult,
  });
}
