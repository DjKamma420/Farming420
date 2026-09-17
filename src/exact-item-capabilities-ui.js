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

function replaceReforgeControl(slotId, editor, item, capabilities) {
  const existing = editor.querySelector(`[data-slot-reforge="${slotId}"]`);
  const field = existing?.closest('.settings-field');
  if (!field) return;

  if (!capabilities.known || !capabilities.canReforge) {
    setHidden(field, true);
    return;
  }
  setHidden(field, false);

  let select = existing.matches('select[data-exact-reforge]') ? existing : null;
  if (!select) {
    select = document.createElement('select');
    select.dataset.slotReforge = slotId;
    select.dataset.exactReforge = '1';
    existing.replaceWith(select);
  }
  const signature = `${item?.reforge || ''}|${capabilities.reforges.map(option => option.id).join(',')}`;
  if (select.dataset.signature === signature) return;
  select.dataset.signature = signature;
  const current = String(item?.reforge || '').trim().toLowerCase();
  select.innerHTML = [
    '<option value="">— no reforge —</option>',
    ...capabilities.reforges.map(option => `<option value="${esc(option.id)}" ${option.id === current ? 'selected' : ''}>${esc(option.name)}${option.currentOnly ? ' (current)' : ''}</option>`),
  ].join('');
  select.addEventListener('change', event => {
    const next = load();
    patchSlot(next, slotId, { reforge: event.target.value || null });
    save(next);
    window.location.reload();
  }, { once: true });
}

function configureRecomb(slotId, editor, capabilities) {
  const checkbox = editor.querySelector(`[data-slot-recomb="${slotId}"]`);
  const row = checkbox?.closest('.item-editor-row');
  if (!row) return;
  setHidden(row, !(capabilities.known && capabilities.canRecombobulate));
}

function replaceGemstoneControls(slotId, editor, item, capabilities) {
  const section = editor.querySelector('.gem-grid')?.closest('.item-editor-section');
  if (!section) return;
  const slots = capabilities.known ? capabilities.gemstoneSlots : [];
  setHidden(section, slots.length === 0);
  if (!slots.length) return;

  const sanitized = sanitizeGems(item, slots);
  section.dataset.exactGemstones = '1';
  const heading = section.querySelector('h3');
  const note = section.querySelector('.section-row p');
  if (heading) heading.textContent = 'Gemstones';
  if (note) note.textContent = `${slots.length} official socket${slots.length === 1 ? '' : 's'} on this item. Only legal gemstone types are offered.`;

  const grid = section.querySelector('.gem-grid');
  if (!grid) return;
  const signature = slots.map((slot, index) => `${slot.slotType}:${sanitized[index] || ''}`).join('|');
  if (grid.dataset.signature !== signature) {
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
}

function decorateSlot(raw, slotId, catalog) {
  const editor = document.querySelector(`[data-item-editor="${slotId}"]`);
  if (!editor) return;
  const item = activeSetup(raw)?.slots?.[slotId];
  if (!item?.displayName && !item?.skyblockId) return;
  const capabilities = itemCapabilities(slotId, item, catalog);
  editor.dataset.capabilityKnown = capabilities.known ? '1' : '0';

  replaceReforgeControl(slotId, editor, item, capabilities);
  configureRecomb(slotId, editor, capabilities);
  replaceGemstoneControls(slotId, editor, item, capabilities);

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
}

function apply() {
  if (applying) return;
  applying = true;
  try {
    const raw = load();
    const catalog = readCachedCatalog()?.items || [];
    for (const slotId of MANAGED_SLOTS) decorateSlot(raw, slotId, catalog);
  } finally { applying = false; }
}

function schedule() {
  if (scheduled) return;
  scheduled = true;
  queueMicrotask(() => { scheduled = false; apply(); });
}
function boot() {
  apply();
  const app = document.getElementById('app');
  if (app && typeof MutationObserver !== 'undefined') {
    new MutationObserver(schedule).observe(app, { childList: true, subtree: true });
  }
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
else boot();
