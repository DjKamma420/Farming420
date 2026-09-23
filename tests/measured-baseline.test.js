import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { cropModel } from '../src/farming-mechanics-data.js';
import {
  MEASURED_FEAST_KEY,
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
const FULL = Object.freeze({ breaksPerSecond: 20, uptimePercent: 85, coinsPerUnit: 6 });
const CROP = 'melon';

test('the engine is no longer an orphan, and reached through the existing adapter', () => {
  // `planner-profit-adapter.js` already built the engine input, taking the
  // crop's own base drop count from `farming-mechanics-data.js`. The first
  // draft of this module hand-rolled a second one and asked the player for the
  // drop count as an extra field -- a copy of existing work, and a worse panel.
  const source = read('measured-baseline.js');
  assert.match(source, /from '\.\/planner-profit-adapter\.js'/);
  assert.doesNotMatch(source, /from '\.\/profit-engine\.js'/);
  // It may still *translate* that engine path for the reader; what it must not
  // do is assign one, which is how it would be building its own input again.
  assert.doesNotMatch(source, /baseUnitsPerBreak:/);
  assert.match(read('revenue-planner.js'), /from '\.\/measured-baseline\.js'/);
});

test('three measurable numbers produce Coins per hour', () => {
  const result = measuredBaseline(FULL, STATS, CROP);
  const perBreak = cropModel(CROP).baseDrop.expected;
  // 20/s over 85% of an hour = 61,200 breaks, times the crop's own drop count,
  // times 1 + (900 + 420)/100, times 6 coins.
  assert.equal(result.validBreaksPerHour, 61_200);
  assert.equal(result.normalCropCoinsPerHour, 61_200 * perBreak * (1 + 13.2) * 6);
  assert.equal(result.complete, true);
  assert.deepEqual(result.missing, []);
  // The drop count is data, so its verification status travels with the number.
  assert.equal(result.cropDataStatus, cropModel(CROP).baseDrop.status);
});

test('an incomplete measurement is null, not a partial number', () => {
  for (const drop of ['breaksPerSecond', 'uptimePercent', 'coinsPerUnit']) {
    const partial = { ...FULL };
    delete partial[drop];
    const result = measuredBaseline(partial, STATS, CROP);
    assert.equal(result.normalCropCoinsPerHour, null, `${drop} missing still produced a number`);
    assert.equal(result.complete, false);
    assert.ok(result.missing.length > 0);
  }
});

test('an unknown Fortune is reported, never substituted', () => {
  const result = measuredBaseline(FULL, {}, CROP);
  assert.equal(result.normalCropCoinsPerHour, null);
  const words = result.missing.map(describeMissing);
  assert.ok(words.includes('your Farming Fortune'), words.join(' | '));
  assert.ok(words.includes('your Crop Fortune for this crop'), words.join(' | '));
});

test('a crop with no drop model says so instead of showing a bare dash', () => {
  // An unknown crop produces no `missing` entry at all, because the engine was
  // never handed a drop model to find a gap in. That is the case a dash with
  // no reason would hide.
  const result = measuredBaseline(FULL, STATS, 'not-a-crop');
  assert.equal(result.cropKnown, false);
  assert.equal(result.normalCropCoinsPerHour, null);
  assert.equal(result.complete, false);
  assert.match(read('revenue-planner.js'), /if \(!result\.cropKnown\) \{/);
  assert.match(read('revenue-planner.js'), /no verified drop model yet/);
});

test('every missing path is said in words a player can act on', () => {
  // A path like `normalDrops[melon-base-crop].unitValueCoins` is right for a
  // diagnostic and wrong on screen. Nothing may leak an array index.
  const cases = [{}, { breaksPerSecond: 20 }, { ...FULL, [MEASURED_FEAST_KEY]: true, feastMaterialCoins: 900_000 }];
  for (const measured of cases) {
    for (const entry of measuredBaseline(measured, {}, CROP).missing) {
      const words = describeMissing(entry);
      assert.notEqual(words, entry.path, `no words for ${entry.path}`);
      assert.doesNotMatch(words, /\[|\]/, `${words} still reads like a path`);
    }
  }
});

test('Feast rare crops stay unknown until the Feast is switched on', () => {
  // No verified base probability for rare crops outside a Harvest Feast exists
  // in the research, and the Feast model itself comes from the research rather
  // than from the player.
  const result = measuredBaseline(FULL, STATS, CROP);
  assert.equal(result.rareCropCoinsPerHour, null);
  assert.equal(result.feastRequested, false);
  // And the normal number survives: an untouched optional field is not a failure.
  assert.ok(result.normalCropCoinsPerHour > 0);
  assert.equal(result.complete, true);
});

test('half a Feast measurement does not poison the normal number', () => {
  const toggleOnly = measuredBaseline({ ...FULL, [MEASURED_FEAST_KEY]: true }, STATS, CROP);
  assert.equal(toggleOnly.feastRequested, false);
  assert.equal(toggleOnly.rareCropCoinsPerHour, null);
  assert.ok(toggleOnly.normalCropCoinsPerHour > 0, 'an optional field left half-filled cost the whole result');

  const priceOnly = measuredBaseline({ ...FULL, feastMaterialCoins: 900_000 }, STATS, CROP);
  assert.equal(priceOnly.feastRequested, false);
  assert.ok(priceOnly.normalCropCoinsPerHour > 0);
});

test('the Feast toggle plus a price produces a rare stream', () => {
  const result = measuredBaseline({ ...FULL, [MEASURED_FEAST_KEY]: true, feastMaterialCoins: 900_000 }, STATS, CROP);
  assert.equal(result.feastRequested, true);
  assert.ok(result.rareCropCoinsPerHour > 0);
  assert.ok(result.normalCropCoinsPerHour > 0);
});

test('a zero or negative measurement is no measurement', () => {
  for (const bad of [0, -5, '', 'abc', null, undefined]) {
    const result = measuredBaseline({ ...FULL, breaksPerSecond: bad }, STATS, CROP);
    assert.equal(result.normalCropCoinsPerHour, null, String(bad));
  }
});

test('uptime is a percentage and cannot exceed the hour', () => {
  const capped = measuredBaseline({ ...FULL, uptimePercent: 400 }, STATS, CROP);
  assert.equal(capped.validBreaksPerHour, 20 * 3600, 'more than 100% uptime bought extra hours');
});

test('the player is never asked for what the data already knows', () => {
  // The crop's drops per break comes from `farming-mechanics-data.js`.
  const input = measuredProfitInput(FULL, STATS, CROP);
  assert.ok(!('unitsPerBreak' in input));
  assert.equal(MEASURED_FIELDS.some(field => /per break/i.test(field.label)), false);
});

test('the editable field list contains throughput only, never coin prices', () => {
  assert.equal(MEASURED_FIELDS.length, 2);
  assert.deepEqual(MEASURED_FIELDS.map(field => field.key), ['breaksPerSecond', 'uptimePercent']);
  assert.equal(MEASURED_FIELDS.some(field => /coin|price/i.test(`${field.key} ${field.label}`)), false);
  for (const field of MEASURED_FIELDS) {
    assert.ok(field.label && field.hint && field.step, field.key);
  }
});
