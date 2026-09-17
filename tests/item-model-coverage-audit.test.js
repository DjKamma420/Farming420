import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { FARMING_TOOL_ITEM_IDS, GARDEN_VACUUM_ITEMS } from '../src/exact-farming-items.js';
import { ITEM_MODEL_SOURCE, itemModelSource } from '../src/item-model-coverage.js';

/**
 * Art coverage, measured.
 *
 * `item-model-coverage.js` exists to make a missing item model "a measurable
 * coverage failure rather than an invisible generic badge fallback"
 * (research/knowledge-base/40-calculator-model-strategy-gap-audit.md, section
 * 6). Nothing was measuring it: the module was imported by no runtime path and
 * by no test, so a tool quietly dropping to a generic silhouette would have
 * shipped unnoticed -- which is exactly how twelve nav entries and thirteen crop
 * tiles came to be bare letters.
 *
 * This audits the ids the app knows offline: every farming tool at every tier
 * and every Garden vacuum, against the shipped resource pack. The official
 * skin path cannot be exercised here because `api.hypixel.net` is unreachable
 * from CI, so this is deliberately the pack-only view -- the weaker of the two,
 * which makes it the useful one to pin.
 */

const manifest = JSON.parse(
  readFileSync(new URL('../assets/hypixel-pack/manifest.json', import.meta.url), 'utf8'),
);

function knownPhysicalItems() {
  const rows = [];
  for (const [tool, ids] of Object.entries(FARMING_TOOL_ITEM_IDS)) {
    ids.forEach((id, index) => rows.push({ id, name: `${tool} Mk. ${index + 1}` }));
  }
  for (const vacuum of GARDEN_VACUUM_ITEMS) rows.push({ id: vacuum.id, name: vacuum.name });
  return rows;
}

function audit() {
  return knownPhysicalItems().map(item => ({
    ...item,
    ...itemModelSource({ id: item.id, name: item.name }, manifest),
  }));
}

test('the offline item set is the one the app actually claims to know', () => {
  const rows = knownPhysicalItems();
  assert.equal(rows.length, 41, '12 tools at three tiers plus five vacuums');
  assert.equal(new Set(rows.map(row => row.id)).size, rows.length, 'ids must be unique');
});

test('no known farming item is unresolved', () => {
  const unresolved = audit()
    .filter(row => row.source === ITEM_MODEL_SOURCE.UNRESOLVED)
    .map(row => `${row.name} (${row.id})`);
  assert.deepEqual(unresolved, [], `these would render as a placeholder: ${unresolved.join(', ')}`);
});

test('none of them falls back to a vanilla material either', () => {
  // A vanilla material is a legitimate last resort for items outside this set,
  // but every tool and vacuum here has a texture in the shipped pack. Dropping
  // to a material would mean a pack key stopped resolving.
  const weak = audit()
    .filter(row => row.source === ITEM_MODEL_SOURCE.VANILLA_MATERIAL)
    .map(row => `${row.name} (${row.id})`);
  assert.deepEqual(weak, [], `these lost their pack texture: ${weak.join(', ')}`);
});

test('every one resolves to its own exact pack texture', () => {
  const rows = audit();
  const exact = rows.filter(row => row.source === ITEM_MODEL_SOURCE.RESOURCE_PACK_ITEM);
  assert.equal(
    exact.length,
    rows.length,
    `expected all ${rows.length} to have an exact texture; sources were `
      + JSON.stringify(Object.fromEntries(
        Object.values(ITEM_MODEL_SOURCE).map(source => [source, rows.filter(r => r.source === source).length]),
      )),
  );
  for (const row of exact) {
    assert.ok(row.packKey, `${row.id} resolved without naming a pack key`);
  }
});

test('the audit can fail: an unknown id resolves to nothing', () => {
  // A check that cannot distinguish the broken state from the fixed one is not
  // a check.
  const res = itemModelSource({ id: 'DEFINITELY_NOT_AN_ITEM', name: 'Nope' }, manifest);
  assert.equal(res.source, ITEM_MODEL_SOURCE.UNRESOLVED);
});
