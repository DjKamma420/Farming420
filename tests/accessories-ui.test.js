import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

import { UPGRADES } from '../src/data.js';
import { FARMING_ACCESSORIES } from '../src/farming-accessories.js';
import { ACCESSORY_CAPABILITIES_VERIFIED } from '../src/accessory-capabilities.js';

test('every calculator-linked accessory resolves to the same exact physical item id', () => {
  const upgrades = new Map(UPGRADES.map(item => [item.id, item]));
  for (const accessory of FARMING_ACCESSORIES.filter(item => item.upgradeId)) {
    const upgrade = upgrades.get(accessory.upgradeId);
    assert.ok(upgrade, `missing upgrade ${accessory.upgradeId}`);
    assert.equal(upgrade.section, 'accessories');
    assert.equal(upgrade.physicalItemId, accessory.itemId);
  }
});

test('the main navigation folds accessories, chips and shards into one workspace', () => {
  const source = readFileSync(new URL('../src/app.js', import.meta.url), 'utf8');
  assert.match(source, /\['shards', 'Accessories \/ Chips \/ Shards'\]/);
  assert.doesNotMatch(source, /case 'accessories':/);
  assert.match(source, /function accessorySections\(\)/);
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


test('accessory cards no longer expose Recombobulator or Enrichment configuration', () => {
  const source = readFileSync(new URL('../src/app.js', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /data-accessory-recomb=/);
  assert.doesNotMatch(source, /data-accessory-strength-enrichment=/);
  assert.doesNotMatch(source, /Recombobulator 3000/);
  assert.doesNotMatch(source, /Strength Enrichment/);
  assert.match(source, /Accessory upgrade lines/);
  assert.match(source, /accessory-upgrade-line/);
  assert.equal(ACCESSORY_CAPABILITIES_VERIFIED, '2026-09-23');
});

test('accessory state is persistent and the consolidated workspace loads the official item catalog', () => {
  const source = readFileSync(new URL('../src/app.js', import.meta.url), 'utf8');
  assert.match(source, /accessoryItems: \{\}/);
  assert.match(source, /state\.profile\.accessoryItems/);
  assert.match(source, /\['setups', 'shards'\]\.includes\(state\.page\)/);
});

test('accessory cards are articles so nested controls remain valid interactive HTML', () => {
  const source = readFileSync(new URL('../src/app.js', import.meta.url), 'utf8');
  const start = source.indexOf('function accessoryCatalogCard');
  const end = source.indexOf('function accessorySections', start);
  const block = source.slice(start, end);
  assert.match(block, /<article class="item-card accessory-catalog-card/);
  assert.doesNotMatch(block, /const tag = upgrade/);
});



test('Accessories section presents real upgrade families without Cow Strength controls', () => {
  const source = readFileSync(new URL('../src/app.js', import.meta.url), 'utf8');
  const start = source.indexOf('function accessoryCatalogCard');
  const end = source.indexOf('function cropFocusCard', start);
  const block = source.slice(start, end);
  assert.match(block, /Tier \$\{tierIndex \+ 1\}\/\$\{tierCount\}/);
  assert.match(block, /upgrades previous tier/);
  assert.match(block, /each later tier replaces the previous item/);
  assert.doesNotMatch(block, /Mooshroom Cow/);
  assert.doesNotMatch(block, /data-accessory-strength-enrichment/);
  assert.doesNotMatch(block, /data-accessory-recomb/);
});


test('Shards page keeps Cow Strength shard planning optional and collapsible at the bottom', () => {
  const source = readFileSync(new URL('../src/app.js', import.meta.url), 'utf8');
  assert.match(source, /function indirectShardSynergyPanel/);
  assert.match(source, /function cowStrengthShardPlanner/);
  assert.match(source, /<details class="cow-strength-shard-planner"/);
  assert.match(source, /Changing shard levels here never changes the Strength value you entered for the Cow/);
  assert.match(source, /Echo of Elemental/);
  assert.match(source, /Unlimited Power/);
  assert.match(source, /data-synergy-shard-level/);
  assert.match(source, /data-synergy-shard-value/);
  assert.match(source, /function synergyShardLevelControl/);
  assert.doesNotMatch(source.slice(source.indexOf('function cowStrengthShardPlanner'), source.indexOf('function shardsPage')), /input type="number"/);
  assert.match(source, /case 'shards': content = shardsPage\(\);/);
});


test('indirect shards use the same full card surface as direct Attribute Shards', () => {
  const source = readFileSync(new URL('../src/app.js', import.meta.url), 'utf8');
  assert.match(source, /function synergyShardCard/);
  assert.match(source, /item-card shard-card shard-synergy-card/);
  assert.match(source, /card-portrait shard-portrait/);
  assert.match(source, /card-meta/);
  assert.match(source, /card-grid shard-gallery shard-synergy-gallery/);
  assert.doesNotMatch(source.slice(source.indexOf('function cowStrengthShardPlanner'), source.indexOf('function shardsPage')), /accessory-upgrade-row shard-synergy-row/);
});


test('Cow Strength shard planner renders after direct Attribute Shards', () => {
  const source = readFileSync(new URL('../src/app.js', import.meta.url), 'utf8');
  const page = source.slice(source.indexOf('function shardsPage'), source.indexOf('function drawer'));
  assert.ok(page.indexOf('shards.map(x=>card(x))') < page.indexOf('cowStrengthShardPlanner()'));
});
