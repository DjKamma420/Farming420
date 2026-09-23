/**
 * Explicit market routes for upgrade coin costs.
 *
 * Item tags are source-backed SkyBlock/Bazaar IDs. No display-name guessing is
 * allowed here. A route can have alternatives; the cheapest fully priced
 * 90-day acquisition path wins.
 */
import {
  MARKET_KIND,
  MARKET_SIDE,
  marketAverageDescriptor,
  marketAverageLabel,
  readCachedMarketAverage,
} from './market-average-prices.js';

const bz = (itemTag, quantity = 1) => Object.freeze({
  market: MARKET_KIND.BAZAAR,
  itemTag,
  side: MARKET_SIDE.ACQUIRE,
  quantity,
});
const ah = (itemTag, quantity = 1) => Object.freeze({
  market: MARKET_KIND.AUCTION_HOUSE,
  itemTag,
  side: MARKET_SIDE.ACQUIRE,
  quantity,
});
const route = (...components) => Object.freeze([Object.freeze(components)]);
const alternatives = (...paths) => Object.freeze(paths.map(path => Object.freeze(path)));

const ENTRY_ROUTES = Object.freeze({
  'armor-enchant-pesterminator-vi-on-full-armor': route(bz('PESTHUNTING_GUIDE', 4)),
  'armor-enchant-sunset-v-day-overbloom': route(bz('ENCHANTMENT_SUNSET_5', 4)),
  'armor-helianthus-armor-base-stats': route(
    ah('HELIANTHUS_HELMET'), ah('HELIANTHUS_CHESTPLATE'), ah('HELIANTHUS_LEGGINGS'), ah('HELIANTHUS_BOOTS'),
  ),
  'chocolate-factory-refined-dark-cacao-permanent-bonus': route(bz('REFINED_DARK_CACOA_TRUFFLE', 5)),
  'consumable-feast-burger-permanent-overbloom': route(bz('FEAST_BURGER', 5)),
  'consumable-rosewater-flask-permanent-stacks': route(bz('FILLED_ROSEWATER_FLASK', 5)),
  'equipment-blossom-set-visitor-bonus': route(
    ah('BLOSSOM_NECKLACE'), ah('BLOSSOM_CLOAK'), ah('BLOSSOM_BELT'), ah('BLOSSOM_BRACELET'),
  ),
  'equipment-enchant-green-thumb-v-on-equipment': route(bz('ENCHANTMENT_GREEN_THUMB_5', 4)),
  'equipment-zorro-s-cape-contest-swap': route(ah('ZORROS_CAPE')),
  'tool-enchant-cultivating-x': route(bz('ENCHANTMENT_CULTIVATING_1')),
  'tool-enchant-dedication': route(bz('ENCHANTMENT_DEDICATION_4')),
  'tool-enchant-harvesting-vi': route(bz('ENCHANTMENT_HARVESTING_6')),
});

const STEP_ROUTES = Object.freeze({
  'tool-enchant-cultivating-x': Object.freeze({
    1: route(bz('ENCHANTMENT_CULTIVATING_1')),
  }),
  'tool-enchant-dedication': Object.freeze({
    1: route(bz('ENCHANTMENT_DEDICATION_1')),
    2: route(bz('ENCHANTMENT_DEDICATION_1')),
    3: alternatives(
      [bz('ENCHANTMENT_DEDICATION_2')],
      [bz('ENCHANTMENT_DEDICATION_1', 2)],
    ),
    4: route(bz('ENCHANTMENT_DEDICATION_4')),
  }),
  'chocolate-factory-refined-dark-cacao-permanent-bonus': Object.freeze({
    1: route(bz('REFINED_DARK_CACOA_TRUFFLE')),
    2: route(bz('REFINED_DARK_CACOA_TRUFFLE')),
    3: route(bz('REFINED_DARK_CACOA_TRUFFLE')),
    4: route(bz('REFINED_DARK_CACOA_TRUFFLE')),
    5: route(bz('REFINED_DARK_CACOA_TRUFFLE')),
  }),
  'consumable-feast-burger-permanent-overbloom': Object.freeze({
    1: route(bz('FEAST_BURGER')),
    2: route(bz('FEAST_BURGER')),
    3: route(bz('FEAST_BURGER')),
    4: route(bz('FEAST_BURGER')),
    5: route(bz('FEAST_BURGER')),
  }),
  'consumable-rosewater-flask-permanent-stacks': Object.freeze({
    1: route(bz('FILLED_ROSEWATER_FLASK')),
    2: route(bz('FILLED_ROSEWATER_FLASK')),
    3: route(bz('FILLED_ROSEWATER_FLASK')),
    4: route(bz('FILLED_ROSEWATER_FLASK')),
    5: route(bz('FILLED_ROSEWATER_FLASK')),
  }),
  'tool-farming-for-dummies': Object.freeze({
    1: route(bz('FARMING_FOR_DUMMIES')),
    2: route(bz('FARMING_FOR_DUMMIES')),
    3: route(bz('FARMING_FOR_DUMMIES')),
    4: route(bz('FARMING_FOR_DUMMIES')),
    5: route(bz('FARMING_FOR_DUMMIES')),
  }),
  'tool-overclocker-3000': Object.freeze(Object.fromEntries(
    Array.from({ length: 10 }, (_, index) => [index + 1, route(bz('OVERCLOCKER_3000'))]),
  )),
  'tool-recombobulator-effect-on-tool-stats': Object.freeze({
    1: route(bz('RECOMBOBULATOR_3000')),
  }),
});

export function marketRoutesForUpgrade(itemId, targetLevel = null) {
  const id = String(itemId || '');
  if (targetLevel != null && STEP_ROUTES[id]) {
    return STEP_ROUTES[id][Number(targetLevel)] || null;
  }
  return ENTRY_ROUTES[id] || null;
}

export function allUpgradeMarketDescriptors() {
  const out = new Map();
  const collect = routes => {
    for (const path of routes || []) {
      for (const component of path || []) {
        const descriptor = marketAverageDescriptor(component);
        if (!descriptor) continue;
        out.set(`${descriptor.market}:${descriptor.side}:${descriptor.itemTag}`, descriptor);
      }
    }
  };
  Object.values(ENTRY_ROUTES).forEach(collect);
  Object.values(STEP_ROUTES).forEach(levels => Object.values(levels).forEach(collect));
  return [...out.values()];
}

export function resolveUpgradeMarketAverage(itemId, targetLevel = null) {
  const routes = marketRoutesForUpgrade(itemId, targetLevel);
  if (!routes) return null;

  const complete = [];
  for (const path of routes) {
    let coins = 0;
    const quotes = [];
    let missing = false;
    for (const component of path) {
      const descriptor = marketAverageDescriptor(component);
      const quote = readCachedMarketAverage(descriptor);
      if (!quote) {
        missing = true;
        break;
      }
      const quantity = Math.max(1, Number(component.quantity) || 1);
      coins += Number(quote.coinsPerUnit) * quantity;
      quotes.push({ quote, quantity });
    }
    if (!missing && coins > 0) complete.push({ coins, quotes });
  }

  if (!complete.length) {
    return {
      complete: false,
      coins: null,
      reason: '90-day market average is loading or unavailable for this acquisition route',
    };
  }

  complete.sort((a, b) => a.coins - b.coins);
  const selected = complete[0];
  const markets = [...new Set(selected.quotes.map(row => row.quote.market))];
  return {
    complete: true,
    coins: selected.coins,
    quotes: selected.quotes,
    source: 'skycofl-90d',
    marketLabel: markets.length === 1
      ? marketAverageLabel(selected.quotes[0].quote)
      : '90-day mixed-market average',
    windowDays: 90,
  };
}
