import { STORAGE_KEY } from './config.js';
import { loadItemCatalog, readCachedCatalog } from './item-catalog.js';
import { enchantRowsFor, withEnchantLevel, withEnchantToggled } from './item-editor.js';
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
  bucket.enchantments ||= {};
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

function toRoman(value) {
  const numerals = [[10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
  let rest = Math.max(0, Math.floor(Number(value) || 0));
  if (!rest) return '0';
  let out = '';
  for (const [size, numeral] of numerals) {
    while (rest >= size) { out += numeral; rest -= size; }
  }
  return out;
}

function vacuumEnchantLine(row) {
  const minLevel = Math.max(1, Number(row.minLevel) || 1);
  const levels = row.maxLevel
    ? [...new Set([
      ...Array.from({ length: Math.max(0, row.maxLevel - minLevel + 1) }, (_, index) => index + minLevel),
      row.level,
    ].filter(value => value > 0))].sort((a, b) => a - b)
    : [...new Set([row.level, 1, 2, 3, 4, 5].filter(value => value > 0))].sort((a, b) => a - b);
  const maximum = row.maxLevel
    ? `max ${esc(toRoman(row.maxLevel))}${row.trueMaxLevel > row.maxLevel ? ` · special ${esc(toRoman(row.trueMaxLevel))}` : ''}`
    : 'level unknown';

  return `<div class="enchant-line enchant-${esc(row.state)} ${row.active ? 'on' : 'off'}" data-vacuum-ench-row="${esc(row.storageKey)}">
    <label class="lever" title="${esc(`${row.label} on this Vacuum`)}">
      <input type="checkbox" data-vacuum-ench-toggle="${esc(row.storageKey)}" ${row.active ? 'checked' : ''}>
      <span class="lever-track" aria-hidden="true"></span>
      <span class="sr-only">${esc(`${row.label} on this Vacuum`)}</span>
    </label>
    <span class="enchant-name">${esc(row.label)}${row.kind === 'ultimate' ? '<em class="enchant-tag">ultimate</em>' : ''}${row.known ? '' : '<em class="enchant-tag unknown">not verified</em>'}</span>
    <select class="enchant-level" data-vacuum-ench-select="${esc(row.storageKey)}" data-vacuum-ench-max="${row.maxLevel || 0}" ${row.active ? '' : 'disabled'}>
      ${levels.map(level => `<option value="${level}" ${level === row.level ? 'selected' : ''}>${esc(toRoman(level))}</option>`).join('')}
    </select>
    <span class="enchant-max">${maximum}</span>
  </div>`;
}

function enchantmentsHtml(bucket) {
  const item = { enchantments: { ...(bucket.enchantments || {}) } };
  const rows = enchantRowsFor('vacuum', item);
  if (!rows.length) return '';

  return `<section class="item-editor-section" data-vacuum-enchantments="1">
    <div class="section-row"><div><h3>Enchantments</h3><p>Everything that can sit on this Vacuum. Flip the ones you have, then pick the level.</p></div></div>
    <div class="enchant-grid">${rows.map(vacuumEnchantLine).join('')}</div>
  </section>`;
}

function progressionHtml(bucket) {
  const selected = String(bucket.skyblockId || '').toUpperCase();
  const item = catalogItem(bucket);
  const rarity = vacuumRarity(bucket);
  const recombAllowed = Boolean(selected) && item?.canRecombobulate !== false;

  return `<section class="item-editor-section" data-vacuum-exact="1">
    <div class="workspace-section-head"><div><h3>Vacuum progression</h3><p>Choose the physical Vacuum first. Reforge and every other modifier apply to this selected model.</p></div></div>
    <div class="workspace-level-list">
      <div class="workspace-level-row">
        <div><strong>Vacuum model</strong><small>This replaces the Mk. tier choice used by crop tools.</small></div>
        <select data-vacuum-model aria-label="Vacuum model">
          <option value="">— select Vacuum —</option>
          ${GARDEN_VACUUM_ITEMS.map(record => `<option value="${record.id}" ${record.id === selected ? 'selected' : ''}>${esc(record.name)} · ${record.rarity}</option>`).join('')}
        </select>
      </div>
      <div class="workspace-level-row">
        <div><strong>Item rarity</strong><small>Derived from the selected Vacuum and Recombobulator state.</small></div>
        <div class="workspace-derived"><strong>${esc(rarity || 'Unknown')}</strong><small>${selected ? 'Current physical Vacuum rarity.' : 'Select a Vacuum first.'}</small></div>
      </div>
      <label class="workspace-level-row workspace-toggle-row ${recombAllowed ? '' : 'is-disabled'}">
        <div><strong>Recombobulator 3000</strong><small>${!selected ? 'Select a Vacuum first.' : item?.canRecombobulate === false ? 'Hypixel marks this item as not recombobulatable.' : 'Can be applied once; raises this Vacuum by one rarity.'}</small></div>
        <input type="checkbox" data-vacuum-recomb ${bucket.recombobulated ? 'checked' : ''} ${recombAllowed ? '' : 'disabled'}>
      </label>
    </div>
  </section>`;
}

function gemstonesHtml(bucket) {
  const selected = String(bucket.skyblockId || '').toUpperCase();
  const item = catalogItem(bucket);
  const exactSlots = officialSlots(bucket, item);
  const count = socketCount(bucket, item);
  const slots = normalizeToolGemstoneSlots(bucket.gemSlots, count);
  const peridot = vacuumPeridotFortune(bucket);

  return `<section class="item-editor-section workspace-gemstones" data-vacuum-gemstones="1">
    <div class="workspace-section-head"><div><h3>Gemstone slots</h3><p>${selected ? (item ? `Exact Hypixel item data: ${esc(item.name)} (${esc(item.id)}).` : 'Official item data is unavailable; verified Vacuum fallback is used.') : 'Select a Vacuum to see its gemstone sockets.'}</p></div></div>
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
  section.querySelectorAll('[data-vacuum-ench-toggle]').forEach(input => input.addEventListener('change', event => write(bucket => {
    const item = { enchantments: { ...(bucket.enchantments || {}) } };
    bucket.enchantments = withEnchantToggled(item, input.dataset.vacuumEnchToggle, event.target.checked);
  })));
  section.querySelectorAll('[data-vacuum-ench-select]').forEach(select => select.addEventListener('change', event => write(bucket => {
    const item = { enchantments: { ...(bucket.enchantments || {}) } };
    const max = Number(select.dataset.vacuumEnchMax || 0) || null;
    bucket.enchantments = withEnchantLevel(item, select.dataset.vacuumEnchSelect, event.target.value, max);
  })));
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
    const oldProgression = panel.querySelector('[data-vacuum-exact]');
    const oldEnchantments = panel.querySelector('[data-vacuum-enchantments]');
    const oldGemstones = panel.querySelector('[data-vacuum-gemstones]');
    const signature = `${bucket.skyblockId || ''}|${bucket.recombobulated ? 1 : 0}|${JSON.stringify(bucket.enchantments || {})}|${JSON.stringify(bucket.gemSlots || [])}|${readCachedCatalog()?.fetchedAt || ''}`;
    if (oldProgression?.dataset.signature === signature
      && oldEnchantments?.dataset.signature === signature
      && oldGemstones?.dataset.signature === signature) return;

    oldProgression?.remove();
    oldEnchantments?.remove();
    oldGemstones?.remove();

    const progressionWrapper = document.createElement('div');
    progressionWrapper.innerHTML = progressionHtml(bucket);
    const progression = progressionWrapper.firstElementChild;
    progression.dataset.signature = signature;

    const enchantmentWrapper = document.createElement('div');
    enchantmentWrapper.innerHTML = enchantmentsHtml(bucket);
    const enchantments = enchantmentWrapper.firstElementChild;
    if (enchantments) enchantments.dataset.signature = signature;

    const gemstoneWrapper = document.createElement('div');
    gemstoneWrapper.innerHTML = gemstonesHtml(bucket);
    const gemstones = gemstoneWrapper.firstElementChild;
    gemstones.dataset.signature = signature;

    const reforge = panel.querySelector('[data-vacuum-section="reforge"]');
    if (reforge) reforge.insertAdjacentElement('beforebegin', progression);
    else panel.prepend(progression);

    if (enchantments) {
      if (reforge) reforge.insertAdjacentElement('afterend', enchantments);
      else progression.insertAdjacentElement('afterend', enchantments);
    }

    const upgrades = panel.querySelector('[data-vacuum-section="upgrades"]');
    if (upgrades) upgrades.insertAdjacentElement('afterend', gemstones);
    else panel.append(gemstones);

    bind(panel);
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
      return [...mutation.addedNodes].some(node => !(node instanceof Element)
        || !node.matches?.('[data-vacuum-exact], [data-vacuum-enchantments], [data-vacuum-gemstones]'));
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
