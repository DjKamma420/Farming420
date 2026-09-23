import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { UPGRADES } from '../src/data.js';
import { UPGRADE_COSTS } from '../src/upgrade-costs.js';
import { costOriginNote, resolveUpgradeCost } from '../src/upgrade-cost-resolution.js';
import { marketRoutesForUpgrade } from '../src/upgrade-market-routes.js';
import {
  MARKET_AVERAGE_MODEL_VERSION,
  MARKET_KIND,
  MARKET_SIDE,
  writeCachedMarketAverage,
} from '../src/market-average-prices.js';
import { rankEvaluatedUpgrades } from '../src/revenue-ranking.js';

const read = name => readFileSync(new URL(`../src/${name}`, import.meta.url), 'utf8');

const earnedId = Object.keys(UPGRADE_COSTS)
  .find(id => UPGRADE_COSTS[id]?.unit === 'time');
const unknownId = Object.keys(UPGRADE_COSTS)
  .find(id => UPGRADE_COSTS[id]?.unit === null && !(Number(UPGRADE_COSTS[id]?.coins) > 0));
const marketPricedId = 'tool-enchant-harvesting-vi';

async function withStorage(run) {
  const map = new Map();
  const previous = globalThis.localStorage;
  globalThis.localStorage = {
    getItem: key => map.has(key) ? map.get(key) : null,
    setItem: (key, value) => map.set(key, String(value)),
    removeItem: key => map.delete(key),
  };
  try { return await run(map); } finally { globalThis.localStorage = previous; }
}

function cacheBazaarAverage(itemTag, coinsPerUnit) {
  const now = Date.now();
  writeCachedMarketAverage({
    version: MARKET_AVERAGE_MODEL_VERSION,
    source: 'skycofl-90d',
    market: MARKET_KIND.BAZAAR,
    side: MARKET_SIDE.ACQUIRE,
    itemTag,
    coinsPerUnit,
    sampleCount: 90,
    windowDays: 90,
    windowStartMs: now - 90 * 24 * 60 * 60 * 1000,
    windowEndMs: now,
    computedAtMs: now,
    attributionUrl: 'https://sky.coflnet.com/data',
  });
}

test('the research table still distinguishes bought, earned and unknown routes', () => {
  assert.ok(
    Object.keys(UPGRADE_COSTS).some(id => UPGRADE_COSTS[id]?.unit === 'coins' && Number(UPGRADE_COSTS[id]?.coins) > 0),
    'no researched BUYABLE entry exists',
  );
  assert.ok(earnedId, 'no EARNED entry in the generated cost table');
  assert.ok(unknownId, 'no unknown entry in the generated cost table');
});

test('a buyable upgrade stays unknown until its 90-day market average is cached', async () => {
  await withStorage(async () => {
    const resolved = resolveUpgradeCost({ costs: { [marketPricedId]: 1234 } }, marketPricedId);
    assert.equal(resolved.coins, 0);
    assert.equal(resolved.origin, 'unknown');
    assert.equal(resolved.acquisitionMode, 'UNKNOWN');
    assert.match(resolved.reason, /90-day market average/);
  });
});

test('a cached 90-day market average wins even when a legacy player cost exists', async () => {
  await withStorage(async () => {
    cacheBazaarAverage('ENCHANTMENT_HARVESTING_6', 2_250_000);
    const resolved = resolveUpgradeCost({ costs: { [marketPricedId]: 1234 } }, marketPricedId);
    assert.equal(resolved.coins, 2_250_000);
    assert.equal(resolved.origin, 'market-average');
    assert.equal(resolved.acquisitionMode, 'BUYABLE');
    assert.match(costOriginNote(resolved), /90-day Bazaar/);
  });
});

test('EARNED route ignores legacy recorded coin components', () => {
  const resolved = resolveUpgradeCost({ costs: { [earnedId]: 2_000_000 } }, earnedId);
  assert.equal(resolved.acquisitionMode, 'EARNED');
  assert.equal(resolved.unit, 'time');
  assert.equal(resolved.directCoinCost, 0);
  assert.equal(resolved.coins, 0);
  assert.equal(resolved.origin, 'earned');
  assert.equal(costOriginNote(resolved), 'EARNED — enter active grind time');
});

test('an unclassified cost stays unknown instead of becoming zero-as-free', () => {
  for (const id of [unknownId, 'not-an-upgrade-id-at-all']) {
    const resolved = resolveUpgradeCost({ costs: { [id]: 99_999_999 } }, id);
    assert.equal(resolved.origin, 'unknown');
    assert.equal(resolved.acquisitionMode, 'UNKNOWN');
    assert.equal(resolved.coins, 0);
    assert.ok(resolved.reason, `no reason given for ${id}`);
    assert.equal(costOriginNote(resolved), resolved.reason);
  }
});

test('every currently static-priced active BUYABLE entry has an explicit 90-day market route', () => {
  const active = UPGRADES.filter(item => item.status === 'ACTIVE');
  const priced = active.filter(item => UPGRADE_COSTS[item.id]?.unit === 'coins' && Number(UPGRADE_COSTS[item.id]?.coins) > 0);
  assert.ok(priced.length > 0, 'the table prices nothing the planner shows');
  for (const item of priced) {
    assert.ok(marketRoutesForUpgrade(item.id, null), `${item.id} has no rolling-market route`);
  }
});

test('the planner resolves market routes and passes earned-time inputs into evaluation', () => {
  const planner = read('revenue-planner.js');
  assert.match(planner, /from '\.\/upgrade-cost-resolution\.js'/);
  assert.match(planner, /resolveUpgradeCost\(store, item\.id\)/);
  assert.match(planner, /costCoins: costSource\.coins/);
  assert.match(planner, /acquisitionMode: costSource\.acquisitionMode/);
  assert.match(planner, /activeGrindHours/);
  assert.match(planner, /timeValueCoinsPerHour: timeValue\.coinsPerHour/);
  assert.match(planner, /data-earned-hours/);
  assert.match(planner, /EARNED — time converted to coins/);
  assert.match(planner, /costOriginNote\(row\.costSource\)/);
  const spread = planner.indexOf('...evaluateUpgrade(');
  assert.ok(spread > 0);
  assert.ok(planner.indexOf('costSource,', spread) > spread);
});

test('with no profit baseline the ranking helper still orders known cheaper cost before dearer cost', () => {
  const cheap = { item: { id: 'cheap', name: 'Cheap' }, gain: 1, cost: 1_000_000,
    payback: null, marginalCoinsHour: null, fortuneEquivalent: 1, coinsPerEffectiveFortune: 1_000_000 };
  const dear = { item: { id: 'dear', name: 'Dear' }, gain: 1, cost: 50_000_000,
    payback: null, marginalCoinsHour: null, fortuneEquivalent: 1, coinsPerEffectiveFortune: 50_000_000 };
  const unpriced = { item: { id: 'unpriced', name: 'Unpriced' }, gain: 1, cost: 0,
    payback: null, marginalCoinsHour: null, fortuneEquivalent: 1, coinsPerEffectiveFortune: null };

  const order = rankEvaluatedUpgrades([unpriced, dear, cheap]).map(row => row.item.id);
  assert.deepEqual(order, ['cheap', 'dear', 'unpriced']);
});
