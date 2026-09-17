/**
 * The bridge between what a player can measure and what the planner needs.
 *
 * `src/profit-engine.js` has been in this repo, complete and tested, imported
 * by nothing. It was left unwired because the constants a full model would
 * need are not verified, and
 * research/knowledge-base/40-calculator-model-strategy-gap-audit.md section 9
 * says what to do about that: "the new calculator core should accept
 * measured/manual inputs and expose incompleteness rather than synthesize
 * values."
 *
 * So this does not try to model a farm. It takes the four things a player can
 * actually measure in ten seconds -- breaks per second, how much of the hour
 * they really farm, drops per break, and the Bazaar price -- borrows the
 * Fortune the app already knows, and produces the one number the planner keeps
 * asking for: normal-crop Coins per hour.
 *
 * Everything it cannot get, it names. `rareCropCoinsPerHour` stays null unless
 * the player supplies a rare-drop probability, because no verified base
 * probability for rare crops outside a Harvest Feast exists in the research,
 * and inventing one would put a fabricated number straight into the ranking
 * that decides what to buy next.
 */
import { DROP_SCALING, calculateFarmingProfit } from './profit-engine.js';

/**
 * The inputs, in the order they belong on screen.
 *
 * `measurable` marks the ones a player reads off their own farm rather than
 * looking up; `optional` marks the rare-crop pair, which is allowed to stay
 * empty and leaves that stream unknown instead of zero.
 */
export const MEASURED_FIELDS = Object.freeze([
  Object.freeze({
    key: 'breaksPerSecond',
    label: 'Crop breaks per second',
    hint: 'Count your breaks over ten seconds and divide by ten.',
    step: 0.1,
    measurable: true,
  }),
  Object.freeze({
    key: 'uptimePercent',
    label: 'Farming uptime',
    hint: 'Percent of the hour actually spent breaking crops, after resets and walking.',
    step: 1,
    max: 100,
    measurable: true,
  }),
  Object.freeze({
    key: 'unitsPerBreak',
    label: 'Crops per break',
    hint: 'Before Fortune. The plain drop count for this crop.',
    step: 0.1,
    measurable: true,
  }),
  Object.freeze({
    key: 'coinsPerUnit',
    label: 'Coins per crop',
    hint: 'Your sell price per unit.',
    step: 0.1,
    measurable: true,
  }),
  Object.freeze({
    key: 'rareChancePercent',
    label: 'Rare-crop chance per break',
    hint: 'Optional. No verified base chance exists outside a Harvest Feast, so this is only used if you measured it.',
    step: 0.01,
    max: 100,
    optional: true,
  }),
  Object.freeze({
    key: 'rareCoinsPerUnit',
    label: 'Coins per rare crop',
    hint: 'Optional. Needed only alongside the chance above.',
    step: 1,
    optional: true,
  }),
]);

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
 * The engine reports paths like `normalDrops[normal].unitValueCoins`, which is
 * the right thing for a diagnostic and the wrong thing to show a player.
 * Anything without a translation is passed through rather than swallowed: a
 * path nobody has words for is still more use than silence.
 */
const MISSING_WORDS = Object.freeze({
  'throughput.breaksPerSecond': 'how many crops you break per second',
  'throughput.baseFarmingUptimeRatio': 'how much of the hour you actually farm',
  'normalDrops[normal].baseUnitsPerBreak': 'how many crops one break drops',
  'normalDrops[normal].unitValueCoins': 'what one crop sells for',
  'rareDrops[rare].baseProbability': 'the rare-crop chance per break',
  'rareDrops[rare].unitValueCoins': 'what one rare crop sells for',
  'stats.farmingFortune': 'your Farming Fortune',
  'stats.cropFortune': 'your Crop Fortune for this crop',
  'stats.overbloom': 'your Overbloom',
});

export function describeMissing(entry) {
  return MISSING_WORDS[entry?.path] || entry?.path || 'an unnamed input';
}

/**
 * Build the engine input from measured fields plus the Fortune already known.
 *
 * The rare-crop stream is included only when both of its fields are present.
 * Half a rare-crop stream would make the whole result incomplete and take the
 * normal-crop number down with it, which would punish the player for leaving
 * an optional field empty.
 */
export function measuredProfitInput(measured = {}, stats = {}) {
  const rareChance = ratioFromPercent(measured.rareChancePercent);
  const rareValue = positive(measured.rareCoinsPerUnit);
  const wantsRare = rareChance != null && rareValue != null;

  return {
    stats: {
      farmingFortune: stats.farmingFortune,
      cropFortune: stats.cropFortune,
      overbloom: stats.overbloom,
    },
    throughput: {
      breaksPerSecond: positive(measured.breaksPerSecond),
      baseFarmingUptimeRatio: ratioFromPercent(measured.uptimePercent),
    },
    normalDrops: [{
      id: 'normal',
      baseUnitsPerBreak: positive(measured.unitsPerBreak),
      unitValueCoins: positive(measured.coinsPerUnit),
      scaling: DROP_SCALING.COMBINED_FORTUNE,
    }],
    rareDrops: wantsRare ? [{
      id: 'rare',
      rollsPerBreak: 1,
      expectedQuantity: 1,
      baseProbability: rareChance,
      unitValueCoins: rareValue,
      scaling: DROP_SCALING.OVERBLOOM,
      // A measured chance scaled by Overbloom can exceed 1. The engine refuses
      // to guess what happens then, and a chance cannot exceed certainty, so
      // the cap is stated rather than left for it to ask about.
      probabilityCap: 1,
    }] : [],
  };
}

/**
 * The planner baseline a set of measurements supports, and what it lacks.
 *
 * `normalCropCoinsPerHour` and `rareCropCoinsPerHour` are each null unless
 * every input that stream needs is present. Null means unknown. Zero would
 * mean measured-as-worthless, and the planner treats the two differently.
 */
export function measuredBaseline(measured = {}, stats = {}) {
  const result = calculateFarmingProfit(measuredProfitInput(measured, stats));
  const streamCoins = id => {
    const row = result.streams.find(stream => stream.id === id);
    return row ? row.coinsPerHour : null;
  };
  const missingFor = prefix => result.missing.filter(entry =>
    entry.path.startsWith(prefix) || entry.path.startsWith('throughput.') || entry.path.startsWith('stats.'));

  const normalMissing = missingFor('normalDrops');
  const rareRequested = measuredProfitInput(measured, stats).rareDrops.length > 0;
  const rareMissing = rareRequested ? missingFor('rareDrops') : [];

  return {
    normalCropCoinsPerHour: normalMissing.length === 0 ? streamCoins('normal') : null,
    rareCropCoinsPerHour: rareRequested && rareMissing.length === 0 ? streamCoins('rare') : null,
    rareRequested,
    complete: normalMissing.length === 0,
    missing: result.missing,
    warnings: result.warnings,
    validBreaksPerHour: result.throughput?.validBreaksPerHour ?? null,
    engineVersion: result.version,
  };
}
