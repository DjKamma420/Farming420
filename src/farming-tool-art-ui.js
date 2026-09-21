import { CROPS } from './data.js';
import { STORAGE_KEY } from './config.js';
import { toolKeyForCropId } from './migrations.js';
import { TOOL_TIER_CHAIN, highestChainTier } from './progression-chains.js';
import { farmingToolPackKey } from './farming-tool-art.js';

let applyQueued = false;

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
  if (!host) return false;
  const current = host.getAttribute('data-pack-asset');
  if (!key) {
    if (current !== null) {
      host.removeAttribute('data-pack-asset');
      return true;
    }
    return false;
  }
  if (current !== key) host.setAttribute('data-pack-asset', key);
  const nextLabel = label || 'Farming tool texture';
  if (host.getAttribute('aria-label') !== nextLabel) host.setAttribute('aria-label', nextLabel);
  return current !== key;
}

function enhanceWorkspaceEditor(raw) {
  const select = document.querySelector('#workspaceToolSelect');
  const cropId = select?.value || raw.selectedCrop || 'melon';
  const tool = toolForCropId(cropId);
  const key = artKey(raw, cropId);
  const portrait = document.querySelector('[data-tool-editor="1"] .item-portrait');
  ensureArtHost(portrait, key, tool ? `${tool} texture` : null);
}

export function applyFarmingToolArt() {
  const raw = readState();
  enhanceWorkspaceEditor(raw);
}

function queueApply() {
  if (applyQueued) return;
  applyQueued = true;
  queueMicrotask(() => {
    applyQueued = false;
    applyFarmingToolArt();
  });
}

function mutationNeedsApply(mutations) {
  return mutations.some(mutation => [...mutation.addedNodes].some(node => {
    if (!(node instanceof Element)) return false;
    if (node.classList.contains('workspace-tool-art')) return false;
    return node.matches?.('#workspaceToolSelect, [data-tool-editor="1"]')
      || node.querySelector?.('#workspaceToolSelect, [data-tool-editor="1"]');
  }));
}

function boot() {
  applyFarmingToolArt();
  const app = document.getElementById('app');
  if (app && typeof MutationObserver !== 'undefined') {
    new MutationObserver(mutations => {
      if (mutationNeedsApply(mutations)) queueApply();
    }).observe(app, { childList: true, subtree: true });
  }
  window.addEventListener('farming420:state-changed', queueApply);
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
}
