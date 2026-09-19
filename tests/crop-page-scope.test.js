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

test('crop page contains only crop-scoped progression cards', () => {
  const source = cropPageSource();
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
  assert.match(enhancements, /heading\.textContent\.trim\(\) !== 'Crop progression'/);
});
