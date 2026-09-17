export const LIVE_PRICE_MODEL_VERSION = 1;
export const BAZAAR_CACHE_STORAGE_KEY = 'farming420-bazaar-price-snapshot-v1';
export const DEFAULT_BAZAAR_CACHE_MAX_AGE_MS = 60_000;
export const DEFAULT_BAZAAR_SOURCE_MAX_AGE_MS = 5 * 60_000;

export const PRICE_INTENT = Object.freeze({
  ACQUIRE: 'acquire',
  LIQUIDATE: 'liquidate',
});

export const PRICE_SOURCE = Object.freeze({
  BAZAAR: 'hypixel-bazaar',
  NPC: 'hypixel-npc-sell',
  UNRESOLVED: 'unresolved',
});

function finiteNonNegative(value) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : null;
}

function finiteTimestamp(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}

function normalizeOrders(raw) {
  if (!Array.isArray(raw)) return Object.freeze([]);
  return Object.freeze(raw.map(order => {
    const amount = finiteNonNegative(order?.amount);
    const pricePerUnit = finiteNonNegative(order?.pricePerUnit);
    const orders = finiteNonNegative(order?.orders);
    if (amount == null || pricePerUnit == null) return null;
    return Object.freeze({ amount, pricePerUnit, orders });
  }).filter(Boolean));
}

/**
 * Normalize Hypixel's Bazaar payload without renaming the two market sides into
 * ambiguous "buy"/"sell" shortcuts.
 *
 * Official API semantics:
 * - quick_status.sellPrice = weighted average of the top 2% sell offers.
 * - quick_status.buyPrice  = weighted average of the top 2% buy orders.
 * Therefore an immediate acquisition quote uses sellPrice, while an immediate
 * liquidation quote uses buyPrice.
 */
export function normalizeBazaarPayload(payload, receivedAtMs = Date.now()) {
  const lastUpdatedMs = finiteTimestamp(payload?.lastUpdated);
  const products = payload?.products;
  if (payload?.success === false || !lastUpdatedMs || !products || typeof products !== 'object' || Array.isArray(products)) {
    return Object.freeze({
      version: LIVE_PRICE_MODEL_VERSION,
      complete: false,
      source: PRICE_SOURCE.BAZAAR,
      lastUpdatedMs,
      receivedAtMs: finiteTimestamp(receivedAtMs),
      products: Object.freeze({}),
      error: 'Hypixel Bazaar payload is missing lastUpdated/products data.',
    });
  }

  const normalized = {};
  for (const [fallbackId, raw] of Object.entries(products)) {
    const productId = String(raw?.product_id || raw?.quick_status?.productId || fallbackId || '').trim();
    if (!productId) continue;
    const quick = raw?.quick_status || {};
    normalized[productId] = Object.freeze({
      productId,
      weightedSellOfferPriceCoins: finiteNonNegative(quick.sellPrice),
      weightedBuyOrderPriceCoins: finiteNonNegative(quick.buyPrice),
      sellVolume: finiteNonNegative(quick.sellVolume),
      buyVolume: finiteNonNegative(quick.buyVolume),
      sellMovingWeek: finiteNonNegative(quick.sellMovingWeek),
      buyMovingWeek: finiteNonNegative(quick.buyMovingWeek),
      sellOrders: finiteNonNegative(quick.sellOrders),
      buyOrders: finiteNonNegative(quick.buyOrders),
      sellSummary: normalizeOrders(raw?.sell_summary),
      buySummary: normalizeOrders(raw?.buy_summary),
    });
  }

  return Object.freeze({
    version: LIVE_PRICE_MODEL_VERSION,
    complete: true,
    source: PRICE_SOURCE.BAZAAR,
    lastUpdatedMs,
    receivedAtMs: finiteTimestamp(receivedAtMs),
    products: Object.freeze(normalized),
    error: null,
  });
}

/** Official item resources expose exact npc_sell_price where one exists. */
export function normalizeNpcSellPriceResource(payload, receivedAtMs = Date.now()) {
  const rows = {};
  for (const item of (Array.isArray(payload?.items) ? payload.items : [])) {
    const id = String(item?.id || '').trim();
    const npcSellPriceCoins = finiteNonNegative(item?.npc_sell_price);
    if (!id || npcSellPriceCoins == null) continue;
    rows[id] = Object.freeze({ itemId: id, npcSellPriceCoins });
  }
  return Object.freeze({
    version: LIVE_PRICE_MODEL_VERSION,
    complete: Array.isArray(payload?.items),
    source: PRICE_SOURCE.NPC,
    lastUpdatedMs: finiteTimestamp(payload?.lastUpdated),
    receivedAtMs: finiteTimestamp(receivedAtMs),
    prices: Object.freeze(rows),
  });
}

export function bazaarSnapshotFresh(snapshot, {
  nowMs = Date.now(),
  maxCacheAgeMs = DEFAULT_BAZAAR_CACHE_MAX_AGE_MS,
  maxSourceAgeMs = DEFAULT_BAZAAR_SOURCE_MAX_AGE_MS,
} = {}) {
  if (snapshot?.complete !== true) return false;
  const received = finiteTimestamp(snapshot?.receivedAtMs);
  const source = finiteTimestamp(snapshot?.lastUpdatedMs);
  const now = finiteTimestamp(nowMs);
  if (!received || !source || !now) return false;
  const receivedAge = now - received;
  const sourceAge = now - source;
  return receivedAge >= 0 && sourceAge >= 0
    && receivedAge <= maxCacheAgeMs
    && sourceAge <= maxSourceAgeMs;
}

function bazaarQuote(snapshot, itemId, intent, options = {}) {
  const id = String(itemId || '').trim();
  const product = snapshot?.products?.[id];
  const fresh = bazaarSnapshotFresh(snapshot, options);
  if (!product || !fresh) return null;

  if (intent === PRICE_INTENT.ACQUIRE) {
    const price = finiteNonNegative(product.weightedSellOfferPriceCoins);
    if (price == null) return null;
    return Object.freeze({
      complete: true,
      itemId: id,
      intent,
      source: PRICE_SOURCE.BAZAAR,
      marketSide: 'sell-offer',
      method: 'quick-status-weighted-top-2-percent',
      coinsPerUnit: price,
      lastUpdatedMs: snapshot.lastUpdatedMs,
    });
  }

  if (intent === PRICE_INTENT.LIQUIDATE) {
    const price = finiteNonNegative(product.weightedBuyOrderPriceCoins);
    if (price == null) return null;
    return Object.freeze({
      complete: true,
      itemId: id,
      intent,
      source: PRICE_SOURCE.BAZAAR,
      marketSide: 'buy-order',
      method: 'quick-status-weighted-top-2-percent',
      coinsPerUnit: price,
      lastUpdatedMs: snapshot.lastUpdatedMs,
    });
  }
  return null;
}

function npcQuote(snapshot, itemId, intent) {
  if (intent !== PRICE_INTENT.LIQUIDATE) return null;
  const id = String(itemId || '').trim();
  const price = finiteNonNegative(snapshot?.prices?.[id]?.npcSellPriceCoins);
  if (price == null) return null;
  return Object.freeze({
    complete: true,
    itemId: id,
    intent,
    source: PRICE_SOURCE.NPC,
    marketSide: 'npc-sell',
    method: 'official-item-resource',
    coinsPerUnit: price,
    lastUpdatedMs: snapshot?.lastUpdatedMs || null,
    constraints: Object.freeze(['NPC sell limits/caps are not modeled by this unit quote.']),
  });
}

/**
 * Return every verified candidate. The caller may display/compare them without
 * losing provenance. No Auction House/BIN estimate is fabricated here.
 */
export function priceCandidates({ bazaar, npc, itemId, intent, nowMs = Date.now() } = {}) {
  const normalizedIntent = String(intent || '').trim().toLowerCase();
  if (!Object.values(PRICE_INTENT).includes(normalizedIntent)) return Object.freeze([]);
  const rows = [];
  const market = bazaarQuote(bazaar, itemId, normalizedIntent, { nowMs });
  if (market) rows.push(market);
  const npcRow = npcQuote(npc, itemId, normalizedIntent);
  if (npcRow) rows.push(npcRow);
  return Object.freeze(rows);
}

/**
 * Conservative default for optimizer plumbing:
 * - acquisition: Bazaar sell-offer quote only;
 * - liquidation: Bazaar buy-order quote first, NPC only as fallback.
 *
 * Choosing the mathematically highest liquidation route is a separate strategy
 * decision because NPC caps and account context can make an NPC quote unusable.
 */
export function resolveUnitPrice({ bazaar, npc, itemId, intent, nowMs = Date.now() } = {}) {
  const candidates = priceCandidates({ bazaar, npc, itemId, intent, nowMs });
  const market = candidates.find(row => row.source === PRICE_SOURCE.BAZAAR);
  const fallback = candidates.find(row => row.source === PRICE_SOURCE.NPC);
  const selected = market || fallback || null;
  if (selected) return Object.freeze({ ...selected, candidates });
  return Object.freeze({
    complete: false,
    itemId: String(itemId || '').trim() || null,
    intent: Object.values(PRICE_INTENT).includes(intent) ? intent : null,
    source: PRICE_SOURCE.UNRESOLVED,
    coinsPerUnit: null,
    candidates,
    reason: 'No fresh official Bazaar quote or applicable NPC sell price is available. AH/BIN prices require a separate source.',
  });
}

function storage() {
  try { return globalThis.localStorage ?? null; } catch { return null; }
}

export function readCachedBazaarSnapshot() {
  try {
    const raw = storage()?.getItem(BAZAAR_CACHE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.version === LIVE_PRICE_MODEL_VERSION ? parsed : null;
  } catch { return null; }
}

export function writeCachedBazaarSnapshot(snapshot) {
  try { storage()?.setItem(BAZAAR_CACHE_STORAGE_KEY, JSON.stringify(snapshot)); }
  catch { /* Cache failure must never break price evaluation. */ }
}

/** Fetches only when the short-lived Bazaar cache is no longer fresh. */
export async function loadBazaarSnapshot({ fetchBazaar, force = false, nowMs = Date.now() } = {}) {
  const cached = readCachedBazaarSnapshot();
  if (!force && bazaarSnapshotFresh(cached, { nowMs })) {
    return Object.freeze({ snapshot: cached, fromCache: true, error: null });
  }
  if (typeof fetchBazaar !== 'function') {
    return Object.freeze({ snapshot: cached, fromCache: Boolean(cached), error: 'No Bazaar fetch function is available.' });
  }
  try {
    const payload = await fetchBazaar();
    const snapshot = normalizeBazaarPayload(payload, nowMs);
    if (!snapshot.complete) throw new Error(snapshot.error);
    writeCachedBazaarSnapshot(snapshot);
    return Object.freeze({ snapshot, fromCache: false, error: null });
  } catch (error) {
    return Object.freeze({
      snapshot: cached,
      fromCache: Boolean(cached),
      error: `Live Bazaar prices could not be loaded: ${error.message}`,
    });
  }
}
