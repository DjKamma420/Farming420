import { STORAGE_KEY } from './config.js';
import { itemAssetForSkyblockId, loadItemAssetManifest } from './item-assets.js';
import { armorItemSvgMarkup } from './armor-item-art.js';
import { loadItemCatalog, readCachedCatalog } from './item-catalog.js';
import { effectiveSetup } from './setups.js';
import { exactSetupItemArt } from './setup-item-art-map.js';
import { knownSkyblockHeadTexture, knownSkyblockRenderedIcon, skullTextureUrl } from './skull-art.js?v=20260918-4';

let manifest = null;
let manifestPromise = null;
let itemCatalog = readCachedCatalog()?.items || [];
let catalogPromise = null;
let applyQueued = false;

export function setupFromStoredState(rawState, setupId = null) {
  const setups = rawState?.profile?.setups;
  if (!setups || !Array.isArray(setups.list) || !setups.list.length) return null;
  return effectiveSetup(setups, setupId || setups.activeId);
}

export function activeSetupFromStoredState(rawState) {
  return setupFromStoredState(rawState);
}

export function itemForSetupSlot(rawState, slotId, setupId = null) {
  if (!slotId) return null;
  const setup = setupFromStoredState(rawState, setupId);
  const item = setup?.slots?.[slotId];
  return item && typeof item === 'object' ? item : null;
}

export function setupItemAsset(manifestValue, rawState, slotId, setupId = null) {
  const item = itemForSetupSlot(rawState, slotId, setupId);
  const itemId = String(item?.skyblockId || '').trim().toUpperCase();
  if (!itemId) return null;
  return itemAssetForSkyblockId(manifestValue, itemId);
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

function voxelHeadNode(textureId, item, onError = null) {
  const url = skullTextureUrl(textureId);
  if (!url) return null;

  const node = document.createElement('span');
  node.className = 'official-item-art setup-voxel-head-art exact-setup-item-art';
  node.dataset.skullTexture = textureId;
  node.setAttribute('role', 'img');
  node.setAttribute('aria-label', item?.displayName
    ? `${item.displayName} 3D item model`
    : 'SkyBlock 3D head model');

  const cube = document.createElement('span');
  cube.className = 'setup-voxel-head-cube';

  let failed = false;
  const fail = () => {
    if (failed) return;
    failed = true;
    node.remove();
    if (typeof onError === 'function') onError();
  };

  for (const faceName of ['front', 'right', 'top']) {
    const face = document.createElement('span');
    face.className = `setup-voxel-face setup-voxel-${faceName}`;

    for (const layerName of ['base', 'hat']) {
      const image = document.createElement('img');
      image.className = `setup-voxel-layer setup-voxel-${layerName}`;
      image.src = url;
      image.alt = '';
      image.decoding = 'async';
      image.draggable = false;
      image.addEventListener('error', fail, { once: true });
      face.append(image);
    }
    cube.append(face);
  }

  node.append(cube);
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

export function catalogItemForSetupArt(catalogValue, skyblockId) {
  const id = String(skyblockId || '').trim().toUpperCase();
  if (!id || !Array.isArray(catalogValue)) return null;
  return catalogValue.find(item => String(item?.id || '').trim().toUpperCase() === id) || null;
}

/**
 * Non-head Pet Items are not guaranteed to exist in the shipped SkyBlock
 * resource-pack manifest. Once the official Hypixel item catalog confirms the
 * exact id is a PET_ITEM, use the same exact-id rendered-icon endpoint already
 * used by the setup art layer. Display names are never turned into URLs.
 */
export function catalogRenderedIconForSetupArt(catalogValue, skyblockId) {
  const record = catalogItemForSetupArt(catalogValue, skyblockId);
  if (!record || String(record.category || '').trim().toUpperCase() !== 'PET_ITEM') return null;
  const id = String(record.id || '').trim().toLowerCase();
  if (!/^[a-z0-9_-]+$/.test(id)) return null;
  return `https://skyah.net/icons/items/${id}.webp`;
}

function exactSetupArtNode(itemId, item, onError = null) {
  const descriptor = exactSetupItemArt(itemId);
  if (!descriptor) return null;

  if (descriptor.kind === 'head') {
    return skullNode(descriptor.textureId, item, onError);
  }

  if (descriptor.kind === 'voxel-head') {
    return voxelHeadNode(descriptor.textureId, item, onError);
  }

  if (descriptor.kind === 'rendered') {
    return remoteIconNode(knownSkyblockRenderedIcon(itemId), item, onError);
  }

  if (descriptor.kind === 'armor') {
    const markup = armorItemSvgMarkup(descriptor.item);
    if (!markup) return null;
    const node = document.createElement('span');
    node.className = 'official-item-art setup-armor-item-art exact-setup-item-art';
    node.setAttribute('role', 'img');
    node.setAttribute('aria-label', `${item?.displayName || descriptor.item?.name || itemId} item model`);
    node.innerHTML = markup;
    return node;
  }

  return null;
}

function catalogFallbackNode(itemId, item, onError = null) {
  const record = catalogItemForSetupArt(itemCatalog, itemId);
  if (!record) return null;

  const catalogTexture = String(record.skin || '').trim().toLowerCase();
  if (/^[0-9a-f]{32,64}$/.test(catalogTexture)) {
    return skullNode(catalogTexture, item, onError);
  }

  const renderedIconUrl = catalogRenderedIconForSetupArt(itemCatalog, itemId);
  if (renderedIconUrl) return remoteIconNode(renderedIconUrl, item, onError);

  const markup = armorItemSvgMarkup(record);
  if (!markup) return null;
  const node = document.createElement('span');
  node.className = 'official-item-art setup-armor-item-art';
  node.setAttribute('role', 'img');
  node.setAttribute('aria-label', `${item?.displayName || record.name || itemId} item model`);
  node.innerHTML = markup;
  return node;
}

function showCatalogOrLetterFallback(container, item, itemId, slotId, identity) {
  const node = catalogFallbackNode(itemId, item, () => showFallback(container, item?.displayName || slotId, identity));
  if (!node) return showFallback(container, item?.displayName || slotId, identity);

  removeRenderedArt(container);
  container.prepend(node);
  container.classList.add('has-official-item-art');
  container.dataset.renderedItemArt = `catalog:${itemId}`;
  return node;
}

export function renderSetupItemArt({ root = document, rawState = readState(), manifestValue = manifest } = {}) {
  if (!root?.querySelectorAll || !rawState) return 0;
  let rendered = 0;

  root.querySelectorAll('[data-pack-asset]').forEach(card => {
    const requestedKey = String(card.dataset.packAsset || '');
    if (!requestedKey) return;

    const sameKey = card.dataset.renderedPackAsset === requestedKey;
    if (sameKey && card.classList.contains('has-official-item-art')) return;

    const asset = itemAssetForSkyblockId(manifestValue, requestedKey);
    const label = card.closest('.item-card')?.querySelector('.item-title')?.textContent || requestedKey;

    // The first render intentionally runs before the async pack manifest has
    // loaded. A fallback from that pass must not block the second pass: once
    // the real asset exists, replace the fallback instead of keeping the paper
    // placeholder for the lifetime of the page.
    if (!asset) {
      if (sameKey && card.classList.contains('has-item-art-fallback')) return;
      removeRenderedArt(card);
      card.prepend(fallbackNode(label, requestedKey));
      card.classList.add('has-item-art-fallback');
      card.dataset.renderedPackAsset = requestedKey;
      return;
    }

    removeRenderedArt(card);
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

  root.querySelectorAll('.slot-portrait').forEach(card => {
    const slotCard = card.closest('[data-slot]');
    const slotId = card.dataset.slot || slotCard?.dataset.slot;
    if (!slotId) return;

    const setupId = slotCard?.dataset.setupTarget || null;
    const storedItem = itemForSetupSlot(rawState, slotId, setupId);
    const storedItemId = String(storedItem?.skyblockId || '').trim().toUpperCase();
    const domItemId = String(card.dataset.skyblockItemId || slotCard?.dataset.skyblockItemId || '').trim().toUpperCase();
    const itemId = domItemId || storedItemId;
    const item = storedItem || (itemId ? {
      skyblockId: itemId,
      displayName: slotCard?.querySelector('.slot-text strong')?.textContent?.trim() || itemId,
    } : null);
    if (!item || !itemId) {
      if (card.querySelector(':scope > .official-item-art, :scope > .skull-art, :scope > .item-art-fallback')) removeRenderedArt(card);
      delete card.dataset.skyblockItemId;
      return;
    }

    if (card.dataset.skyblockItemId !== itemId) card.dataset.skyblockItemId = itemId;

    const exactStoredTexture = storedItemId === itemId ? storedItem?.skullTexture : null;
    const mappedArt = exactSetupItemArt(itemId);
    const mappedTextureId = mappedArt?.kind === 'head' ? mappedArt.textureId : null;
    const textureId = exactStoredTexture || mappedTextureId || knownSkyblockHeadTexture(itemId);
    // A deterministic item-id mapping is stronger than a generated third-party
    // icon URL. Only use SkyAH when no exact local/head mapping exists.
    const renderedIconUrl = exactStoredTexture || mappedArt
      ? null
      : knownSkyblockRenderedIcon(itemId);
    const identity = mappedArt
      ? `mapped:${itemId}`
      : renderedIconUrl
        ? `rendered:${itemId}`
        : textureId
          ? `skull:${textureId}`
          : itemId ? `item:${itemId}` : `unresolved:${setupId || 'active'}:${slotId}`;
    if ((card.classList.contains('has-official-item-art') || card.classList.contains('has-item-art-fallback')) && card.dataset.renderedItemArt === identity) return;
    removeRenderedArt(card);

    const asset = itemId ? itemAssetForSkyblockId(manifestValue, itemId) : null;

    if (mappedArt) {
      const exactMapped = exactSetupArtNode(itemId, item, () => showCatalogOrLetterFallback(card, item, itemId, slotId, identity));
      if (exactMapped) {
        card.prepend(exactMapped);
        card.classList.add('has-official-item-art');
        card.dataset.renderedItemArt = identity;
        rendered += 1;
        return;
      }
    }

    if (renderedIconUrl) {
      const exact = remoteIconNode(renderedIconUrl, item, () => {
        const skullFallback = skullNode(textureId, item, () => showCatalogOrLetterFallback(card, item, itemId, slotId, identity));
        if (skullFallback) {
          card.prepend(skullFallback);
          card.classList.add('has-official-item-art');
          card.dataset.renderedItemArt = `skull:${textureId}`;
        } else {
          showCatalogOrLetterFallback(card, item, itemId, slotId, identity);
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

    const skull = skullNode(textureId, item, () => showCatalogOrLetterFallback(card, item, itemId, slotId, identity));
    if (skull) {
      card.prepend(skull);
      card.classList.add('has-official-item-art');
      card.dataset.renderedItemArt = identity;
      rendered += 1;
      return;
    }
    if (asset) {
      const img = imageNode(asset, item, () => showCatalogOrLetterFallback(card, item, itemId, slotId, identity));
      card.prepend(img);
      card.classList.add('has-official-item-art');
      card.dataset.renderedItemArt = identity;
      rendered += 1;
      return;
    }
    showCatalogOrLetterFallback(card, item, itemId, slotId, identity);
  });
  return rendered;
}

async function ensureManifest() {
  if (manifest) return manifest;
  manifestPromise ||= loadItemAssetManifest().then(value => {
    manifest = value;
    return manifest;
  });
  return manifestPromise;
}

async function ensureCatalog() {
  if (itemCatalog.length) return itemCatalog;
  catalogPromise ||= loadItemCatalog().then(result => {
    itemCatalog = Array.isArray(result?.items) ? result.items : itemCatalog;
    return itemCatalog;
  });
  return catalogPromise;
}

export async function applySetupItemArt({
  root = document,
  rawState = readState(),
} = {}) {
  if (!root?.querySelectorAll || !rawState) return 0;
  // Never suppress a newer render while resources for an older render are loading.
  // Every caller paints its own current DOM, then awaits the shared promises.
  let rendered = renderSetupItemArt({ root, rawState, manifestValue: manifest });
  const [loaded] = await Promise.all([ensureManifest(), ensureCatalog()]);
  rendered += renderSetupItemArt({ root, rawState, manifestValue: loaded });
  return rendered;
}

function queueApply() {
  if (applyQueued) return;
  applyQueued = true;
  queueMicrotask(async () => {
    applyQueued = false;
    await applySetupItemArt();
  });
}

function mutationNeedsApply(mutations) {
  return mutations.some(mutation => {
    if (mutation.type === 'attributes') return true;
    return [...mutation.addedNodes].some(node => {
      if (!(node instanceof Element)) return false;
      if (node.matches?.('.official-item-art, .skull-art, .item-art-fallback')) return false;
      return node.matches?.('[data-pack-asset], .slot-portrait')
        || node.querySelector?.('[data-pack-asset], .slot-portrait');
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
  window.addEventListener('farming420:rendered', event => {
    void applySetupItemArt({
      root: document.getElementById('app') || document,
      rawState: event.detail?.state || readState(),
    });
  });
}

if (typeof document !== 'undefined' && typeof window !== 'undefined') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
}
