import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { BAZAAR_ENDPOINT, REFRESH_INTERVAL_MS, refreshBazaarPrices } from '../src/live-price-refresh.js';
import { BAZAAR_CACHE_STORAGE_KEY, normalizeBazaarPayload, readCachedBazaarSnapshot } from '../src/live-prices.js';

const read = name => readFileSync(new URL(`../src/${name}`, import.meta.url), 'utf8');

/**
 * A minimal localStorage, so the cache path is exercised rather than skipped.
 *
 * `await`ed, not just called: a synchronous `finally` around a function that
 * returns a promise restores the global before the awaits inside it have run,
 * and every cache read then sees no storage at all. That cost me one round.
 */
async function withStorage(run) {
  const store = new Map();
  const previous = globalThis.localStorage;
  globalThis.localStorage = {
    getItem: key => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => store.set(key, String(value)),
    removeItem: key => store.delete(key),
  };
  try { return await run(store); } finally { globalThis.localStorage = previous; }
}

const NOW = 1_800_000_000_000;
const payload = { success: true, lastUpdated: NOW - 1_000, products: {
  MELON: { product_id: 'MELON', quick_status: { sellPrice: 6.4, buyPrice: 5.9 } },
} };

test('the endpoint is the one the research names', () => {
  // research/enchantment-costs-2026-09-17.json, marketPolicy.primaryRuntimeSource
  assert.equal(BAZAAR_ENDPOINT, 'https://api.hypixel.net/v2/skyblock/bazaar');
});

test('a fetched snapshot is cached and announced once', async () => {
  await withStorage(async () => {
    let notified = 0;
    const first = await refreshBazaarPrices({
      fetchImpl: async () => payload,
      nowMs: NOW,
      notify: () => { notified += 1; },
    });
    assert.equal(first.changed, true);
    assert.equal(first.error, null);
    assert.equal(notified, 1);
    assert.equal(readCachedBazaarSnapshot()?.products?.MELON?.weightedBuyOrderPriceCoins, 5.9);

    // A second call inside the cache window must not fetch and must not
    // announce: a render per interval forever is rule 5 of
    // docs/RENDER_FREEZE_SAFETY.md -- a state-changing event from something
    // other than a user action.
    let fetched = 0;
    const second = await refreshBazaarPrices({
      fetchImpl: async () => { fetched += 1; return payload; },
      nowMs: NOW + 1_000,
      notify: () => { notified += 1; },
    });
    assert.equal(second.changed, false);
    assert.equal(fetched, 0);
    assert.equal(notified, 1);
  });
});

test('a failed fetch is silent and harmless', async () => {
  await withStorage(async () => {
    let notified = 0;
    const result = await refreshBazaarPrices({
      fetchImpl: async () => { throw new Error('offline'); },
      nowMs: NOW,
      notify: () => { notified += 1; },
    });
    assert.equal(result.changed, false);
    assert.match(result.error, /offline/);
    assert.equal(notified, 0, 'a failure must not cause a render');
    assert.equal(readCachedBazaarSnapshot(), null);
  });
});

test('a malformed payload is rejected rather than cached', async () => {
  await withStorage(async () => {
    // Guard the shape the engine checks, so a 200 with junk in it cannot
    // become the app's idea of a current price.
    for (const bad of [{ success: false }, {}, { lastUpdated: NOW, products: [] }]) {
      assert.equal(normalizeBazaarPayload(bad, NOW).complete, false);
    }
  });
});

test('a cached snapshot from an older model version is ignored', async () => {
  await withStorage(async store => {
    store.set(BAZAAR_CACHE_STORAGE_KEY, JSON.stringify({ version: 0, complete: true, products: {} }));
    assert.equal(readCachedBazaarSnapshot(), null);
  });
});

test('the refresher owns no DOM and polls slowly', () => {
  const source = read('live-price-refresh.js');
  assert.ok(REFRESH_INTERVAL_MS >= 60_000, 'polling a public API faster than a minute is rude');
  assert.doesNotMatch(source, /querySelector|MutationObserver|innerHTML/);
  // The boot path must never throw into the page.
  assert.match(source, /\.catch\(\(\) => \{\}\)/);
});

test('the old live quote path is not the production planner price source', () => {
  const planner = read('revenue-planner.js');
  const index = read('../index.html');
  assert.doesNotMatch(planner, /liveCropUnitPrice/);
  assert.doesNotMatch(planner, /CROP_PRICE_STATUS\.LIVE/);
  assert.match(planner, /measuredWithMarketAverage/);
  assert.match(planner, /delete priced\.coinsPerUnit/);
  assert.match(planner, /averageCropUnitPrice/);
  assert.doesNotMatch(index, /src\/live-price-refresh\.js/);
  assert.match(index, /src\/market-average-refresh\.js/);
});
