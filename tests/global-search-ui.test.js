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
  const info = read('src/info-content.js');
  for (const marker of [
    'selectableCatalogSearchEntries',
    'FARMING_ACCESSORY_GROUPS',
    'FARMING_PETS',
    'FARMING_TOOL_ITEM_IDS',
    'GARDEN_VACUUM_ITEMS',
    'SETTINGS_SEARCH_TOPICS',
    'allInfoEntries(CROPS)',
  ]) assert.ok(app.includes(marker), marker);

  assert.match(info, /title: 'Recombobulator 3000'/);
  assert.match(info, /title: 'Gemstones'/);
  assert.match(app, /target: \{ type: 'info', page: 'info', anchor: topic\.anchor \}/);
});

test('settings search targets real settings sections', () => {
  const foundation = read('src/foundation.js');
  for (const section of ['live-sync', 'hypixel-access', 'backup', 'app-updates']) {
    assert.match(foundation, new RegExp(`data-settings-section="${section}"`));
  }
  assert.match(foundation, /farming420:open-settings/);
  assert.match(foundation, /openSettings\(event\.detail\?\.section \|\| null\)/);
});

test('the two baseline armor roles are named FF Set and BPC Set', () => {
  const app = read('src/app.js');
  const guide = read('src/phase-loadout-guide.js');
  assert.match(app, /Armor · BPC Set/);
  assert.match(app, /Armor · FF Set/);
  assert.match(guide, /return 'BPC Set'/);
  assert.match(guide, /return 'FF Set'/);
  assert.match(guide, /FF Set \+ BPC Set/);
});


test('search targets selectable items without silently applying them', () => {
  const app = read('src/app.js');
  assert.match(app, /pendingSearchSpotlight = target/);
  assert.match(app, /Search result: \$\{target\.itemName\}\. Select it here to update this loadout\./);
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


test('every repaint preserves active search focus and caret centrally', () => {
  const app = read('src/app.js');
  assert.match(app, /function activeSearchFocusSnapshot\(\)/);
  assert.match(app, /function restoreActiveSearchFocus\(snapshot\)/);
  assert.match(app, /const searchFocusSnapshot = preserveScroll \? activeSearchFocusSnapshot\(\) : null/);
  assert.match(app, /document\.getElementById\('app'\)\.innerHTML = shell\(content\);[\s\S]*?restoreActiveSearchFocus\(searchFocusSnapshot\)/);
  assert.match(app, /input\.setSelectionRange\(start, end, snapshot\.direction \|\| 'none'\)/);
});

test('keyboard result movement keeps typing focus in the search input', () => {
  const app = read('src/app.js');
  const focusFunction = app.match(/function focusSearchResult\(index\) \{[\s\S]*?return true;\n\}/)[0];
  assert.match(focusFunction, /input\?\.focus\(\{ preventScroll: true \}\)/);
  assert.doesNotMatch(focusFunction, /target\.focus\(/);
});

test('search results are categorized and index existing Info mechanics data', () => {
  const app = read('src/app.js');
  for (const marker of [
    "return 'Settings'",
    "return 'Info & mechanics'",
    "return 'Upgrades'",
    "return 'Navigation'",
    "kind: 'Mechanic'",
    'SPAWN_PIPELINE.forEach',
    'LOOT_PIPELINE.forEach',
    'Object.entries(PEST_STAT_SIDES)',
    'for (const place of BEGINNER_PLACES)',
    'for (const stage of STAGES)',
    'for (const ladder of ENCHANT_LADDERS)',
  ]) assert.ok(app.includes(marker), marker);
  assert.match(app, /class="search-result-group-title"/);
});

test('armor catalog search exposes FF and BPC set context', () => {
  const app = read('src/app.js');
  assert.match(app, /FF set \/ BPC set/);
  assert.match(app, /'ff set', 'bpc set', 'farming set', 'pest spawning set'/);
});
