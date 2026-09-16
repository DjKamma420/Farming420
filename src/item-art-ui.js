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

/**
 * A player head, drawn from the skin the item itself points at.
 *
 * Two layers, because a skin stores the face and the hat as separate squares on
 * one sheet, and the hat is meant to sit over the face. The sheet is positioned
 * with background-size and background-position rather than cropped in a canvas:
 * Mojang's texture host sends no CORS header, so reading these pixels back would
 * fail, while simply displaying them does not.
 *
 * Every property is set through the CSSOM. The page's Content Security Policy
 * drops inline style attributes, so building this as an HTML string would
 * silently render the whole skin instead of the head.
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

  // A skin sheet is 64 wide and either 64 or 32 tall. The two share the face and
  // hat coordinates, but a percentage offset is relative to the rendered height,
  // so the layout has to know which sheet arrived.
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
  // No manifest is needed for a head, so this no longer waits for the pack.
  if (!root?.querySelectorAll || !rawState) return 0;
  let rendered = 0;
  // Both surfaces that show one slot's item: the collapsed card in the grid and
  // the portrait at the top of the open editor.
  // Only the innermost art container, never both it and its card. A slot card
  // contains its own portrait, so matching the card as well put one head in the
  // card and a second in the portrait inside it.
  root.querySelectorAll('.slot-portrait, [data-item-art-slot]').forEach(card => {
    // Guard on the container, not on one kind of child. A head and a pack
    // texture are different elements, and checking only for the pack texture let
    // every mutation add another head: the observer that watches for new cards
    // sees its own insertion and runs again, without end.
    if (card.classList.contains('has-official-item-art')) return;
    const slotId = card.dataset.slot || card.dataset.itemArtSlot || card.closest('[data-slot]')?.dataset.slot;
    if (!slotId) return;
    const item = itemForSetupSlot(rawState, slotId);
    if (!item) return;
    // The head comes first. Farming armour, equipment and pets have no entry in
    // the resource pack at all, so for those slots this is the only real picture
    // there is; where both exist, the head is what the game itself shows.
    const asset = item.skyblockId ? itemAssetForSkyblockId(manifestValue, item.skyblockId) : null;
    const node = skullNode(item.skullTexture, item) || (asset ? imageNode(asset, item) : null);
    if (!node) return;
    card.prepend(node);
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
