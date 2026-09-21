import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL(`../src/${path}`, import.meta.url), 'utf8');

test('gemstone item editors do not expose unlock prices', () => {
  const toolWorkspace = read('workspace-ui.js');
  const vacuumWorkspace = read('vacuum-exact-ui.js');
  const setupEditor = read('app.js');
  const exactSetupCapabilities = read('exact-item-capabilities-ui.js');

  for (const source of [toolWorkspace, vacuumWorkspace, setupEditor, exactSetupCapabilities]) {
    assert.doesNotMatch(source, /Unlock coin cost/);
  }

  assert.doesNotMatch(toolWorkspace, /data-gem-cost/);
  assert.doesNotMatch(vacuumWorkspace, /data-vacuum-gem-cost/);
  assert.doesNotMatch(toolWorkspace, /officialGemstoneUnlock(?:Coins|Items)/);
  assert.doesNotMatch(vacuumWorkspace, /officialGemstoneUnlock(?:Coins|Items)/);
});

test('official gemstone unlock costs remain available as background metadata', () => {
  const catalog = read('item-catalog.js');
  const exactItems = read('exact-farming-items.js');

  assert.match(catalog, /gemstone_slots/);
  assert.match(catalog, /costs:\s*Array\.isArray\(slot\?\.costs\)/);
  assert.match(exactItems, /export function officialGemstoneUnlockCoins\(slot\)/);
  assert.match(exactItems, /export function officialGemstoneUnlockItems\(slot\)/);
});
