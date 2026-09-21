import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../src/app.js', import.meta.url), 'utf8');
const enhancements = readFileSync(new URL('../src/enhancements.js', import.meta.url), 'utf8');

function cropPageSource() {
  const start = app.indexOf('function cropsPage() {');
  const end = app.indexOf('\n// --- The physical tool', start);
  assert.ok(start >= 0 && end > start, 'cropsPage source not found');
  return app.slice(start, end);
}

test('Garden page combines account-wide Garden progression with crop-scoped progression', () => {
  const source = cropPageSource();
  assert.match(source, /gardenAccountProgression\(\)/);
  assert.match(source, /visibleUpgrades\('crops'\)/);
  assert.doesNotMatch(source, /visibleUpgrades\('tools'\)/);
  assert.doesNotMatch(source, /layer-tabs/);
});

test('tool and setup are explicit navigation actions, not fake tabs', () => {
  const source = cropPageSource();
  assert.match(source, /data-page="tools"/);
  assert.match(source, /data-page="setups"/);
  assert.match(source, /Tool reforges, enchantments and gemstones are edited under Tools/);
  assert.match(source, /Armor, equipment and pets are edited in Setups/);
});

test('crop workspace enhancer does not inject Tool or Items & Setup tabs', () => {
  assert.doesNotMatch(enhancements, /data-layer="tool"/);
  assert.doesNotMatch(enhancements, /data-layer="setup"/);
  assert.doesNotMatch(enhancements, /farming420-crop-layer/);
  assert.match(enhancements, /heading\.textContent\.trim\(\) !== 'Garden & Crop Progression'/);
});


test('navigation replaces Account, Crops and Buffs with Garden and Effects', () => {
  const block = app.match(/const NAV = \[([\s\S]*?)\n\];/);
  assert.ok(block, 'NAV table not found');
  assert.doesNotMatch(block[1], /\['account',\s*'Account'\]/);
  assert.match(block[1], /\['crops',\s*'Garden'\]/);
  assert.match(block[1], /\['buffs',\s*'Effects'\]/);
});

test('Effects combines permanent account effects with temporary buffs', () => {
  const start = app.indexOf('function effectsPage() {');
  const end = app.indexOf('\nfunction accessoryItemState', start);
  assert.ok(start >= 0 && end > start, 'effectsPage source not found');
  const source = app.slice(start, end);
  assert.match(source, /visibleUpgrades\('account'\)/);
  assert.match(source, /Consumable/);
  assert.match(source, /Chocolate Factory/);
  assert.match(source, /visibleUpgrades\('buffs'\)/);
});
