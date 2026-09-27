import { DATA_SCHEMA_VERSION, STORAGE_KEY } from './config.js';
import {
  createEmptyItem,
  ITEM_SOURCE,
  SLOT_IDS,
  effectiveSetup,
  prepareFfBpcSetups,
  writeLinkedSetupSlot,
} from './setups.js';
import {
  intrinsicEnchantmentsForCatalogItem,
  itemsForSlot,
  loadItemCatalog,
  mergeFarmingSetupCatalog,
  readCachedCatalog,
  slotHasOfficialCategory,
} from './item-catalog.js';
import {
  FARMING_PETS,
  farmingPetById,
  petLevelBounds,
  petRarities,
} from './setup-pet-catalog.js';
import { exactSetupItemArt } from './setup-item-art-map.js';
import {
  FACE_OFFSET,
  HAT_OFFSET,
  headLayerGeometry,
  skullTextureUrl,
} from './skull-art.js?v=20260918-4';

const REAPPLY_CLICK_SELECTOR = [
  '[data-page="setups"]',
  '[data-slot]',
  '[data-setup]',
  '[data-setup-add]',
  '[data-setup-remove]',
  '[data-setup-prefill]',
  '[data-slot-clear]',
  '[data-pet-item-option]',
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
  '[data-farming-pet-rarity]',
  '[data-farming-pet-level]',
  '[data-cow-strength]',
].join(',');

function normalizedRarity(value) {
  return String(value || '').trim().toUpperCase().replace(/_/g, ' ') || null;
}

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
  const setups = prepareFfBpcSetups(state.profile.setups);
  state.profile.setups = setups;
  const targetId = state.setupSlotTarget || setups.activeId;
  const setup = effectiveSetup(setups, targetId);
  return { setups, setup, targetId };
}

function activeSetupFromStorage() {
  const state = readState();
  if (!state) return null;
  return currentSetupRecord(state).setup;
}

function replaceSlot(slotId, mutator) {
  const state = readState();
  if (!state) return false;
  const { setups, setup, targetId } = currentSetupRecord(state);
  if (!setup || !targetId) return false;
  const nextItem = mutator(setup.slots?.[slotId] || null);
  writeLinkedSetupSlot(setups, targetId, slotId, nextItem);
  return writeState(state);
}

function writeProfileStrength(value) {
  const state = readState();
  if (!state) return false;
  state.profile ||= {};
  state.profile.inputs ||= {};
  if (value === '' || value === null || value === undefined) {
    delete state.profile.inputs.strength;
  } else {
    const strength = Number(value);
    if (!Number.isFinite(strength) || strength < 0) delete state.profile.inputs.strength;
    else state.profile.inputs.strength = strength;
  }
  return writeState(state);
}

function currentProfileStrength() {
  const state = readState();
  const raw = state?.profile?.inputs?.strength;
  if (raw === '' || raw === null || raw === undefined) return null;
  const strength = Number(raw);
  return Number.isFinite(strength) && strength >= 0 ? strength : null;
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

const PET_ART_SIZE = 40;

function petInitials(label = '') {
  const words = String(label).replace(/[_-]+/g, ' ').trim().split(/\s+/).filter(Boolean);
  if (!words.length) return '?';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0] || ''}${words[1][0] || ''}`.toUpperCase();
}

function appendHeadArtLayers(art, textureId) {
  const textureUrl = skullTextureUrl(textureId);
  if (!textureUrl) return false;

  for (const [className, offset] of [['face', FACE_OFFSET], ['hat', HAT_OFFSET]]) {
    const geometry = headLayerGeometry(PET_ART_SIZE, offset);
    const layer = element('span', { className: `sb-pet-head-layer sb-pet-head-${className}` });
    layer.style.backgroundImage = `url("${textureUrl}")`;
    layer.style.backgroundSize = `${geometry.backgroundSize}px auto`;
    layer.style.backgroundPosition = `${geometry.offsetX}px ${geometry.offsetY}px`;
    art.append(layer);
  }
  art.classList.add('has-pet-head');
  return true;
}

function petArtNode(pet, label = 'Pet') {
  const art = element('span', { className: 'sb-pet-art', 'aria-hidden': 'true' });
  art.append(element('span', { className: 'sb-pet-art-fallback' }, pet ? petInitials(label) : '—'));

  const descriptor = exactSetupItemArt(pet?.id);
  const textureId = descriptor?.kind === 'head' ? descriptor.textureId : null;
  appendHeadArtLayers(art, textureId);
  return art;
}

function petItemRenderedIconUrl(record) {
  const descriptor = exactSetupItemArt(record?.id);
  if (descriptor?.kind === 'rendered' && descriptor.iconUrl) return descriptor.iconUrl;

  const id = String(record?.id || '').trim().toLowerCase();
  return /^[a-z0-9_-]+$/.test(id)
    ? `https://skyah.net/icons/items/${id}.webp`
    : null;
}

function petItemArtNode(record, label = 'Pet Item') {
  const art = element('span', { className: 'sb-pet-art sb-pet-item-art', 'aria-hidden': 'true' });
  art.append(element('span', { className: 'sb-pet-art-fallback' }, record ? petInitials(label) : '—'));
  if (!record) return art;

  const descriptor = exactSetupItemArt(record.id);
  const catalogSkin = String(record.skin || '').trim().toLowerCase();
  const textureId = descriptor?.kind === 'head'
    ? descriptor.textureId
    : (/^[0-9a-f]{32,64}$/.test(catalogSkin) ? catalogSkin : null);
  if (appendHeadArtLayers(art, textureId)) return art;

  const iconUrl = petItemRenderedIconUrl(record);
  if (!iconUrl) return art;

  const image = element('img', {
    className: 'sb-pet-item-icon',
    src: iconUrl,
    alt: '',
    loading: 'lazy',
    decoding: 'async',
    referrerPolicy: 'no-referrer',
  });
  image.addEventListener('load', () => art.classList.add('has-pet-item-icon'), { once: true });
  image.addEventListener('error', () => {
    image.remove();
    art.classList.remove('has-pet-item-icon');
  }, { once: true });
  art.append(image);
  return art;
}

function writePetSelection(petId) {
  const pet = farmingPetById(petId);
  if (!pet) return replaceSlot('pet', () => null);
  return replaceSlot('pet', current => {
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
}

function buildPetDropdown(currentId, item) {
  const currentPet = farmingPetById(currentId);
  const currentName = currentPet?.name || item?.displayName || (currentId ? currentId : 'No pet selected');
  const dropdown = element('details', {
    className: 'sb-pet-dropdown',
    dataset: { farmingPetDropdown: '1' },
  });
  const trigger = element('summary', { className: 'sb-pet-dropdown-trigger' });
  const triggerCopy = element('span', { className: 'sb-pet-dropdown-copy' });
  triggerCopy.append(
    element('strong', {}, currentName),
    element('small', {}, currentId && !currentPet ? 'Saved pet · choose a current farming pet' : 'Choose a farming pet'),
  );
  trigger.append(
    petArtNode(currentPet, currentName),
    triggerCopy,
    element('span', { className: 'sb-pet-dropdown-chevron', 'aria-hidden': 'true' }, '▾'),
  );

  const menu = element('div', {
    className: 'sb-pet-dropdown-menu',
    role: 'listbox',
    'aria-label': 'Farming pet',
  });

  const addOption = (pet, petId, label, selected = false) => {
    const option = element('button', {
      type: 'button',
      className: `sb-pet-dropdown-option${selected ? ' is-selected' : ''}`,
      dataset: { farmingPetOption: petId },
      role: 'option',
      'aria-selected': String(selected),
    });
    const copy = element('span', { className: 'sb-pet-option-copy' });
    copy.append(
      element('strong', {}, label),
      ...(pet ? [element('small', {}, `Level 1–${pet.levelMax}`)] : []),
    );
    option.append(
      petArtNode(pet, label),
      copy,
      element('span', { className: 'sb-pet-option-check', 'aria-hidden': 'true' }, selected ? '✓' : ''),
    );
    option.addEventListener('click', event => {
      event.preventDefault();
      dropdown.open = false;
      writePetSelection(petId);
    });
    menu.append(option);
  };

  addOption(null, '', 'No pet', !currentId);
  for (const pet of FARMING_PETS) addOption(pet, pet.id, pet.name, currentId === pet.id);
  dropdown.append(trigger, menu);
  return dropdown;
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

  const currentId = selectedPetId(item);
  const petDropdown = buildPetDropdown(currentId, item);

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

  const isMooshroomCow = currentId === 'MOOSHROOM_COW';
  const currentStrength = isMooshroomCow ? currentProfileStrength() : null;
  const strengthMissing = isMooshroomCow && currentStrength === null;
  let strengthField = null;
  if (isMooshroomCow) {
    const strengthInput = element('input', {
      type: 'number',
      min: '0',
      step: '1',
      value: currentStrength === null ? '' : String(currentStrength),
      className: `sb-cow-strength-input${strengthMissing ? ' is-missing' : ''}`,
      dataset: { cowStrength: '1' },
      placeholder: 'Enter current Strength',
    });
    strengthInput.addEventListener('change', () => {
      writeProfileStrength(strengthInput.value);
    });
    strengthField = field('Strength', strengthInput, `sb-cow-strength-field${strengthMissing ? ' is-missing' : ''}`);
    if (strengthMissing) {
      strengthField.querySelector(':scope > span')?.append(
        element('strong', {
          className: 'sb-required-alert',
          title: 'Strength is required for the Mooshroom Cow Farming Fortune calculation.',
          ariaLabel: 'Strength required',
        }, '!'),
      );
    }
    strengthField.append(element(
      'small',
      { className: 'sb-cow-strength-hint' },
      'Use your current total Strength. Shard planning never changes this value automatically.',
    ));
  }

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

  const petField = element('div', { className: 'settings-field sb-pet-dropdown-field' });
  petField.append(element('span', {}, 'Pet'), petDropdown);

  picker.append(
    petField,
    field('Rarity', raritySelect),
    field('Level', levelSelect),
    ...(strengthField ? [strengthField] : []),
  );
  editor.querySelector('.item-editor-head')?.insertAdjacentElement('afterend', picker);
}

let pickerCatalogItems = readCachedCatalog()?.items || [];

function currentCatalogItems(slotId) {
  return itemsForSlot(mergeFarmingSetupCatalog(pickerCatalogItems), slotId);
}

function closedItemPickerSignature(options, item) {
  return [
    String(item?.skyblockId || '').trim(),
    String(item?.displayName || '').trim(),
    ...options.map(option => `${option.id}:${option.name}:${option.tier || ''}:${option.skin || ''}:${option.material || ''}`),
  ].join('|');
}

function writeClosedItemSelection(slotId, itemId) {
  if (!itemId) return replaceSlot(slotId, () => null);
  const chosen = currentCatalogItems(slotId).find(option => option.id === itemId);
  if (!chosen) return false;

  return replaceSlot(slotId, current => {
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
      enchantments: intrinsicEnchantmentsForCatalogItem(chosen),
      source: ITEM_SOURCE.MANUAL,
    };
  });
}

function buildPetItemPicker(editor, item) {
  const options = currentCatalogItems('petItem');
  const signature = closedItemPickerSignature(options, item);
  const existing = editor.querySelector('[data-pet-item-dropdown]');
  const oldControl = existing
    || editor.querySelector('[data-closed-item-select="petItem"]')
    || editor.querySelector('[data-slot-item="petItem"]')
    || editor.querySelector('[data-slot-name="petItem"]');
  const oldField = oldControl?.closest('.settings-field');
  if (!oldField) return;
  if (existing?.dataset.catalogSignature === signature) return;

  const currentId = String(item?.skyblockId || '').trim().toUpperCase();
  const currentRecord = options.find(option => String(option.id || '').toUpperCase() === currentId)
    || (currentId ? { id: currentId, name: item?.displayName || currentId } : null);
  const currentName = currentRecord?.name || item?.displayName || 'No pet item selected';

  const dropdown = element('details', {
    className: 'sb-pet-dropdown sb-pet-item-dropdown',
    dataset: {
      petItemDropdown: '1',
      catalogSignature: signature,
    },
  });
  const trigger = element('summary', { className: 'sb-pet-dropdown-trigger' });
  const triggerCopy = element('span', { className: 'sb-pet-dropdown-copy' });
  triggerCopy.append(
    element('strong', {}, currentName),
    element('small', {}, currentId ? 'Choose a Pet Item' : 'No Pet Item selected'),
  );
  trigger.append(
    petItemArtNode(currentRecord, currentName),
    triggerCopy,
    element('span', { className: 'sb-pet-dropdown-chevron', 'aria-hidden': 'true' }, '▾'),
  );

  const menu = element('div', {
    className: 'sb-pet-dropdown-menu sb-pet-item-dropdown-menu',
    role: 'listbox',
    'aria-label': 'Pet Item',
  });

  const addOption = (record, selected = false) => {
    const itemId = String(record?.id || '');
    const label = record?.name || 'No Pet Item';
    const option = element('button', {
      type: 'button',
      className: `sb-pet-dropdown-option sb-pet-item-dropdown-option${selected ? ' is-selected' : ''}`,
      dataset: { petItemOption: itemId },
      role: 'option',
      'aria-selected': String(selected),
    });
    const copy = element('span', { className: 'sb-pet-option-copy' });
    copy.append(
      element('strong', {}, label),
      ...(record?.tier ? [element('small', {}, String(record.tier).replace(/_/g, ' '))] : []),
    );
    option.append(
      petItemArtNode(record, label),
      copy,
      element('span', { className: 'sb-pet-option-check', 'aria-hidden': 'true' }, selected ? '✓' : ''),
    );
    option.addEventListener('click', event => {
      event.preventDefault();
      dropdown.open = false;
      writeClosedItemSelection('petItem', itemId);
    });
    menu.append(option);
  };

  addOption(null, !currentId);
  for (const option of options) addOption(option, currentId === String(option.id || '').toUpperCase());

  dropdown.append(trigger, menu);
  const closedField = element('div', { className: 'settings-field sb-closed-item-field sb-pet-item-dropdown-field' });
  closedField.append(element('span', {}, 'Which item'), dropdown);
  if (!options.length) {
    closedField.append(element(
      'span',
      { className: 'find-warn sb-picker-status' },
      item?.displayName
        ? 'This saved Pet Item is not in the loaded Farming item list.'
        : 'Loading the Farming Pet Item list…',
    ));
  }
  oldField.replaceWith(closedField);
  editor.classList.add('sb-pet-item-editor');
}

function buildClosedItemPicker(editor, slotId, item) {
  if (!slotHasOfficialCategory(slotId)) return;
  if (slotId === 'petItem') {
    buildPetItemPicker(editor, item);
    return;
  }

  const existingSelect = editor.querySelector(`[data-closed-item-select="${slotId}"]`);
  const oldControl = existingSelect
    || editor.querySelector(`[data-slot-item="${slotId}"]`)
    || editor.querySelector(`[data-slot-name="${slotId}"]`);
  const oldField = oldControl?.closest('.settings-field');
  if (!oldField) return;

  const options = currentCatalogItems(slotId);
  const signature = closedItemPickerSignature(options, item);
  if (existingSelect?.dataset.catalogSignature === signature) return;

  const select = element('select', {
    dataset: {
      closedItemSelect: slotId,
      catalogSignature: signature,
    },
  });
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
    writeClosedItemSelection(slotId, select.value);
  });

  const closedField = field('Which item', select, 'sb-closed-item-field');
  if (!options.length) {
    const warning = element('span', { className: 'find-warn sb-picker-status' },
      item?.displayName
        ? 'This saved item is not in the loaded official Farming item list. Choose none or wait for the catalog to refresh.'
        : 'Loading the official Farming item list…');
    closedField.append(warning);
  }
  oldField.replaceWith(closedField);

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
export function dockSetupEditor(root = document, setupTargetId = null) {
  const editor = root.querySelector('[data-item-editor]');
  const slotId = editor?.dataset.itemEditor;
  if (!editor || !slotId) return false;
  const selected = [...root.querySelectorAll('.slot-card[data-slot]')]
    .find(card => card.dataset.slot === slotId
      && (!setupTargetId || card.dataset.setupTarget === setupTargetId));
  const grid = selected?.closest('.slot-grid');
  if (!selected || !grid) return false;
  editor.classList.add('sb-docked-setup-editor');
  if (selected.nextElementSibling !== editor) selected.insertAdjacentElement('afterend', editor);
  return true;
}

let catalogRequestStarted = false;
function ensurePickerCatalog() {
  if (catalogRequestStarted) return;
  catalogRequestStarted = true;
  loadItemCatalog()
    .then(result => {
      if (Array.isArray(result?.items) && result.items.length) pickerCatalogItems = result.items;
    })
    .finally(() => schedule());
}

export function applySetupSelectionUi(root = document) {
  const app = root.querySelector?.('#app') || root;
  if (!app?.querySelector) return;
  const editor = app.querySelector('[data-item-editor]');
  if (!editor) return;

  const state = readState();
  if (!state) return;
  const { setup, targetId } = currentSetupRecord(state);
  const slotId = editor.dataset.itemEditor;
  const item = setup?.slots?.[slotId] || null;

  dockSetupEditor(app, targetId);
  if (slotId === 'pet') {
    buildPetPicker(editor, item);
  } else {
    buildClosedItemPicker(editor, slotId, item);
    if (slotId === 'petItem') editor.classList.add('sb-pet-item-editor');
    else closeReforgePicker(editor, slotId, item);
    ensurePickerCatalog();
  }
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
