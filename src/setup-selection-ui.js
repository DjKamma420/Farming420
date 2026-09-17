import { setTextIfChanged } from './set-text.js';
import { DATA_SCHEMA_VERSION, STORAGE_KEY } from './config.js';
import { rarityClass } from './item-editor.js';
import {
  createEmptyItem,
  ITEM_SOURCE,
  SLOT_IDS,
  normalizeSetups,
} from './setups.js';
import {
  itemsForSlot,
  loadItemCatalog,
  readCachedCatalog,
  slotHasOfficialCategory,
} from './item-catalog.js';
import {
  FARMING_PETS,
  farmingPetById,
  petLevelBounds,
  petRarities,
} from './setup-pet-catalog.js';

const RARITY_UPGRADE = Object.freeze({
  COMMON: 'UNCOMMON',
  UNCOMMON: 'RARE',
  RARE: 'EPIC',
  EPIC: 'LEGENDARY',
  LEGENDARY: 'MYTHIC',
  MYTHIC: 'DIVINE',
  SPECIAL: 'VERY SPECIAL',
});

const KNOWN_RARITY_CLASSES = Object.freeze([
  'rarity-common',
  'rarity-uncommon',
  'rarity-rare',
  'rarity-epic',
  'rarity-legendary',
  'rarity-mythic',
  'rarity-divine',
  'rarity-special',
  'rarity-very-special',
  'rarity-unknown',
]);

const REAPPLY_CLICK_SELECTOR = [
  '[data-page="setups"]',
  '[data-slot]',
  '[data-setup]',
  '[data-setup-add]',
  '[data-setup-remove]',
  '[data-setup-prefill]',
  '[data-slot-clear]',
].join(',');

const REAPPLY_CHANGE_SELECTOR = [
  '#setupName',
  '[data-slot-item]',
  '[data-slot-reforge]',
  '[data-slot-recomb]',
  '[data-ench-toggle]',
  '[data-ench-select]',
  '[data-gem-value]',
  '[data-gem-new]',
  '[data-closed-item-select]',
  '[data-farming-pet-select]',
  '[data-farming-pet-rarity]',
  '[data-farming-pet-level]',
].join(',');

function normalizedRarity(value) {
  return String(value || '').trim().toUpperCase().replace(/_/g, ' ') || null;
}

/** Base rarity stays stored; this is only the rarity the physical item has now. */
export function effectiveItemRarity(item) {
  const base = normalizedRarity(item?.rarity);
  if (!base || !item?.recombobulated) return base;
  return RARITY_UPGRADE[base] || base;
}

/** Idempotent DOM write used by rarity presentation. */
// Imported *and* re-exported: a bare `export ... from` creates no local
// binding, so this module's own calls to it would be a ReferenceError.
export { setTextIfChanged };

function readState() {
  try {
    const raw = globalThis.localStorage?.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    if (Number(parsed.schemaVersion || 0) > DATA_SCHEMA_VERSION) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeState(state) {
  try {
    state.schemaVersion = DATA_SCHEMA_VERSION;
    globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(state));
    globalThis.dispatchEvent?.(new Event('farming420:state-changed'));
    return true;
  } catch {
    return false;
  }
}

function currentSetupRecord(state) {
  state.profile ||= {};
  const setups = normalizeSetups(state.profile.setups);
  state.profile.setups = setups;
  const setup = setups.list.find(row => row.id === setups.activeId) || setups.list[0] || null;
  return { setups, setup };
}

function activeSetupFromStorage() {
  const state = readState();
  if (!state) return null;
  return currentSetupRecord(state).setup;
}

function replaceSlot(slotId, mutator) {
  const state = readState();
  if (!state) return false;
  const { setup } = currentSetupRecord(state);
  if (!setup) return false;
  setup.slots ||= {};
  setup.slots[slotId] = mutator(setup.slots[slotId] || null);
  return writeState(state);
}

function element(tag, attrs = {}, text = null) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value === null || value === undefined || value === false) continue;
    if (key === 'className') node.className = value;
    else if (key === 'dataset') Object.assign(node.dataset, value);
    else if (key in node && key !== 'list') node[key] = value;
    else node.setAttribute(key, String(value));
  }
  if (text !== null) node.textContent = text;
  return node;
}

function field(labelText, control, className = '') {
  const label = element('label', { className: `settings-field ${className}`.trim() });
  label.append(element('span', {}, labelText), control);
  return label;
}

function selectedPetId(item) {
  const id = String(item?.skyblockId || '').trim().toUpperCase();
  if (id) return id;
  const byName = FARMING_PETS.find(pet => pet.name.toLowerCase() === String(item?.displayName || '').trim().toLowerCase());
  return byName?.id || '';
}

function buildLevelSelect(petId, currentLevel) {
  const bounds = petLevelBounds(petId);
  const select = element('select', {
    dataset: { farmingPetLevel: '1' },
    disabled: !bounds,
  });
  select.append(element('option', { value: '' }, bounds ? '— choose level —' : '— choose a pet first —'));
  if (!bounds) return select;
  for (let level = bounds.min; level <= bounds.max; level += 1) {
    select.append(element('option', { value: String(level) }, `Level ${level}`));
  }
  const numeric = Number(currentLevel);
  select.value = Number.isFinite(numeric) && numeric >= bounds.min && numeric <= bounds.max
    ? String(Math.floor(numeric))
    : '';
  return select;
}

function buildPetPicker(editor, item) {
  if (editor.querySelector('[data-farming-pet-picker]')) return;

  editor.classList.add('sb-pet-editor');
  const picker = element('div', {
    className: 'sb-selection-picker sb-pet-picker item-editor-grid',
    dataset: { farmingPetPicker: '1' },
  });

  const petSelect = element('select', { dataset: { farmingPetSelect: '1' } });
  petSelect.append(element('option', { value: '' }, '— no pet —'));
  const currentId = selectedPetId(item);
  const currentKnown = farmingPetById(currentId);
  if (currentId && !currentKnown) {
    petSelect.append(element('option', { value: currentId }, `${item?.displayName || currentId} · current`));
  }
  for (const pet of FARMING_PETS) petSelect.append(element('option', { value: pet.id }, pet.name));
  petSelect.value = currentId;

  const raritySelect = element('select', { dataset: { farmingPetRarity: '1' }, disabled: !currentId });
  raritySelect.append(element('option', { value: '' }, '— choose rarity —'));
  const legalRarities = [...petRarities(currentId)];
  const currentRarity = normalizedRarity(item?.rarity);
  if (currentRarity && !legalRarities.includes(currentRarity)) {
    raritySelect.append(element('option', { value: currentRarity }, `${currentRarity} · current`));
  }
  for (const rarity of legalRarities) raritySelect.append(element('option', { value: rarity }, rarity));
  raritySelect.value = currentRarity || '';

  const levelSelect = buildLevelSelect(currentId, item?.petLevel);

  petSelect.addEventListener('change', () => {
    const pet = farmingPetById(petSelect.value);
    if (!pet) {
      replaceSlot('pet', () => null);
      return;
    }
    replaceSlot('pet', current => {
      const oldRarity = normalizedRarity(current?.rarity);
      const rarity = pet.rarities.includes(oldRarity)
        ? oldRarity
        : (pet.rarities.length === 1 ? pet.rarities[0] : null);
      const currentLevel = Number(current?.petLevel);
      const petLevel = Number.isFinite(currentLevel)
        && currentLevel >= pet.levelMin && currentLevel <= pet.levelMax
        ? Math.floor(currentLevel)
        : null;
      return {
        ...createEmptyItem(),
        skyblockId: pet.id,
        displayName: pet.name,
        rarity,
        petLevel,
        source: ITEM_SOURCE.MANUAL,
      };
    });
  });

  raritySelect.addEventListener('change', () => {
    replaceSlot('pet', current => current ? {
      ...current,
      rarity: normalizedRarity(raritySelect.value),
      source: ITEM_SOURCE.MANUAL,
    } : current);
  });

  levelSelect.addEventListener('change', () => {
    replaceSlot('pet', current => current ? {
      ...current,
      petLevel: levelSelect.value === '' ? null : Number(levelSelect.value),
      source: ITEM_SOURCE.MANUAL,
    } : current);
  });

  picker.append(
    field('Pet', petSelect),
    field('Rarity', raritySelect),
    field('Level', levelSelect),
  );
  editor.querySelector('.item-editor-head')?.insertAdjacentElement('afterend', picker);
}

function currentCatalogItems(slotId) {
  return itemsForSlot(readCachedCatalog()?.items || [], slotId);
}

function buildClosedItemPicker(editor, slotId, item) {
  if (!slotHasOfficialCategory(slotId) || editor.querySelector(`[data-closed-item-select="${slotId}"]`)) return;

  const oldControl = editor.querySelector(`[data-slot-item="${slotId}"]`)
    || editor.querySelector(`[data-slot-name="${slotId}"]`);
  const oldField = oldControl?.closest('.settings-field');
  if (!oldField) return;

  const options = currentCatalogItems(slotId);
  const select = element('select', { dataset: { closedItemSelect: slotId } });
  select.append(element('option', { value: '' }, '— none —'));

  const currentId = String(item?.skyblockId || '').trim();
  const knownCurrent = options.some(option => option.id === currentId);
  if ((currentId || item?.displayName) && !knownCurrent) {
    select.append(element('option', { value: '__current__' }, `${item?.displayName || currentId} · current`));
  }
  for (const option of options) select.append(element('option', { value: option.id }, option.name));
  select.value = knownCurrent ? currentId : ((currentId || item?.displayName) ? '__current__' : '');

  select.addEventListener('change', () => {
    if (select.value === '__current__') return;
    if (!select.value) {
      replaceSlot(slotId, () => null);
      return;
    }
    const chosen = currentCatalogItems(slotId).find(option => option.id === select.value);
    if (!chosen) return;
    replaceSlot(slotId, current => {
      if (current?.skyblockId === chosen.id) {
        return {
          ...current,
          displayName: chosen.name,
          rarity: chosen.tier || current.rarity || null,
          source: ITEM_SOURCE.MANUAL,
        };
      }
      return {
        ...createEmptyItem(),
        skyblockId: chosen.id,
        displayName: chosen.name,
        rarity: chosen.tier || null,
        source: ITEM_SOURCE.MANUAL,
      };
    });
  });

  const closedField = field(`Which item`, select, 'sb-closed-item-field');
  if (!options.length) {
    const warning = element('span', { className: 'find-warn sb-picker-status' },
      item?.displayName
        ? 'This saved item is not in the loaded official Farming item list. Choose none or wait for the catalog to refresh.'
        : 'Loading the official Farming item list…');
    closedField.append(warning);
  }
  oldField.replaceWith(closedField);

  if (slotId === 'petItem') editor.classList.add('sb-pet-item-editor');
}

function closeReforgePicker(editor, slotId, item) {
  const existing = editor.querySelector(`[data-slot-reforge="${slotId}"]`);
  if (!existing || existing.matches('select')) return;
  const listId = existing.getAttribute('list');
  const datalist = listId ? editor.querySelector(`#${CSS.escape(listId)}`) : null;
  const values = [...new Set([
    String(item?.reforge || '').trim().toLowerCase(),
    ...[...(datalist?.querySelectorAll('option') || [])].map(option => String(option.value || '').trim().toLowerCase()),
  ].filter(Boolean))].sort();

  const select = element('select', { dataset: { slotReforge: slotId, closedReforge: '1' } });
  select.append(element('option', { value: '' }, '— no reforge —'));
  for (const value of values) select.append(element('option', { value }, value.replace(/\b\w/g, letter => letter.toUpperCase())));
  select.value = String(item?.reforge || '').trim().toLowerCase();
  select.addEventListener('change', () => {
    replaceSlot(slotId, current => current ? {
      ...current,
      reforge: select.value || null,
      source: ITEM_SOURCE.MANUAL,
    } : current);
  });
  existing.replaceWith(select);
}

/** Move the existing bound editor; never clone it, so its event handlers survive. */
export function dockSetupEditor(root = document) {
  const editor = root.querySelector('[data-item-editor]');
  const slotId = editor?.dataset.itemEditor;
  if (!editor || !slotId) return false;
  const selected = [...root.querySelectorAll('.slot-card[data-slot]')]
    .find(card => card.dataset.slot === slotId);
  const grid = selected?.closest('.slot-grid');
  if (!selected || !grid) return false;
  editor.classList.add('sb-docked-setup-editor');
  if (selected.nextElementSibling !== editor) selected.insertAdjacentElement('afterend', editor);
  return true;
}

function applyRarityPresentation(root, setup) {
  if (!setup) return;
  for (const slotId of SLOT_IDS) {
    const item = setup.slots?.[slotId];
    if (!item) continue;
    const effective = effectiveItemRarity(item);
    if (!effective) continue;
    const card = [...root.querySelectorAll('.slot-card[data-slot]')].find(row => row.dataset.slot === slotId);
    const editor = root.querySelector(`[data-item-editor="${slotId}"]`);
    for (const node of [card, editor].filter(Boolean)) {
      node.classList.remove(...KNOWN_RARITY_CLASSES);
      node.classList.add(rarityClass(effective));
      node.dataset.effectiveRarity = effective;
    }
    const rarity = editor?.querySelector('.item-rarity');
    if (rarity) {
      const base = normalizedRarity(item.rarity);
      const source = item.source === ITEM_SOURCE.SYNC ? ' · synced' : '';
      const rarityText = item.recombobulated && base !== effective
        ? `${effective} · base ${base} + Recombobulator${source}`
        : `${effective}${source}`;
      setTextIfChanged(rarity, rarityText);
    }
  }
}

let catalogRequestStarted = false;
function ensurePickerCatalog() {
  if (catalogRequestStarted || (readCachedCatalog()?.items || []).length) return;
  catalogRequestStarted = true;
  loadItemCatalog().finally(() => schedule());
}

export function applySetupSelectionUi(root = document) {
  const app = root.querySelector?.('#app') || root;
  if (!app?.querySelector) return;
  const editor = app.querySelector('[data-item-editor]');
  if (!editor) return;

  const setup = activeSetupFromStorage();
  const slotId = editor.dataset.itemEditor;
  const item = setup?.slots?.[slotId] || null;

  dockSetupEditor(app);
  if (slotId === 'pet') {
    buildPetPicker(editor, item);
  } else {
    buildClosedItemPicker(editor, slotId, item);
    if (slotId === 'petItem') editor.classList.add('sb-pet-item-editor');
    else closeReforgePicker(editor, slotId, item);
    ensurePickerCatalog();
  }
  applyRarityPresentation(app, setup);
}

let scheduled = false;
function schedule() {
  if (scheduled) return;
  scheduled = true;
  queueMicrotask(() => {
    scheduled = false;
    applySetupSelectionUi(document);
  });
}

function matchesEventTarget(event, selector) {
  const target = event.target;
  return target instanceof Element && Boolean(target.closest(selector));
}

if (typeof document !== 'undefined') {
  schedule();
  document.addEventListener('click', event => {
    if (matchesEventTarget(event, REAPPLY_CLICK_SELECTOR)) schedule();
  });
  document.addEventListener('change', event => {
    if (matchesEventTarget(event, REAPPLY_CHANGE_SELECTOR)) schedule();
  });
  globalThis.addEventListener?.('farming420:state-changed', schedule);
}
