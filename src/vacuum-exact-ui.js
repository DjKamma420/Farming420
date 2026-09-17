import { STORAGE_KEY } from './config.js';
import { loadItemCatalog, readCachedCatalog } from './item-catalog.js';
import {
  GARDEN_VACUUM_ITEMS,
  availableOfficialGemstoneSlots,
  catalogItemByExactId,
  officialGemstoneUnlockCoins,
  officialGemstoneUnlockItems,
  vacuumFallbackGemstoneSlotCount,
} from './exact-farming-items.js';
import {
  GEMSTONE_QUALITIES,
  normalizeToolGemstoneSlots,
  withGemstone,
  withGemstoneSlotCost,
  withGemstoneSlotUnlocked,
} from './gemstone-slots.js';
import {
  normalizeVacuumPhysicalState,
  vacuumPeridotFortune,
  vacuumRarity,
} from './vacuum-state.js';

let applying = false;
let queued = false;
let catalogRequested = false;

function esc(value = '') {
  return String(value).replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;',
  }[character]));
}

function load() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch { return {}; }
}

function save(raw) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(raw));
}

function bucketOf(raw) {
  raw.profile ||= {};
  const bucket = raw.profile.vacuumProgress ||= {};
  bucket.levels ||= {};
  bucket.owned ||= {};
  bucket.costs ||= {};
  bucket.manualGain ||= {};
  return normalizeVacuumPhysicalState(bucket);
}

function write(mutator) {
  const raw = load();
  const bucket = bucketOf(raw);
  mutator(bucket, raw);
  save(raw);
  window.dispatchEvent(new Event('farming420:state-changed'));
}

function catalogItem(bucket) {
  return catalogItemByExactId(readCachedCatalog()?.items || [], bucket?.skyblockId);
}

function officialSlots(bucket, item) {
  if (!item) return null;
  return availableOfficialGemstoneSlots(item, {});
}

function socketCount(bucket, item) {
  const exact = officialSlots(bucket, item);
  return exact ? exact.length : vacuumFallbackGemstoneSlotCount(bucket?.skyblockId);
}

function gemOptions(value) {
  const selected = String(value || '').toUpperCase();
  return `<option value="">Empty</option>${GEMSTONE_QUALITIES.map(quality => {
    const gem = `${quality} PERIDOT`;
    const label = `${quality[0]}${quality.slice(1).toLowerCase()} Peridot`;
    return `<option value="${gem}" ${selected === gem ? 'selected' : ''}>${label}</option>`;
  }).join('')}`;
}

function costText(slot) {
  if (!slot) return '';
  const parts = officialGemstoneUnlockItems(slot).map(cost => `${cost.amount}× ${cost.itemId}`);
  const coins = officialGemstoneUnlockCoins(slot);
  if (coins) parts.push(`${coins.toLocaleString('en-US')} Coins`);
  return parts.join(' + ');
}

function sectionHtml(bucket) {
  const selected = String(bucket.skyblockId || '').toUpperCase();
  const item = catalogItem(bucket);
  const exactSlots = officialSlots(bucket, item);
  const count = socketCount(bucket, item);
  const slots = normalizeToolGemstoneSlots(bucket.gemSlots, count);
  const rarity = vacuumRarity(bucket);
  const peridot = vacuumPeridotFortune(bucket);
  const recombAllowed = Boolean(selected) && item?.canRecombobulate !== false;

  return `<section class="item-editor-section" data-vacuum-exact="1">
    <div class="section-row"><div><h3>Physical Vacuum</h3><p>Only upgrades supported by the selected physical Vacuum are shown.</p></div></div>
    <div class="item-editor-grid">
      <label class="settings-field"><span>Vacuum model</span><select data-vacuum-model>
        <option value="">— select Vacuum —</option>
        ${GARDEN_VACUUM_ITEMS.map(record => `<option value="${record.id}" ${record.id === selected ? 'selected' : ''}>${esc(record.name)} · ${record.rarity}</option>`).join('')}
      </select></label>
      <label class="settings-field"><span>Current rarity</span><input value="${esc(rarity || 'Unknown')}" disabled></label>
    </div>
    <div class="workspace-level-list">
      <label class="workspace-level-row workspace-toggle-row ${recombAllowed ? '' : 'is-disabled'}">
        <div><strong>Recombobulator 3000</strong><small>${!selected ? 'Select a Vacuum first.' : item?.canRecombobulate === false ? 'Hypixel marks this item as not recombobulatable.' : 'Can be applied once; raises this Vacuum by one rarity.'}</small></div>
        <input type="checkbox" data-vacuum-recomb ${bucket.recombobulated ? 'checked' : ''} ${recombAllowed ? '' : 'disabled'}>
      </label>
    </div>
    <div class="workspace-section-head"><div><h3>Vacuum Gemstones</h3><p>${selected ? (item ? `Exact Hypixel item data: ${esc(item.name)} (${esc(item.id)}).` : 'Official item data is unavailable; verified Vacuum fallback is used.') : 'Select a Vacuum to see its gemstone sockets.'}</p></div></div>
    <div class="workspace-gem-summary"><strong>${count ? `${peridot} Farming Fortune from filled active Peridot sockets` : 'This Vacuum has no Peridot socket.'}</strong><span>${count} physical socket${count === 1 ? '' : 's'}</span></div>
    <div class="workspace-gem-list">
      ${slots.map((slot, index) => {
        const meta = exactSlots?.[index];
        const official = costText(meta);
        const coinCost = officialGemstoneUnlockCoins(meta);
        return `<div class="workspace-gem-slot ${slot.unlocked ? 'unlocked' : 'locked'}">
          <label class="workspace-slot-toggle"><input type="checkbox" data-vacuum-gem-unlocked="${index}" ${slot.unlocked ? 'checked' : ''}><span>Peridot Slot ${index + 1}</span><small>${slot.unlocked ? 'Unlocked' : 'Locked'}${official ? ` · official: ${esc(official)}` : ''}</small></label>
          <label><span>Unlock coin cost</span><input type="number" min="0" data-vacuum-gem-cost="${index}" value="${slot.unlockCostCoins ?? ''}" placeholder="${coinCost || ''}" ${slot.unlocked ? '' : 'disabled'}></label>
          <label><span>Gemstone</span><select data-vacuum-gem-value="${index}" ${slot.unlocked ? '' : 'disabled'}>${gemOptions(slot.gem)}</select></label>
        </div>`;
      }).join('') || '<p class="hint">No gemstone socket belongs to this physical Vacuum.</p>'}
    </div>
  </section>`;
}

function bind(section) {
  section.querySelector('[data-vacuum-model]')?.addEventListener('change', event => write(bucket => {
    bucket.skyblockId = event.target.value || null;
  }));
  section.querySelector('[data-vacuum-recomb]')?.addEventListener('change', event => write(bucket => {
    bucket.recombobulated = event.target.checked === true;
  }));
  section.querySelectorAll('[data-vacuum-gem-unlocked]').forEach(input => input.addEventListener('change', event => write(bucket => {
    const item = catalogItem(bucket);
    const count = socketCount(bucket, item);
    bucket.gemSlots = withGemstoneSlotUnlocked(bucket.gemSlots, Number(event.target.dataset.vacuumGemUnlocked), event.target.checked, count);
  })));
  section.querySelectorAll('[data-vacuum-gem-cost]').forEach(input => input.addEventListener('change', event => write(bucket => {
    const item = catalogItem(bucket);
    const count = socketCount(bucket, item);
    bucket.gemSlots = withGemstoneSlotCost(bucket.gemSlots, Number(event.target.dataset.vacuumGemCost), event.target.value, count);
  })));
  section.querySelectorAll('[data-vacuum-gem-value]').forEach(select => select.addEventListener('change', event => write(bucket => {
    const item = catalogItem(bucket);
    const count = socketCount(bucket, item);
    bucket.gemSlots = withGemstone(bucket.gemSlots, Number(event.target.dataset.vacuumGemValue), event.target.value, count);
  })));
}

export function applyExactVacuumUI() {
  if (applying) return;
  const panel = document.querySelector('[data-vacuum-panel]');
  if (!panel) return;
  applying = true;
  try {
    const raw = load();
    const bucket = bucketOf(raw);
    const old = panel.querySelector('[data-vacuum-exact]');
    const signature = `${bucket.skyblockId || ''}|${bucket.recombobulated ? 1 : 0}|${JSON.stringify(bucket.gemSlots || [])}|${readCachedCatalog()?.fetchedAt || ''}`;
    if (old?.dataset.signature === signature) return;
    old?.remove();
    const wrapper = document.createElement('div');
    wrapper.innerHTML = sectionHtml(bucket);
    const section = wrapper.firstElementChild;
    section.dataset.signature = signature;
    panel.querySelector('.item-editor-head')?.insertAdjacentElement('afterend', section);
    bind(section);
  } finally {
    applying = false;
  }
}

function schedule() {
  if (queued) return;
  queued = true;
  queueMicrotask(() => {
    queued = false;
    applyExactVacuumUI();
  });
}

function mutationNeedsApply(mutations) {
  return mutations.some(mutation => {
    if (mutation.target instanceof Element && mutation.target.matches('[data-vacuum-panel]')) {
      return [...mutation.addedNodes].some(node => !(node instanceof Element) || !node.matches?.('[data-vacuum-exact]'));
    }
    return [...mutation.addedNodes].some(node => node instanceof Element && (
      node.matches?.('[data-vacuum-panel]') || node.querySelector?.('[data-vacuum-panel]')
    ));
  });
}

async function ensureCatalog() {
  if (catalogRequested) return;
  catalogRequested = true;
  const before = readCachedCatalog()?.fetchedAt || null;
  const result = await loadItemCatalog();
  if (result?.items?.length && result.fetchedAt !== before) schedule();
}

function boot() {
  applyExactVacuumUI();
  ensureCatalog();
  const app = document.getElementById('app');
  if (app && typeof MutationObserver !== 'undefined') {
    new MutationObserver(mutations => {
      if (mutationNeedsApply(mutations)) schedule();
    }).observe(app, { childList: true, subtree: true });
  }
  window.addEventListener('farming420:state-changed', schedule);
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
}
