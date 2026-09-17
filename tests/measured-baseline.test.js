import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DROP_SCALING } from '../src/profit-engine.js';
import {
  MEASURED_FIELDS,
  describeMissing,
  measuredBaseline,
  measuredProfitInput,
} from '../src/measured-baseline.js';

/**
 * `src/profit-engine.js` shipped complete, tested, and imported by nothing.
 *
 * It was left unwired because a full farm model needs constants the research
 * marks unverified, and section 9 of
 * research/knowledge-base/40-calculator-model-strategy-gap-audit.md says what
 * to do about that: "accept measured/manual inputs and expose incompleteness
 * rather than synthesize values."
 *
 * This is that entry point, so these tests are mostly about what it refuses to
 * claim.
 */

const read = name => readFileSync(new URL(`../src/${name}`, import.meta.url), 'utf8');

const STATS = Object.freeze({ farmingFortune: 900, cropFortune: 420, overbloom: 40 });
const FULL = Object.freeze({ breaksPerSecond: 20, uptimePercent: 85, unitsPerBreak: 5, coinsPerUnit: 6 });

test('the engine is no longer an orphan', () => {
  assert.match(read('measured-baseline.js'), /from '\.\/profit-engine\.js'/);
  assert.match(read('revenue-planner.js'), /from '\.\/measured-baseline\.js'/);
});

test('four measurable numbers produce Coins per hour', () => {
  const result = measuredBaseline(FULL, STATS);
  // 20/s over 85% of an hour = 61,200 breaks; 5 crops each, times
  // 1 + (900 + 420)/100, times 6 coins.
  assert.equal(result.validBreaksPerHour, 61_200);
  assert.equal(result.normalCropCoinsPerHour, 61_200 * 5 * (1 + 13.2) * 6);
  assert.equal(result.complete, true);
  assert.deepEqual(result.missing, []);
});

test('an incomplete measurement is null, not a partial number', () => {
  for (const drop of ['breaksPerSecond', 'uptimePercent', 'unitsPerBreak', 'coinsPerUnit']) {
    const partial = { ...FULL };
    delete partial[drop];
    const result = measuredBaseline(partial, STATS);
    assert.equal(result.normalCropCoinsPerHour, null, `${drop} missing still produced a number`);
    assert.equal(result.complete, false);
    assert.ok(result.missing.length > 0);
  }
});

test('an unknown Fortune is reported, never substituted', () => {
  const result = measuredBaseline(FULL, {});
  assert.equal(result.normalCropCoinsPerHour, null);
  const words = result.missing.map(describeMissing);
  assert.ok(words.includes('your Farming Fortune'), words.join(' | '));
  assert.ok(words.includes('your Crop Fortune for this crop'), words.join(' | '));
});

test('every missing path is said in words a player can act on', () => {
  // A path like `normalDrops[normal].unitValueCoins` is right for a diagnostic
  // and wrong on screen.
  const cases = [
    {},
    { breaksPerSecond: 20 },
    { ...FULL, rareChancePercent: 0.5 },
  ];
  for (const measured of cases) {
    for (const entry of measuredBaseline(measured, {}).missing) {
      const words = describeMissing(entry);
      assert.notEqual(words, entry.path, `no words for ${entry.path}`);
      assert.doesNotMatch(words, /\[|\]|\./, `${words} still reads like a path`);
    }
  }
});

test('rare crops stay unknown without a measured chance', () => {
  // No verified base probability for rare crops outside a Harvest Feast exists
  // in the research. Inventing one would put a fabricated number into the
  // ranking that decides what to buy next.
  const result = measuredBaseline(FULL, STATS);
  assert.equal(result.rareCropCoinsPerHour, null);
  assert.equal(result.rareRequested, false);
  // And the normal number survives: an empty optional field is not a failure.
  assert.ok(result.normalCropCoinsPerHour > 0);
  assert.equal(result.complete, true);
});

test('half a rare-crop measurement does not poison the normal number', () => {
  const chanceOnly = measuredBaseline({ ...FULL, rareChancePercent: 0.5 }, STATS);
  assert.equal(chanceOnly.rareRequested, false);
  assert.equal(chanceOnly.rareCropCoinsPerHour, null);
  assert.ok(chanceOnly.normalCropCoinsPerHour > 0, 'an optional field left half-filled cost the whole result');

  const priceOnly = measuredBaseline({ ...FULL, rareCoinsPerUnit: 900_000 }, STATS);
  assert.equal(priceOnly.rareRequested, false);
  assert.ok(priceOnly.normalCropCoinsPerHour > 0);
});

test('both rare fields together produce a rare stream scaled by Overbloom', () => {
  const result = measuredBaseline({ ...FULL, rareChancePercent: 0.5, rareCoinsPerUnit: 900_000 }, STATS);
  assert.equal(result.rareRequested, true);
  // 61,200 rolls at 0.5% scaled by +40% Overbloom, times 900,000.
  assert.equal(result.rareCropCoinsPerHour, 61_200 * (0.005 * 1.4) * 900_000);
  const rare = measuredProfitInput({ ...FULL, rareChancePercent: 0.5, rareCoinsPerUnit: 900_000 }, STATS).rareDrops[0];
  assert.equal(rare.scaling, DROP_SCALING.OVERBLOOM);
  // A measured chance scaled by Overbloom can exceed 1, and the engine refuses
  // to guess what happens then. A chance cannot exceed certainty.
  assert.equal(rare.probabilityCap, 1);
});

test('normal crops scale by Farming plus matching Crop Fortune', () => {
  const normal = measuredProfitInput(FULL, STATS).normalDrops[0];
  assert.equal(normal.scaling, DROP_SCALING.COMBINED_FORTUNE);
});

test('a zero or negative measurement is no measurement', () => {
  for (const bad of [0, -5, '', 'abc', null, undefined]) {
    const result = measuredBaseline({ ...FULL, breaksPerSecond: bad }, STATS);
    assert.equal(result.normalCropCoinsPerHour, null, String(bad));
  }
});

test('uptime is a percentage and cannot exceed the hour', () => {
  const capped = measuredBaseline({ ...FULL, uptimePercent: 400 }, STATS);
  assert.equal(capped.validBreaksPerHour, 20 * 3600, 'more than 100% uptime bought extra hours');
});

test('the field list stays the one the panel renders', () => {
  assert.equal(MEASURED_FIELDS.length, 6);
  const optional = MEASURED_FIELDS.filter(field => field.optional).map(field => field.key);
  assert.deepEqual(optional, ['rareChancePercent', 'rareCoinsPerUnit']);
  for (const field of MEASURED_FIELDS) {
    assert.ok(field.label && field.hint && field.step, field.key);
  }
});
