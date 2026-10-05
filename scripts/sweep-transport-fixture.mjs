import { marketHistoryUrl } from './browser-error-classification.mjs';

/** Optional native regression fixture; ordinary sweeps never install routes. */
export async function installSweepTransportFixture(page, mode, baseUrl) {
  if (!mode) return null;
  if (!['failed', 'cors', 'local'].includes(mode)) throw new Error('Unknown sweep transport fixture: ' + mode);
  await page.route(url => Boolean(marketHistoryUrl(url.href)), route => mode === 'cors'
    ? route.fulfill({ status: 200, contentType: 'application/json', body: '[]',
      headers: { 'access-control-allow-origin': 'https://unrelated.invalid' } })
    : route.abort('failed'));
  const localUrl = mode === 'local' ? new URL('/api/bazaar/WHEAT/history', baseUrl).href : null;
  if (localUrl) await page.route(localUrl, route => route.abort('failed'));
  return async () => page.evaluate(async ({ mode, localUrl }) => {
    const market = await import('./src/market-average-prices.js');
    const results = [];
    for (const descriptor of [
      { market: market.MARKET_KIND.BAZAAR, itemTag: 'WHEAT', side: market.MARKET_SIDE.ACQUIRE },
      { market: market.MARKET_KIND.AUCTION_HOUSE, itemTag: 'RAREFINDER_CHIP', side: market.MARKET_SIDE.ACQUIRE },
    ]) {
      const result = await market.loadMarketAverage(descriptor, { force: true });
      const cached = market.readCachedMarketAverage(descriptor);
      if (result.quote !== null || !result.error || cached !== null) {
        throw new Error('Rejected history became a known/cached market price: ' + descriptor.itemTag);
      }
      results.push({ itemTag: descriptor.itemTag, quote: result.quote, cached, error: result.error });
    }
    if (localUrl) {
      let rejected = false;
      try { await fetch(localUrl); } catch { rejected = true; }
      if (!rejected) throw new Error('Local transport negative control did not reject');
    }
    return { mode, results, localUrl };
  }, { mode, localUrl });
}

/** Require observable native diagnostics, so a silent/unexercised fixture fails. */
export function transportFixtureErrors(fixture, notes) {
  if (!fixture) return [];
  const errors = [];
  for (const path of ['/api/bazaar/WHEAT/history', '/api/item/price/RAREFINDER_CHIP/history/full']) {
    const matches = notes.filter(note => new URL(note.url).pathname === path);
    if (!matches.length) errors.push('MARKET_TRANSPORT_FIXTURE_NOT_OBSERVED: ' + path);
    if (fixture.mode === 'cors' && !matches.some(note => note.message.startsWith('Access to fetch at '))) {
      errors.push('MARKET_CORS_FIXTURE_NOT_OBSERVED: ' + path);
    }
  }
  return errors;
}
