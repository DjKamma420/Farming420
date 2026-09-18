import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const [uiSource, cssSource, indexSource] = await Promise.all([
  readFile(new URL('../src/rarity-background-ui.js', import.meta.url), 'utf8'),
  readFile(new URL('../src/rarity-background-ui.css', import.meta.url), 'utf8'),
  readFile(new URL('../index.html', import.meta.url), 'utf8'),
]);

test('rarity presentation covers every physical farming item surface', () => {
  assert.match(uiSource, /\.slot-card\[data-slot/);
  assert.match(uiSource, /\.item-card\[data-open\]/);
  assert.match(uiSource, /physicalItemId/);
  assert.match(uiSource, /applyProgressionCardRarity/);
  assert.match(uiSource, /\.sb-tool-card\[data-sb-tool-crop/);
  assert.match(uiSource, /data-tool-editor/);
  assert.match(uiSource, /data-vacuum-panel/);
  assert.match(uiSource, /effectiveSetupItemRarity/);
  assert.match(uiSource, /vacuumRarity/);
  assert.match(uiSource, /deriveRarity/);
});

test('physical progression cards use the official resolved item tier and non-items stay neutral', () => {
  assert.match(uiSource, /catalogItemById/);
  assert.match(uiSource, /item\?\.tier/);
  assert.match(uiSource, /clearRarityClass\(card\)/);
  assert.match(uiSource, /attributeFilter:\s*\['data-physical-item-id'\]/);
});

test('rarity label writes are idempotent inside the observed app subtree', () => {
  assert.match(uiSource, /setTextIfChanged\(rarityLabel, label\)/);
  assert.doesNotMatch(uiSource, /rarityLabel\.textContent\s*=/);
});

test('rarity backgrounds do not depend on some other editor loading the item catalog first', () => {
  assert.match(uiSource, /loadItemCatalog/);
  assert.match(uiSource, /ensureCatalog/);
  assert.match(uiSource, /readCachedCatalog/);
});

test('rarity is expressed as the physical item background, not only text or a border', () => {
  assert.match(cssSource, /\.rarity-surface/);
  assert.match(cssSource, /background:/);
  assert.match(cssSource, /var\(--rarity/);
  assert.match(cssSource, /border-color:/);
});

test('the rarity presentation is loaded after the redesign styles and item UI scripts', () => {
  const redesignCss = indexSource.indexOf('src/skyblock-redesign.css');
  const rarityCss = indexSource.indexOf('src/rarity-background-ui.css');
  const capabilityScript = indexSource.indexOf('src/exact-item-capabilities-ui.js');
  const rarityScript = indexSource.indexOf('src/rarity-background-ui.js');
  assert.ok(redesignCss >= 0 && rarityCss > redesignCss, 'rarity CSS must override the generic redesign card background');
  assert.ok(capabilityScript >= 0 && rarityScript > capabilityScript, 'rarity JS runs after the physical item editors');
});