import assert from 'node:assert/strict';
import test from 'node:test';

import {
  BAZAAR_CACHE_STORAGE_KEY,
  PRICE_INTENT,
  PRICE_SOURCE,
  bazaarSnapshotFresh,
  loadBazaarSnapshot,
  normalizeBazaarPayload,
  normalizeNpcSellPriceResource,
  priceCandidates,
  resolveUnitPrice,
} from '../src/live-prices.js';
import { installLocalStorage, uninstallLocalStorage } from './local-storage-stub.js';

const NOW = 1_800_000_000_000;

function bazaarPayload(overrides = {}) {
  return {
    success: true,
    lastUpdated: NOW - 10_000,
    products: {
      WHEAT: {
        product_id: 'WHEAT',
        sell_summary: [{ amount: 1000, pricePerUnit: 12.4, orders: 3 }],
        buy_summary: [{ amount: 900, pricePerUnit: 10.1, orders: 2 }],
        quick_status: {
          productId: 'WHEAT',
          sellPrice: 12.5,
          buyPrice: 10,
          sellVolume: 10000,
          buyVolume: 12000,
          sellMovingWeek: 100000,
          buyMovingWeek: 110000,
          sellOrders: 12,
          buyOrders: 15,
        },
      },
    },
    ...overrides,
  };
}

test.afterEach(() => uninstallLocalStorage());

test('Bazaar normalization preserves official market-side semantics', () => {
  const snapshot = normalizeBazaarPayload(bazaarPayload(), NOW);
  assert.equal(snapshot.complete, true);
  assert.equal(snapshot.products.WHEAT.weightedSellOfferPriceCoins, 12.5);
  assert.equal(snapshot.products.WHEAT.weightedBuyOrderPriceCoins, 10);
  assert.deepEqual(snapshot.products.WHEAT.sellSummary[0], { amount: 1000, pricePerUnit: 12.4, orders: 3 });
  assert.deepEqual(snapshot.products.WHEAT.buySummary[0], { amount: 900, pricePerUnit: 10.1, orders: 2 });
});

test('acquisition uses sell offers while liquidation uses buy orders', () => {
  const bazaar = normalizeBazaarPayload(bazaarPayload(), NOW);
  const npc = normalizeNpcSellPriceResource({ items: [{ id: 'WHEAT', npc_sell_price: 6 }] }, NOW);

  const acquire = resolveUnitPrice({ bazaar, npc, itemId: 'WHEAT', intent: PRICE_INTENT.ACQUIRE, nowMs: NOW });
  assert.equal(acquire.source, PRICE_SOURCE.BAZAAR);
  assert.equal(acquire.marketSide, 'sell-offer');
  assert.equal(acquire.coinsPerUnit, 12.5);

  const liquidate = resolveUnitPrice({ bazaar, npc, itemId: 'WHEAT', intent: PRICE_INTENT.LIQUIDATE, nowMs: NOW });
  assert.equal(liquidate.source, PRICE_SOURCE.BAZAAR);
  assert.equal(liquidate.marketSide, 'buy-order');
  assert.equal(liquidate.coinsPerUnit, 10);
});

test('liquidation exposes NPC as a separate candidate without silently overriding Bazaar', () => {
  const bazaar = normalizeBazaarPayload(bazaarPayload(), NOW);
  const npc = normalizeNpcSellPriceResource({ items: [{ id: 'WHEAT', npc_sell_price: 50 }] }, NOW);
  const candidates = priceCandidates({ bazaar, npc, itemId: 'WHEAT', intent: PRICE_INTENT.LIQUIDATE, nowMs: NOW });
  assert.deepEqual(candidates.map(row => [row.source, row.coinsPerUnit]), [
    [PRICE_SOURCE.BAZAAR, 10],
    [PRICE_SOURCE.NPC, 50],
  ]);
  const resolved = resolveUnitPrice({ bazaar, npc, itemId: 'WHEAT', intent: PRICE_INTENT.LIQUIDATE, nowMs: NOW });
  assert.equal(resolved.source, PRICE_SOURCE.BAZAAR);
  assert.equal(resolved.candidates.length, 2);
});

test('NPC sell price is a liquidation fallback, never an acquisition price', () => {
  const bazaar = normalizeBazaarPayload({ success: true, lastUpdated: NOW - 10_000, products: {} }, NOW);
  const npc = normalizeNpcSellPriceResource({ items: [{ id: 'PUMPKIN', npc_sell_price: 4 }] }, NOW);
  const sell = resolveUnitPrice({ bazaar, npc, itemId: 'PUMPKIN', intent: PRICE_INTENT.LIQUIDATE, nowMs: NOW });
  assert.equal(sell.source, PRICE_SOURCE.NPC);
  assert.equal(sell.coinsPerUnit, 4);
  assert.ok(sell.constraints[0].includes('caps'));

  const buy = resolveUnitPrice({ bazaar, npc, itemId: 'PUMPKIN', intent: PRICE_INTENT.ACQUIRE, nowMs: NOW });
  assert.equal(buy.complete, false);
  assert.equal(buy.coinsPerUnit, null);
  assert.match(buy.reason, /AH\/BIN/);
});

test('missing NPC prices stay missing rather than becoming zero', () => {
  const npc = normalizeNpcSellPriceResource({ success: true, items: [{ id: 'A' }, { id: 'B', npc_sell_price: null }] }, NOW);
  assert.equal(npc.complete, true);
  assert.equal(npc.prices.A, undefined);
  assert.equal(npc.prices.B, undefined);
});

test('freshness checks both local cache age and Hypixel source age', () => {
  const fresh = normalizeBazaarPayload(bazaarPayload(), NOW);
  assert.equal(bazaarSnapshotFresh(fresh, { nowMs: NOW }), true);
  assert.equal(bazaarSnapshotFresh(fresh, { nowMs: NOW + 61_000 }), false, 'local cache age expires first');

  const oldSource = normalizeBazaarPayload(bazaarPayload({ lastUpdated: NOW - 10 * 60_000 }), NOW);
  assert.equal(bazaarSnapshotFresh(oldSource, { nowMs: NOW }), false, 'stuck server data is not called live');
});

test('invalid Bazaar payload is incomplete instead of a zero-price market', () => {
  for (const payload of [null, {}, { success: false }, { success: true, lastUpdated: NOW }]) {
    const snapshot = normalizeBazaarPayload(payload, NOW);
    assert.equal(snapshot.complete, false);
    assert.deepEqual(snapshot.products, {});
  }
});

test('fresh Bazaar cache avoids another API request', async () => {
  const storage = installLocalStorage();
  const cached = normalizeBazaarPayload(bazaarPayload(), NOW);
  storage.setItem(BAZAAR_CACHE_STORAGE_KEY, JSON.stringify(cached));
  let calls = 0;
  const result = await loadBazaarSnapshot({
    nowMs: NOW,
    fetchBazaar: async () => { calls += 1; return bazaarPayload(); },
  });
  assert.equal(calls, 0);
  assert.equal(result.fromCache, true);
  assert.equal(result.snapshot.products.WHEAT.weightedBuyOrderPriceCoins, 10);
});

test('stale Bazaar cache is refreshed and failures preserve stale data only as stale', async () => {
  const storage = installLocalStorage();
  const stale = normalizeBazaarPayload(bazaarPayload({ lastUpdated: NOW - 10 * 60_000 }), NOW - 10 * 60_000);
  storage.setItem(BAZAAR_CACHE_STORAGE_KEY, JSON.stringify(stale));

  let calls = 0;
  const refreshed = await loadBazaarSnapshot({
    nowMs: NOW,
    fetchBazaar: async () => { calls += 1; return bazaarPayload(); },
  });
  assert.equal(calls, 1);
  assert.equal(refreshed.fromCache, false);
  assert.equal(bazaarSnapshotFresh(refreshed.snapshot, { nowMs: NOW }), true);

  storage.setItem(BAZAAR_CACHE_STORAGE_KEY, JSON.stringify(stale));
  const failed = await loadBazaarSnapshot({
    nowMs: NOW,
    fetchBazaar: async () => { throw new Error('offline'); },
  });
  assert.equal(failed.fromCache, true);
  assert.equal(bazaarSnapshotFresh(failed.snapshot, { nowMs: NOW }), false);
  assert.match(failed.error, /could not be loaded/i);
});
