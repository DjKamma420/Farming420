import { DATA_SCHEMA_VERSION, STORAGE_KEY } from './config.js';
import { rarityClass } from './item-editor.js';
import { ITEM_SOURCE, SLOT_IDS, normalizeSetups } from './setups.js';
import {
  FARMING_PETS,
  clampPetLevel,
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

function normalizedRarity(value) {
  return String(value || '').trim().toUpperCase().replace(/_/g, ' ') || null;
}

/** Base rarity stays stored; this is only the rarity the physical item has now. */
export function effectiveItemRarity(item) {
  const base = normalizedRarity(item?.rarity);
  if (!base || !item?.recombobulated) return base;
  return RARITY_UPGRADE[base] || base;
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

function replacePet(mutator) {
  const state = readState();
  if (!state) return false;
  const { setup } = currentSetupRecord(state);
  if (!setup) return false;
  setup.slots ||= {};
  setup.slots.pet = mutator(setup.slots.pet || null);
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

function field(labelText, control) {
  const label = element('label', { className: 'settings-field' });
  label.append(element('span', {}, labelText), control);
  return label;
}

function selectedPetId(item) {
  const id = String(item?.skyblockId || '').trim().toUpperCase();
  if (id) return id;
  const byName = FARMING_PETS.find(pet => pet.name.toLowerCase() === String(item?.displayName || '').trim().toLowerCase());
  return byName?.id || '';
}

function buildPetPicker(editor, item) {
  if (editor.querySelector('[data-farming-pet-picker]')) return;

  editor.classList.add('sb-pet-editor');
  const picker = element('div', {
    className: 'sb-pet-picker item-editor-grid',
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

  const raritySelect = element('select', { dataset: { farmingPetRarity: '1' } });
  const fillRarities = (petId, current) => {
    raritySelect.replaceChildren(element('option', { value: '' }, '— choose rarity —'));
    const legal = [...petRarities(petId)];
    const existing = normalizedRarity(current);
    if (existing && !legal.includes(existing)) {
      raritySelect.append(element('option', { value: existing }, `${existing} · current`));
    }
    for (const rarity of legal) raritySelect.append(element('option', { value: rarity }, rarity));
    raritySelect.value = existing || '';
    raritySelect.disabled = !petId;
  };
  fillRarities(currentId, item?.rarity);

  const bounds = petLevelBounds(currentId);
  const levelInput = element('input', {
    type: 'number',
    dataset: { farmingPetLevel: '1' },
    min: bounds?.min ?? 1,
    max: bounds?.max ?? 100,
    step: 1,
    value: Number.isFinite(Number(item?.petLevel)) ? Number(item.petLevel) : '',
    placeholder: bounds ? `${bounds.min}–${bounds.max}` : 'Choose a pet first',
    disabled: !currentId,
  });

  petSelect.addEventListener('change', () => {
    const pet = farmingPetById(petSelect.value);
    if (!pet) {
      replacePet(() => null);
      return;
    }
    replacePet(current => {
      const legalRarities = pet.rarities;
      const oldRarity = normalizedRarity(current?.rarity);
      const rarity = legalRarities.includes(oldRarity)
        ? oldRarity
        : (legalRarities.length === 1 ? legalRarities[0] : null);
      const currentLevel = Number(current?.petLevel);
      const petLevel = Number.isFinite(currentLevel)
        && currentLevel >= pet.levelMin && currentLevel <= pet.levelMax
        ? Math.floor(currentLevel)
        : null;
      return {
        ...(current || {}),
        skyblockId: pet.id,
        displayName: pet.name,
        rarity,
        petLevel,
        reforge: null,
        enchantments: {},
        gems: [],
        recombobulated: false,
        source: ITEM_SOURCE.MANUAL,
      };
    });
  });

  raritySelect.addEventListener('change', () => {
    replacePet(current => current ? {
      ...current,
      rarity: normalizedRarity(raritySelect.value),
      source: ITEM_SOURCE.MANUAL,
    } : current);
  });

  levelInput.addEventListener('change', () => {
    replacePet(current => current ? {
      ...current,
      petLevel: levelInput.value === '' ? null : clampPetLevel(selectedPetId(current), levelInput.value),
      source: ITEM_SOURCE.MANUAL,
    } : current);
  });

  picker.append(
    field('Pet', petSelect),
    field('Rarity', raritySelect),
    field('Level', levelInput),
  );
  editor.querySelector('.item-editor-head')?.insertAdjacentElement('afterend', picker);
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
      rarity.textContent = item.recombobulated && base !== effective
        ? `${effective} · base ${base} + Recombobulator${source}`
        : `${effective}${source}`;
    }
  }
}

export function applySetupSelectionUi(root = document) {
  const app = root.querySelector?.('#app') || root;
  if (!app?.querySelector) return;
  const setup = activeSetupFromStorage();
  dockSetupEditor(app);
  const petEditor = app.querySelector('[data-item-editor="pet"]');
  if (petEditor) buildPetPicker(petEditor, setup?.slots?.pet || null);
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

if (typeof document !== 'undefined') {
  schedule();
  const app = document.getElementById('app');
  if (app) new MutationObserver(schedule).observe(app, { childList: true, subtree: true });
}
