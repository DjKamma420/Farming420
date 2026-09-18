import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const read = path => readFileSync(new URL(path, root), 'utf8');

test('setup editor docks directly after the selected slot and spans the grid row', () => {
  const source = read('src/setup-selection-ui.js');
  const css = read('src/setup-selection-ui.css');
  assert.match(source, /selected\.insertAdjacentElement\('afterend', editor\)/);
  assert.match(source, /selected\.nextElementSibling !== editor/);
  assert.match(source, /selected\?\.closest\('\.slot-grid'\)/);
  assert.match(css, /\.slot-grid > \.sb-docked-setup-editor\s*\{[^}]*grid-column:\s*1 \/ -1/s);
});

test('pets use closed pet, rarity and level selects instead of a typed pet name', () => {
  const source = read('src/setup-selection-ui.js');
  const css = read('src/setup-selection-ui.css');
  assert.match(source, /farmingPetSelect/);
  assert.match(source, /farmingPetRarity/);
  assert.match(source, /farmingPetLevel/);
  assert.match(source, /buildLevelSelect/);
  assert.match(source, /FARMING_PETS/);
  assert.doesNotMatch(source, /farmingPetLevel[^\n]*type:\s*'number'/);
  assert.match(css, /\.sb-pet-editor > \.item-editor-grid:not\(\.sb-pet-picker\)/);
  assert.match(css, /display:\s*none/);
});

test('armor, equipment and pet items replace free-text item names with closed item selects', () => {
  const source = read('src/setup-selection-ui.js');
  assert.match(source, /buildClosedItemPicker/);
  assert.match(source, /itemsForSlot\(readCachedCatalog\(\)\?\.items \|\| \[\], slotId\)/);
  assert.match(source, /dataSet|dataset/);
  assert.match(source, /closedItemSelect/);
  assert.match(source, /oldField\.replaceWith\(closedField\)/);
  assert.match(source, /slotId === 'petItem'/);
});

test('generic reforge typing is converted to a select before exact item capabilities refine it', () => {
  const source = read('src/setup-selection-ui.js');
  assert.match(source, /function closeReforgePicker/);
  assert.match(source, /existing\.matches\('select'\)/);
  assert.match(source, /existing\.replaceWith\(select\)/);
  assert.match(source, /— no reforge —/);
});

test('setup selection never writes rarity presentation; the canonical rarity layer is the only writer', () => {
  const source = read('src/setup-selection-ui.js');
  assert.doesNotMatch(source, /rarityClass/);
  assert.doesNotMatch(source, /RARITY_UPGRADE/);
  assert.doesNotMatch(source, /effectiveItemRarity/);
  assert.doesNotMatch(source, /applyRarityPresentation/);
  assert.doesNotMatch(source, /setTextIfChanged/);
});

test('setup selection is event-driven and contains no MutationObserver feedback path', () => {
  const source = read('src/setup-selection-ui.js');
  assert.doesNotMatch(source, /MutationObserver/);
  assert.match(source, /document\.addEventListener\('click'/);
  assert.match(source, /document\.addEventListener\('change'/);
  assert.match(source, /farming420:state-changed/);
});

test('production loads the safe setup selection module and stylesheet', () => {
  const html = read('index.html');
  assert.match(html, /src\/setup-selection-ui\.js/);
  assert.match(html, /src\/setup-selection-ui\.css/);
});
