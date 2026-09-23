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
import {
  FARMING_SHARD_MARKET,
  shardsForAttributeStep,
} from './shard-price-model.js';

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
const traded = (itemTag, quantity = 1) => alternatives(
  [bz(itemTag, quantity)],
  [ah(itemTag, quantity)],
);

export const MARKET_COST_KIND = Object.freeze({
  ACQUISITION: 'acquisition',
  RECURRING_CONSUMABLE: 'recurring-consumable',
});

const MARKET_COST_CONTEXT = Object.freeze({
  'mixin-celestial-mason-jar': Object.freeze({
    costKind: MARKET_COST_KIND.RECURRING_CONSUMABLE,
    displayLabel: 'per use',
  }),
  'mixin-melon-juice-mixin': Object.freeze({
    costKind: MARKET_COST_KIND.RECURRING_CONSUMABLE,
    displayLabel: 'per use',
  }),
  'temporary-harvest-harbinger-v': Object.freeze({
    costKind: MARKET_COST_KIND.RECURRING_CONSUMABLE,
    displayLabel: 'per use',
  }),
  'temporary-buff-refined-dark-cacao-truffle-temporary-stack': Object.freeze({
    costKind: MARKET_COST_KIND.RECURRING_CONSUMABLE,
    displayLabel: 'per use',
  }),
});

export function marketCostContextForUpgrade(itemId) {
  return MARKET_COST_CONTEXT[String(itemId || '')] || Object.freeze({
    costKind: MARKET_COST_KIND.ACQUISITION,
    displayLabel: null,
  });
}

const SHARD_ENTRY_ROUTES = Object.freeze(Object.fromEntries(
  Object.entries(FARMING_SHARD_MARKET).map(([itemId, record]) => [
    itemId,
    alternatives(...record.itemTags.map(itemTag => [bz(itemTag)])),
  ]),
));

const SHARD_STEP_ROUTES = Object.freeze(Object.fromEntries(
  Object.entries(FARMING_SHARD_MARKET).map(([itemId, record]) => [
    itemId,
    Object.freeze(Object.fromEntries(
      Array.from({ length: 10 }, (_, index) => {
        const targetLevel = index + 1;
        const quantity = shardsForAttributeStep(itemId, targetLevel);
        return [
          targetLevel,
          alternatives(...record.itemTags.map(itemTag => [bz(itemTag, quantity)])),
        ];
      }),
    )),
  ]),
));

const ENTRY_ROUTES = Object.freeze({
  ...SHARD_ENTRY_ROUTES,
  'accessory-fermento-artifact': traded('FERMENTO_ARTIFACT'),
  'accessory-helianthus-relic': traded('HELIANTHUS_RELIC'),
  'jacob-accessory-anita-accessory-crop-bonus': route(ah('ANITA_ARTIFACT')),
  'temporary-atmospheric-filter-spring': route(ah('ATMOSPHERIC_FILTER')),
  'temporary-magic-8-ball-ff-roll': route(ah('MAGIC_8_BALL')),
  'mixin-celestial-mason-jar': route(bz('CELESTIAL_MASON_JAR')),
  'mixin-melon-juice-mixin': route(ah('MELON_JUICE_MIXIN')),
  'temporary-harvest-harbinger-v': route(ah('POTION_harvest_harbinger')),
  'temporary-buff-refined-dark-cacao-truffle-temporary-stack': route(bz('REFINED_DARK_CACOA_TRUFFLE')),
  'tool-overclocker-3000': traded('OVERCLOCKER_3000', 10),
  'tool-farming-for-dummies': traded('FARMING_FOR_DUMMIES', 5),
  'tool-recombobulator-effect-on-tool-stats': traded('RECOMBOBULATOR_3000'),
  'tool-gem-perfect-peridot-on-farming-tool': traded('PERFECT_PERIDOT_GEM'),
  'tool-reforge-blessed-reforge': traded('BLESSED_FRUIT'),
  'tool-reforge-bountiful-reforge': traded('GOLDEN_BALL'),
  'tool-reforge-earthy-reforge': traded('LARGE_WALNUT'),
  'tool-reforge-deep-fried-reforge': traded('HASHBROWN'),
  'tool-reforge-overpriced-reforge': traded('OVERPRICED_DRINK'),
  'vacuum-reforge-beady-pest-only-farming-fortune': traded('BEADY_EYES'),
  'armor-reforge-mossy-on-full-armor': traded('OVERGROWN_GRASS', 4),
  'armor-gem-perfect-peridot-on-full-armor': traded('PERFECT_PERIDOT_GEM', 4),
  'equipment-reforge-rooted-on-full-equipment': traded('BURROWING_SPORES', 4),
  'equipment-reforge-thorny-on-full-mythic-equipment-ff': traded('BLOOMING_THORNS', 4),
  'equipment-reforge-thorny-on-full-mythic-equipment-overbloom': traded('BLOOMING_THORNS', 4),
  'pet-item-green-bandana': traded('GREEN_BANDANA'),
  'pet-item-lucky-clover-poignant-lucky-clover': traded('POIGNANT_LUCKY_CLOVER'),
  'garden-chip-cropshot-chip': traded('CROPSHOT_GARDEN_CHIP'),
  'garden-chip-hypercharge-chip-next-level': traded('HYPERCHARGE_GARDEN_CHIP'),
  'garden-chip-rarefinder-chip': traded('RAREFINDER_CHIP'),
  'garden-chip-overdrive-chip': traded('OVERDRIVE_GARDEN_CHIP'),
  'garden-chip-quickdraw-chip': traded('QUICKDRAW_GARDEN_CHIP'),
  'garden-chip-synthesis-chip': traded('SYNTHESIS_GARDEN_CHIP'),
  'garden-chip-evergreen-chip': traded('EVERGREEN_GARDEN_CHIP'),
  'garden-chip-vermin-vaporizer-chip': traded('VERMIN_VAPORIZER_GARDEN_CHIP'),
  'garden-chip-mechamind-chip': traded('MECHAMIND_GARDEN_CHIP'),
  'garden-chip-sowledge-chip': traded('SOWLEDGE_GARDEN_CHIP'),
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
  ...SHARD_STEP_ROUTES,
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

export function stepMarketRoutesForUpgrade(itemId, targetLevel) {
  const id = String(itemId || '');
  if (targetLevel == null) return null;
  return STEP_ROUTES[id]?.[Number(targetLevel)] || null;
}

export function marketRoutesForUpgrade(itemId, targetLevel = null) {
  const id = String(itemId || '');
  if (targetLevel != null && STEP_ROUTES[id]) {
    return stepMarketRoutesForUpgrade(id, targetLevel);
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
  const timestamps = selected.quotes
    .map(row => Number(row.quote?.computedAtMs))
    .filter(value => Number.isFinite(value) && value > 0);
  return {
    complete: true,
    coins: selected.coins,
    quotes: selected.quotes,
    computedAtMs: timestamps.length ? Math.min(...timestamps) : null,
    source: 'skycofl-90d',
    marketLabel: markets.length === 1
      ? marketAverageLabel(selected.quotes[0].quote)
      : '90-day mixed-market average',
    windowDays: 90,
  };
}
