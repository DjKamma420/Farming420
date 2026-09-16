import { CROPS } from './data.js';
import { STORAGE_KEY } from './config.js';
import { toolKeyForCropId } from './migrations.js';
import { cropReforgeRecommendations, reforgeById } from './farming-reforges.js';
import { TOOL_TIER_CHAIN, highestChainTier } from './progression-chains.js';

export const TOOL_PRESENTATION_VERIFIED = '2026-09-16';
export const TOOL_PACK_MODEL_SOURCE = 'assets/hypixel-pack/manifest.json';

// Only exact ids found in the synced official Hypixel SkyBlock resource pack are
// listed here. Melon and Pumpkin currently expose one texture in the pack, so
// the same texture is used for every tier and the portrait badge carries the
// selected Mk. level. Unknown tools keep the normal text fallback instead of a
// guessed image.
export const TOOL_TIER_ASSETS = Object.freeze({
  wheat: Object.freeze(['theoretical_hoe_wheat_1', 'theoretical_hoe_wheat_2', 'theoretical_hoe_wheat_3']),
  carrot: Object.freeze(['theoretical_hoe_carrot_1', 'theoretical_hoe_carrot_2', 'theoretical_hoe_carrot_3']),
  potato: Object.freeze(['theoretical_hoe_potato_1', 'theoretical_hoe_potato_2', 'theoretical_hoe_potato_3']),
  'sugar-cane': Object.freeze(['theoretical_hoe_cane_1', 'theoretical_hoe_cane_2', 'theoretical_hoe_cane_3']),
  'nether-wart': Object.freeze(['theoretical_hoe_warts_1', 'theoretical_hoe_warts_2', 'theoretical_hoe_warts_3']),
  cactus: Object.freeze(['cactus_knife', 'cactus_knife_2', 'cactus_knife_3']),
  'cocoa-beans': Object.freeze(['coco_chopper', 'coco_chopper_2', 'coco_chopper_3']),
  mushroom: Object.freeze(['fungi_cutter', 'fungi_cutter_2', 'fungi_cutter_3']),
  melon: Object.freeze(['melon_dicer', 'melon_dicer', 'melon_dicer']),
  pumpkin: Object.freeze(['pumpkin_dicer', 'pumpkin_dicer', 'pumpkin_dicer']),
});

function readState(storage = globalThis.localStorage) {
  if (!storage?.getItem) return null;
  try {
    return JSON.parse(storage.getItem(STORAGE_KEY) || 'null');
  } catch {
    return null;
  }
}

function cropForState(state) {
  return CROPS.find(crop => crop.id === state?.selectedCrop) || CROPS[0];
}

function toolBucket(state, cropId) {
  const key = toolKeyForCropId(cropId);
  return state?.profile?.toolProgress?.[key] || {};
}

export function selectedToolTier(state, cropId) {
  return highestChainTier(toolBucket(state, cropId), TOOL_TIER_CHAIN);
}

export function toolTierLabel(tier) {
  return TOOL_TIER_CHAIN.options.find(option => option.value === Number(tier))?.label || TOOL_TIER_CHAIN.options[0].label;
}

export function toolAssetForTier(cropId, tier) {
  const assets = TOOL_TIER_ASSETS[String(cropId || '')];
  if (!assets?.length) return null;
  const index = Math.max(1, Math.min(3, Number(tier) || 1)) - 1;
  return assets[index] || assets[0] || null;
}

export function recommendationRows(cropId) {
  const rec = cropReforgeRecommendations(cropId);
  return [
    Object.freeze({ label: 'Normal crop coins', reforge: rec.normalCoins }),
    Object.freeze({ label: 'Feast RARE-CROP coins', reforge: rec.feastRareCropCoins, note: 'only while this crop is in season' }),
    Object.freeze({ label: 'Collection', reforge: rec.collection }),
    Object.freeze({ label: 'Farming XP', reforge: rec.xp }),
    Object.freeze({ label: 'RARE CROPS / Overbloom', reforge: rec.rareCrops }),
    Object.freeze({ label: 'Feast Seasoning', reforge: rec.feastSeasoning }),
    Object.freeze({ label: 'Sowdust', reforge: rec.sowdust }),
  ];
}

function selectedReforge(state, cropId) {
  const bucket = toolBucket(state, cropId);
  if (reforgeById(bucket?.reforge)) return bucket.reforge;
  if (bucket?.owned?.['tool-reforge-bountiful-reforge']) return 'bountiful';
  if (bucket?.owned?.['tool-reforge-blessed-reforge']) return 'blessed';
  return null;
}

function esc(value = '') {
  return String(value).replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
  }[character]));
}

function renderRecommendations(root, crop, state) {
  const goals = root.querySelector('.workspace-recommendations .workspace-goals');
  if (!goals) return;
  const activeId = selectedReforge(state, crop.id);
  goals.innerHTML = recommendationRows(crop.id).map(row => {
    const item = reforgeById(row.reforge);
    return `<span class="workspace-goal ${row.reforge === activeId ? 'active' : ''}"><b>${esc(row.label)}</b>${esc(item?.name || row.reforge)}${row.note ? `<small>${esc(row.note)}</small>` : ''}</span>`;
  }).join('');

  const copy = root.querySelector('.workspace-recommendations .workspace-section-head p');
  if (copy) copy.textContent = 'Recommendations are crop-scoped and goal-scoped. Feast coin value is separate from normal crop profit.';
}

function renderTierPresentation(root, crop, state) {
  const editor = root.querySelector('[data-tool-editor="1"]');
  if (!editor) return;
  const tier = selectedToolTier(state, crop.id);
  const label = toolTierLabel(tier);
  const portrait = editor.querySelector('.item-portrait');
  const asset = toolAssetForTier(crop.id, tier);

  if (portrait) {
    if (asset) portrait.dataset.packAsset = asset;
    else delete portrait.dataset.packAsset;
    let badge = portrait.querySelector('.workspace-tier-badge');
    if (!badge) {
      badge = document.createElement('span');
      badge.className = 'workspace-tier-badge';
      portrait.append(badge);
    }
    badge.textContent = label;
    badge.setAttribute('aria-label', `Selected tool tier ${label}`);
  }

  const title = editor.querySelector('.item-title');
  if (title) {
    title.textContent = crop.tool;
    title.dataset.toolTier = label;
  }

  const status = editor.querySelector('.item-rarity');
  if (status && !status.textContent.includes(label)) status.textContent = `${label} · ${status.textContent}`;
}

export function applyToolPresentation(root = document, state = readState()) {
  if (!root?.querySelector || !state) return;
  const activePage = root.querySelector('.sidebar .nav-link.active')?.dataset.page;
  if (activePage !== 'tools') return;
  const crop = cropForState(state);
  renderTierPresentation(root, crop, state);
  renderRecommendations(root, crop, state);
}

if (typeof document !== 'undefined') {
  applyToolPresentation(document);
  const app = document.getElementById('app');
  if (app && typeof MutationObserver !== 'undefined') {
    new MutationObserver(() => applyToolPresentation(document)).observe(app, { childList: true, subtree: true });
  }
  window.addEventListener('farming420:state-changed', () => applyToolPresentation(document));
}
