import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { UPGRADE_COSTS, costForUpgrade, missingCostReason } from '../src/upgrade-costs.js';

/**
 * The link between the ranked upgrade entries and the price research.
 *
 * Before this existed, the two were disconnected data sets: the entries carried
 * no cost field and the research is keyed by SkyBlock item id, so nothing could
 * get from one to the other without a person reading a document. That is why
 * the planner had to ask for Coins/h by hand.
 */
const root = new URL('../', import.meta.url);
const read = path => readFileSync(new URL(path, root), 'utf8');

function upgradeEntries() {
  const src = read('src/data.js');
  const block = src.slice(src.indexOf('export const UPGRADES = ['));
  const body = block.slice(0, block.indexOf('\n];') + 3);
  const ids = [...body.matchAll(/"id":\s*"([\w-]+)"/g)].map(m => m[1]);
  const names = [...body.matchAll(/"name":\s*"([^"]+)"/g)].map(m => m[1]);
  assert.equal(ids.length, names.length);
  return ids.map((id, index) => ({ id, name: names[index] }));
}

test('the table covers exactly the entries the planner can rank', () => {
  const ids = upgradeEntries().map(entry => entry.id);
  assert.deepEqual(Object.keys(UPGRADE_COSTS).sort(), [...ids].sort());
});

test('unknown is never zero', () => {
  // Zero would make an unpriced upgrade look free and win every ranking it
  // appears in. Only an entry whose cost sits on another entry may be zero.
  const zeroed = Object.entries(UPGRADE_COSTS)
    .filter(([, record]) => record.coins === 0 && !record.includedIn)
    .map(([id]) => id);
  assert.deepEqual(zeroed, [], `these would rank as free: ${zeroed.join(', ')}`);
});

test('every unpriced entry says why', () => {
  const silent = Object.entries(UPGRADE_COSTS)
    .filter(([, record]) => typeof record.coins !== 'number' && !record.reason)
    .map(([id]) => id);
  assert.deepEqual(silent, [], `no reason recorded for: ${silent.join(', ')}`);
});

test('a priced entry carries its sources and a verification date', () => {
  for (const [id, record] of Object.entries(UPGRADE_COSTS)) {
    if (typeof record.coins !== 'number' || record.coins <= 0) continue;
    assert.ok(Array.isArray(record.items) && record.items.length, `${id} names no items`);
    assert.ok(record.sources && record.sources.length, `${id} carries no source`);
    assert.ok(record.verifiedAt, `${id} carries no verification date`);
  }
});

test('nothing is counted twice', () => {
  for (const [id, record] of Object.entries(UPGRADE_COSTS)) {
    if (!record.includedIn) continue;
    const target = UPGRADE_COSTS[record.includedIn];
    assert.ok(target, `${id} points at ${record.includedIn}, which is not in the table`);
    assert.notEqual(record.includedIn, id, `${id} points at itself`);
    assert.ok(
      typeof target.coins === 'number',
      `${id} defers to ${record.includedIn}, which carries no cost either`,
    );
  }
});

test('the unit is one of the three states, never invented', () => {
  for (const [id, record] of Object.entries(UPGRADE_COSTS)) {
    assert.ok(
      [null, 'coins', 'time'].includes(record.unit ?? null),
      `${id} has an unexpected unit: ${record.unit}`,
    );
    if (typeof record.coins === 'number' && record.coins > 0) {
      assert.equal(record.unit, 'coins', `${id} has a coin figure but is not marked as coins`);
    }
  }
});

test('pet switches are equipment decisions, not earned progression', () => {
  const pet = UPGRADE_COSTS['pet-switch-to-best-farming-pet'];
  assert.ok(pet);
  assert.equal(pet.unit, null);
  assert.match(pet.reason, /no price research/i);
});

test('the accessors answer honestly', () => {
  const priced = Object.entries(UPGRADE_COSTS)
    .find(([, record]) => typeof record.coins === 'number' && record.coins > 0);
  assert.ok(priced, 'the table should contain at least one priced entry');
  assert.equal(costForUpgrade(priced[0]).coins, priced[1].coins);
  assert.equal(missingCostReason(priced[0]), null);

  const unpriced = Object.entries(UPGRADE_COSTS)
    .find(([, record]) => typeof record.coins !== 'number');
  assert.ok(unpriced, 'the table should still contain unpriced entries');
  assert.equal(costForUpgrade(unpriced[0]), null, 'an unpriced entry must not yield a cost');
  assert.ok(missingCostReason(unpriced[0]), 'an unpriced entry must explain itself');

  assert.equal(costForUpgrade('not-an-entry'), null);
  assert.match(missingCostReason('not-an-entry'), /not in the generated cost table/);
});

test('the generated document still matches the table', () => {
  const doc = read('docs/ITEM_PRICE_COVERAGE.md');
  const records = Object.values(UPGRADE_COSTS);
  const counted = {
    priced: records.filter(r => typeof r.coins === 'number' && !r.includedIn).length,
    included: records.filter(r => r.includedIn).length,
    timed: records.filter(r => typeof r.coins !== 'number' && r.unit === 'time').length,
    unlinked: records.filter(r => typeof r.coins !== 'number' && r.unit !== 'time').length,
  };
  const row = (label, value) => assert.ok(
    new RegExp(`\\| ${label}[^|]*\\| ${value} \\|`).test(doc),
    `the document does not report ${label} as ${value}; run npm run build:costs`,
  );
  row('Priced from research', counted.priced);
  row('Covered by another entry', counted.included);
  row('Earned, not bought', counted.timed);
  row('No price research linked yet', counted.unlinked);
  assert.match(doc, new RegExp(`\\*\\*${records.length}\\*\\*`), 'the total does not match');
});

test('the document only names entries that exist', () => {
  const ids = new Set(upgradeEntries().map(entry => entry.id));
  const listed = [...read('docs/ITEM_PRICE_COVERAGE.md').matchAll(/\| `([\w-]+)` \|/g)].map(m => m[1]);
  assert.ok(listed.length > 0);
  const unknown = listed.filter(id => !ids.has(id) && !(id in UPGRADE_COSTS));
  assert.deepEqual(unknown, [], `stale ids in the document: ${unknown.join(', ')}`);
});
