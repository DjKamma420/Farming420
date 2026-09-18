import { STORAGE_KEY } from './config.js';
import { UPGRADES } from './data.js';
import { ACTIVITY_MODE, isVacuumItemEntry } from './activity-mode.js';
import { computeStatTotals } from './computed-stats.js';
import {
  FARMING_REFORGES_BY_FAMILY,
  VACUUM_REFORGE_EFFECT_ENTRY_IDS,
  applyVacuumReforge,
  selectedVacuumReforge,
} from './item-capabilities.js';
import { petLevelFromExperience } from './mooshroom-cow.js';

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
  setup.slots[slotId] = { ...(setup.slots[slotId] || {}), ...changes, source: 'manual' };
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

function renderVacuumSurface(raw) {
  // The normal crop tool is shared by Farming and Spawning and stays on Tools.
  // Vacuum is a Killing-only Pest concern, so configure it on the Pests page
  // without changing the shared Tools workspace.
  if (raw.page !== 'pests') return;
  const content = document.querySelector('.content');
  if (!content) return;

  let panel = content.querySelector('[data-vacuum-panel]');
  if (!panel) {
    panel = document.createElement('div');
    panel.dataset.vacuumPanel = '1';
    panel.className = 'item-editor pest-loadout-panel rarity-unknown';
    content.querySelector('.page-head')?.insertAdjacentElement('afterend', panel);
  }

  const cropId = raw.selectedCrop || 'melon';
  const spawnStats = computeStatTotals(raw, cropId, ACTIVITY_MODE.PEST_SPAWN);
  const killStats = computeStatTotals(raw, cropId, ACTIVITY_MODE.PEST_KILL);
  const bucket = ensureVacuumBucket(raw);
  const reforge = selectedVacuumReforge(bucket);
  // If an old build left Beady's scored flag enabled while Buzzing was selected,
  // normalize it before totals are recalculated.
  if (bucket.reforge && reforge) applyVacuumReforge(bucket, reforge);
  const reforgeEntries = new Set(Object.values(VACUUM_REFORGE_EFFECT_ENTRY_IDS).filter(Boolean));
  const entries = UPGRADES.filter(isVacuumItemEntry).filter(item => !reforgeEntries.has(item.id));
  const signature = [
    reforge || '',
    spawnStats.effectiveFortune,
    spawnStats.bonusPestChance,
    killStats.effectiveFortune,
    killStats.pestFortune,
    killStats.overbloom,
    entries.map(item => `${item.id}:${vacuumLevel(bucket, item)}`).join('|'),
  ].join('|');
  if (panel.dataset.signature === signature) return;
  panel.dataset.signature = signature;

  panel.innerHTML = `
    <header class="item-editor-head">
      <div class="item-portrait"><span class="item-portrait-fallback">PE</span></div>
      <div class="item-identity"><div class="eyebrow">Pest loadouts</div><strong class="item-title">Spawning + Killing totals</strong><span class="item-rarity">Shared values stay shared; only the loadout-specific gear and Vacuum differ.</span></div>
    </header>
    <section class="pest-loadout-stats" aria-label="Pest loadout totals">
      <div class="pest-loadout-stat"><span>Spawning Farming Fortune</span><strong>${Number(spawnStats.effectiveFortune || 0).toLocaleString('en-US')}</strong></div>
      <div class="pest-loadout-stat"><span>Bonus Pest Chance</span><strong>${Number(spawnStats.bonusPestChance || 0).toLocaleString('en-US')}</strong></div>
      <div class="pest-loadout-stat"><span>Total Pest Fortune</span><strong>${Number(killStats.effectiveFortune || 0).toLocaleString('en-US')}</strong><small>Pest-only: +${Number(killStats.pestFortune || 0).toLocaleString('en-US')}</small></div>
      <div class="pest-loadout-stat"><span>Pest Overbloom</span><strong>${Number(killStats.overbloom || 0).toLocaleString('en-US')}</strong></div>
    </section>
    <section class="item-editor-section">
      <div class="section-row"><div><h3>Vacuum · Killing only</h3><p>The Vacuum belongs to the Killing loadout. It does not replace the shared crop Tool on the Tools page.</p></div></div>
    </section>
    <section class="item-editor-section">
      <div class="section-row"><div><h3>Vacuum reforge</h3><p>A Vacuum can have exactly one reforge. Beady contributes to the Killing Pest Fortune total; Buzzing is the damage reforge.</p></div></div>
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
    <section class="item-editor-section">
      <div class="section-row"><div><h3>Other Vacuum values</h3><p>Only Vacuum properties belong here. Shared Shards and other general sources remain configured once in their own sections and are included automatically when applicable.</p></div></div>
      <div class="enchant-grid">
        ${entries.map(item => {
          const level = vacuumLevel(bucket, item);
          const max = Math.max(1, Number(item.max || 1));
          const on = level > 0;
          return `<div class="enchant-line ${on ? 'on' : 'off'}">
            <label class="lever"><input type="checkbox" data-vacuum-toggle="${esc(item.id)}" ${on ? 'checked' : ''}><span class="lever-track"></span></label>
            <span class="enchant-name">${esc(item.name)}</span>
            ${max > 1 ? `<input class="enchant-level" type="number" min="1" max="${max}" value="${level || 1}" data-vacuum-level="${esc(item.id)}" ${on ? '' : 'disabled'}>` : '<span></span>'}
            <span class="enchant-max">${item.stepGain ? `+${Number(item.stepGain).toLocaleString('en-US')} / step` : item.metric}</span>
          </div>`;
        }).join('') || '<p class="hint">No other modeled Vacuum values are available yet.</p>'}
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
    else writeVacuumEntry(item, { levels: { [item.id]: Math.max(1, vacuumLevel(bucket, item)) }, owned: { [item.id]: true } });
  }));
  panel.querySelectorAll('[data-vacuum-level]').forEach(input => input.addEventListener('change', event => {
    const item = entries.find(entry => entry.id === input.dataset.vacuumLevel);
    if (!item) return;
    const max = Math.max(1, Number(item.max || 1));
    const level = Math.max(1, Math.min(max, Math.floor(Number(event.target.value) || 1)));
    writeVacuumEntry(item, { levels: { [item.id]: level }, owned: { [item.id]: true } });
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
