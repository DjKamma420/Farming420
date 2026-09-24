import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const read = path => readFileSync(new URL(path, root), 'utf8');

test('global search updates results without rerendering the app per keystroke', () => {
  const app = read('src/app.js');
  const binding = app.match(/const search = document\.getElementById\('search'\);[\s\S]*?const profileName/)[0];
  assert.match(binding, /updateSearchResults\(state\.search\)/);
  assert.doesNotMatch(binding, /addEventListener\('input'[\s\S]*?render\(/);
  assert.match(app, /document\.activeElement\?\.id === 'search'/);
});

test('global search indexes selectable and explanatory surfaces', () => {
  const app = read('src/app.js');
  for (const marker of [
    'selectableCatalogSearchEntries',
    'FARMING_ACCESSORY_GROUPS',
    'FARMING_PETS',
    'FARMING_TOOL_ITEM_IDS',
    'GARDEN_VACUUM_ITEMS',
    'SETTINGS_SEARCH_TOPICS',
    'INFO_UPGRADE_TOPICS',
  ]) assert.ok(app.includes(marker), marker);

  assert.match(app, /title: 'Recombobulator 3000'/);
  assert.match(app, /title: 'Gemstones'/);
  assert.match(app, /target: \{ type: 'info', page: 'info'/);
});

test('settings search targets real settings sections', () => {
  const foundation = read('src/foundation.js');
  for (const section of ['live-sync', 'hypixel-access', 'backup', 'app-updates']) {
    assert.match(foundation, new RegExp(`data-settings-section="${section}"`));
  }
  assert.match(foundation, /farming420:open-settings/);
  assert.match(foundation, /openSettings\(event\.detail\?\.section \|\| null\)/);
});

test('the two baseline armor roles are named FF set and BPC set', () => {
  const app = read('src/app.js');
  const guide = read('src/phase-loadout-guide.js');
  assert.match(app, /Armor · BPC set/);
  assert.match(app, /Armor · FF set/);
  assert.match(guide, /return 'BPC set'/);
  assert.match(guide, /return 'FF set'/);
  assert.match(guide, /FF set \+ BPC set/);
});


test('search targets selectable items without silently applying them', () => {
  const app = read('src/app.js');
  assert.match(app, /pendingSearchSpotlight = target/);
  assert.match(app, /Search result: \$\{target\.itemName\}\. Select it here to update this setup\./);
  assert.match(app, /Search result: \$\{target\.vacuumName\}\. Select this model here to update your Vacuum\./);
  assert.doesNotMatch(app, /pendingSearchSpotlight[\s\S]{0,180}dispatchEvent\(new Event\('change'/);
});

test('tool and vacuum results land on their exact editor surfaces', () => {
  const app = read('src/app.js');
  assert.match(app, /target: \{ type: 'tool', page: 'tools', cropId, toolName \}/);
  assert.match(app, /target: \{ type: 'vacuum', page: 'tools', vacuumId: vacuum\.id, vacuumName: vacuum\.name \}/);
  assert.match(app, /\.sb-tool-card\[data-sb-tool-crop=/);
  assert.match(app, /\[data-vacuum-model\]/);
});

test('global search supports full keyboard movement', () => {
  const app = read('src/app.js');
  assert.match(app, /function focusSearchResult\(index\)/);
  assert.match(app, /event\.key === 'ArrowDown'/);
  assert.match(app, /event\.key === 'ArrowUp'/);
  assert.match(app, /event\.key === 'Escape'/);
  assert.match(app, /aria-selected="false"/);
});
