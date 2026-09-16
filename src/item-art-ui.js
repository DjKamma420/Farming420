import { STORAGE_KEY } from './config.js';
import { itemAssetForSkyblockId, loadItemAssetManifest } from './item-assets.js';

let manifest = null;
let manifestRequested = false;
let applying = false;

export function activeSetupFromStoredState(rawState) {
  const setups = rawState?.profile?.setups;
  if (!setups || !Array.isArray(setups.list) || !setups.list.length) return null;
  return setups.list.find(setup => setup?.id === setups.activeId) || setups.list[0] || null;
}

export function itemForSetupSlot(rawState, slotId) {
  if (!slotId) return null;
  const setup = activeSetupFromStoredState(rawState);
  const item = setup?.slots?.[slotId];
  return item && typeof item === 'object' ? item : null;
}

export function setupItemAsset(manifestValue, rawState, slotId) {
  const item = itemForSetupSlot(rawState, slotId);
  if (!item?.skyblockId) return null;
  return itemAssetForSkyblockId(manifestValue, item.skyblockId);
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

function imageNode(asset, item) {
  const img = document.createElement('img');
  img.className = 'official-item-art';
  img.src = asset.textureUrl;
  img.alt = item?.displayName ? `${item.displayName} item texture` : 'SkyBlock item texture';
  img.loading = 'lazy';
  img.decoding = 'async';
  img.dataset.officialPack = asset.packHash || 'unknown';
  img.addEventListener('error', () => img.remove(), { once: true });
  return img;
}

export function renderSetupItemArt({ root = document, rawState = readState(), manifestValue = manifest } = {}) {
  if (!root?.querySelectorAll || !rawState || !manifestValue) return 0;
  let rendered = 0;
  root.querySelectorAll('.slot-card[data-slot]').forEach(card => {
    if (card.querySelector('.official-item-art')) return;
    const slotId = card.dataset.slot;
    const item = itemForSetupSlot(rawState, slotId);
    const asset = item?.skyblockId ? itemAssetForSkyblockId(manifestValue, item.skyblockId) : null;
    if (!asset) return;
    card.prepend(imageNode(asset, item));
    card.classList.add('has-official-item-art');
    rendered += 1;
  });
  return rendered;
}

async function ensureManifest() {
  if (manifestRequested) return manifest;
  manifestRequested = true;
  manifest = await loadItemAssetManifest();
  return manifest;
}

async function apply() {
  if (applying) return;
  applying = true;
  try {
    const loaded = await ensureManifest();
    if (!loaded) return;
    renderSetupItemArt({ manifestValue: loaded });
  } finally {
    applying = false;
  }
}

function boot() {
  apply();
  if (typeof MutationObserver === 'function') {
    const observer = new MutationObserver(() => apply());
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }
  window.addEventListener('farming420:state-changed', apply);
}

if (typeof document !== 'undefined' && typeof window !== 'undefined') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
}
