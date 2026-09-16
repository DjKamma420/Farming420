import { CROPS } from './data.js';
import { STORAGE_KEY } from './config.js';
import { toolKeyForCropId } from './migrations.js';
import { TOOL_TIER_CHAIN, highestChainTier } from './progression-chains.js';
import { farmingToolPackKey } from './farming-tool-art.js';

function readState() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch { return {}; }
}

function toolBucket(raw, cropId) {
  const key = toolKeyForCropId(cropId);
  return raw?.profile?.toolProgress?.[key] || {};
}

function toolForCropId(cropId) {
  return CROPS.find(crop => crop.id === cropId)?.tool || null;
}

function artKey(raw, cropId) {
  const tool = toolForCropId(cropId);
  if (!tool) return null;
  const tier = highestChainTier(toolBucket(raw, cropId), TOOL_TIER_CHAIN);
  return farmingToolPackKey(tool, tier);
}

function ensureArtHost(host, key, label) {
  if (!host) return;
  if (!key) {
    host.removeAttribute('data-pack-asset');
    return;
  }
  host.dataset.packAsset = key;
  host.setAttribute('aria-label', label || 'Farming tool texture');
}

function enhanceWorkspaceEditor(raw) {
  const select = document.querySelector('#workspaceToolSelect');
  const cropId = select?.value || raw.selectedCrop || 'melon';
  const tool = toolForCropId(cropId);
  const key = artKey(raw, cropId);
  const portrait = document.querySelector('[data-tool-editor="1"] .item-portrait');
  ensureArtHost(portrait, key, tool ? `${tool} texture` : null);
}

function enhanceDirectPicker(raw) {
  document.querySelectorAll('[data-workspace-tool-value]').forEach(button => {
    const cropId = button.dataset.workspaceToolValue;
    const tool = toolForCropId(cropId);
    const key = artKey(raw, cropId);
    let host = button.querySelector('.workspace-tool-art');
    if (!host) {
      host = document.createElement('span');
      host.className = 'workspace-tool-art';
      button.prepend(host);
    }
    ensureArtHost(host, key, tool ? `${tool} texture` : null);
  });
}

export function applyFarmingToolArt() {
  const raw = readState();
  enhanceWorkspaceEditor(raw);
  enhanceDirectPicker(raw);
}

function boot() {
  applyFarmingToolArt();
  const app = document.getElementById('app');
  if (app && typeof MutationObserver !== 'undefined') {
    new MutationObserver(() => queueMicrotask(applyFarmingToolArt)).observe(app, { childList: true, subtree: true });
  }
  window.addEventListener('farming420:state-changed', applyFarmingToolArt);
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
}
