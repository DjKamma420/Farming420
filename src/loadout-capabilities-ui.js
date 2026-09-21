import { STORAGE_KEY } from './config.js';
import { UPGRADES } from './data.js';
import { ACTIVITY_MODE, isVacuumItemEntry, setActivityModeOnState } from './activity-mode.js';
import { computeStatTotals } from './computed-stats.js';
import { applySnapshotToProgress } from './snapshot-apply.js';
import {
  FARMING_REFORGES_BY_FAMILY,
  VACUUM_REFORGE_EFFECT_ENTRY_IDS,
  applyVacuumReforge,
  selectedVacuumReforge,
} from './item-capabilities.js';
import { petLevelFromExperience } from './mooshroom-cow.js';
import { writeLinkedSetupSlot } from './setups.js';

const PET_RARITIES = Object.freeze(['COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY', 'MYTHIC']);
let applying = false;
let scheduled = false;

function load() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch { return {}; }
}

function save(raw) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(raw));
}

function esc(value = '') {
  return String(value).replace(/[&<>'"]/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;',
  }[character]));
}

function activeSetup(raw) {
  const setups = raw?.profile?.setups;
  const list = Array.isArray(setups?.list) ? setups.list : [];
  return list.find(entry => entry?.id === setups?.activeId) || list[0] || null;
}

function patchSlot(slotId, changes) {
  const raw = load();
  const setup = activeSetup(raw);
  if (!setup) return;
  setup.slots ||= {};
  const item = { ...(setup.slots[slotId] || {}), ...changes, source: 'manual' };
  writeLinkedSetupSlot(raw.profile?.setups, setup.id, slotId, item);
  save(raw);
  window.dispatchEvent(new Event('farming420:state-changed'));
}

function hideUnsupportedItemControls(editor) {
  editor.querySelector('[data-slot-reforge]')?.closest('.settings-field')?.setAttribute('hidden', '');
  editor.querySelector('[data-slot-recomb]')?.closest('.item-editor-row')?.setAttribute('hidden', '');
  editor.querySelector('.enchant-grid')?.closest('.item-editor-section')?.setAttribute('hidden', '');
  editor.querySelector('.gem-grid')?.closest('.item-editor-section')?.setAttribute('hidden', '');
}

function matchingSyncedPet(raw, item) {
  const pets = Array.isArray(raw?.profile?.normalizedSnapshot?.pets) ? raw.profile.normalizedSnapshot.pets : [];
  const id = String(item?.skyblockId || '').toUpperCase().replace(/[^A-Z0-9]+/g, '_');
  const name = String(item?.displayName || '').toUpperCase().replace(/[^A-Z0-9]+/g, '_');
  return pets.find(pet => {
    const type = String(pet?.type || '').toUpperCase().replace(/[^A-Z0-9]+/g, '_');
    return type && (type === id || name.includes(type));
  }) || null;
}

function petDisplayLevel(raw, item) {
  const explicit = Number(item?.petLevel);
  if (Number.isFinite(explicit) && explicit >= 1 && explicit <= 100) return explicit;
  const synced = matchingSyncedPet(raw, item);
  if (!synced) return '';
  return petLevelFromExperience(synced.experience, item?.rarity || synced.rarity || 'COMMON') ?? '';
}

function decoratePetEditor(raw) {
  const editor = document.querySelector('[data-item-editor="pet"]');
  if (!editor) return;
  hideUnsupportedItemControls(editor);

  const item = activeSetup(raw)?.slots?.pet || {};
  const currentLevel = petDisplayLevel(raw, item);
  let panel = editor.querySelector('[data-pet-core-fields]');
  if (!panel) {
    panel = document.createElement('div');
    panel.dataset.petCoreFields = '1';
    panel.className = 'item-editor-grid pet-core-fields';
    editor.querySelector('.item-editor-grid')?.insertAdjacentElement('afterend', panel);
  }

  const signature = `${item.skyblockId || item.displayName || ''}:${item.rarity || ''}:${currentLevel || ''}`;
  if (panel.dataset.signature !== signature) {
    panel.dataset.signature = signature;
    panel.innerHTML = `
      <label class="settings-field"><span>Pet rarity</span>
        <select data-pet-rarity>
          <option value="">— unknown —</option>
          ${PET_RARITIES.map(rarity => `<option value="${rarity}" ${String(item.rarity || '').toUpperCase() === rarity ? 'selected' : ''}>${rarity}</option>`).join('')}
        </select>
      </label>
      <label class="settings-field"><span>Pet level</span>
        <input type="number" min="1" max="100" step="1" data-pet-level value="${esc(currentLevel)}" placeholder="1-100">
        <span class="hint">Level and rarity drive the pet's perk values. They are not Recombobulator or gemstone upgrades.</span>
      </label>`;

    panel.querySelector('[data-pet-rarity]')?.addEventListener('change', event => {
      patchSlot('pet', { rarity: event.target.value || null });
    });
    panel.querySelector('[data-pet-level]')?.addEventListener('change', event => {
      const value = Math.max(1, Math.min(100, Math.floor(Number(event.target.value) || 1)));
      patchSlot('pet', { petLevel: value });
    });
  }

  const summary = document.querySelector('[data-slot="pet"] .slot-text span:last-child');
  if (summary && item.displayName) {
    const parts = [];
    if (currentLevel) parts.push(`Lv ${currentLevel}`);
    if (item.rarity) parts.push(String(item.rarity).toUpperCase());
    if (parts.length && summary.textContent !== parts.join(' · ')) summary.textContent = parts.join(' · ');
  }
}

function decoratePetItemEditor() {
  const editor = document.querySelector('[data-item-editor="petItem"]');
  if (!editor) return;
  hideUnsupportedItemControls(editor);
}

function ensureVacuumBucket(raw) {
  raw.profile ||= {};
  const bucket = raw.profile.vacuumProgress ||= {};
  bucket.levels ||= {};
  bucket.owned ||= {};
  bucket.costs ||= {};
  bucket.manualGain ||= {};
  return bucket;
}

function vacuumLevel(bucket, item) {
  const max = Math.max(1, Number(item.max || 1));
  const level = Number(bucket.levels?.[item.id] || 0);
  if (Number.isFinite(level) && level > 0) return Math.min(max, level);
  return bucket.owned?.[item.id] ? 1 : 0;
}

function vacuumUpgradeRow(bucket, item) {
  const max = Math.max(1, Number(item.max || 1));
  const level = vacuumLevel(bucket, item);
  const note = item.notes || item.metric || 'Vacuum upgrade';

  if (max === 1) {
    return `<label class="workspace-level-row workspace-toggle-row">
      <div><strong>${esc(item.name)}</strong><small>${esc(note)}</small></div>
      <input type="checkbox" data-vacuum-toggle="${esc(item.id)}" ${level > 0 ? 'checked' : ''}>
    </label>`;
  }

  return `<div class="workspace-level-row">
    <div><strong>${esc(item.name)}</strong><small>${esc(note)}</small></div>
    <div class="workspace-stepper">
      <button type="button" data-vacuum-step="-1" data-vacuum-entry="${esc(item.id)}" aria-label="Decrease ${esc(item.name)}">−</button>
      <select data-vacuum-number="${esc(item.id)}" aria-label="${esc(item.name)} level">
        ${Array.from({ length: max + 1 }, (_, value) => `<option value="${value}" ${value === level ? 'selected' : ''}>${value}</option>`).join('')}
      </select>
      <button type="button" data-vacuum-step="1" data-vacuum-entry="${esc(item.id)}" aria-label="Increase ${esc(item.name)}">+</button>
      <span>/ ${max}</span>
    </div>
  </div>`;
}

function writeVacuumEntry(item, patch) {
  const raw = load();
  const bucket = ensureVacuumBucket(raw);
  Object.assign(bucket.levels, patch.levels || {});
  Object.assign(bucket.owned, patch.owned || {});
  if (patch.clear) {
    delete bucket.levels[item.id];
    delete bucket.owned[item.id];
  }
  save(raw);
  window.dispatchEvent(new Event('farming420:state-changed'));
}

function writeVacuumReforge(reforgeId) {
  const raw = load();
  const bucket = ensureVacuumBucket(raw);
  applyVacuumReforge(bucket, reforgeId || null);
  save(raw);
  window.dispatchEvent(new Event('farming420:state-changed'));
}

function statsForMode(raw, cropId, mode) {
  const scoped = typeof structuredClone === 'function'
    ? structuredClone(raw)
    : JSON.parse(JSON.stringify(raw));
  setActivityModeOnState(scoped, mode);
  scoped.profile ||= {};
  scoped.profile.lastApply = applySnapshotToProgress(scoped, scoped.profile.normalizedSnapshot || {});
  return computeStatTotals(scoped, cropId, mode);
}

function renderVacuumSurface(raw) {
  // Vacuum is a physical tool. Configure it in the same expandable picker as
  // the crop tools; Pest pages only analyze this stored build.
  if (raw.page !== 'tools') return;
  const content = document.querySelector('.content');
  if (!content) return;

  const anchor = content.querySelector('[data-sb-vacuum]')
    || content.querySelector('.sb-tool-picker')
    || content.querySelector('[data-tool-editor="1"]')
    || content.querySelector('.page-head');
  let panel = content.querySelector('[data-vacuum-panel]');
  if (!panel) {
    panel = document.createElement('div');
    panel.dataset.vacuumPanel = '1';
    panel.className = 'item-editor pest-loadout-panel rarity-unknown sb-docked-editor sb-tool-editor-collapsed';
    anchor?.insertAdjacentElement('afterend', panel);
  }

  const cropId = raw.selectedCrop || 'melon';
  const killStats = statsForMode(raw, cropId, ACTIVITY_MODE.PEST_KILL);
  const totalPestFortune = Number(killStats.globalFortune || 0) + Number(killStats.pestFortune || 0);
  const bucket = ensureVacuumBucket(raw);
  const reforge = selectedVacuumReforge(bucket);
  // If an old build left Beady's scored flag enabled while Buzzing was selected,
  // normalize it before totals are recalculated.
  if (bucket.reforge && reforge) applyVacuumReforge(bucket, reforge);
  const reforgeEntries = new Set(Object.values(VACUUM_REFORGE_EFFECT_ENTRY_IDS).filter(Boolean));
  const entries = UPGRADES.filter(isVacuumItemEntry).filter(item => !reforgeEntries.has(item.id));
  const signature = [
    reforge || '',
    bucket.skyblockId || '',
    bucket.recombobulated ? 1 : 0,
    totalPestFortune,
    killStats.pestFortune,
    killStats.overbloom,
    entries.map(item => `${item.id}:${vacuumLevel(bucket, item)}`).join('|'),
  ].join('|');
  if (panel.dataset.signature === signature) return;
  panel.dataset.signature = signature;

  panel.innerHTML = `
    <section class="item-editor-section sb-reforge-panel" data-vacuum-section="reforge">
      <div class="sb-block-title"><div><span class="eyebrow">Reforge</span><h3>Pick what is actually on the Vacuum</h3><p>A Vacuum carries exactly one Vacuum reforge.</p></div></div>
      <div class="sb-reforge-grid sb-reforge-grid-compact setup-reforge-grid" role="radiogroup" aria-label="Vacuum reforge">
        ${[
          { id: '', name: 'No reforge', stone: 'Nothing applied', itemId: '' },
          ...FARMING_REFORGES_BY_FAMILY.vacuum,
        ].map(option => {
          const selected = option.id === (reforge || '');
          const fallback = option.id ? esc(option.name.slice(0, 1).toUpperCase()) : '&ndash;';
          return `<button type="button" class="sb-reforge-card setup-reforge-card ${selected ? 'selected' : ''} ${option.id ? '' : 'sb-reforge-none'}"
            role="radio" aria-checked="${selected ? 'true' : 'false'}"
            data-vacuum-reforge-choice="${esc(option.id)}" data-reforge-id="${esc(option.id)}" data-reforge-item-id="${esc(option.itemId || '')}">
            <span class="sb-reforge-art"><span class="sb-reforge-fallback">${fallback}</span></span>
            <span class="sb-reforge-copy"><strong>${esc(option.name)}</strong><small>${esc(option.stone || '')}</small></span>
            <span class="sb-state-dot" aria-hidden="true"></span>
          </button>`;
        }).join('')}
      </div>
    </section>
    <section class="item-editor-section" data-vacuum-section="upgrades">
      <div class="workspace-section-head"><div><h3>Vacuum upgrades</h3><p>Use the same 0-to-max progression controls as the farming tools. Zero means the upgrade is not applied.</p></div></div>
      <div class="workspace-level-list">
        ${entries.map(item => vacuumUpgradeRow(bucket, item)).join('') || '<p class="hint">No other modeled Vacuum values are available yet.</p>'}
      </div>
    </section>
    <section class="item-editor-section" data-vacuum-section="totals">
      <div class="workspace-section-head"><div><h3>Pest totals</h3><p>Calculated from the configured Vacuum and the active Killing setup.</p></div></div>
      <div class="pest-loadout-stats" aria-label="Vacuum Pest totals">
        <div class="pest-loadout-stat"><span>Total Pest Fortune</span><strong>${totalPestFortune.toLocaleString('en-US')}</strong><small>Global + Pest-only (+${Number(killStats.pestFortune || 0).toLocaleString('en-US')})</small></div>
        <div class="pest-loadout-stat"><span>Pest Overbloom</span><strong>${Number(killStats.overbloom || 0).toLocaleString('en-US')}</strong></div>
      </div>
    </section>`;

  panel.querySelectorAll('[data-vacuum-reforge-choice]').forEach(button => button.addEventListener('click', event => {
    event.preventDefault();
    writeVacuumReforge(button.dataset.vacuumReforgeChoice || null);
  }));
  panel.querySelectorAll('[data-vacuum-toggle]').forEach(input => input.addEventListener('change', event => {
    const item = entries.find(entry => entry.id === input.dataset.vacuumToggle);
    if (!item) return;
    if (!event.target.checked) writeVacuumEntry(item, { clear: true });
    else writeVacuumEntry(item, { levels: { [item.id]: 1 }, owned: { [item.id]: true } });
  }));
  panel.querySelectorAll('[data-vacuum-number]').forEach(select => select.addEventListener('change', event => {
    const item = entries.find(entry => entry.id === select.dataset.vacuumNumber);
    if (!item) return;
    const max = Math.max(1, Number(item.max || 1));
    const level = Math.max(0, Math.min(max, Math.floor(Number(event.target.value) || 0)));
    if (level === 0) writeVacuumEntry(item, { clear: true });
    else writeVacuumEntry(item, { levels: { [item.id]: level }, owned: { [item.id]: true } });
  }));
  panel.querySelectorAll('[data-vacuum-step]').forEach(button => button.addEventListener('click', () => {
    const item = entries.find(entry => entry.id === button.dataset.vacuumEntry);
    if (!item) return;
    const max = Math.max(1, Number(item.max || 1));
    const next = Math.max(0, Math.min(max, vacuumLevel(bucket, item) + Number(button.dataset.vacuumStep || 0)));
    if (next === 0) writeVacuumEntry(item, { clear: true });
    else writeVacuumEntry(item, { levels: { [item.id]: next }, owned: { [item.id]: true } });
  }));
}

function apply() {
  if (applying) return;
  applying = true;
  try {
    const raw = load();
    decoratePetEditor(raw);
    decoratePetItemEditor();
    renderVacuumSurface(raw);
  } finally {
    applying = false;
  }
}

function schedule() {
  if (scheduled) return;
  scheduled = true;
  queueMicrotask(() => {
    scheduled = false;
    apply();
  });
}

function boot() {
  apply();
  const app = document.getElementById('app');
  if (!app || typeof MutationObserver === 'undefined') return;
  new MutationObserver(schedule).observe(app, { childList: true, subtree: true });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
else boot();
