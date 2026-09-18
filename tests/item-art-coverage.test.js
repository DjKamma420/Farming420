import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

import {
  REFORGE_ITEM_IDS,
  TOOL_PROGRESS_ITEM_IDS,
  catalogItemById,
  catalogItemForUpgrade,
  normalizeItemName,
  skinTextureUrl,
} from '../src/item-art-coverage.js';

const catalog = [
  { id: 'BLESSED_BAIT', name: 'Blessed Bait', material: 'SKULL_ITEM', skin: 'a'.repeat(64) },
  { id: 'BLESSED_FRUIT', name: 'Blessed Fruit', material: 'SKULL_ITEM', skin: 'b'.repeat(64) },
  { id: 'RECOMBOBULATOR_3000', name: 'Recombobulator 3000', material: 'SKULL_ITEM', skin: 'c'.repeat(64) },
  { id: 'BOOSTER_COOKIE', name: 'Booster Cookie', material: 'COOKIE', skin: null },
  { id: 'MOSQUITO_SHARD', name: 'Mosquito Shard', material: 'SKULL_ITEM', skin: 'd'.repeat(64) },
  { id: 'FERMENTO_ARTIFACT', name: 'Fermento Artifact', material: 'SKULL_ITEM', skin: 'e'.repeat(64) },
  { id: 'POWER_RELIC', name: 'Relic of Power', material: 'SKULL_ITEM', skin: '1'.repeat(64) },
];

test('official item ids resolve exactly and never through substring collisions', () => {
  assert.equal(catalogItemById(catalog, 'blessed_fruit')?.id, 'BLESSED_FRUIT');
  assert.equal(catalogItemById(catalog, 'blessed')?.id, undefined);
  assert.equal(REFORGE_ITEM_IDS.blessed, 'BLESSED_FRUIT');
  assert.notEqual(REFORGE_ITEM_IDS.blessed, 'BLESSED_BAIT');
});

test('the five farming reforges point at their actual physical item ids', () => {
  assert.deepEqual(REFORGE_ITEM_IDS, {
    bountiful: 'GOLDEN_BALL',
    blessed: 'BLESSED_FRUIT',
    earthy: 'LARGE_WALNUT',
    'deep-fried': 'HASHBROWN',
    overpriced: 'OVERPRICED_DRINK',
  });
});

test('tool progression resolves Recombobulator as a physical item', () => {
  assert.equal(TOOL_PROGRESS_ITEM_IDS['Recombobulator 3000'], 'RECOMBOBULATOR_3000');
  assert.ok(skinTextureUrl(catalogItemById(catalog, 'RECOMBOBULATOR_3000')).endsWith('c'.repeat(64)));
});

test('known equipment gets exact id-backed art while live Hypixel skin still wins', () => {
  const fallback = skinTextureUrl({ id: 'BLOSSOM_CLOAK', skin: null });
  assert.ok(fallback.endsWith('8453a8084b7773c1b2bb6213901da8cfb50de5e5d0c8c524ff4fad0e182ea68b'));

  const live = 'f'.repeat(64);
  assert.ok(skinTextureUrl({ id: 'BLOSSOM_CLOAK', skin: live }).endsWith(live));
});

test('invalid skin hashes are never emitted as remote texture urls', () => {
  assert.equal(skinTextureUrl({ skin: 'not-a-hash' }), null);
  assert.equal(skinTextureUrl({}), null);
});

test('armor uses the item model before any same-set pack stand-in', () => {
  const source = readFileSync(new URL('../src/item-art-coverage.js', import.meta.url), 'utf8');
  const armorGuard = source.indexOf('if (isArmorItem(item))');
  const packLookup = source.indexOf('const packNode = packArtNodeFor(item, label)');
  assert.ok(armorGuard >= 0 && packLookup > armorGuard);
  assert.match(source, /armorItemSvgMarkup/);
});

test('catalog head art renders both the face and hat layers', () => {
  const source = readFileSync(new URL('../src/item-art-coverage.js', import.meta.url), 'utf8');
  const css = readFileSync(new URL('../src/item-art-coverage.css', import.meta.url), 'utf8');
  assert.match(source, /\['face', 'hat'\]/);
  assert.match(css, /\.coverage-skull-face[\s\S]*?14\.2857% 14\.2857%/);
  assert.match(css, /\.coverage-skull-hat[\s\S]*?71\.4286% 14\.2857%/);
});


test('setup portraits have exactly one writer', () => {
  const coverage = readFileSync(new URL('../src/item-art-coverage.js', import.meta.url), 'utf8');
  const setupArt = readFileSync(new URL('../src/item-art-ui.js', import.meta.url), 'utf8');
  assert.doesNotMatch(coverage, /decorateSetupItems\(/);
  assert.doesNotMatch(coverage, /\.slot-portrait, \[data-item-art-slot\]/);
  assert.match(setupArt, /root\.querySelectorAll\('\.slot-portrait, \[data-item-art-slot\]'\)/);
});

test('physical progression cards resolve exact names and deliberate suffix stripping', () => {
  const shard = catalogItemForUpgrade(catalog, {
    id: 'pest-mosquito-shard-enchanted-farmer',
    name: 'Mosquito Shard - Enchanted Farmer',
    category: 'Attribute Shard',
  });
  assert.equal(shard?.id, 'MOSQUITO_SHARD');

  const cookie = catalogItemForUpgrade(catalog, {
    id: 'buff-booster-cookie-farming-wisdom-contribution',
    name: 'Booster Cookie Farming Wisdom contribution',
    category: 'Buff',
  });
  assert.equal(cookie?.id, 'BOOSTER_COOKIE');

  const fermento = catalogItemForUpgrade(catalog, {
    id: 'accessory-fermento-artifact',
    name: 'Fermento Artifact',
    category: 'Accessory',
  });
  assert.equal(fermento?.id, 'FERMENTO_ARTIFACT');
});

test('explicit physical item ids override display wording for accessory art', () => {
  const relic = catalogItemForUpgrade(catalog, {
    id: 'accessory-relic-of-power-perfect-peridot-effect',
    physicalItemId: 'POWER_RELIC',
    name: 'Relic of Power + Perfect Peridot effect',
    category: 'Accessory',
  });
  assert.equal(relic?.id, 'POWER_RELIC');
});

test('accessory catalog cards are decorated by exact item id', () => {
  const source = readFileSync(new URL('../src/item-art-coverage.js', import.meta.url), 'utf8');
  assert.match(source, /function decorateAccessoryCatalog/);
  assert.match(source, /dataset\.accessoryItemId/);
  assert.match(source, /catalogItemById\(catalog, itemId\)/);
  assert.match(source, /decorateAccessoryCatalog\(items\)/);
});

test('abstract stat cards do not steal vaguely similar item art', () => {
  const abstract = catalogItemForUpgrade(catalog, {
    id: 'account-skill-farming-skill-level',
    name: 'Farming Skill level',
    category: 'Account/Skill',
  });
  assert.equal(abstract, null);

  const blessed = catalogItemForUpgrade(catalog, {
    id: 'tool-reforge-blessed-reforge',
    name: 'Blessed reforge',
    category: 'Tool Reforge',
  });
  assert.equal(blessed, null);
});

test('name normalization is deterministic without fuzzy substring guessing', () => {
  assert.equal(normalizeItemName("Mossy Helianthus Helmet"), 'mossy helianthus helmet');
  assert.equal(normalizeItemName("Farmer’s Boots"), 'farmers boots');
});


test('resolved physical progression cards expose their exact item id for the rarity layer', () => {
  const source = readFileSync(new URL('../src/item-art-coverage.js', import.meta.url), 'utf8');
  assert.match(source, /card\.dataset\.physicalItemId\s*=\s*record\.id/);
  assert.match(source, /delete card\.dataset\.physicalItemId/);
});

test('a physical item detail drawer reuses the same exact catalog identity', () => {
  const source = readFileSync(new URL('../src/item-art-coverage.js', import.meta.url), 'utf8');
  assert.match(source, /function decorateDrawer/);
  assert.match(source, /rawState\?\.drawer/);
  assert.match(source, /drawer\.dataset\.physicalItemId\s*=\s*record\.id/);
  assert.match(source, /decorateDrawer\(items, rawState\)/);
});

test('reforge choices and physical tool-upgrade rows expose exact item ids for rarity backgrounds', () => {
  const source = readFileSync(new URL('../src/item-art-coverage.js', import.meta.url), 'utf8');
  assert.match(source, /card\.dataset\.physicalItemId\s*=\s*record\.id/);
  assert.match(source, /row\.dataset\.physicalItemId\s*=\s*record\.id/);
  assert.match(source, /delete row\.dataset\.physicalItemId/);
  assert.match(source, /decorateReforges\(catalog\)/);
  assert.match(source, /decorateToolProgression\(catalog\)/);
});

test('chip/card art is pinned directly beside its title even under redesign specificity', () => {
  const css = readFileSync(new URL('../src/item-art-coverage.css', import.meta.url), 'utf8');
  assert.match(css, /\.skyblock-redesign \.item-card \.card-head[\s\S]*?display:\s*flex\s*!important/);
  assert.match(css, /\.skyblock-redesign \.item-card \.card-head[\s\S]*?justify-content:\s*flex-start\s*!important/);
  assert.match(css, /\.skyblock-redesign \.item-card \.card-head > div[\s\S]*?flex:\s*0 1 auto\s*!important/);
  assert.match(css, /\.item-card \.card-head > \.badge:first-of-type[\s\S]*?margin-left:\s*auto\s*!important/);
  assert.match(css, /\.skyblock-redesign \.item-card \.card-portrait[\s\S]*?width:\s*42px\s*!important/);
});
