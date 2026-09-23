/**
 * Crop valuation from rolling 90-day Bazaar history.
 *
 * Prices are read-only inputs to profit calculations. Legacy manually entered
 * coin fields may still exist in old backups, but are deliberately ignored.
 */
import { HARVEST_FEAST_RARE_CROPS, cropModel } from './farming-mechanics-data.js';
import {
  MARKET_KIND,
  MARKET_SIDE,
  marketAverageDescriptor,
  marketAverageLabel,
  readCachedMarketAverage,
} from './market-average-prices.js';

export const AVERAGE_CROP_PRICE_STATUS = Object.freeze({
  AVERAGE: 'average',
  NO_PRODUCT: 'no-product',
  NO_QUOTE: 'no-quote',
  UNKNOWN_CROP: 'unknown-crop',
});

export function cropBazaarProductId(cropId) {
  const model = cropModel(cropId);
  const itemId = String(model?.itemId || '').trim();
  if (!itemId || itemId.includes('/')) return null;
  return itemId;
}

export function cropMarketDescriptor(cropId) {
  const productId = cropBazaarProductId(cropId);
  return productId
    ? marketAverageDescriptor({ market: MARKET_KIND.BAZAAR, itemTag: productId, side: MARKET_SIDE.LIQUIDATE })
    : null;
}

export function harvestFeastMarketDescriptor(cropId) {
  const itemTag = String(HARVEST_FEAST_RARE_CROPS[cropId]?.itemId || '').trim();
  return itemTag
    ? marketAverageDescriptor({ market: MARKET_KIND.BAZAAR, itemTag, side: MARKET_SIDE.LIQUIDATE })
    : null;
}

function quoteFor(descriptor, missingReason) {
  if (!descriptor) {
    return {
      status: AVERAGE_CROP_PRICE_STATUS.NO_PRODUCT,
      coinsPerUnit: null,
      reason: missingReason,
      productId: null,
      source: null,
      windowDays: 90,
    };
  }
  const quote = readCachedMarketAverage(descriptor);
  if (!quote) {
    return {
      status: AVERAGE_CROP_PRICE_STATUS.NO_QUOTE,
      coinsPerUnit: null,
      reason: 'the rolling 90-day Bazaar average is not cached yet or has no usable history',
      productId: descriptor.itemTag,
      source: null,
      windowDays: 90,
    };
  }
  return {
    status: AVERAGE_CROP_PRICE_STATUS.AVERAGE,
    coinsPerUnit: Number(quote.coinsPerUnit),
    reason: null,
    productId: descriptor.itemTag,
    source: quote.source,
    windowDays: quote.windowDays,
    sampleCount: quote.sampleCount,
    market: quote.market,
    side: quote.side,
  };
}

export function averageCropUnitPrice(cropId) {
  if (!cropModel(cropId)) {
    return {
      status: AVERAGE_CROP_PRICE_STATUS.UNKNOWN_CROP,
      coinsPerUnit: null,
      reason: 'this crop has no model in the app',
      productId: null,
      source: null,
      windowDays: 90,
    };
  }
  return quoteFor(
    cropMarketDescriptor(cropId),
    'this crop drops more than one item, so it has no single Bazaar price',
  );
}

export function averageHarvestFeastMaterialPrice(cropId) {
  return quoteFor(
    harvestFeastMarketDescriptor(cropId),
    'this crop has no Harvest Feast material model',
  );
}

export function averageCropPriceNote(price) {
  if (price?.status !== AVERAGE_CROP_PRICE_STATUS.AVERAGE) {
    return price?.reason || '90-day market average unavailable';
  }
  return marketAverageLabel({
    market: price.market || MARKET_KIND.BAZAAR,
    side: price.side || MARKET_SIDE.LIQUIDATE,
  }) + ' · SkyCofl';
}
