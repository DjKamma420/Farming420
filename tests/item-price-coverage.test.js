import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

/**
 * Price coverage, kept honest.
 *
 * `docs/ITEM_PRICE_COVERAGE.md` records how many ranked upgrade entries have a
 * cost a machine can reach. A document like that rots the moment the data moves
 * under it, so the number is recomputed here and compared.
 *
 * What this does NOT claim: that the research fails to mention a price. It
 * measures whether code can get from an upgrade entry to a cost without a
 * human reading prose. Today it mostly cannot, because the entries carry no
 * cost field at all.
 */

const root = new URL('../', import.meta.url);
const read = path => readFileSync(new URL(path, root), 'utf8');

function upgradeEntries() {
  const src = read('src/data.js');
  const block = src.slice(src.indexOf('export const UPGRADES = ['));
  const body = block.slice(0, block.indexOf('\n];') + 3);
  const ids = [...body.matchAll(/"id":\s*"([\w-]+)"/g)].map(m => m[1]);
  const names = [...body.matchAll(/"name":\s*"([^"]+)"/g)].map(m => m[1]);
  assert.equal(ids.length, names.length, 'every entry must have an id and a name');
  return ids.map((id, index) => ({ id, name: names[index] }));
}

const COST_KEY = /coin|price|cost|bazaar|ah_|market|total/i;
const NAME_KEYS = ['item', 'name', 'item_name', 'display', 'id', 'enchantment', 'label'];

function* walk(node) {
  if (Array.isArray(node)) { for (const value of node) yield* walk(value); return; }
  if (node && typeof node === 'object') {
    yield node;
    for (const value of Object.values(node)) yield* walk(value);
  }
}

const normalise = value => String(value).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

function costRecordNames() {
  const names = new Set();
  const files = readdirSync(new URL('research/', root)).filter(name => /costs.*\.json$/.test(name));
  assert.ok(files.length >= 4, `expected the shipped price research; found ${files.join(', ')}`);
  for (const file of files) {
    for (const node of walk(JSON.parse(read(`research/${file}`)))) {
      const named = NAME_KEYS.map(key => node[key]).find(value => typeof value === 'string');
      if (!named) continue;
      const hasCost = Object.entries(node).some(([key, value]) =>
        COST_KEY.test(key) && value !== null && value !== '' &&
        !(Array.isArray(value) && !value.length));
      if (hasCost) names.add(normalise(named));
    }
  }
  return names;
}

function linkableCount() {
  const records = costRecordNames();
  const words = value => new Set(normalise(value).split(' ').filter(Boolean));
  return upgradeEntries().filter(entry => {
    const key = normalise(entry.name);
    if (records.has(key)) return true;
    const entryWords = words(entry.name);
    for (const record of records) {
      const recordWords = new Set(record.split(' ').filter(Boolean));
      if (!recordWords.size || !entryWords.size) continue;
      const shared = [...recordWords].filter(word => entryWords.has(word)).length;
      const union = new Set([...recordWords, ...entryWords]).size;
      if (shared / union >= 0.6) return true;
      if (recordWords.size >= 2 && [...recordWords].every(word => entryWords.has(word))) return true;
      if (entryWords.size >= 2 && [...entryWords].every(word => recordWords.has(word))) return true;
    }
    return false;
  }).length;
}

test('the price research is present and carries cost records', () => {
  assert.ok(costRecordNames().size >= 50, 'the shipped cost research should name dozens of items');
});

test('the gap document still matches the data', () => {
  const doc = read('docs/ITEM_PRICE_COVERAGE.md');
  const stated = doc.match(/## Current state: (\d+) of (\d+) linkable/);
  assert.ok(stated, 'the document must state its own numbers so they can be checked');
  assert.equal(
    Number(stated[2]),
    upgradeEntries().length,
    'the document counts a different number of upgrade entries than data.js has',
  );
  assert.equal(
    Number(stated[1]),
    linkableCount(),
    'the documented linkable count no longer matches the data; regenerate the document',
  );
});

test('coverage never silently drops', () => {
  // A floor, not a target. Raising it is the point; falling below it means a
  // cost record or an entry name changed and the link broke.
  assert.ok(
    linkableCount() >= 7,
    `only ${linkableCount()} entries can reach a cost; something unlinked further`,
  );
});

test('every gap row in the document names a real entry', () => {
  const ids = new Set(upgradeEntries().map(entry => entry.id));
  const listed = [...read('docs/ITEM_PRICE_COVERAGE.md').matchAll(/\| `([\w-]+)` \|/g)].map(m => m[1]);
  assert.ok(listed.length > 0, 'the document should list the gaps it found');
  const unknown = listed.filter(id => !ids.has(id));
  assert.deepEqual(unknown, [], `the document lists entries that no longer exist: ${unknown.join(', ')}`);
});
