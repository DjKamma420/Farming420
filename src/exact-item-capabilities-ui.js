import { STORAGE_KEY } from './config.js';
import { readCachedCatalog } from './item-catalog.js';
import { gemValuesForSlotType, itemCapabilities } from './item-capabilities.js';

const MANAGED_SLOTS = Object.freeze([
  'helmet', 'chestplate', 'leggings', 'boots',
  'equipment1', 'equipment2', 'equipment3', 'equipment4',
]);
let applying = false;
let scheduled = false;

function load() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch { return {}; }
}
function save(raw) { localStorage.setItem(STORAGE_KEY, JSON.stringify(raw)); }
function activeSetup(raw) {
  const setups = raw?.profile?.setups;
  const list = Array.isArray(setups?.list) ? setups.list : [];
  return list.find(entry => entry?.id === setups?.activeId) || list[0] || null;
}
function esc(value = '') {
  return String(value).replace(/[&<>'"]/g, character => ({
    '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#039;', '"':'&quot;',
  }[character]));
}
function sameArray(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
  return a.every((value, index) => value === b[index]);
}
function patchSlot(raw, slotId, changes) {
  const setup = activeSetup(raw);
  if (!setup) return;
  setup.slots ||= {};
  setup.slots[slotId] = { ...(setup.slots[slotId] || {}), ...changes, source: 'manual' };
}
function setHidden(node, hidden) {
  if (!node) return;
  if (hidden) node.setAttribute('hidden', '');
  else node.removeAttribute('hidden');
}

function sanitizeGems(item, slots) {
  const current = Array.isArray(item?.gems) ? item.gems : [];
  return slots.map((slot, index) => {
    const value = String(current[index] || '').trim().toUpperCase();
    return gemValuesForSlotType(slot.slotType).includes(value) ? value : '';
  });
}

function reforgeChoiceMarkup(slotId, option, current) {
  const id = String(option?.id || '');
  const selected = id === current;
  const label = option?.name || id || 'No reforge';
  const stone = option?.stone || (option?.currentOnly ? 'Current reforge' : 'No stone');
  const itemId = option?.itemId || '';
  const fallback = label === 'No reforge' ? '&ndash;' : esc(label.slice(0, 1).toUpperCase());
  return `<button type="button" class="sb-reforge-card setup-reforge-card ${selected ? 'selected' : ''} ${id ? '' : 'sb-reforge-none'}"
      role="radio" aria-checked="${selected ? 'true' : 'false'}"
      data-slot-reforge-choice="${esc(slotId)}" data-reforge-id="${esc(id)}" data-reforge-item-id="${esc(itemId)}">
    <span class="sb-reforge-art"><span class="sb-reforge-fallback">${fallback}</span></span>
    <span class="sb-reforge-copy"><strong>${esc(label)}</strong><small>${esc(stone)}</small></span>
    <span class="sb-state-dot" aria-hidden="true"></span>
  </button>`;
}

function replaceReforgeControl(slotId, editor, item, capabilities) {
  const existing = editor.querySelector(`[data-slot-reforge="${slotId}"]`);
  const existingGrid = editor.querySelector(`[data-exact-reforge-grid="${slotId}"]`);
  const field = existing?.closest('.settings-field') || existingGrid?.closest('.settings-field');
  if (!field) return;

  if (!capabilities.known || !capabilities.canReforge) {
    setHidden(field, true);
    return;
  }
  setHidden(field, false);
  field.classList.add('setup-reforge-field');

  let grid = existingGrid;
  if (!grid) {
    grid = document.createElement('div');
    grid.className = 'sb-reforge-grid sb-reforge-grid-compact setup-reforge-grid';
    grid.dataset.exactReforgeGrid = slotId;
    grid.setAttribute('role', 'radiogroup');
    grid.setAttribute('aria-label', 'Reforge on this item');
    existing.replaceWith(grid);
  }

  const current = String(item?.reforge || '').trim().toLowerCase();
  const signature = `${current}|${capabilities.reforges.map(option => `${option.id}:${option.itemId || ''}`).join(',')}`;
  if (grid.dataset.signature === signature) return;
  grid.dataset.signature = signature;

  const options = [{ id: '', name: 'No reforge', stone: 'Nothing applied', itemId: '' }, ...capabilities.reforges];
  grid.innerHTML = options.map(option => reforgeChoiceMarkup(slotId, option, current)).join('');
  grid.querySelectorAll(`[data-slot-reforge-choice="${slotId}"]`).forEach(button => button.addEventListener('click', event => {
    event.preventDefault();
    const next = load();
    patchSlot(next, slotId, { reforge: button.dataset.reforgeId || null });
    save(next);
    window.dispatchEvent(new Event('farming420:state-changed'));
  }));
}
function configureRecomb(raw, slotId, editor, item, capabilities) {
  const checkbox = editor.querySelector(`[data-slot-recomb="${slotId}"]`);
  const row = checkbox?.closest('.item-editor-row');
  if (!row) return false;
  const allowed = capabilities.known && capabilities.canRecombobulate;
  setHidden(row, !allowed);
  if (!allowed && item?.recombobulated) {
    patchSlot(raw, slotId, { recombobulated: false });
    return true;
  }
  return false;
}

function replaceGemstoneControls(raw, slotId, editor, item, capabilities) {
  const section = editor.querySelector('.gem-grid')?.closest('.item-editor-section');
  if (!section) return false;
  const slots = capabilities.known ? capabilities.gemstoneSlots : [];
  setHidden(section, slots.length === 0);

  const sanitized = sanitizeGems(item, slots);
  const changed = !sameArray(Array.isArray(item?.gems) ? item.gems : [], sanitized);
  if (changed) patchSlot(raw, slotId, { gems: sanitized });
  if (!slots.length) return changed;

  section.dataset.exactGemstones = '1';
  const heading = section.querySelector('h3');
  const note = section.querySelector('.section-row p');
  if (heading) heading.textContent = 'Gemstones';
  if (note) note.textContent = `${slots.length} official socket${slots.length === 1 ? '' : 's'} on this item. Only legal gemstone types are offered.`;

  const grid = section.querySelector('.gem-grid');
  const signature = slots.map((slot, index) => `${slot.slotType}:${sanitized[index] || ''}`).join('|');
  if (grid?.dataset.signature !== signature) {
    grid.dataset.signature = signature;
    grid.innerHTML = slots.map((slot, index) => {
      const values = gemValuesForSlotType(slot.slotType);
      const current = sanitized[index] || '';
      return `<label class="gem-line exact-gem-line">
        <span><strong>${esc(slot.slotType)}</strong> slot ${index + 1}</span>
        <select data-exact-gem="${esc(slotId)}" data-gem-index="${index}">
          <option value="">— empty —</option>
          ${values.map(value => `<option value="${esc(value)}" ${value === current ? 'selected' : ''}>${esc(value)}</option>`).join('')}
        </select>
      </label>`;
    }).join('');
    grid.querySelectorAll(`[data-exact-gem="${slotId}"]`).forEach(select => select.addEventListener('change', event => {
      const next = load();
      const setup = activeSetup(next);
      const nextItem = setup?.slots?.[slotId] || {};
      const nextCapabilities = itemCapabilities(slotId, nextItem, readCachedCatalog()?.items || []);
      const gems = sanitizeGems(nextItem, nextCapabilities.gemstoneSlots);
      gems[Number(event.target.dataset.gemIndex)] = event.target.value || '';
      patchSlot(next, slotId, { gems });
      save(next);
      window.location.reload();
    }));
  }
  return changed;
}

function decorateSlot(raw, slotId, catalog) {
  const editor = document.querySelector(`[data-item-editor="${slotId}"]`);
  if (!editor) return false;
  const item = activeSetup(raw)?.slots?.[slotId];
  if (!item?.displayName && !item?.skyblockId) return false;
  const capabilities = itemCapabilities(slotId, item, catalog);
  editor.dataset.capabilityKnown = capabilities.known ? '1' : '0';

  replaceReforgeControl(slotId, editor, item, capabilities);
  let changed = configureRecomb(raw, slotId, editor, item, capabilities);
  changed = replaceGemstoneControls(raw, slotId, editor, item, capabilities) || changed;

  let note = editor.querySelector('[data-capability-note]');
  if (!capabilities.known) {
    if (!note) {
      note = document.createElement('p');
      note.dataset.capabilityNote = '1';
      note.className = 'hint';
      editor.querySelector('.item-editor-grid')?.insertAdjacentElement('afterend', note);
    }
    note.textContent = 'Reforge, Recombobulator and gemstone controls are hidden until this item matches an official SkyBlock item ID.';
  } else {
    note?.remove();
  }
  return changed;
}

function apply() {
  if (applying) return;
  applying = true;
  try {
    const raw = load();
    const catalog = readCachedCatalog()?.items || [];
    let changed = false;
    for (const slotId of MANAGED_SLOTS) changed = decorateSlot(raw, slotId, catalog) || changed;
    // Cleanup is persisted without navigation. The previous implementation
    // reloaded here, which could repeat during startup and keep the app from
    // ever settling on profiles containing stale generic gem/recomb states.
    if (changed) save(raw);
  } finally { applying = false; }
}

function schedule() {
  if (scheduled) return;
  scheduled = true;
  queueMicrotask(() => { scheduled = false; apply(); });
}

export function mutationNeedsCapabilityApply(mutations) {
  return mutations.some(mutation => [...mutation.addedNodes].some(node => {
    if (!(node instanceof Element)) return false;
    return node.matches?.('[data-item-editor]') || Boolean(node.querySelector?.('[data-item-editor]'));
  }));
}

function boot() {
  apply();
  const app = document.getElementById('app');
  if (app && typeof MutationObserver !== 'undefined') {
    new MutationObserver(mutations => {
      if (mutationNeedsCapabilityApply(mutations)) schedule();
    }).observe(app, { childList: true, subtree: true });
  }
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
else boot();
