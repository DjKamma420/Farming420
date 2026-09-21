import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { CROPS } from '../src/data.js';
import { cropModel } from '../src/farming-mechanics-data.js';
import { PRICE_SOURCE, normalizeBazaarPayload } from '../src/live-prices.js';
import {
  CROP_PRICE_STATUS,
  cropBazaarProductId,
  liveCropPriceNote,
  liveCropUnitPrice,
  liveHarvestFeastMaterialPrice,
} from '../src/live-crop-price.js';

/**
 * `src/live-prices.js` was a complete Bazaar model reached by nothing, while
 * every price in the app came from a research snapshot -- several of which the
 * research itself flags `STALE_FALLBACK_SNAPSHOT`. That research states the
 * runtime rule directly: "Fresh Hypixel Bazaar data must override snapshot
 * prices whenever a Bazaar product exists."
 */

const read = name => readFileSync(new URL(`../src/${name}`, import.meta.url), 'utf8');
const NOW = 1_800_000_000_000;

function snapshotWith(products, { sourceAgeMs = 20_000, receivedAgeMs = 5_000 } = {}) {
  return normalizeBazaarPayload(
    { success: true, lastUpdated: NOW - sourceAgeMs, products },
    NOW - receivedAgeMs,
  );
}

const MELON = snapshotWith({
  MELON: { product_id: 'MELON', quick_status: { sellPrice: 6.4, buyPrice: 5.9 } },
});

test('the product id comes from the crop model, never from the crop name', () => {
  // Guessing `MELON` from "melon" happens to work and `CARROT_ITEM` does not,
  // which is exactly why the id is data.
  assert.equal(cropBazaarProductId('melon'), cropModel('melon').itemId);
  assert.equal(cropBazaarProductId('carrot'), 'CARROT_ITEM');
  assert.doesNotMatch(read('live-crop-price.js'), /toUpperCase\(\)/);
});

test('a crop that drops two different items has no single price', () => {
  // `RED_MUSHROOM/BROWN_MUSHROOM`: a Garden mushroom layout can break either,
  // so resolving it to whichever half comes first would be a made-up price.
  assert.match(cropModel('mushroom').itemId, /\//);
  assert.equal(cropBazaarProductId('mushroom'), null);
  const price = liveCropUnitPrice('mushroom', { snapshot: MELON, nowMs: NOW });
  assert.equal(price.status, CROP_PRICE_STATUS.NO_PRODUCT);
  assert.equal(price.coinsPerUnit, null);
  assert.match(price.reason, /more than one item/);
});

test('every crop either resolves to one product id or says why not', () => {
  for (const crop of CROPS) {
    const id = cropBazaarProductId(crop.id);
    if (id === null) {
      const price = liveCropUnitPrice(crop.id, { snapshot: MELON, nowMs: NOW });
      assert.ok(price.reason, `${crop.id} has neither a product id nor a reason`);
    } else {
      assert.doesNotMatch(id, /\//, crop.id);
    }
  }
});

test('a live quote is the side the player actually receives', () => {
  // Selling crops means the buy-order side, not the sell-offer side. Using the
  // higher number would overstate every farm in the app.
  const price = liveCropUnitPrice('melon', { snapshot: MELON, nowMs: NOW });
  assert.equal(price.status, CROP_PRICE_STATUS.LIVE);
  assert.equal(price.coinsPerUnit, 5.9);
  assert.equal(price.source, PRICE_SOURCE.BAZAAR);
  assert.equal(price.productId, 'MELON');
  assert.equal(price.ageSeconds, 20);
  assert.equal(liveCropPriceNote(price), 'live Bazaar, just now');
});

test('a stale snapshot is not a live price', () => {
  // `bazaarSnapshotFresh` owns this decision, and the point of going through it
  // is that an hour-old number is never shown as current.
  const stale = snapshotWith(
    { MELON: { product_id: 'MELON', quick_status: { sellPrice: 6.4, buyPrice: 5.9 } } },
    { sourceAgeMs: 3_600_000, receivedAgeMs: 3_600_000 },
  );
  const price = liveCropUnitPrice('melon', { snapshot: stale, nowMs: NOW });
  assert.equal(price.status, CROP_PRICE_STATUS.NO_QUOTE);
  assert.equal(price.coinsPerUnit, null);
});

test('no snapshot is no price, not a zero', () => {
  // A crop priced at zero would make a farm look worthless, which is a
  // different claim from having no quote.
  for (const snapshot of [null, undefined, {}, { complete: false }]) {
    const price = liveCropUnitPrice('melon', { snapshot, nowMs: NOW });
    assert.equal(price.coinsPerUnit, null);
    assert.equal(price.status, CROP_PRICE_STATUS.NO_QUOTE);
  }
});

test('an unknown crop is named as such', () => {
  const price = liveCropUnitPrice('not-a-crop', { snapshot: MELON, nowMs: NOW });
  assert.equal(price.status, CROP_PRICE_STATUS.UNKNOWN_CROP);
  assert.equal(price.coinsPerUnit, null);
  assert.match(price.reason, /no model/);
});

test('the note fits under a form field and stays actionable', () => {
  const noQuote = liveCropUnitPrice('melon', { snapshot: null, nowMs: NOW });
  const note = liveCropPriceNote(noQuote);
  assert.ok(note.length < 60, `"${note}" is too long for a field hint`);
  assert.match(note, /enter your sell price/);
  // The full engine reason is still carried, just not shown here.
  assert.ok(noQuote.reason.length > note.length);
});

test('age is reported in units a reader can judge', () => {
  const cases = [
    [20_000, 'live Bazaar, just now'],
    [600_000, 'live Bazaar, 10 min old'],
    [7_200_000, 'live Bazaar, 2 h old'],
  ];
  for (const [ageMs, expected] of cases) {
    // Freshness is judged on the cache age, so keep that young and vary only
    // the source stamp.
    const price = {
      status: CROP_PRICE_STATUS.LIVE,
      source: PRICE_SOURCE.BAZAAR,
      ageSeconds: Math.round(ageMs / 1000),
    };
    assert.equal(liveCropPriceNote(price), expected);
  }
});


test('Harvest Feast material price uses the sourced material id and Bazaar liquidation side', () => {
  const snapshot = snapshotWith({
    MELON_JUICE: { product_id: 'MELON_JUICE', quick_status: { sellPrice: 910_000, buyPrice: 875_000 } },
  });
  const price = liveHarvestFeastMaterialPrice('melon', { snapshot, nowMs: NOW });
  assert.equal(price.status, CROP_PRICE_STATUS.LIVE);
  assert.equal(price.productId, 'MELON_JUICE');
  assert.equal(price.coinsPerUnit, 875_000);
  assert.equal(price.source, PRICE_SOURCE.BAZAAR);
});
