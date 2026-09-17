import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { UPGRADES } from '../src/data.js';
import { UPGRADE_COSTS } from '../src/upgrade-costs.js';
import { costOriginNote, resolveUpgradeCost } from '../src/upgrade-cost-resolution.js';
import { rankEvaluatedUpgrades } from '../src/revenue-ranking.js';

const read = name => readFileSync(new URL(`../src/${name}`, import.meta.url), 'utf8');

const pricedId = Object.keys(UPGRADE_COSTS)
  .find(id => Number(UPGRADE_COSTS[id]?.coins) > 0);
const unpricedId = Object.keys(UPGRADE_COSTS)
  .find(id => !(Number(UPGRADE_COSTS[id]?.coins) > 0));

test('the research table has something to read on both sides', () => {
  assert.ok(pricedId, 'no priced entry in the generated cost table');
  assert.ok(unpricedId, 'no unpriced entry in the generated cost table');
});

test('a price the player recorded wins over the research snapshot', () => {
  const store = { costs: { [pricedId]: 1234 } };
  const resolved = resolveUpgradeCost(store, pricedId);
  assert.equal(resolved.coins, 1234);
  assert.equal(resolved.origin, 'recorded');
  assert.equal(costOriginNote(resolved), 'your recorded price');
});

test('the research snapshot is read when nothing is recorded', () => {
  const resolved = resolveUpgradeCost({ costs: {} }, pricedId);
  assert.equal(resolved.coins, UPGRADE_COSTS[pricedId].coins);
  assert.equal(resolved.origin, 'research');
  assert.match(costOriginNote(resolved), /research/);
});

test('an unknown cost stays unknown instead of becoming zero-as-free', () => {
  // `unknown != 0`: a zero cost would read as "free" and take first place in a
  // ranking sorted by value for money. The row carries a reason instead.
  for (const id of [unpricedId, 'not-an-upgrade-id-at-all']) {
    const resolved = resolveUpgradeCost({ costs: {} }, id);
    assert.equal(resolved.origin, 'unknown');
    assert.equal(resolved.coins, 0);
    assert.ok(resolved.reason, `no reason given for ${id}`);
    assert.equal(costOriginNote(resolved), resolved.reason);
  }
});

test('a recorded zero is not a recorded price', () => {
  const resolved = resolveUpgradeCost({ costs: { [unpricedId]: 0 } }, unpricedId);
  assert.equal(resolved.origin, 'unknown');
});

test('a stale snapshot says so rather than passing as current', () => {
  const stale = Object.keys(UPGRADE_COSTS)
    .filter(id => Number(UPGRADE_COSTS[id]?.coins) > 0)
    .find(id => UPGRADE_COSTS[id].priceStatus === 'STALE_FALLBACK_SNAPSHOT');
  if (!stale) return;
  assert.equal(costOriginNote(resolveUpgradeCost({}, stale)), 'research snapshot, stale');
});

test('the planner resolves every row through the shared table', () => {
  const planner = read('revenue-planner.js');
  assert.match(planner, /from '\.\/upgrade-cost-resolution\.js'/);
  assert.match(planner, /resolveUpgradeCost\(store, item\.id\)/);
  assert.match(planner, /costCoins: costSource\.coins/);
  // The cost cell names its origin, so a research average is never mistaken
  // for a price the player confirmed.
  assert.match(planner, /costOriginNote\(row\.costSource\)/);
  // `evaluateUpgrade` returns its own numeric `cost`; `costSource` has to be
  // attached after that spread or the spread silently wins.
  const spread = planner.indexOf('...evaluateUpgrade(');
  assert.ok(spread > 0);
  assert.ok(planner.indexOf('costSource,', spread) > spread);
});

test('every priced row the planner can show resolves to a positive cost', () => {
  const active = UPGRADES.filter(item => item.status === 'ACTIVE');
  const priced = active.filter(item => Number(UPGRADE_COSTS[item.id]?.coins) > 0);
  assert.ok(priced.length > 0, 'the table prices nothing the planner shows');
  for (const item of priced) {
    assert.ok(resolveUpgradeCost({ costs: {} }, item.id).coins > 0, item.id);
  }
});

test('with no profit baseline the table still decides the order', () => {
  // This is the point of reading the cost table: "what do I pay per point of
  // Farming Fortune" needs no Coins/h, so the ranking is useful before the
  // player has measured anything.
  const cheap = { item: { id: 'cheap', name: 'Cheap' }, gain: 1, cost: 1_000_000,
    payback: null, marginalCoinsHour: null, fortuneEquivalent: 1, coinsPerEffectiveFortune: 1_000_000 };
  const dear = { item: { id: 'dear', name: 'Dear' }, gain: 1, cost: 50_000_000,
    payback: null, marginalCoinsHour: null, fortuneEquivalent: 1, coinsPerEffectiveFortune: 50_000_000 };
  const unpriced = { item: { id: 'unpriced', name: 'Unpriced' }, gain: 1, cost: 0,
    payback: null, marginalCoinsHour: null, fortuneEquivalent: 1, coinsPerEffectiveFortune: null };

  const order = rankEvaluatedUpgrades([unpriced, dear, cheap]).map(row => row.item.id);
  // An unknown cost is not a cheap one, so it follows the priced rows instead
  // of leading them the way a zero would.
  assert.deepEqual(order, ['cheap', 'dear', 'unpriced']);
});
