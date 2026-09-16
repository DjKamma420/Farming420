import { STORAGE_KEY } from './config.js';
import { itemAssetForSkyblockId, loadItemAssetManifest } from './item-assets.js';
import { skullTextureUrl } from './skull-art.js';

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

function removeRenderedArt(container) {
  if (!container?.querySelectorAll) return;
  container.querySelectorAll(':scope > .official-item-art, :scope > .skull-art').forEach(node => node.remove());
  container.classList.remove('has-official-item-art');
  delete container.dataset.renderedPackAsset;
  delete container.dataset.renderedItemArt;
}

/**
 * A player head, drawn from the skin the item itself points at.
 *
 * Two layers, because a skin stores the face and the hat as separate squares on
 * one sheet, and the hat is meant to sit over the face. The sheet is positioned
 * with background-size and background-position rather than cropped in a canvas:
 * Mojang's texture host sends no CORS header, so reading these pixels back would
 * fail, while simply displaying them does not.
 */
function skullNode(textureId, item) {
  const url = skullTextureUrl(textureId);
  if (!url) return null;

  const node = document.createElement('span');
  node.className = 'skull-art';
  node.dataset.skullTexture = textureId;
  node.setAttribute('role', 'img');
  node.setAttribute('aria-label', item?.displayName ? `${item.displayName} head texture` : 'SkyBlock head texture');

  for (const layer of ['skull-face', 'skull-hat']) {
    const element = document.createElement('span');
    element.className = `skull-layer ${layer}`;
    element.style.backgroundImage = `url("${url}")`;
    node.append(element);
  }

  const probe = new Image();
  probe.addEventListener('load', () => {
    node.classList.add(probe.naturalHeight >= probe.naturalWidth ? 'skull-square' : 'skull-legacy');
  }, { once: true });
  probe.addEventListener('error', () => node.remove(), { once: true });
  probe.src = url;

  return node;
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
  if (!root?.querySelectorAll || !rawState) return 0;
  let rendered = 0;

  // Progression surfaces can change their requested pack id after they were
  // inserted into the DOM (for example Mk. I -> Mk. III). Track the exact id
  // that was rendered so a changed selection replaces stale art instead of the
  // old `has-official-item-art` guard keeping the first image forever.
  root.querySelectorAll('[data-pack-asset]').forEach(card => {
    const requestedKey = String(card.dataset.packAsset || '');
    if (!requestedKey) return;
    if (card.classList.contains('has-official-item-art') && card.dataset.renderedPackAsset === requestedKey) return;
    if (card.classList.contains('has-official-item-art')) removeRenderedArt(card);
    const asset = itemAssetForSkyblockId(manifestValue, requestedKey);
    if (!asset) return;
    card.append(imageNode(asset, { displayName: card.closest('.item-card')?.querySelector('.item-title')?.textContent }));
    card.classList.add('has-official-item-art');
    card.dataset.renderedPackAsset = requestedKey;
    rendered += 1;
  });

  root.querySelectorAll('.slot-portrait, [data-item-art-slot]').forEach(card => {
    const slotId = card.dataset.slot || card.dataset.itemArtSlot || card.closest('[data-slot]')?.dataset.slot;
    if (!slotId) return;
    const item = itemForSetupSlot(rawState, slotId);
    if (!item) {
      if (card.classList.contains('has-official-item-art')) removeRenderedArt(card);
      return;
    }

    const identity = item.skullTexture
      ? `skull:${item.skullTexture}`
      : item.skyblockId ? `item:${item.skyblockId}` : '';
    if (!identity) return;
    if (card.classList.contains('has-official-item-art') && card.dataset.renderedItemArt === identity) return;
    if (card.classList.contains('has-official-item-art')) removeRenderedArt(card);

    const asset = item.skyblockId ? itemAssetForSkyblockId(manifestValue, item.skyblockId) : null;
    const node = skullNode(item.skullTexture, item) || (asset ? imageNode(asset, item) : null);
    if (!node) return;
    card.prepend(node);
    card.classList.add('has-official-item-art');
    card.dataset.renderedItemArt = identity;
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
    renderSetupItemArt({ manifestValue: loaded });
  } finally {
    applying = false;
  }
}

function boot() {
  apply();
  if (typeof MutationObserver === 'function') {
    const observer = new MutationObserver(() => apply());
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['data-pack-asset'],
    });
  }
  window.addEventListener('farming420:state-changed', apply);
}

if (typeof document !== 'undefined' && typeof window !== 'undefined') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
}
