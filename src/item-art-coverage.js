import { STORAGE_KEY } from './config.js';
import { UPGRADES } from './data.js';
import { itemForSetupSlot } from './item-art-ui.js';
import { loadItemCatalog } from './item-catalog.js';
import { packArtNodeFor } from './pack-item-art.js';

export const REFORGE_ITEM_IDS = Object.freeze({
  bountiful: 'GOLDEN_BALL',
  blessed: 'BLESSED_FRUIT',
  earthy: 'LARGE_WALNUT',
  'deep-fried': 'HASHBROWN',
  overpriced: 'OVERPRICED_DRINK',
});

export const TOOL_PROGRESS_ITEM_IDS = Object.freeze({
  'Overclocker 3000': 'OVERCLOCKER_3000',
  'Farming for Dummies': 'FARMING_FOR_DUMMIES',
  'Recombobulator 3000': 'RECOMBOBULATOR_3000',
});

const CARD_ITEM_ID_OVERRIDES = Object.freeze({
  'accessory-relic-of-power-perfect-peridot-effect': 'RELIC_OF_POWER',
  'accessory-fermento-artifact': 'FERMENTO_ARTIFACT',
  'accessory-helianthus-relic': 'HELIANTHUS_RELIC',
  'buff-booster-cookie-farming-wisdom-contribution': 'BOOSTER_COOKIE',
});

const PHYSICAL_CARD_CATEGORIES = new Set([
  'Accessory',
  'Attribute Shard',
  'Consumable',
  'Garden Chip',
  'Jacob Accessory',
  'Mixin',
  'Pet Item',
  'Reforge Stone',
  'Temporary Buff',
  'Tool Reforge',
]);

function clean(value = '') {
  return String(value).replace(/§[0-9a-fk-or]/gi, '').trim();
}

export function normalizeItemName(value = '') {
  return clean(value)
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

export function catalogItemById(catalog, skyblockId) {
  if (!Array.isArray(catalog) || !skyblockId) return null;
  const id = String(skyblockId).trim().toUpperCase();
  return catalog.find(item => String(item?.id || '').toUpperCase() === id) || null;
}

export function skinTextureUrl(item) {
  const hash = String(item?.skin || '').trim().toLowerCase();
  return /^[0-9a-f]{32,128}$/.test(hash)
    ? `https://textures.minecraft.net/texture/${hash}`
    : null;
}

function physicalNameCandidates(entry) {
  const name = clean(entry?.name);
  if (!name) return [];
  const values = [name];
  if (entry?.category === 'Attribute Shard' && name.includes(' - ')) values.unshift(name.split(' - ')[0]);
  for (const suffix of [' contribution', ' effect', ' temporary stack']) {
    if (name.toLowerCase().endsWith(suffix)) values.unshift(name.slice(0, -suffix.length));
  }
  return [...new Set(values.map(normalizeItemName).filter(Boolean))];
}

/**
 * Resolves a progression entry only when there is a strong physical-item match.
 * Exact names win. Prefix matching is accepted only when it is unique and the
 * API item name is the complete leading phrase (e.g. "Booster Cookie ...").
 * Arbitrary substring matching is deliberately forbidden: that previously made
 * Blessed Fruit display Blessed Bait art.
 */
export function catalogItemForUpgrade(catalog, entry) {
  if (!Array.isArray(catalog) || !entry) return null;
  const override = CARD_ITEM_ID_OVERRIDES[entry.id];
  if (override) return catalogItemById(catalog, override);
  if (!entry.packAsset && !PHYSICAL_CARD_CATEGORIES.has(entry.category)) return null;

  const candidates = physicalNameCandidates(entry);
  for (const candidate of candidates) {
    const exact = catalog.filter(item => normalizeItemName(item?.name) === candidate);
    if (exact.length === 1) return exact[0];
  }

  const entryName = normalizeItemName(entry.name);
  const prefix = catalog.filter(item => {
    const itemName = normalizeItemName(item?.name);
    return itemName.length >= 8 && entryName.startsWith(`${itemName} `);
  });
  if (!prefix.length) return null;
  prefix.sort((a, b) => normalizeItemName(b.name).length - normalizeItemName(a.name).length);
  const longest = normalizeItemName(prefix[0].name).length;
  const best = prefix.filter(item => normalizeItemName(item.name).length === longest);
  return best.length === 1 ? best[0] : null;
}

function parseColor(value) {
  const parts = String(value || '').split(',').map(Number);
  if (parts.length !== 3 || parts.some(part => !Number.isFinite(part) || part < 0 || part > 255)) return null;
  return `rgb(${parts.map(part => Math.round(part)).join(', ')})`;
}

function materialColor(item) {
  const custom = parseColor(item?.color);
  if (custom) return custom;
  const material = String(item?.material || '');
  if (material.startsWith('GOLD_')) return '#ffd84a';
  if (material.startsWith('DIAMOND_')) return '#56e3e6';
  if (material.startsWith('IRON_')) return '#d6dddd';
  if (material.startsWith('CHAINMAIL_')) return '#a7b0b0';
  if (material.startsWith('LEATHER_')) return '#a46d45';
  return '#9fb8a7';
}

function armorSvg(category, color, label) {
  const paths = {
    HELMET: '<path d="M3 3h10v3H2V4h1zm-1 3h3v7H2zm9 0h3v7h-3zM5 10h6v4H5z"/>',
    CHESTPLATE: '<path d="M2 3h4l2 2 2-2h4l1 4-3 1v6H4V8L1 7zm4 0h4v3H6z"/>',
    LEGGINGS: '<path d="M3 3h10v5h-2v6H7V9H5v5H2V8h1z"/>',
    BOOTS: '<path d="M2 3h5v7H5v2h3v2H2zm7 0h5v11H8v-2h3v-2H9z"/>',
  };
  const path = paths[String(category || '').toUpperCase()];
  if (!path) return null;
  const span = document.createElement('span');
  span.className = 'coverage-item-art coverage-material-art';
  span.setAttribute('role', 'img');
  span.setAttribute('aria-label', `${label || 'SkyBlock armour'} item icon`);
  span.innerHTML = `<svg viewBox="0 0 16 16" aria-hidden="true" shape-rendering="crispEdges"><g fill="${color}">${path}</g><path d="M1 2h14v13H1z" fill="none" stroke="rgba(255,255,255,.16)" stroke-width=".45"/></svg>`;
  return span;
}

function genericMaterialSvg(item, label) {
  const material = String(item?.material || '').toUpperCase();
  const category = String(item?.category || '').toUpperCase();
  const armour = armorSvg(category, materialColor(item), label);
  if (armour) return armour;

  let shape = null;
  if (material.includes('BOOK')) {
    shape = '<path d="M2 3h5c1 0 1.5.4 2 1 .5-.6 1-1 2-1h3v10h-3c-1 0-1.5.4-2 1-.5-.6-1-1-2-1H2z" fill="#8b5937"/><path d="M3 4h4v7H3zm7 0h3v7h-3z" fill="#ead9aa"/>';
  } else if (material.includes('PAPER')) {
    shape = '<path d="M3 2h8l2 2v10H3z" fill="#e9eee7"/><path d="M10 2v3h3M5 7h6M5 9h6M5 11h4" fill="none" stroke="#7d8d82" stroke-width="1"/>';
  } else if (material.includes('COOKIE')) {
    shape = '<circle cx="8" cy="8" r="6" fill="#b87937"/><g fill="#4b2b18"><rect x="5" y="4" width="2" height="2"/><rect x="9" y="6" width="2" height="2"/><rect x="6" y="10" width="2" height="2"/><rect x="10" y="10" width="1" height="1"/></g>';
  } else if (material.includes('POTION') || material.includes('BOTTLE')) {
    shape = '<path d="M6 2h4v2H9v2l3 4v3H4v-3l3-4V4H6z" fill="#d7eef0"/><path d="M5 10h6v2H5z" fill="#a66de6"/>';
  }
  if (!shape) return null;
  const span = document.createElement('span');
  span.className = 'coverage-item-art coverage-material-art';
  span.setAttribute('role', 'img');
  span.setAttribute('aria-label', `${label || item?.name || 'SkyBlock item'} material icon`);
  span.innerHTML = `<svg viewBox="0 0 16 16" aria-hidden="true" shape-rendering="crispEdges">${shape}</svg>`;
  return span;
}

export function itemArtNode(item, label = '') {
  if (typeof document === 'undefined' || !item) return null;
  const url = skinTextureUrl(item);
  if (url) {
    const span = document.createElement('span');
    span.className = 'coverage-item-art coverage-skull-art';
    span.style.backgroundImage = `url("${url}")`;
    span.setAttribute('role', 'img');
    span.setAttribute('aria-label', `${label || item.name || 'SkyBlock item'} texture`);
    return span;
  }
  // Real set art from the shipped pack, before the hand-drawn outline.
  const packNode = packArtNodeFor(item, label);
  if (packNode) return packNode;
  return genericMaterialSvg(item, label);
}

function readState(storage = globalThis.localStorage) {
  if (!storage?.getItem) return null;
  try {
    const raw = storage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function putArt(container, node, identity, { prepend = true } = {}) {
  if (!container || !node || !identity) return false;
  const existing = container.querySelector(':scope > .coverage-item-art');
  if (existing && container.dataset.coverageArt === identity) return false;
  existing?.remove();
  if (prepend) container.prepend(node); else container.append(node);
  container.dataset.coverageArt = identity;
  container.classList.add('has-coverage-item-art', 'has-official-item-art');
  return true;
}

function decorateSetupItems(catalog, rawState) {
  document.querySelectorAll('.slot-portrait, [data-item-art-slot]').forEach(container => {
    if (container.querySelector(':scope > .official-item-art, :scope > .skull-art')) return;
    const slotId = container.dataset.slot
      || container.dataset.itemArtSlot
      || container.closest('[data-slot]')?.dataset.slot;
    const setupItem = itemForSetupSlot(rawState, slotId);
    if (!setupItem?.skyblockId) return;
    const record = catalogItemById(catalog, setupItem.skyblockId);
    const node = itemArtNode(record, setupItem.displayName || record?.name || slotId);
    if (node) putArt(container, node, `setup:${record.id}`);
  });
}

function decorateProgressionCards(catalog) {
  document.querySelectorAll('.item-card[data-open]').forEach(card => {
    const entry = UPGRADES.find(item => item.id === card.dataset.open);
    if (!entry) return;
    const record = catalogItemForUpgrade(catalog, entry);
    const node = itemArtNode(record, record?.name || entry.name);
    if (!node) return;
    let portrait = card.querySelector('.card-head > .card-portrait');
    if (!portrait) {
      portrait = document.createElement('span');
      portrait.className = 'card-portrait coverage-card-portrait';
      card.querySelector('.card-head')?.prepend(portrait);
    }
    if (!portrait.querySelector(':scope > .official-item-art, :scope > .coverage-item-art')) {
      putArt(portrait, node, `card:${record.id}`, { prepend: false });
    }
  });
}

function decorateReforges(catalog) {
  document.querySelectorAll('.sb-reforge-card[data-sb-reforge]').forEach(card => {
    const reforgeId = card.dataset.sbReforge;
    if (!reforgeId) return;
    const itemId = REFORGE_ITEM_IDS[reforgeId];
    const art = card.querySelector('.sb-reforge-art');
    if (!itemId || !art) return;

    // skyblock-redesign historically used fuzzy substring matching here. Remove
    // that image first so Blessed Fruit can never silently become Blessed Bait.
    art.querySelectorAll(':scope > .sb-pack-icon').forEach(node => node.remove());
    const record = catalogItemById(catalog, itemId);
    const node = itemArtNode(record, record?.name || reforgeId);
    if (node) putArt(art, node, `reforge:${itemId}`, { prepend: true });
  });
}

function decorateToolProgression(catalog) {
  document.querySelectorAll('.workspace-level-row').forEach(row => {
    const label = row.querySelector('strong')?.textContent?.trim();
    const itemId = TOOL_PROGRESS_ITEM_IDS[label];
    if (!itemId) return;
    const record = catalogItemById(catalog, itemId);
    const node = itemArtNode(record, record?.name || label);
    if (!node) return;
    const copy = row.querySelector(':scope > div:first-child');
    if (!copy) return;
    putArt(copy, node, `tool:${itemId}`);
    row.classList.add('has-physical-item-art');
  });
}

let catalog = null;
let loadPromise = null;
let applying = false;
let queued = false;

async function ensureCatalog() {
  if (catalog) return catalog;
  loadPromise ||= loadItemCatalog().then(result => {
    catalog = Array.isArray(result?.items) ? result.items : [];
    return catalog;
  });
  return loadPromise;
}

export async function applyItemArtCoverage(root = document, rawState = readState()) {
  if (!root?.querySelectorAll || applying) return 0;
  applying = true;
  try {
    const items = await ensureCatalog();
    if (!items.length) return 0;
    decorateSetupItems(items, rawState);
    decorateProgressionCards(items);
    decorateReforges(items);
    decorateToolProgression(items);
    return items.length;
  } finally {
    applying = false;
  }
}

function queueApply() {
  if (queued) return;
  queued = true;
  queueMicrotask(async () => {
    queued = false;
    await applyItemArtCoverage();
  });
}

function boot() {
  queueApply();
  const root = document.getElementById('app');
  if (root && typeof MutationObserver === 'function') {
    new MutationObserver(mutations => {
      const relevant = mutations.some(mutation => [...mutation.addedNodes].some(node =>
        node instanceof Element
        && !node.matches?.('.coverage-item-art')
        && (node.matches?.('.item-card, .slot-portrait, [data-item-art-slot], .sb-reforge-card, .workspace-level-row')
          || node.querySelector?.('.item-card, .slot-portrait, [data-item-art-slot], .sb-reforge-card, .workspace-level-row'))));
      if (relevant) queueApply();
    }).observe(root, { childList: true, subtree: true });
  }
  window.addEventListener('farming420:state-changed', queueApply);
}

if (typeof document !== 'undefined' && typeof window !== 'undefined') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
}
