/**
 * The bridge between what a player can measure and what the planner needs.
 *
 * `src/profit-engine.js` has been in this repo complete, tested and reached by
 * no runtime path. It was left unwired because a full farm model needs
 * constants the research marks unverified, and
 * research/knowledge-base/40-calculator-model-strategy-gap-audit.md section 9
 * says what to do about that: "the new calculator core should accept
 * measured/manual inputs and expose incompleteness rather than synthesize
 * values."
 *
 * This asks for the three things a player can read off their own farm in ten
 * seconds -- breaks per second, how much of the hour they really farm, and the
 * sell price -- and gets everything else from data the repo already has. It
 * does not build its own engine input: `planner-profit-adapter.js` already
 * does that, and it does it better, taking the crop's own base drop count from
 * `farming-mechanics-data.js` together with the status of that figure. The
 * first draft of this module hand-rolled the same input and asked the player
 * for the drop count as a fourth field, which was both a second copy of
 * existing work and a worse panel.
 *
 * Rare crops stay unknown outside a Harvest Feast. No verified base
 * probability for them exists in the research, and inventing one would put a
 * fabricated number straight into the ranking that decides what to buy next.
 */
import { cropModel } from './farming-mechanics-data.js';
import { PLANNER_PROFIT_MODE, calculateSourceDrivenCropProfit } from './planner-profit-adapter.js';

/**
 * The inputs, in the order they belong on screen.
 *
 * `optional` marks the Harvest Feast pair. A Feast is either running or it is
 * not, and its rare-crop model comes from `farming-mechanics-data.js` rather
 * than from the player.
 */
export const MEASURED_FIELDS = Object.freeze([
  Object.freeze({
    key: 'breaksPerSecond',
    label: 'Crop breaks per second',
    hint: 'Count your breaks over ten seconds and divide by ten.',
    step: 0.1,
  }),
  Object.freeze({
    key: 'uptimePercent',
    label: 'Farming uptime',
    hint: 'Percent of the hour actually spent breaking crops, after resets and walking.',
    step: 1,
    max: 100,
  }),
]);

/** The Harvest Feast toggle, kept beside the fields it unlocks. */
export const MEASURED_FEAST_KEY = 'harvestFeastActive';

function positive(value) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}

function ratioFromPercent(value) {
  const percent = positive(value);
  if (percent == null) return null;
  return Math.max(0, Math.min(1, percent / 100));
}

/**
 * Plain-language words for an engine `missing` path.
 *
 * The engine reports paths like `normalDrops[melon-base-crop].unitValueCoins`,
 * which is the right thing for a diagnostic and the wrong thing to show a
 * player. A path with no translation falls back to a generic sentence rather
 * than leaking the path: a reader cannot act on an array index.
 */
const MISSING_WORDS = Object.freeze([
  [/^throughput\.breaksPerSecond$/, 'how many crops you break per second'],
  [/^throughput\.baseFarmingUptimeRatio$/, 'how much of the hour you actually farm'],
  [/^normalDrops\[.*\]\.unitValueCoins$/, 'what one crop sells for'],
  [/^normalDrops\[.*\]\.baseUnitsPerBreak$/, 'how many crops this one drops per break'],
  [/^rareDrops\[.*\]\.unitValueCoins$/, 'what one Feast crop sells for'],
  [/^rareDrops\[.*\]\.baseProbability$/, 'the Feast rare-crop chance'],
  [/^rareDrops\[.*\]\.probabilityCap$/, 'what happens when the Feast chance passes certainty'],
  [/^stats\.farmingFortune$/, 'your Farming Fortune'],
  [/^stats\.cropFortune$/, 'your Crop Fortune for this crop'],
  [/^stats\.overbloom$/, 'your Overbloom'],
]);

export function describeMissing(entry) {
  const path = String(entry?.path || '');
  for (const [pattern, words] of MISSING_WORDS) {
    if (pattern.test(path)) return words;
  }
  return 'a value this crop model still needs';
}

/**
 * The adapter input a set of measurements supports.
 *
 * The Feast rare-crop stream is requested only when the Feast is switched on
 * *and* its material price is given. Half of an optional stream would make the
 * whole result incomplete and take the normal-crop number down with it, which
 * would punish the player for leaving an optional field empty.
 */
export function measuredProfitInput(measured = {}, stats = {}, cropId = null) {
  const feastValue = positive(measured.feastMaterialCoins);
  const feastActive = Boolean(measured[MEASURED_FEAST_KEY]) && feastValue != null;
  return {
    cropId,
    stats: {
      farmingFortune: stats.farmingFortune,
      cropFortune: stats.cropFortune,
      overbloom: stats.overbloom,
    },
    breaksPerSecond: positive(measured.breaksPerSecond),
    baseFarmingUptimeRatio: ratioFromPercent(measured.uptimePercent),
    // Coin values are injected by the rolling market-price adapter. Legacy
    // manually entered values are never supplied by UI code.
    cropUnitValueCoins: positive(measured.coinsPerUnit),
    harvestFeastActive: feastActive,
    harvestFeastCropMaterialValueCoins: feastActive ? feastValue : null,
  };
}

/**
 * The planner baseline a set of measurements supports, and what it lacks.
 *
 * `normalCropCoinsPerHour` and `rareCropCoinsPerHour` are each null unless
 * every input that stream needs is present. Null means unknown. Zero would
 * mean measured-as-worthless, and the planner treats the two differently.
 */
export function measuredBaseline(measured = {}, stats = {}, cropId = null) {
  const input = measuredProfitInput(measured, stats, cropId);
  const result = calculateSourceDrivenCropProfit(input);

  const missingIn = prefix => result.missing.filter(entry =>
    entry.path.startsWith(prefix) || entry.path.startsWith('throughput.') || entry.path.startsWith('stats.'));
  const coinsFrom = kind => {
    const rows = result.streams.filter(stream => stream.kind === kind);
    return rows.length ? rows.reduce((sum, row) => sum + row.coinsPerHour, 0) : null;
  };

  const normalOk = missingIn('normalDrops').length === 0 && result.streams.some(row => row.kind === 'normal-drop');
  const feastRequested = input.harvestFeastActive;
  const rareOk = feastRequested && missingIn('rareDrops').length === 0;

  return {
    mode: PLANNER_PROFIT_MODE.SOURCE_DRIVEN,
    normalCropCoinsPerHour: normalOk ? coinsFrom('normal-drop') : null,
    rareCropCoinsPerHour: rareOk ? coinsFrom('rare-drop') : null,
    feastRequested,
    complete: normalOk,
    missing: result.missing,
    warnings: result.warnings,
    // The crop's own base-drop figure is data, not a measurement, so its
    // verification status belongs on screen beside the number it produced.
    cropDataStatus: result.cropDataStatus,
    cropDataReason: result.cropDataReason,
    cropKnown: Boolean(cropModel(cropId)),
    validBreaksPerHour: result.throughput?.validBreaksPerHour ?? null,
    engineVersion: result.version,
  };
}
