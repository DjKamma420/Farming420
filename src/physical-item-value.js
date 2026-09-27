import { FARMING_REFORGES_BY_FAMILY, capabilityFamilyForSlot } from './item-capabilities.js';
import { intrinsicEnchantmentsForCatalogItem } from './item-catalog.js';
import { parseGem } from './item-editor.js';
import {
  MARKET_KIND,
  MARKET_SIDE,
  loadMarketAverage,
  marketAverageDescriptor,
  readCachedMarketAverage,
} from './market-average-prices.js';

function marketAlternatives(itemTag, preferredMarket = MARKET_KIND.BAZAAR) {
  const primary = Object.values(MARKET_KIND).includes(preferredMarket)
    ? preferredMarket
    : MARKET_KIND.BAZAAR;
  const secondary = primary === MARKET_KIND.BAZAAR
    ? MARKET_KIND.AUCTION_HOUSE
    : MARKET_KIND.BAZAAR;
  return Object.freeze(
    [primary, secondary]
      .map(market => marketAverageDescriptor({ market, itemTag, side: MARKET_SIDE.ACQUIRE }))
      .filter(Boolean),
  );
}

function component(id, label, itemTag, quantity = 1, {
  preferredMarket = MARKET_KIND.BAZAAR,
} = {}) {
  const normalizedQuantity = Math.max(1, Number(quantity) || 1);
  return Object.freeze({
    id,
    label,
    itemTag,
    quantity: normalizedQuantity,
    preferredMarket,
    alternatives: marketAlternatives(itemTag, preferredMarket),
  });
}

function baseMarketTag(slotId, item) {
  const id = String(item?.skyblockId || '').trim().toUpperCase();
  if (!id) return null;
  if (slotId === 'pet') return id.startsWith('PET_') ? id : `PET_${id}`;
  return id;
}

function reforgeComponent(slotId, item) {
  const reforge = String(item?.reforge || '').trim().toLowerCase();
  if (!reforge) return null;
  const family = capabilityFamilyForSlot(slotId);
  const row = (FARMING_REFORGES_BY_FAMILY[family] || []).find(entry => entry.id === reforge);
  return row?.itemId
    ? component(`reforge:${reforge}`, `${row.name} reforge stone`, row.itemId)
    : null;
}

function enchantMarketTag(key, level) {
  const normalizedKey = String(key || '').trim().toUpperCase();
  const normalizedLevel = Math.max(1, Math.floor(Number(level) || 1));
  if (!normalizedKey) return null;
  if (normalizedKey === 'PESTERMINATOR') return 'PESTHUNTING_GUIDE';
  if (normalizedKey === 'CULTIVATING') return 'ENCHANTMENT_CULTIVATING_1';
  return `ENCHANTMENT_${normalizedKey}_${normalizedLevel}`;
}

function enchantComponents(item) {
  const intrinsic = intrinsicEnchantmentsForCatalogItem({ id: item?.skyblockId });
  const rows = [];
  for (const [key, rawLevel] of Object.entries(item?.enchantments || {})) {
    const level = Math.max(0, Math.floor(Number(rawLevel) || 0));
    if (!level) continue;
    if (Number(intrinsic?.[key] || 0) >= level) continue;
    const tag = enchantMarketTag(key, level);
    if (!tag) continue;
    rows.push(component(
      `enchant:${key}`,
      `${String(key).replace(/_/g, ' ')} ${level}`,
      tag,
      1,
    ));
  }
  return rows;
}

function gemComponents(item) {
  return (Array.isArray(item?.gems) ? item.gems : []).flatMap((raw, index) => {
    const gem = parseGem(raw);
    if (!gem) return [];
    return [component(
      `gem:${index}`,
      gem.value,
      `${gem.quality}_${gem.type}_GEM`,
      1,
    )];
  });
}

export function physicalItemValueComponents(slotId, item, { extraComponents = [] } = {}) {
  if (!item || typeof item !== 'object') return Object.freeze([]);
  const rows = [];
  const baseTag = baseMarketTag(slotId, item);
  if (baseTag) {
    const preferredMarket = slotId === 'petItem'
      ? MARKET_KIND.BAZAAR
      : MARKET_KIND.AUCTION_HOUSE;
    rows.push(component('base', item.displayName || baseTag, baseTag, 1, { preferredMarket }));
  }

  const reforge = reforgeComponent(slotId, item);
  if (reforge) rows.push(reforge);

  if (item.recombobulated) {
    rows.push(component('recombobulator', 'Recombobulator 3000', 'RECOMBOBULATOR_3000'));
  }

  rows.push(...enchantComponents(item));
  rows.push(...gemComponents(item));

  for (const extra of extraComponents || []) {
    if (!extra?.itemTag || !(Number(extra.quantity) > 0)) continue;
    rows.push(component(
      String(extra.id || extra.itemTag),
      String(extra.label || extra.itemTag),
      String(extra.itemTag),
      Number(extra.quantity),
      { preferredMarket: extra.preferredMarket || MARKET_KIND.BAZAAR },
    ));
  }

  return Object.freeze(rows);
}

function pricedAlternative(componentRow, readQuote) {
  for (const descriptor of componentRow.alternatives || []) {
    const quote = readQuote(descriptor);
    const unit = Number(quote?.coinsPerUnit);
    if (!Number.isFinite(unit) || unit <= 0) continue;
    // Alternatives are ordered by market semantics, not price. A physical
    // base item prefers AH history; applied tradeable upgrades prefer Bazaar.
    // The second market is only a missing-history fallback, never arbitrage.
    return { descriptor, quote, coins: unit * componentRow.quantity };
  }
  return null;
}

export function physicalItemBuildValue(slotId, item, {
  extraComponents = [],
  readQuote = readCachedMarketAverage,
} = {}) {
  const components = physicalItemValueComponents(slotId, item, { extraComponents });
  const priced = [];
  const missing = [];

  for (const row of components) {
    const resolved = pricedAlternative(row, readQuote);
    if (resolved) priced.push(Object.freeze({ ...row, ...resolved }));
    else missing.push(row);
  }

  const totalCoins = priced.reduce((sum, row) => sum + row.coins, 0);
  const timestamps = priced
    .map(row => Number(row.quote?.computedAtMs))
    .filter(value => Number.isFinite(value) && value > 0);
  return Object.freeze({
    totalCoins: totalCoins > 0 ? totalCoins : null,
    computedAtMs: timestamps.length ? Math.min(...timestamps) : null,
    complete: components.length > 0 && missing.length === 0,
    componentCount: components.length,
    pricedCount: priced.length,
    priced: Object.freeze(priced),
    missing: Object.freeze(missing),
  });
}

export async function refreshPhysicalItemBuildValue(slotId, item, {
  extraComponents = [],
  fetchImpl = globalThis.fetch,
} = {}) {
  const components = physicalItemValueComponents(slotId, item, { extraComponents });
  const descriptors = new Map();
  for (const row of components) {
    for (const descriptor of row.alternatives || []) {
      descriptors.set(`${descriptor.market}:${descriptor.side}:${descriptor.itemTag}`, descriptor);
    }
  }

  let updated = 0;
  await Promise.all([...descriptors.values()].map(async descriptor => {
    const result = await loadMarketAverage(descriptor, { fetchImpl });
    if (result.quote && !result.fromCache) updated += 1;
  }));
  return updated;
}
