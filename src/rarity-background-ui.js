import { STORAGE_KEY } from './config.js';
import { CROPS } from './data.js';
import { rarityClass, RARITY_COLORS } from './item-editor.js';
import { normalizeSetups } from './setups.js';
import { effectiveSetupItemRarity, normalizeRarity } from './setup-rarity.js';
import { readCachedCatalog } from './item-catalog.js';
import { canRecombobulateItem, catalogItemForSetupItem } from './item-capabilities.js';
import { toolKeyForCropId } from './migrations.js';
import { TOOL_TIER_CHAIN, highestChainTier } from './progression-chains.js';
import { catalogItemByExactId, farmingToolSkyblockId } from './exact-farming-items.js';
import { deriveRarity } from './tool-rarity.js';
import { vacuumRarity } from './vacuum-state.js';

const RECOMB_ID = 'tool-recombobulator-effect-on-tool-stats';
const RARITY_CLASSES = Object.freeze([
  ...Object.keys(RARITY_COLORS).map(rarity => rarityClass(rarity)),
  'rarity-unknown',
]);

function readState() {
  try {
    return JSON.parse(globalThis.localStorage?.getItem(STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
}

function activeSetupFromState(state) {
  const setups = normalizeSetups(state?.profile?.setups);
  return setups.list.find(setup => setup.id === setups.activeId) || setups.list[0] || null;
}

function applyRarityClass(node, rarity) {
  if (!node?.classList) return;
  node.classList.remove(...RARITY_CLASSES);
  const normalized = normalizeRarity(rarity);
  node.classList.add(rarityClass(normalized));
  node.classList.add('rarity-surface');
  if (normalized) node.dataset.effectiveRarity = normalized;
  else delete node.dataset.effectiveRarity;
}

function setupItemRarity(item, catalog) {
  if (!item) return { rarity: null, catalogItem: null };
  const catalogItem = catalogItemForSetupItem(catalog, item);
  return {
    rarity: effectiveSetupItemRarity(item, catalogItem?.tier),
    catalogItem,
  };
}

function applySetupRarity(root, state, catalog) {
  const setup = activeSetupFromState(state);
  if (!setup) return;

  for (const [slotId, item] of Object.entries(setup.slots || {})) {
    if (!item) continue;
    const { rarity, catalogItem } = setupItemRarity(item, catalog);
    if (!rarity) continue;

    const card = root.querySelector(`.slot-card[data-slot="${CSS.escape(slotId)}"]`);
    const editor = root.querySelector(`[data-item-editor="${CSS.escape(slotId)}"]`);
    applyRarityClass(card, rarity);
    applyRarityClass(editor, rarity);

    const rarityLabel = editor?.querySelector('.item-rarity');
    if (!rarityLabel) continue;
    const base = normalizeRarity(catalogItem?.tier) || normalizeRarity(item.rarity);
    const source = item.source === 'sync' ? ' · synced' : '';
    if (item.recombobulated && base && base !== rarity) {
      rarityLabel.textContent = `${rarity} · base ${base} + Recombobulator${source}`;
    } else {
      rarityLabel.textContent = `${rarity}${source}`;
    }
  }
}

function bucketForCrop(state, cropId) {
  return state?.profile?.toolProgress?.[toolKeyForCropId(cropId)] || {};
}

function entryEnabled(bucket, id) {
  return Number(bucket?.levels?.[id] || 0) > 0 || bucket?.owned?.[id] === true;
}

function toolRarityForCrop(state, cropId, catalog) {
  const crop = CROPS.find(entry => entry.id === cropId);
  if (!crop) return null;
  const bucket = bucketForCrop(state, cropId);
  const tier = highestChainTier(bucket, TOOL_TIER_CHAIN);
  const skyblockId = farmingToolSkyblockId(crop.tool, tier);
  const item = catalogItemByExactId(catalog, skyblockId);
  const base = item?.tier || bucket.toolRarity || null;
  return deriveRarity({
    base,
    recombobulated: entryEnabled(bucket, RECOMB_ID),
    canRecombobulate: item ? canRecombobulateItem('tool', item) : true,
  });
}

function applyToolRarity(root, state, catalog) {
  for (const card of root.querySelectorAll('.sb-tool-card[data-sb-tool-crop]')) {
    applyRarityClass(card, toolRarityForCrop(state, card.dataset.sbToolCrop, catalog));
  }

  const editor = root.querySelector('[data-tool-editor="1"]');
  if (!editor) return;
  const cropId = state?.selectedCrop || root.querySelector('#cropSelect')?.value || 'melon';
  applyRarityClass(editor, toolRarityForCrop(state, cropId, catalog));
}

function applyVacuumRarity(root, state) {
  const panel = root.querySelector('[data-vacuum-panel]');
  if (!panel) return;
  applyRarityClass(panel, vacuumRarity(state?.profile?.vacuumProgress || {}));
}

export function applyRarityBackgrounds(root = document) {
  if (!root?.querySelector) return;
  const state = readState();
  const catalog = readCachedCatalog()?.items || [];
  applySetupRarity(root, state, catalog);
  applyToolRarity(root, state, catalog);
  applyVacuumRarity(root, state);
}

let queued = false;
function schedule() {
  if (queued) return;
  queued = true;
  queueMicrotask(() => {
    queued = false;
    applyRarityBackgrounds();
  });
}

function mutationNeedsRarity(mutations) {
  return mutations.some(mutation => [...mutation.addedNodes].some(node => node instanceof Element && (
    node.matches?.('.slot-card, [data-item-editor], .sb-tool-card, [data-tool-editor], [data-vacuum-panel]')
    || node.querySelector?.('.slot-card, [data-item-editor], .sb-tool-card, [data-tool-editor], [data-vacuum-panel]')
  )));
}

function boot() {
  schedule();
  window.addEventListener('farming420:state-changed', schedule);
  document.addEventListener('click', schedule);
  document.addEventListener('change', schedule);
  const app = document.getElementById('app');
  if (app && typeof MutationObserver !== 'undefined') {
    new MutationObserver(mutations => {
      if (mutationNeedsRarity(mutations)) schedule();
    }).observe(app, { childList: true, subtree: true });
  }
}

if (typeof document !== 'undefined' && typeof window !== 'undefined') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
}
