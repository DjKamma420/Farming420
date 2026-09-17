/**
 * The live Bazaar price for a crop, or a stated reason there is none.
 *
 * `src/live-prices.js` is a complete Bazaar model -- normalization, freshness,
 * caching, buy-order vs sell-offer sides, NPC fallback -- and nothing in the
 * app used it. Meanwhile the measured-baseline panel asked the player to look
 * up their own crop price, and the cost research says outright what should
 * happen instead:
 *
 *   "Fresh Hypixel Bazaar data must override snapshot prices whenever a Bazaar
 *    product exists."
 *   -- research/enchantment-costs-2026-09-17.json, runtimePriceRule
 *
 * The crop's Bazaar product id is not guessed here. `ACTIVE_CROP_MODELS`
 * already carries an `itemId` per crop, and the one entry that is a compound
 * (`RED_MUSHROOM/BROWN_MUSHROOM`, because a Garden mushroom layout can break
 * either) is reported as not-a-single-product rather than resolved to whichever
 * half comes first.
 *
 * The intent is LIQUIDATE: the player is selling crops, so the buy-order side
 * is what they actually receive, and `resolveUnitPrice` falls back to an NPC
 * sell price only where one exists.
 */
import { cropModel } from './farming-mechanics-data.js';
import { PRICE_INTENT, PRICE_SOURCE, readCachedBazaarSnapshot, resolveUnitPrice } from './live-prices.js';

export const CROP_PRICE_STATUS = Object.freeze({
  LIVE: 'live',
  NO_PRODUCT: 'no-product',
  NO_QUOTE: 'no-quote',
  UNKNOWN_CROP: 'unknown-crop',
});

/** The single Bazaar product id for a crop, or null when there is not one. */
export function cropBazaarProductId(cropId) {
  const model = cropModel(cropId);
  const itemId = String(model?.itemId || '').trim();
  if (!itemId) return null;
  // A compound id is two products, so it is not one price.
  if (itemId.includes('/')) return null;
  return itemId;
}

/**
 * What one unit of this crop currently sells for, and where that came from.
 *
 * Never returns a number without a source, and never returns zero for
 * "unknown": a crop priced at zero would make a farm look worthless, which is
 * a different claim from having no quote.
 */
export function liveCropUnitPrice(cropId, {
  snapshot = readCachedBazaarSnapshot(),
  npc = null,
  nowMs = Date.now(),
} = {}) {
  if (!cropModel(cropId)) {
    return {
      status: CROP_PRICE_STATUS.UNKNOWN_CROP,
      coinsPerUnit: null,
      reason: 'this crop has no model in the app',
      productId: null,
      source: null,
      ageSeconds: null,
    };
  }

  const productId = cropBazaarProductId(cropId);
  if (!productId) {
    return {
      status: CROP_PRICE_STATUS.NO_PRODUCT,
      coinsPerUnit: null,
      reason: 'this crop drops more than one item, so it has no single Bazaar price',
      productId: null,
      source: null,
      ageSeconds: null,
    };
  }

  const quote = resolveUnitPrice({
    bazaar: snapshot,
    npc,
    itemId: productId,
    intent: PRICE_INTENT.LIQUIDATE,
    nowMs,
  });

  if (!quote?.complete || !(Number(quote.coinsPerUnit) > 0)) {
    return {
      status: CROP_PRICE_STATUS.NO_QUOTE,
      coinsPerUnit: null,
      reason: quote?.reason || 'no fresh Bazaar quote is cached yet',
      productId,
      source: null,
      ageSeconds: null,
    };
  }

  const stamp = Number(snapshot?.lastUpdatedMs);
  return {
    status: CROP_PRICE_STATUS.LIVE,
    coinsPerUnit: Number(quote.coinsPerUnit),
    reason: null,
    productId,
    source: quote.source,
    ageSeconds: Number.isFinite(stamp) ? Math.max(0, Math.round((nowMs - stamp) / 1000)) : null,
  };
}

/**
 * One line naming the price's origin and how old it is.
 *
 * Short enough to sit under a form field. The engine's own reason for having no
 * quote is accurate and three lines long, so the no-quote case gets a sentence
 * the reader can act on instead; `price.reason` still carries the full text.
 */
export function liveCropPriceNote(price) {
  if (price?.status === CROP_PRICE_STATUS.NO_QUOTE) {
    return 'No live Bazaar price cached yet \u2014 enter your sell price.';
  }
  if (price?.status !== CROP_PRICE_STATUS.LIVE) return price?.reason || 'no live price';
  const where = price.source === PRICE_SOURCE.NPC ? 'NPC sell price' : 'live Bazaar';
  if (price.ageSeconds == null) return where;
  if (price.ageSeconds < 90) return `${where}, just now`;
  if (price.ageSeconds < 3600) return `${where}, ${Math.round(price.ageSeconds / 60)} min old`;
  return `${where}, ${Math.round(price.ageSeconds / 3600)} h old`;
}
