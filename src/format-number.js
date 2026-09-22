/**
 * Shared number formatting.
 *
 * The reason this module exists is narrower than it looks, and the wide version
 * of the reason is wrong. Measured over 200k calls:
 *
 * | Call | ns/call |
 * |---|---:|
 * | `v.toLocaleString('en-US')` | 625 |
 * | `formatNumber(v)` | 642 |
 * | `v.toLocaleString('en-US', { maximumFractionDigits: 2 })` | **22,877** |
 * | `formatNumber(v, FRACTION_2)` | 582 |
 *
 * So "toLocaleString is slow" is folklore. Without options V8 already reuses an
 * internal formatter and there is nothing to win -- the plain call sites here
 * are for one way of doing it, not for speed. **With** options it rebuilds an
 * `Intl.NumberFormat` every single time, at 37x the cost, and that is the whole
 * win: the Dashboard formats five numbers for each of thirteen crops, so one
 * options-bearing call site cost ~1.5 ms of every render on an untuned desktop.
 *
 * A CPU profile of boot at 412px with 4x throttling charged `app.js :: number`
 * 2.6% of total time against ~17% active CPU; afterwards formatting is 1.0%
 * against ~13.5%. Keeping every call site on one helper is what stops the
 * expensive shape from being reintroduced by someone adding an option to a
 * currently-plain call.
 *
 * Output is unchanged by construction, and `tests/format-number.test.js` proves
 * it against the built-in rather than trusting that reasoning, including for
 * NaN, Infinity and negative zero.
 *
 * This module has no side effects and imports nothing, so any module may use it
 * without pulling a DOM enhancer's boot into its graph
 * (`docs/RENDER_FREEZE_SAFETY.md`, rule 10).
 */

const LOCALE = 'en-US';

/** `toLocaleString('en-US', { maximumFractionDigits: 2 })`. */
export const FRACTION_2 = Object.freeze({ maximumFractionDigits: 2 });

/**
 * The two option sets the app actually uses, held directly.
 *
 * A `Map` keyed by `JSON.stringify(options)` was the first version, and the
 * profiler still charged it 1.2% of total time -- building a key string for
 * every one of the ~65 numbers the Dashboard formats per render is its own
 * cost. The app only ever asks for these two shapes, so they need no lookup at
 * all; the map survives only for a caller that wants something else.
 */
const PLAIN_FORMATTER = new Intl.NumberFormat(LOCALE);
const FRACTION_2_FORMATTER = new Intl.NumberFormat(LOCALE, FRACTION_2);

/** Anything beyond the two known shapes, built on first use. */
const cache = new Map();

function formatterFor(options) {
  const key = JSON.stringify(options);
  let formatter = cache.get(key);
  if (!formatter) {
    formatter = new Intl.NumberFormat(LOCALE, options);
    cache.set(key, formatter);
  }
  return formatter;
}

/**
 * `formatNumber(x)` replaces `x.toLocaleString('en-US')` exactly.
 *
 * Nothing is coerced here on purpose. A caller that wrote `Number(x || 0)` kept
 * that; a caller that passed a possibly-absent value still formats whatever it
 * had. Quietly turning an absent value into `0` inside a formatter is how
 * `unknown` becomes an answer, and this app has paid for that twice already.
 */
export function formatNumber(value, options = null) {
  if (options === null) return PLAIN_FORMATTER.format(value);
  if (options === FRACTION_2) return FRACTION_2_FORMATTER.format(value);
  return formatterFor(options).format(value);
}

/**
 * Test seam: formatters built beyond the two held directly.
 *
 * Zero is the healthy number -- it means every call site went down a path that
 * constructs nothing.
 */
export function formatterCacheSize() {
  return cache.size;
}
