import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const root = new URL('../', import.meta.url);
const app = readFileSync(new URL('src/app.js', root), 'utf8');

test('priced upgrade cards use compact approximate coin tags', () => {
  assert.match(app, /formatApproxCoins\(priceTagCoins\)/);
  assert.match(app, /price-tag/);
  assert.match(app, /to max/);
});

test('upgrade drawer shows next cost, cost to max and shard-specific value fields', () => {
  assert.match(app, /<span>Next cost<\/span>/);
  assert.match(app, /<span>Cost to max<\/span>/);
  assert.match(app, /<span>1 shard<\/span>/);
  assert.match(app, /<span>Current level value<\/span>/);
  assert.match(app, /<span>Shards to max<\/span>/);
});

test('physical item editors and Farming Tool expose installed-upgrade build value', () => {
  assert.match(app, /Estimated build value/);
  assert.match(app, /physicalItemBuildValue/);
  assert.match(app, /Recombobulator/);
  assert.match(app, /rolling 90-day market averages/);
});

test('physical market refresh starts from bind paths, not during render helpers', () => {
  const toolPanel = app.match(/function toolBuildValuePanel\(\)[\s\S]*?\n}/)?.[0] || '';
  const slotEditor = app.match(/function slotEditor\(slotId\)[\s\S]*?\n}/)?.[0] || '';
  assert.doesNotMatch(toolPanel, /queuePhysicalValueRefresh/);
  assert.doesNotMatch(slotEditor, /queuePhysicalValueRefresh/);
  assert.match(app, /function bindToolPanel[\s\S]*queuePhysicalValueRefresh/);
  assert.match(app, /function bindSetups[\s\S]*queuePhysicalValueRefresh/);
});
