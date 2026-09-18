import { STORAGE_KEY } from './config.js';
import { itemAssetForSkyblockId, loadItemAssetManifest } from './item-assets.js';
import { knownSkyblockHeadTexture, knownSkyblockRenderedIcon, skullTextureUrl } from './skull-art.js?v=20260918-3';

let manifest = null;
let manifestRequested = false;
let applying = false;
let applyQueued = false;

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
  container.querySelectorAll(':scope > .official-item-art, :scope > .skull-art, :scope > .item-art-fallback').forEach(node => node.remove());
  container.classList.remove('has-official-item-art', 'has-item-art-fallback');
  delete container.dataset.renderedPackAsset;
  delete container.dataset.renderedItemArt;
}

function fallbackText(value = '') {
  const words = String(value).replace(/[_-]+/g, ' ').trim().split(/\s+/).filter(Boolean);
  if (!words.length) return '?';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0] || ''}${words[1][0] || ''}`.toUpperCase();
}

function fallbackNode(label, identity = '') {
  const node = document.createElement('span');
  node.className = 'item-art-fallback';
  node.textContent = fallbackText(label || identity);
  node.setAttribute('role', 'img');
  node.setAttribute('aria-label', `${label || 'SkyBlock item'} texture unavailable`);
  return node;
}

function showFallback(container, label, identity) {
  if (!container) return null;
  removeRenderedArt(container);
  const node = fallbackNode(label, identity);
  container.prepend(node);
  container.classList.add('has-item-art-fallback');
  if (identity) container.dataset.renderedItemArt = `fallback:${identity}`;
  return node;
}

function skullNode(textureId, item, onError = null) {
  const url = skullTextureUrl(textureId);
  if (!url) return null;

  const node = document.createElement('span');
  node.className = 'skull-art';
  node.dataset.skullTexture = textureId;
  node.setAttribute('role', 'img');
  node.setAttribute('aria-label', item?.displayName ? `${item.displayName} head texture` : 'SkyBlock head texture');

  // Use real image elements rather than CSS background-image. The CSP permits
  // Mojang in img-src, while a dynamically assigned background style is a much
  // more fragile path on mobile/WebView. Both images show the same skin sheet;
  // CSS shifts one to the face square and the other to the hat square.
  let failed = false;
  const fail = () => {
    if (failed) return;
    failed = true;
    node.remove();
    if (typeof onError === 'function') onError();
  };

  for (const layer of ['skull-face', 'skull-hat']) {
    const image = document.createElement('img');
    image.className = `skull-layer ${layer}`;
    image.src = url;
    image.alt = '';
    image.decoding = 'async';
    image.draggable = false;
    image.addEventListener('error', fail, { once: true });
    node.append(image);
  }

  return node;
}

function remoteIconNode(url, item, onError = null) {
  if (!url) return null;
  const img = document.createElement('img');
  img.className = 'official-item-art exact-remote-item-art';
  img.src = url;
  img.alt = item?.displayName ? `${item.displayName} item icon` : 'SkyBlock item icon';
  img.loading = 'eager';
  img.decoding = 'async';
  img.referrerPolicy = 'no-referrer';
  img.addEventListener('error', () => {
    img.remove();
    if (typeof onError === 'function') onError();
  }, { once: true });
  return img;
}

function imageNode(asset, item, onError = null) {
  const img = document.createElement('img');
  img.className = 'official-item-art';
  img.src = asset.textureUrl;
  img.alt = item?.displayName ? `${item.displayName} item texture` : 'SkyBlock item texture';
  img.loading = 'lazy';
  img.decoding = 'async';
  img.dataset.officialPack = asset.packHash || 'unknown';
  img.addEventListener('error', () => {
    img.remove();
    if (typeof onError === 'function') onError();
  }, { once: true });
  return img;
}

export function renderSetupItemArt({ root = document, rawState = readState(), manifestValue = manifest } = {}) {
  if (!root?.querySelectorAll || !rawState) return 0;
  let rendered = 0;

  root.querySelectorAll('[data-pack-asset]').forEach(card => {
    const requestedKey = String(card.dataset.packAsset || '');
    if (!requestedKey) return;
    if ((card.classList.contains('has-official-item-art') || card.classList.contains('has-item-art-fallback')) && card.dataset.renderedPackAsset === requestedKey) return;
    removeRenderedArt(card);
    const asset = itemAssetForSkyblockId(manifestValue, requestedKey);
    const label = card.closest('.item-card')?.querySelector('.item-title')?.textContent || requestedKey;
    if (!asset) {
      card.prepend(fallbackNode(label, requestedKey));
      card.classList.add('has-item-art-fallback');
      card.dataset.renderedPackAsset = requestedKey;
      return;
    }
    const img = imageNode(asset, { displayName: label }, () => {
      card.prepend(fallbackNode(label, requestedKey));
      card.classList.remove('has-official-item-art');
      card.classList.add('has-item-art-fallback');
    });
    card.append(img);
    card.classList.add('has-official-item-art');
    card.dataset.renderedPackAsset = requestedKey;
    rendered += 1;
  });

  root.querySelectorAll('.slot-portrait, [data-item-art-slot]').forEach(card => {
    const slotId = card.dataset.slot || card.dataset.itemArtSlot || card.closest('[data-slot]')?.dataset.slot;
    if (!slotId) return;
    const item = itemForSetupSlot(rawState, slotId);
    if (!item) {
      if (card.querySelector(':scope > .official-item-art, :scope > .skull-art, :scope > .item-art-fallback')) removeRenderedArt(card);
      return;
    }

    const textureId = item.skullTexture || knownSkyblockHeadTexture(item.skyblockId);
    const renderedIconUrl = item.skullTexture ? null : knownSkyblockRenderedIcon(item.skyblockId);
    const identity = renderedIconUrl
      ? `rendered:${String(item.skyblockId || '').toUpperCase()}`
      : textureId
        ? `skull:${textureId}`
        : item.skyblockId ? `item:${item.skyblockId}` : `name:${item.displayName || slotId}`;
    if ((card.classList.contains('has-official-item-art') || card.classList.contains('has-item-art-fallback')) && card.dataset.renderedItemArt === identity) return;
    removeRenderedArt(card);

    const asset = item.skyblockId ? itemAssetForSkyblockId(manifestValue, item.skyblockId) : null;

    if (renderedIconUrl) {
      const exact = remoteIconNode(renderedIconUrl, item, () => {
        const skullFallback = skullNode(textureId, item, () => showFallback(card, item.displayName || slotId, identity));
        if (skullFallback) {
          card.prepend(skullFallback);
          card.classList.add('has-official-item-art');
          card.dataset.renderedItemArt = `skull:${textureId}`;
        } else {
          showFallback(card, item.displayName || slotId, identity);
        }
      });
      if (exact) {
        card.prepend(exact);
        card.classList.add('has-official-item-art');
        card.dataset.renderedItemArt = identity;
        rendered += 1;
        return;
      }
    }

    const skull = skullNode(textureId, item, () => showFallback(card, item.displayName || slotId, identity));
    if (skull) {
      card.prepend(skull);
      card.classList.add('has-official-item-art');
      card.dataset.renderedItemArt = identity;
      rendered += 1;
      return;
    }
    if (asset) {
      const img = imageNode(asset, item, () => showFallback(card, item.displayName || slotId, identity));
      card.prepend(img);
      card.classList.add('has-official-item-art');
      card.dataset.renderedItemArt = identity;
      rendered += 1;
      return;
    }
    showFallback(card, item.displayName || slotId, identity);
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
    // Heads are independent of the Hypixel resource-pack manifest. Render them
    // immediately so a slow/missing manifest can never leave a setup portrait
    // blank. Once the manifest arrives, run a second pass for non-head items.
    renderSetupItemArt({ manifestValue: manifest });
    const loaded = await ensureManifest();
    renderSetupItemArt({ manifestValue: loaded });
  } finally {
    applying = false;
  }
}

function queueApply() {
  if (applyQueued) return;
  applyQueued = true;
  queueMicrotask(async () => {
    applyQueued = false;
    await apply();
  });
}

function mutationNeedsApply(mutations) {
  return mutations.some(mutation => {
    if (mutation.type === 'attributes') return true;
    return [...mutation.addedNodes].some(node => {
      if (!(node instanceof Element)) return false;
      if (node.matches?.('.official-item-art, .skull-art, .item-art-fallback')) return false;
      return node.matches?.('[data-pack-asset], .slot-portrait, [data-item-art-slot]')
        || node.querySelector?.('[data-pack-asset], .slot-portrait, [data-item-art-slot]');
    });
  });
}

function boot() {
  queueApply();
  if (typeof MutationObserver === 'function') {
    const root = document.getElementById('app') || document.body;
    const observer = new MutationObserver(mutations => {
      if (mutationNeedsApply(mutations)) queueApply();
    });
    observer.observe(root, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['data-pack-asset'],
    });
  }
  window.addEventListener('farming420:state-changed', queueApply);
}

if (typeof document !== 'undefined' && typeof window !== 'undefined') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
}
