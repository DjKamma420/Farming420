import { CROPS } from './data.js';
import { HARVEST_FEAST_RARE_CROPS } from './farming-mechanics-data.js';
import { cropMarketDescriptor, harvestFeastMarketDescriptor } from './average-crop-price.js';
import { allUpgradeMarketDescriptors } from './upgrade-market-routes.js';
import { loadMarketAverage, marketAverageKey } from './market-average-prices.js';

const CONCURRENCY = 4;

function descriptors() {
  const rows = [
    ...CROPS.map(crop => cropMarketDescriptor(crop.id)),
    ...CROPS.map(crop => harvestFeastMarketDescriptor(crop.id)),
    ...allUpgradeMarketDescriptors(),
  ].filter(Boolean);

  // The Feast table is intentionally referenced here so a renamed/removed
  // material cannot silently leave dead prefetch code behind.
  void HARVEST_FEAST_RARE_CROPS;

  const unique = new Map();
  rows.forEach(row => unique.set(marketAverageKey(row), row));
  return [...unique.values()];
}

export async function refreshMarketAverages({ force = false } = {}) {
  const queue = descriptors();
  let updated = 0;
  const worker = async () => {
    while (queue.length) {
      const descriptor = queue.shift();
      const result = await loadMarketAverage(descriptor, { force });
      if (result.quote && !result.fromCache) updated += 1;
    }
  };
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, queue.length || 1) }, worker));
  if (updated > 0) window.dispatchEvent(new Event('farming420:market-average-updated'));
  return updated;
}

function boot() {
  refreshMarketAverages().catch(() => {});
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
else boot();
