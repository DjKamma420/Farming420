/**
 * Keep one Bazaar snapshot fresh, quietly.
 *
 * `src/live-prices.js` had the whole model and no caller, so every price in the
 * app was a research snapshot -- including several the research itself flags
 * `STALE_FALLBACK_SNAPSHOT`. The cost research states the rule directly:
 *
 *   "Fresh Hypixel Bazaar data must override snapshot prices whenever a Bazaar
 *    product exists."
 *   -- research/enchantment-costs-2026-09-17.json, runtimePriceRule
 *
 * This module is only the fetch and the cache. It owns no DOM. Readers call
 * `readCachedBazaarSnapshot()` and get either a fresh snapshot or nothing --
 * never a stale number presented as current, because `bazaarSnapshotFresh`
 * decides that, not this module.
 *
 * Failure is the normal case in some environments, and it must stay silent and
 * harmless: no throw, no retry storm, no render. The app already works without
 * it.
 */
import {
  bazaarSnapshotFresh,
  loadBazaarSnapshot,
  readCachedBazaarSnapshot,
} from './live-prices.js';

/** Per the research's own marketPolicy.primaryRuntimeSource. */
export const BAZAAR_ENDPOINT = 'https://api.hypixel.net/v2/skyblock/bazaar';

/** Long enough that a page left open all evening makes a handful of calls. */
export const REFRESH_INTERVAL_MS = 5 * 60_000;

async function fetchBazaar() {
  const response = await fetch(BAZAAR_ENDPOINT, { cache: 'no-store' });
  if (!response.ok) throw new Error(`Bazaar responded ${response.status}`);
  return response.json();
}

/**
 * One refresh. Returns what happened, so a caller or a test can see it.
 *
 * A render is dispatched only when a *new* snapshot actually arrived. Firing on
 * a cache hit would mean a render every interval forever, which is rule 5 of
 * docs/RENDER_FREEZE_SAFETY.md -- a state-changing event from something other
 * than a user action.
 */
export async function refreshBazaarPrices({
  fetchImpl = fetchBazaar,
  nowMs = Date.now(),
  notify = null,
} = {}) {
  const before = readCachedBazaarSnapshot();
  if (bazaarSnapshotFresh(before, { nowMs })) {
    return { changed: false, reason: 'cached snapshot is still fresh', error: null };
  }

  const result = await loadBazaarSnapshot({ fetchBazaar: fetchImpl, nowMs });
  if (result.error && !result.snapshot) {
    return { changed: false, reason: 'no snapshot available', error: result.error };
  }
  const changed = !result.fromCache
    && result.snapshot?.complete === true
    && result.snapshot?.receivedAtMs !== before?.receivedAtMs;
  if (changed) notify?.();
  return {
    changed,
    reason: changed ? 'new snapshot cached' : 'snapshot unchanged',
    error: result.error,
  };
}

function boot() {
  const notify = () => window.dispatchEvent(new Event('farming420:state-changed'));
  const tick = () => { refreshBazaarPrices({ notify }).catch(() => {}); };
  tick();
  setInterval(tick, REFRESH_INTERVAL_MS);
}

if (typeof window !== 'undefined' && typeof fetch === 'function') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
}
