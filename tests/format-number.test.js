import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { FRACTION_2, formatNumber, formatterCacheSize } from '../src/format-number.js';

/**
 * The point of `format-number.js` is speed, so the only thing worth asserting
 * is that speed cost nothing: every call site swapped to it must still print
 * exactly what `toLocaleString` printed. That is checked against the built-in
 * itself rather than against hand-written expected strings, because a hardcoded
 * "1,234,568" would pass while silently disagreeing with the platform.
 */

const VALUES = [
  0, -0, 1, -1, 7, 42, 999, 1000, 1001, 9999, 10000, 123456, 1234567, 1e9, 1e21,
  0.1, 0.5, 0.05, 0.005, 0.0049, 1.005, 2.675, -2.675, 1234.5678, -1234.5678,
  1 / 3, 2 / 3, Math.PI, Number.MAX_SAFE_INTEGER, Number.MIN_SAFE_INTEGER,
  Number.EPSILON, Number.MAX_VALUE, Number.MIN_VALUE,
  NaN, Infinity, -Infinity,
];

test('plain formatting matches toLocaleString exactly', () => {
  for (const value of VALUES) {
    assert.equal(
      formatNumber(value),
      value.toLocaleString('en-US'),
      `disagreed on ${String(value)}`,
    );
  }
});

test('two-fraction-digit formatting matches toLocaleString exactly', () => {
  for (const value of VALUES) {
    assert.equal(
      formatNumber(value, FRACTION_2),
      value.toLocaleString('en-US', { maximumFractionDigits: 2 }),
      `disagreed on ${String(value)}`,
    );
  }
});

test('neither shape the app uses constructs anything', () => {
  // Both go to a formatter held directly, so the fallback map stays empty. A
  // non-zero size here means a call site slipped onto the slow path.
  for (let i = 0; i < 500; i++) {
    formatNumber(i);
    formatNumber(i, FRACTION_2);
  }
  assert.equal(formatterCacheSize(), 0, 'a hot-path call fell through to the map');
});

test('an unknown option set still works, once', () => {
  const opts = { minimumFractionDigits: 3 };
  assert.equal(formatNumber(1.5, opts), (1.5).toLocaleString('en-US', opts));
  const size = formatterCacheSize();
  for (let i = 0; i < 50; i++) formatNumber(i, { minimumFractionDigits: 3 });
  assert.equal(formatterCacheSize(), size, 'an equal option set rebuilt the formatter');
});

test('nothing is coerced on the way through', () => {
  // A formatter that turned an absent value into 0 would make `unknown` print
  // as a measured zero, which is the defect class this app keeps re-fixing.
  // `toLocaleString` is what the call sites used, so match it and nothing more.
  assert.equal(formatNumber(NaN), 'NaN');
  assert.equal(formatNumber(Number(null)), '0', 'Number(null) is the caller\'s choice, still 0');
});

test('the module boots nothing and pulls in no enhancer', () => {
  // Rule 10 of docs/RENDER_FREEZE_SAFETY.md: a shared utility must not drag a
  // DOM enhancer's boot into the graph of everything that formats a number.
  const source = readFileSync(new URL('../src/format-number.js', import.meta.url), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');
  assert.doesNotMatch(source, /MutationObserver|addEventListener|document\.|localStorage/);
  assert.doesNotMatch(source, /^import /m, 'a formatting helper needs no imports');
});
