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


test('setup picker writes to the explicitly opened FF or Killing pet target', () => {
  const source = read('src/setup-selection-ui.js');
  assert.match(source, /state\.setupSlotTarget \|\| setups\.activeId/);
  assert.match(source, /const \{ setups, setup \} = currentSetupRecord\(state\)/);
  assert.match(source, /writeLinkedSetupSlot\(setups, setup\.id, slotId, nextItem\)/);
});


test('setup picker writes to the explicitly opened FF or Killing pet target', () => {
  const source = read('src/setup-selection-ui.js');
  assert.match(source, /state\.setupSlotTarget \|\| setups\.activeId/);
  assert.match(source, /const \{ setups, setup \} = currentSetupRecord\(state\)/);
  assert.match(source, /writeLinkedSetupSlot\(setups, setup\.id, slotId, nextItem\)/);
});


test('Mooshroom Cow pet menu owns the manual Strength input and missing-value warning', () => {
  const source = read('src/setup-selection-ui.js');
  const css = read('src/setup-selection-ui.css');
  assert.match(source, /currentId === 'MOOSHROOM_COW'/);
  assert.match(source, /dataset: \{ cowStrength: '1' \}/);
  assert.match(source, /writeProfileStrength/);
  assert.match(source, /profile\.inputs\.strength/);
  assert.match(source, /sb-required-alert/);
  assert.match(source, /Shard planning never changes this value automatically/);
  assert.match(css, /\.sb-required-alert/);
  assert.match(css, /#ff5b68/);
});


test('setup picker reads effective Killing gear and docks the editor to the exact setup target', () => {
  const source = read('src/setup-selection-ui.js');
  assert.match(source, /effectiveSetup\(setups, targetId\)/);
  assert.match(source, /writeLinkedSetupSlot\(setups, targetId, slotId, nextItem\)/);
  assert.match(source, /dockSetupEditor\(app, targetId\)/);
  assert.match(source, /card\.dataset\.setupTarget === setupTargetId/);
});

test('loadout capability edits preserve the exact item identity of inherited Killing gear', () => {
  const source = read('src/loadout-capabilities-ui.js');
  assert.match(source, /effectiveSetup\(raw\?\.profile\?\.setups, targetId\)/);
  assert.match(source, /raw\?\.setupSlotTarget \|\| raw\?\.profile\?\.setups\?\.activeId/);
  assert.match(source, /writeLinkedSetupSlot\(raw\.profile\?\.setups, targetId, slotId, item\)/);
});
