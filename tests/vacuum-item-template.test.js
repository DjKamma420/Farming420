import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

import { GARDEN_VACUUM_ITEMS } from '../src/exact-farming-items.js';
import { enchantRowsFor } from '../src/item-editor.js';

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('every selectable Vacuum has an exact official item model in the shipped pack', () => {
  const manifest = JSON.parse(read('assets/hypixel-pack/manifest.json'));
  assert.equal(GARDEN_VACUUM_ITEMS.length, 5);
  for (const vacuum of GARDEN_VACUUM_ITEMS) {
    const key = vacuum.id.toLowerCase();
    assert.ok(manifest.items?.[key]?.texture, `${vacuum.id} is missing its exact pack model`);
    assert.match(manifest.items[key].texture, /garden\/vacuum\//);
  }
});

test('Vacuum exposes its real enchantment template, including Bug Blender', () => {
  const rows = enchantRowsFor('vacuum', { enchantments: {} });
  const bugBlender = rows.find(row => row.id === 'bug_blender');
  assert.ok(bugBlender, 'Bug Blender must be offered on a Vacuum');
  assert.equal(bugBlender.minLevel, 1);
  assert.equal(bugBlender.maxLevel, 5);

  const exact = read('src/vacuum-exact-ui.js');
  assert.match(exact, /data-vacuum-enchantments="1"/);
  assert.match(exact, /enchantRowsFor\('vacuum'/);
  assert.match(exact, /withEnchantToggled/);
  assert.match(exact, /withEnchantLevel/);
  assert.match(exact, /class="enchant-grid"/);
  assert.match(exact, /class="enchant-line enchant-/);
});

test('Vacuum item editor keeps the same physical-item section order as Tools', () => {
  const exact = read('src/vacuum-exact-ui.js');
  const loadout = read('src/loadout-capabilities-ui.js');

  assert.match(loadout, /data-vacuum-section="reforge"/);
  assert.match(loadout, /data-vacuum-section="upgrades"/);
  assert.match(exact, /insertAdjacentElement\('beforebegin', progression\)/);
  assert.match(exact, /insertAdjacentElement\('afterend', enchantments\)/);
  assert.match(exact, /insertAdjacentElement\('afterend', gemstones\)/);
});

test('Vacuum reforge uses the same card template and item-art hook as farming tools', () => {
  const loadout = read('src/loadout-capabilities-ui.js');
  assert.match(loadout, /item-editor-section sb-reforge-panel/);
  assert.match(loadout, /sb-reforge-grid sb-reforge-grid-compact setup-reforge-grid/);
  assert.match(loadout, /sb-reforge-card setup-reforge-card/);
  assert.match(loadout, /data-reforge-item-id=/);
  assert.match(loadout, /data-vacuum-reforge-choice=/);
});

test('Vacuum physical state preserves item enchantments', () => {
  const state = read('src/vacuum-state.js');
  assert.match(state, /bucket\.enchantments = bucket\.enchantments && typeof bucket\.enchantments === 'object'/);
});
