import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { UPGRADES } from '../src/data.js';
import { UPGRADE_COSTS } from '../src/upgrade-costs.js';
import { costOriginNote, resolveUpgradeCost } from '../src/upgrade-cost-resolution.js';
import { rankEvaluatedUpgrades } from '../src/revenue-ranking.js';

const read = name => readFileSync(new URL(`../src/${name}`, import.meta.url), 'utf8');

const pricedId = Object.keys(UPGRADE_COSTS)
  .find(id => UPGRADE_COSTS[id]?.unit === 'coins' && Number(UPGRADE_COSTS[id]?.coins) > 0);
const earnedId = Object.keys(UPGRADE_COSTS)
  .find(id => UPGRADE_COSTS[id]?.unit === 'time');
const unknownId = Object.keys(UPGRADE_COSTS)
  .find(id => UPGRADE_COSTS[id]?.unit === null && !(Number(UPGRADE_COSTS[id]?.coins) > 0));

test('the research table has BUYABLE, EARNED and unknown routes to resolve', () => {
  assert.ok(pricedId, 'no priced BUYABLE entry in the generated cost table');
  assert.ok(earnedId, 'no EARNED entry in the generated cost table');
  assert.ok(unknownId, 'no unknown entry in the generated cost table');
});

test('a price the player recorded wins over the research snapshot', () => {
  const store = { costs: { [pricedId]: 1234 } };
  const resolved = resolveUpgradeCost(store, pricedId);
  assert.equal(resolved.coins, 1234);
  assert.equal(resolved.origin, 'recorded');
  assert.equal(resolved.acquisitionMode, 'BUYABLE');
  assert.equal(costOriginNote(resolved), 'your recorded price');
});

test('the research snapshot is read when nothing is recorded', () => {
  const resolved = resolveUpgradeCost({ costs: {} }, pricedId);
  assert.equal(resolved.coins, UPGRADE_COSTS[pricedId].coins);
  assert.equal(resolved.origin, 'research');
  assert.equal(resolved.acquisitionMode, 'BUYABLE');
  assert.match(costOriginNote(resolved), /research/);
});

test('EARNED route is preserved instead of becoming zero-as-free', () => {
  const resolved = resolveUpgradeCost({ costs: {} }, earnedId);
  assert.equal(resolved.acquisitionMode, 'EARNED');
  assert.equal(resolved.unit, 'time');
  assert.equal(resolved.coins, 0);
  assert.equal(resolved.origin, 'earned');
  assert.equal(costOriginNote(resolved), 'EARNED — enter active grind time');
});

test('a recorded coin component on EARNED progression does not turn it BUYABLE', () => {
  const resolved = resolveUpgradeCost({ costs: { [earnedId]: 2_000_000 } }, earnedId);
  assert.equal(resolved.acquisitionMode, 'EARNED');
  assert.equal(resolved.directCoinCost, 2_000_000);
  assert.equal(resolved.coins, 2_000_000);
  assert.match(costOriginNote(resolved), /^EARNED/);
});

test('an unclassified cost stays unknown instead of becoming zero-as-free', () => {
  for (const id of [unknownId, 'not-an-upgrade-id-at-all']) {
    const resolved = resolveUpgradeCost({ costs: {} }, id);
    assert.equal(resolved.origin, 'unknown');
    assert.equal(resolved.acquisitionMode, 'UNKNOWN');
    assert.equal(resolved.coins, 0);
    assert.ok(resolved.reason, `no reason given for ${id}`);
    assert.equal(costOriginNote(resolved), resolved.reason);
  }
});

test('a recorded zero is not a recorded price', () => {
  const resolved = resolveUpgradeCost({ costs: { [unknownId]: 0 } }, unknownId);
  assert.equal(resolved.origin, 'unknown');
});

test('a stale snapshot says so rather than passing as current', () => {
  const stale = Object.keys(UPGRADE_COSTS)
    .filter(id => Number(UPGRADE_COSTS[id]?.coins) > 0)
    .find(id => UPGRADE_COSTS[id].priceStatus === 'STALE_FALLBACK_SNAPSHOT');
  if (!stale) return;
  assert.equal(costOriginNote(resolveUpgradeCost({}, stale)), 'research snapshot, stale');
});

test('the planner resolves routes and passes earned-time inputs into evaluation', () => {
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

test('every priced BUYABLE row the planner can show resolves to a positive cost', () => {
  const active = UPGRADES.filter(item => item.status === 'ACTIVE');
  const priced = active.filter(item => UPGRADE_COSTS[item.id]?.unit === 'coins' && Number(UPGRADE_COSTS[item.id]?.coins) > 0);
  assert.ok(priced.length > 0, 'the table prices nothing the planner shows');
  for (const item of priced) {
    const resolved = resolveUpgradeCost({ costs: {} }, item.id);
    assert.equal(resolved.acquisitionMode, 'BUYABLE', item.id);
    assert.ok(resolved.coins > 0, item.id);
  }
});

test('with no profit baseline the table still decides the order', () => {
  const cheap = { item: { id: 'cheap', name: 'Cheap' }, gain: 1, cost: 1_000_000,
    payback: null, marginalCoinsHour: null, fortuneEquivalent: 1, coinsPerEffectiveFortune: 1_000_000 };
  const dear = { item: { id: 'dear', name: 'Dear' }, gain: 1, cost: 50_000_000,
    payback: null, marginalCoinsHour: null, fortuneEquivalent: 1, coinsPerEffectiveFortune: 50_000_000 };
  const unpriced = { item: { id: 'unpriced', name: 'Unpriced' }, gain: 1, cost: 0,
    payback: null, marginalCoinsHour: null, fortuneEquivalent: 1, coinsPerEffectiveFortune: null };

  const order = rankEvaluatedUpgrades([unpriced, dear, cheap]).map(row => row.item.id);
  assert.deepEqual(order, ['cheap', 'dear', 'unpriced']);
});
