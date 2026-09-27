import { STORAGE_KEY } from './config.js';
import { UPGRADES } from './data.js';
import { ACTIVITY_MODE, setActivityModeOnState } from './activity-mode.js';
import { computeStatTotals } from './computed-stats.js';
import { applySnapshotToProgress } from './snapshot-apply.js';
import {
  FARMING_REFORGES_BY_FAMILY,
  applyVacuumReforge,
  selectedVacuumReforge,
} from './item-capabilities.js';
import { petLevelFromExperience } from './mooshroom-cow.js';
import { effectiveSetup, writeLinkedSetupSlot } from './setups.js';
import { formatNumber } from './format-number.js';
import { isVacuumDirectUpgrade, vacuumPhysicalStats } from './vacuum-state.js';

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

function setupTargetId(raw) {
  return raw?.setupSlotTarget || raw?.profile?.setups?.activeId || null;
}

function activeSetup(raw) {
  const targetId = setupTargetId(raw);
  return targetId ? effectiveSetup(raw?.profile?.setups, targetId) : null;
}

function patchSlot(slotId, changes) {
  const raw = load();
  const targetId = setupTargetId(raw);
  const setup = activeSetup(raw);
  if (!setup || !targetId) return;
  const item = { ...(setup.slots?.[slotId] || {}), ...changes, source: 'manual' };
  writeLinkedSetupSlot(raw.profile?.setups, targetId, slotId, item);
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
    panel.className = 'item-editor rarity-unknown sb-docked-editor sb-tool-editor-collapsed';
    anchor?.insertAdjacentElement('afterend', panel);
  }

  const cropId = raw.selectedCrop || 'melon';
  const killStats = statsForMode(raw, cropId, ACTIVITY_MODE.PEST_KILL);
  const totalPestFortune = Number(killStats.effectiveFortune || 0);
  const bucket = ensureVacuumBucket(raw);
  const reforge = selectedVacuumReforge(bucket);
  // If an old build left Beady's scored flag enabled while Buzzing was selected,
  // normalize it before totals are recalculated.
  if (bucket.reforge && reforge) applyVacuumReforge(bucket, reforge);
  const vacuumStats = vacuumPhysicalStats(bucket);
  const entries = UPGRADES.filter(isVacuumDirectUpgrade);
  const signature = [
    reforge || '',
    bucket.skyblockId || '',
    bucket.recombobulated ? 1 : 0,
    totalPestFortune,
    killStats.pestFortune,
    killStats.overbloom,
    vacuumStats.farmingFortune,
    vacuumStats.damage,
    vacuumStats.range,
    entries.map(item => `${item.id}:${vacuumLevel(bucket, item)}`).join('|'),
  ].join('|');
  if (panel.dataset.signature === signature) return;
  panel.dataset.signature = signature;

  panel.innerHTML = `
    <section class="item-editor-section" data-vacuum-section="reforge">
      <div class="workspace-section-head"><div><h3>Reforge</h3><p>Exactly one Vacuum reforge can be active.</p></div></div>
      ${vacuumStats.selected ? `<div class="workspace-choice-list" role="radiogroup" aria-label="Vacuum reforge">
        ${[
          { id: '', name: 'No reforge', stone: 'Nothing applied' },
          ...FARMING_REFORGES_BY_FAMILY.vacuum,
        ].map(option => {
          const selected = option.id === (reforge || '');
          return `<label class="workspace-choice ${selected ? 'selected' : ''}">
            <input type="radio" name="vacuum-workspace-reforge" value="${esc(option.id)}" data-vacuum-reforge-choice="${esc(option.id)}" ${selected ? 'checked' : ''}>
            <span class="workspace-radio" aria-hidden="true"></span>
            <span class="workspace-choice-copy"><strong>${esc(option.name)}</strong><small>${esc(option.stone || '')}</small></span>
          </label>`;
        }).join('')}
      </div>` : '<p class="hint">Choose the physical Vacuum model above before selecting a reforge.</p>'}
    </section>
    <section class="item-editor-section" data-vacuum-section="upgrades">
      <div class="workspace-section-head"><div><h3>Vacuum upgrades</h3><p>Use the same 0-to-max progression controls as the farming tools. Zero means the upgrade is not applied.</p></div></div>
      <div class="workspace-level-list">
        ${vacuumStats.selected
          ? (entries.map(item => vacuumUpgradeRow(bucket, item)).join('') || '<p class="hint">No other modeled Vacuum values are available yet.</p>')
          : '<p class="hint">Choose the physical Vacuum model above before configuring item-local upgrades.</p>'}
      </div>
    </section>
    <section class="item-editor-section" data-vacuum-section="totals">
      <div class="workspace-section-head"><div><h3>Pest totals</h3><p>Calculated from the configured Vacuum and the active Killing setup.</p></div></div>
      <div class="pest-loadout-stats" aria-label="Vacuum Pest totals">
        <div class="pest-loadout-stat"><span>Effective Pest Fortune</span><strong>${formatNumber(totalPestFortune)}</strong><small>Global ${formatNumber(Number(killStats.globalFortune || 0))} + crop ${formatNumber(Number(killStats.cropFortune || 0))} + Pest-only ${formatNumber(Number(killStats.pestFortune || 0))}</small></div>
        <div class="pest-loadout-stat"><span>Pest-only Fortune</span><strong>${formatNumber(Number(killStats.pestFortune || 0))}</strong></div>
        <div class="pest-loadout-stat"><span>Pest Overbloom</span><strong>${formatNumber(Number(killStats.overbloom || 0))}</strong></div>
        <div class="pest-loadout-stat"><span>Vacuum Farming Fortune</span><strong>${formatNumber(vacuumStats.farmingFortune)}</strong><small>Selected Vacuum and its item-local modifiers only</small></div>
        <div class="pest-loadout-stat"><span>Vacuum Damage</span><strong>${formatNumber(vacuumStats.damage)}</strong></div>
        <div class="pest-loadout-stat"><span>Vacuum Range</span><strong>${formatNumber(vacuumStats.range)}</strong></div>
      </div>
    </section>`;

  panel.querySelectorAll('[data-vacuum-reforge-choice]').forEach(input => input.addEventListener('change', () => {
    writeVacuumReforge(input.dataset.vacuumReforgeChoice || null);
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
