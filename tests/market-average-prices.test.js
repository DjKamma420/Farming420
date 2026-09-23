import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MARKET_AVERAGE_MODEL_VERSION,
  MARKET_KIND,
  MARKET_SIDE,
  fetchMarketAverage,
  timeWeightedAverage,
  volumeWeightedAuctionAverage,
  writeCachedMarketAverage,
} from '../src/market-average-prices.js';
import { costOriginNote, resolveUpgradeCost } from '../src/upgrade-cost-resolution.js';

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.parse('2026-09-23T00:00:00Z');
const START = NOW - 90 * DAY;
const MID = START + 45 * DAY;

async function withStorage(run) {
  const map = new Map();
  const previous = globalThis.localStorage;
  globalThis.localStorage = {
    getItem: key => map.has(key) ? map.get(key) : null,
    setItem: (key, value) => map.set(key, String(value)),
    removeItem: key => map.delete(key),
  };
  try { return await run(map); } finally { globalThis.localStorage = previous; }
}

test('Bazaar history is time weighted over the 90-day window', () => {
  const rows = [
    { timestamp: new Date(START).toISOString(), buy: 10, sell: 100 },
    { timestamp: new Date(MID).toISOString(), buy: 20, sell: 200 },
  ];
  assert.equal(timeWeightedAverage(rows, 'buy', { startMs: START, endMs: NOW }).coinsPerUnit, 15);
  assert.equal(timeWeightedAverage(rows, 'sell', { startMs: START, endMs: NOW }).coinsPerUnit, 150);
});

test('Bazaar acquisition and liquidation use opposite market sides', async () => {
  const rows = [
    { timestamp: new Date(START).toISOString(), buy: 10, sell: 100 },
    { timestamp: new Date(MID).toISOString(), buy: 20, sell: 200 },
  ];
  let urls = [];
  const fetchImpl = async url => {
    urls.push(String(url));
    return { ok: true, json: async () => rows };
  };
  const acquire = await fetchMarketAverage(
    { market: MARKET_KIND.BAZAAR, itemTag: 'MELON', side: MARKET_SIDE.ACQUIRE },
    { fetchImpl, nowMs: NOW },
  );
  const liquidate = await fetchMarketAverage(
    { market: MARKET_KIND.BAZAAR, itemTag: 'MELON', side: MARKET_SIDE.LIQUIDATE },
    { fetchImpl, nowMs: NOW },
  );
  assert.equal(acquire.quote.coinsPerUnit, 150);
  assert.equal(liquidate.quote.coinsPerUnit, 15);
  assert.ok(urls.every(url => url.includes('/api/bazaar/MELON/history?')));
});

test('Auction House history is volume weighted and clipped to 90 days', () => {
  const rows = [
    { time: new Date(START - DAY).toISOString(), avg: 1, volume: 1000 },
    { time: new Date(START).toISOString(), avg: 100, volume: 1 },
    { time: new Date(MID).toISOString(), avg: 200, volume: 3 },
    { time: new Date(NOW).toISOString(), avg: 999, volume: 0 },
  ];
  const result = volumeWeightedAuctionAverage(rows, { startMs: START, endMs: NOW });
  assert.equal(result.coinsPerUnit, 175);
  assert.equal(result.volume, 4);
  assert.equal(result.sampleCount, 2);
});

test('legacy player-entered upgrade cost cannot override a 90-day market average', async () => {
  await withStorage(async () => {
    writeCachedMarketAverage({
      version: MARKET_AVERAGE_MODEL_VERSION,
      source: 'skycofl-90d',
      market: MARKET_KIND.BAZAAR,
      side: MARKET_SIDE.ACQUIRE,
      itemTag: 'ENCHANTMENT_HARVESTING_6',
      coinsPerUnit: 2_250_000,
      sampleCount: 90,
      windowDays: 90,
      windowStartMs: NOW - 90 * DAY,
      windowEndMs: NOW,
      computedAtMs: Date.now(),
      attributionUrl: 'https://sky.coflnet.com/data',
    });
    const resolved = resolveUpgradeCost({ costs: { 'tool-enchant-harvesting-vi': 1 } }, 'tool-enchant-harvesting-vi');
    assert.equal(resolved.coins, 2_250_000);
    assert.equal(resolved.origin, 'market-average');
    assert.equal(resolved.acquisitionMode, 'BUYABLE');
    assert.match(costOriginNote(resolved), /90-day Bazaar/);
  });
});

test('missing 90-day history is unknown rather than a stale research price', async () => {
  await withStorage(async () => {
    const resolved = resolveUpgradeCost({}, 'tool-enchant-harvesting-vi');
    assert.equal(resolved.coins, 0);
    assert.equal(resolved.origin, 'unknown');
    assert.equal(resolved.acquisitionMode, 'UNKNOWN');
    assert.match(resolved.reason, /90-day market average/);
  });
});
