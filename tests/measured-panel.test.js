import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

/**
 * The panel that wires the profit engine in, checked against the rules that
 * have already cost this repo a round each.
 */

const read = name => readFileSync(new URL(`../src/${name}`, import.meta.url), 'utf8');
const planner = read('revenue-planner.js');
const css = read('revenue-planner.css').replace(/\/\*[\s\S]*?\*\//g, '');

test('the measured panel lives inside the baseline it feeds', () => {
  // A second economics panel elsewhere would be two writers for one concern,
  // which is rule 7 of docs/RENDER_FREEZE_SAFETY.md and the exact shape of the
  // three-modules-one-planner-list bug.
  const economics = planner.match(/function economicsPanel[\s\S]*?\n}/)[0];
  assert.match(economics, /\$\{measuredPanel\(raw, context\)\}/);
});

test('typing recomputes without dispatching a render', () => {
  // Rebuilding the panel on every keystroke loses the caret and is the loop
  // shape rule 5 exists to prevent. Storage may be written, a render may not.
  const refresh = planner.match(/const refreshMeasured = \(\) => \{[\s\S]*?\n  \};/)[0];
  assert.match(refresh, /save\(next\)/);
  assert.doesNotMatch(refresh, /farming420:state-changed/);
  assert.match(refresh, /setTextIfChanged\(/);
  assert.doesNotMatch(refresh, /\.textContent\s*=/);
});

test('coin values are automatic and are never applied from a manual baseline', () => {
  assert.doesNotMatch(planner, /data-measured-apply/);
  assert.doesNotMatch(planner, /setPlannerEconomicsValue/);
  assert.doesNotMatch(planner, /data-revenue-input/);
  assert.match(planner, /function measuredWithMarketAverage\(values, cropId\)/);
  assert.match(planner, /delete priced\.coinsPerUnit/);
  assert.match(planner, /delete priced\.feastMaterialCoins/);
  assert.match(planner, /averageCropUnitPrice\(cropId\)/);
  assert.match(planner, /averageCropPriceNote/);
});

test('an empty measurement clears its stored value instead of storing zero', () => {
  assert.match(planner, /if \(raw === ''\) delete values\[input\.dataset\.measured\];/);
});

test('measurements are kept per crop and per activity', () => {
  // A Farm measurement does not describe a Pest loadout. Sharing one is the
  // bug the activity-aware economics already fixed once.
  assert.match(planner, /\$\{selectedCropId\(raw\)\}:\$\{activityModeForState\(raw\)\}/);
});

test('the Fortune used is shown, and a zero one is called out', () => {
  // A computed Fortune of zero is a real value, so the engine calls the
  // measurement complete. Left unsaid, the result reads as finished while
  // quietly assuming no Fortune at all.
  assert.match(planner, /function fortuneUsedText\(context\)/);
  assert.match(planner, /No Fortune is known yet, so this counts plain drops only/);
  assert.match(planner, /zeroFortune: total <= 0/);
  assert.match(planner, /fill in your entries and measure again/);
  // Unmodelled axes are a different thing and stay a separate sentence.
  assert.match(planner, /could not be fully worked out, so this assumes what is known/);
});

test('the summary is not given display: flex', () => {
  const rule = css.match(/\.revenue-measured\s*>\s*summary \{([^}]*)\}/);
  assert.ok(rule);
  assert.doesNotMatch(rule[1], /display:\s*flex/);
  assert.match(css, /\.revenue-measured-head \{[^}]*display: flex/);
  assert.match(planner, /<summary>\s*<div class="revenue-measured-head">/);
});

test('the Feast market value is read-only and the Feast toggle remains interactive', () => {
  assert.match(planner, /revenue-measured-market revenue-measured-optional/);
  assert.match(css, /\.revenue-measured-optional/);
  assert.doesNotMatch(planner, /data-measured="feastMaterialCoins"/);
  assert.match(planner, /feastToggle\?\.addEventListener\('change', refreshMeasured\)/);
  assert.match(planner, /if \(feastToggle\?\.checked\) values\[MEASURED_FEAST_KEY\] = true;/);
  assert.match(planner, /else delete values\[MEASURED_FEAST_KEY\];/);
});

test('an unverified crop drop count is said, not hidden behind the number', () => {
  assert.match(planner, /result\.cropDataStatus !== 'VERIFIED'/);
  assert.match(planner, /drops per break are/);
});

test('the panel fits a phone', () => {
  assert.match(css, /@media \(max-width: 650px\) \{[\s\S]*?\.revenue-measured-grid \{ grid-template-columns: 1fr; \}/);
  assert.match(css, /\.revenue-measured-grid input \{[^}]*min-width: 0/);
});
