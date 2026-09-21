import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

import { GARDEN_VACUUM_ITEMS } from '../src/exact-farming-items.js';
import { enchantRowsFor } from '../src/item-editor.js';
import { ACTIVITY_MODE } from '../src/activity-mode.js';
import { computeStatTotals } from '../src/computed-stats.js';
import { VACUUM_BUG_BLENDER } from '../src/vacuum-data-patches.js';

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

test('Vacuum reforge uses the same compact card template as farming tools', () => {
  const redesign = read('src/skyblock-redesign.js');
  const start = redesign.indexOf('function vacuumReforgePanel()');
  const end = redesign.indexOf('\nfunction toolPortrait()', start);
  assert.ok(start >= 0 && end > start, 'vacuumReforgePanel block not found');
  const panel = redesign.slice(start, end);
  assert.match(panel, /className = 'sb-reforge-panel item-editor-section'/);
  assert.match(panel, /class="sb-reforge-grid"/);
  assert.match(panel, /class="sb-reforge-card/);
  assert.match(panel, /class="sb-reforge-art"/);
  assert.match(panel, /class="sb-reforge-copy"/);
  assert.match(panel, /class="sb-state-dot"/);
  assert.match(panel, /data-sb-vacuum-reforge/);
});

test('Vacuum physical state preserves item enchantments', () => {
  const state = read('src/vacuum-state.js');
  assert.match(state, /bucket\.enchantments = bucket\.enchantments && typeof bucket\.enchantments === 'object'/);
});


test('Bug Blender item level contributes its Pest-only Farming Fortune', () => {
  const state = {
    selectedCrop: 'melon',
    profile: {
      vacuumProgress: {
        levels: { [VACUUM_BUG_BLENDER.id]: 5 },
        owned: { [VACUUM_BUG_BLENDER.id]: true },
        enchantments: { bug_blender: 5 },
        gemSlots: [],
      },
    },
  };
  const totals = computeStatTotals(state, 'melon', ACTIVITY_MODE.PEST_KILL);
  assert.equal(totals.pestFortune, 100);
});
