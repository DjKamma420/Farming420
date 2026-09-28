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

test('pets use an illustrated closed dropdown plus closed rarity and level selects', () => {
  const source = read('src/setup-selection-ui.js');
  const css = read('src/setup-selection-ui.css');
  assert.match(source, /farmingPetDropdown/);
  assert.match(source, /farmingPetOption/);
  assert.match(source, /element\('details'/);
  assert.match(source, /exactSetupItemArt/);
  assert.match(source, /headLayerGeometry/);
  assert.match(source, /skullTextureUrl/);
  assert.match(source, /farmingPetRarity/);
  assert.match(source, /farmingPetLevel/);
  assert.match(source, /buildLevelSelect/);
  assert.match(source, /FARMING_PETS/);
  assert.doesNotMatch(source, /dataset:\s*\{\s*farmingPetSelect/);
  const app = read('src/app.js');
  assert.match(app, /\[data-farming-pet-dropdown\]/);
  assert.doesNotMatch(app, /\[data-farming-pet-select\]/);
  assert.doesNotMatch(source, /farmingPetLevel[^\n]*type:\s*'number'/);
  assert.match(css, /\.sb-pet-dropdown-menu/);
  assert.match(css, /\.sb-pet-head-layer/);
  assert.match(css, /image-rendering:\s*pixelated/);
  assert.match(css, /\.sb-pet-editor > \.item-editor-grid:not\(\.sb-pet-picker\)/);
  assert.match(css, /display:\s*none/);
});

test('armor and Pet Items use illustrated closed dropdowns while equipment keeps a closed select', () => {
  const source = read('src/setup-selection-ui.js');
  const css = read('src/setup-selection-ui.css');
  assert.match(source, /buildClosedItemPicker/);
  assert.match(source, /buildArmorItemPicker/);
  assert.match(source, /armorItemArtNode/);
  assert.match(source, /closedItemDropdown/);
  assert.match(source, /armorItemOption/);
  assert.match(source, /knownSkyblockRenderedIcon/);
  assert.match(source, /armorVoxelHeadNode/);
  assert.match(source, /descriptor\?\.kind === 'rendered'/);
  assert.doesNotMatch(source, /armorItemSvgMarkup/);
  assert.match(source, /petItemDropdown/);
  assert.match(source, /petItemOption/);
  assert.match(source, /petItemArtNode/);
  assert.match(source, /exactSetupItemArt\(record\.id\)/);
  assert.match(source, /record\.skin/);
  assert.match(source, /skyah\.net\/icons\/items/);
  assert.match(source, /let pickerCatalogItems = readCachedCatalog\(\)\?\.items \|\| \[\]/);
  assert.match(source, /itemsForSlot\(mergeFarmingSetupCatalog\(pickerCatalogItems\), slotId\)/);
  assert.match(source, /closedItemSelect/);
  assert.match(source, /oldField\.replaceWith\(closedField\)/);
  assert.match(css, /\.sb-pet-item-icon/);
  assert.match(css, /\.sb-pet-art\.has-pet-item-icon/);
});

test('setup picker keeps fetched catalog data in memory when storage persistence is unavailable', () => {
  const source = read('src/setup-selection-ui.js');
  assert.match(source, /loadItemCatalog\(\)\s*\.then\(result =>/);
  assert.match(source, /pickerCatalogItems = result\.items/);
  assert.match(source, /mergeFarmingSetupCatalog\(pickerCatalogItems\)/);
});

test('illustrated armor picker refreshes when the item catalog arrives after the editor opened', () => {
  const source = read('src/setup-selection-ui.js');
  assert.match(source, /const existing = editor\.querySelector\('\[data-closed-item-dropdown=/);
  assert.match(source, /closedItemPickerSignature\(options, item\)/);
  assert.match(source, /existing\?\.dataset\.catalogSignature === signature/);
  assert.match(source, /catalogSignature: signature/);
  assert.match(source, /ARMOR_SLOT_IDS\.has\(slotId\)/);
  assert.doesNotMatch(source, /slotHasOfficialCategory\(slotId\) \|\| editor\.querySelector/);
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
  assert.match(source, /const \{ setups, setup, targetId \} = currentSetupRecord\(state\)/);
  assert.match(source, /writeLinkedSetupSlot\(setups, targetId, slotId, nextItem\)/);
});


test('setup picker writes to the explicitly opened FF or Killing pet target', () => {
  const source = read('src/setup-selection-ui.js');
  assert.match(source, /state\.setupSlotTarget \|\| setups\.activeId/);
  assert.match(source, /const \{ setups, setup, targetId \} = currentSetupRecord\(state\)/);
  assert.match(source, /writeLinkedSetupSlot\(setups, targetId, slotId, nextItem\)/);
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

test('Pet Item picker refreshes only when its exact catalog signature changes', () => {
  const source = read('src/setup-selection-ui.js');
  assert.match(source, /existing\?\.dataset\.catalogSignature === signature/);
  assert.match(source, /skin \|\| ''/);
  assert.match(source, /material \|\| ''/);
  assert.match(source, /data-pet-item-dropdown/);
});


test('setup rerenders keep the selected armor slot at the same viewport position', () => {
  const app = read('src/app.js');
  assert.match(app, /function currentSetupSlotViewportAnchor/);
  assert.match(app, /setupSlotAnchor: currentSetupSlotViewportAnchor\(\)/);
  assert.match(app, /restoreSetupSlotViewportAnchor\(interaction\.setupSlotAnchor\)/);
  assert.match(app, /queueMicrotask\(restoreAnchor\)/);
  assert.match(app, /requestAnimationFrame\(restoreAnchor\)/);
});


test('setup editor controls use the physical slot card as the global scroll anchor', () => {
  const app = read('src/app.js');
  assert.match(app, /if \(state\.page === 'setups'\)/);
  assert.match(app, /target\.closest\('\[data-item-editor\]'\)/);
  assert.match(app, /candidate\.dataset\.slot === slotId/);
  assert.match(app, /if \(card\) return card/);
});


test('pet picker refreshes its rarity choices after switching pet species', () => {
  const source = read('src/setup-selection-ui.js');
  assert.match(source, /function petPickerSignature/);
  assert.match(source, /\.\.\.petRarities\(currentId\)/);
  assert.match(source, /existing\?\.dataset\.petSignature === signature/);
  assert.match(source, /existing\.replaceWith\(picker\)/);
  assert.match(source, /pet\.rarities\.length === 1/);
  assert.match(source, /pet\.rarities\.at\(-1\)/);
});

test('Pet Item picker shows objective recommendation and exposes rarity surface ids', () => {
  const source = read('src/setup-selection-ui.js');
  const css = read('src/setup-selection-ui.css');
  assert.match(source, /recommendedFarmingPetItem/);
  assert.match(source, /currentGardenLevelForRecommendation/);
  assert.match(source, /Recommended:/);
  assert.match(source, /petItemTrigger/);
  assert.match(source, /physicalItemId/);
  assert.match(source, /sb-pet-item-recommended-badge/);
  assert.match(source, /effectSummary/);
  assert.match(css, /\.sb-pet-item-recommendation/);
  assert.match(css, /\.sb-pet-item-recommended-badge/);
});


test('helmet picker pins Farmhand, Sprout and Tater to normal inventory icons', () => {
  const source = read('src/setup-selection-ui.js');
  const map = read('src/setup-item-art-map.js');
  const css = read('src/setup-selection-ui.css');
  assert.match(map, /FARM_SUIT_HELMET[\s\S]*?kind: 'rendered'[\s\S]*?farm_suit_helmet\.webp/);
  assert.match(map, /SPROUT_HELMET[\s\S]*?kind: 'rendered'[\s\S]*?pumpkin_helmet\.webp/);
  assert.match(map, /TATER_HELMET[\s\S]*?kind: 'rendered'[\s\S]*?melon_helmet\.webp/);
  assert.match(map, /HELIANTHUS_HELMET[\s\S]*?kind: 'rendered'[\s\S]*?helianthus_helmet\.webp/);
  assert.match(source, /descriptor\?\.kind === 'rendered'/);
  assert.doesNotMatch(source, /armorItemSvgMarkup/);
  assert.match(css, /farm_suit_helmet\.webp/);
});


test('helmet art map import revision is bumped so corrected helmets are not served from the old module cache', () => {
  const picker = read('src/setup-selection-ui.js');
  const setupArt = read('src/item-art-ui.js');
  assert.match(picker, /setup-item-art-map\.js\?v=20260928-3/);
  assert.match(setupArt, /setup-item-art-map\.js\?v=20260928-3/);
});
