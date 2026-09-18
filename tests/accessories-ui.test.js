import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

import { UPGRADES } from '../src/data.js';
import { FARMING_ACCESSORIES } from '../src/farming-accessories.js';

test('every calculator-linked accessory resolves to the same exact physical item id', () => {
  const upgrades = new Map(UPGRADES.map(item => [item.id, item]));
  for (const accessory of FARMING_ACCESSORIES.filter(item => item.upgradeId)) {
    const upgrade = upgrades.get(accessory.upgradeId);
    assert.ok(upgrade, `missing upgrade ${accessory.upgradeId}`);
    assert.equal(upgrade.section, 'accessories');
    assert.equal(upgrade.physicalItemId, accessory.itemId);
  }
});

test('the main navigation exposes accessories as its own page', () => {
  const source = readFileSync(new URL('../src/app.js', import.meta.url), 'utf8');
  assert.match(source, /\['accessories', 'Accessories'\]/);
  assert.match(source, /case 'accessories': content = accessoriesPage\(\);/);
  assert.match(source, /function accessoriesPage\(\)/);
  assert.match(source, /data-accessory-item-id=/);
  assert.doesNotMatch(source, /Accessories & permanent items/);
});

test('all generic drawer activation paths enforce exclusive accessory families', () => {
  const source = readFileSync(new URL('../src/app.js', import.meta.url), 'utf8');
  assert.match(source, /if \(nextLevel > 0\) clearExclusivePeers\(item\)/);
  const maxHandler = source.slice(source.indexOf("document.querySelectorAll('[data-max]')"), source.indexOf("document.querySelectorAll('[data-owned]')"));
  assert.match(maxHandler, /clearExclusivePeers\(item\)/);
  assert.match(source, /if \(e\.target\.checked\) clearExclusivePeers\(item\)/);
});

test('conditional physical accessories stay in the accessories section', () => {
  const byId = new Map(UPGRADES.map(item => [item.id, item]));
  assert.equal(byId.get('temporary-atmospheric-filter-spring')?.physicalItemId, 'ATMOSPHERIC_FILTER');
  assert.equal(byId.get('temporary-atmospheric-filter-spring')?.section, 'accessories');
  assert.equal(byId.get('temporary-magic-8-ball-ff-roll')?.physicalItemId, 'MAGIC_8_BALL');
  assert.equal(byId.get('temporary-magic-8-ball-ff-roll')?.section, 'accessories');
  assert.equal(byId.get('accessory-relic-of-power-perfect-peridot-effect')?.physicalItemId, 'POWER_RELIC');
});
