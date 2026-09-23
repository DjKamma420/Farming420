/**
 * Rolling 90-day market averages.
 *
 * Farming420 never asks the player to type a coin price. Bazaar and Auction
 * House values are read from SkyCofl history, reduced to one rolling 90-day
 * average, cached locally, and kept separate from live execution quotes.
 *
 * Source/API documentation: https://sky.coflnet.com/wiki/api
 * Attribution: https://sky.coflnet.com/data
 */
export const MARKET_AVERAGE_MODEL_VERSION = 1;
export const MARKET_AVERAGE_WINDOW_DAYS = 90;
export const MARKET_AVERAGE_WINDOW_MS = MARKET_AVERAGE_WINDOW_DAYS * 24 * 60 * 60 * 1000;
export const MARKET_AVERAGE_CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000;
export const MARKET_AVERAGE_CACHE_STORAGE_KEY = 'farming420-market-average-90d-v1';
export const MARKET_AVERAGE_SOURCE = 'skycofl-90d';

export const MARKET_KIND = Object.freeze({
  BAZAAR: 'bazaar',
  AUCTION_HOUSE: 'auction-house',
});

export const MARKET_SIDE = Object.freeze({
  ACQUIRE: 'acquire',
  LIQUIDATE: 'liquidate',
});

function finitePositive(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}

function stamp(value) {
  const ms = Date.parse(String(value || ''));
  return Number.isFinite(ms) ? ms : null;
}

function storage() {
  try { return globalThis.localStorage || null; } catch { return null; }
}

export function marketAverageDescriptor({ market, itemTag, side = MARKET_SIDE.ACQUIRE } = {}) {
  const normalizedMarket = Object.values(MARKET_KIND).includes(market) ? market : null;
  const normalizedSide = Object.values(MARKET_SIDE).includes(side) ? side : null;
  const normalizedTag = String(itemTag || '').trim();
  if (!normalizedMarket || !normalizedSide || !normalizedTag) return null;
  return Object.freeze({ market: normalizedMarket, itemTag: normalizedTag, side: normalizedSide });
}

export function marketAverageKey(descriptor) {
  const d = marketAverageDescriptor(descriptor);
  return d ? `${d.market}:${d.side}:${d.itemTag}` : null;
}

function readCacheMap() {
  try {
    const raw = storage()?.getItem(MARKET_AVERAGE_CACHE_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed?.version === MARKET_AVERAGE_MODEL_VERSION && parsed.quotes && typeof parsed.quotes === 'object'
      ? parsed
      : { version: MARKET_AVERAGE_MODEL_VERSION, quotes: {} };
  } catch {
    return { version: MARKET_AVERAGE_MODEL_VERSION, quotes: {} };
  }
}

function writeCacheMap(cache) {
  try { storage()?.setItem(MARKET_AVERAGE_CACHE_STORAGE_KEY, JSON.stringify(cache)); }
  catch { /* Market cache failure must not break the calculator. */ }
}

export function readCachedMarketAverage(descriptor, {
  nowMs = Date.now(),
  maxAgeMs = MARKET_AVERAGE_CACHE_MAX_AGE_MS,
} = {}) {
  const key = marketAverageKey(descriptor);
  if (!key) return null;
  const quote = readCacheMap().quotes[key];
  if (!quote || quote.version !== MARKET_AVERAGE_MODEL_VERSION) return null;
  const computedAtMs = Number(quote.computedAtMs);
  if (!Number.isFinite(computedAtMs) || nowMs - computedAtMs > maxAgeMs || computedAtMs > nowMs + 60_000) return null;
  return finitePositive(quote.coinsPerUnit) == null ? null : quote;
}

export function writeCachedMarketAverage(quote) {
  const key = marketAverageKey(quote);
  if (!key || finitePositive(quote?.coinsPerUnit) == null) return false;
  const cache = readCacheMap();
  cache.quotes[key] = quote;
  writeCacheMap(cache);
  return true;
}

export function timeWeightedAverage(rows, valueKey, {
  startMs,
  endMs,
} = {}) {
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) return null;
  const points = (Array.isArray(rows) ? rows : [])
    .map(row => ({ at: stamp(row?.timestamp ?? row?.time), value: finitePositive(row?.[valueKey]) }))
    .filter(row => row.at != null && row.value != null && row.at >= startMs && row.at <= endMs)
    .sort((a, b) => a.at - b.at);

  if (!points.length) return null;
  let weighted = 0;
  let weight = 0;
  for (let i = 0; i < points.length; i += 1) {
    const from = Math.max(startMs, points[i].at);
    const to = Math.min(endMs, i + 1 < points.length ? points[i + 1].at : endMs);
    const duration = Math.max(0, to - from);
    if (!(duration > 0)) continue;
    weighted += points[i].value * duration;
    weight += duration;
  }
  if (!(weight > 0)) return null;
  return { coinsPerUnit: weighted / weight, sampleCount: points.length };
}

export function volumeWeightedAuctionAverage(rows, {
  startMs,
  endMs,
} = {}) {
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) return null;
  let weighted = 0;
  let volume = 0;
  let sampleCount = 0;
  for (const row of Array.isArray(rows) ? rows : []) {
    const at = stamp(row?.time ?? row?.timestamp);
    const avg = finitePositive(row?.avg);
    const rowVolume = finitePositive(row?.volume);
    if (at == null || at < startMs || at > endMs || avg == null || rowVolume == null) continue;
    weighted += avg * rowVolume;
    volume += rowVolume;
    sampleCount += 1;
  }
  if (!(volume > 0)) return null;
  return { coinsPerUnit: weighted / volume, sampleCount, volume };
}

function payloadRows(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.prices)) return payload.prices;
  return [];
}

function quoteFromAverage(descriptor, average, nowMs) {
  if (!average || finitePositive(average.coinsPerUnit) == null) return null;
  return Object.freeze({
    version: MARKET_AVERAGE_MODEL_VERSION,
    source: MARKET_AVERAGE_SOURCE,
    market: descriptor.market,
    side: descriptor.side,
    itemTag: descriptor.itemTag,
    coinsPerUnit: average.coinsPerUnit,
    sampleCount: average.sampleCount || 0,
    volume: average.volume || null,
    windowDays: MARKET_AVERAGE_WINDOW_DAYS,
    windowStartMs: nowMs - MARKET_AVERAGE_WINDOW_MS,
    windowEndMs: nowMs,
    computedAtMs: nowMs,
    attributionUrl: 'https://sky.coflnet.com/data',
  });
}

export async function fetchMarketAverage(descriptor, {
  fetchImpl = globalThis.fetch,
  nowMs = Date.now(),
} = {}) {
  const d = marketAverageDescriptor(descriptor);
  if (!d) return { quote: null, error: 'Invalid market-average descriptor.' };
  if (typeof fetchImpl !== 'function') return { quote: null, error: 'No fetch function is available.' };

  const startMs = nowMs - MARKET_AVERAGE_WINDOW_MS;
  const endMs = nowMs;
  let url;
  let valueKey = null;

  if (d.market === MARKET_KIND.BAZAAR) {
    const start = new Date(startMs).toISOString();
    const end = new Date(endMs).toISOString();
    url = `https://sky.coflnet.com/api/bazaar/${encodeURIComponent(d.itemTag)}/history?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`;
    valueKey = d.side === MARKET_SIDE.ACQUIRE ? 'sell' : 'buy';
  } else {
    url = `https://sky.coflnet.com/api/item/price/${encodeURIComponent(d.itemTag)}/history/full`;
  }

  try {
    const response = await fetchImpl(url, { cache: 'no-store' });
    if (!response?.ok) return { quote: null, error: `Market history responded ${response?.status ?? 'without success'}.` };
    const payload = await response.json();
    const rows = payloadRows(payload);
    const average = d.market === MARKET_KIND.BAZAAR
      ? timeWeightedAverage(rows, valueKey, { startMs, endMs })
      : volumeWeightedAuctionAverage(rows, { startMs, endMs });
    const quote = quoteFromAverage(d, average, nowMs);
    return quote
      ? { quote, error: null }
      : { quote: null, error: `No usable ${MARKET_AVERAGE_WINDOW_DAYS}-day market history was returned.` };
  } catch (error) {
    return { quote: null, error: `Market history could not be loaded: ${error?.message || error}` };
  }
}

export async function loadMarketAverage(descriptor, {
  fetchImpl = globalThis.fetch,
  force = false,
  nowMs = Date.now(),
} = {}) {
  const cached = readCachedMarketAverage(descriptor, { nowMs });
  if (!force && cached) return { quote: cached, fromCache: true, error: null };

  const result = await fetchMarketAverage(descriptor, { fetchImpl, nowMs });
  if (result.quote) writeCachedMarketAverage(result.quote);
  return { ...result, fromCache: false };
}

export function marketAverageTimestampMs(quote) {
  const value = Number(quote?.computedAtMs);
  return Number.isFinite(value) && value > 0 ? value : null;
}

export function marketAverageTimestampLabel(quote) {
  const value = marketAverageTimestampMs(quote);
  if (value == null) return 'price time unavailable';
  const iso = new Date(value).toISOString();
  return `as of ${iso.slice(0, 16).replace('T', ' ')} UTC`;
}

export function marketAverageLabel(quote) {
  if (!quote) return '90-day market average unavailable';
  return quote.market === MARKET_KIND.AUCTION_HOUSE
    ? '90-day Auction House average'
    : quote.side === MARKET_SIDE.LIQUIDATE
      ? '90-day Bazaar sell-value average'
      : '90-day Bazaar buy-cost average';
}
