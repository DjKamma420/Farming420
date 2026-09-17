/**
 * Set art from the shipped pack, for gear the official item resource cannot
 * picture.
 *
 * When an item carries no head texture, the coverage layer falls back to a
 * hand-drawn outline filled with one flat colour -- and for equipment, which
 * has no outline at all, to a two-letter badge. That is what the Mossy
 * Helianthus set and the Blossom equipment were showing: a grey T-shirt and
 * "CLTB".
 *
 * The pack does not ship armour or equipment pieces, but it does ship the
 * item each set is built from. Those read instantly and correctly: a
 * Helianthus flower for Helianthus armour, the Fermento fruit for Fermento,
 * the four Lotus flowers for the four Lotus equipment tiers. One icon serves a
 * whole set, which loses nothing here because the slot already prints HELMET,
 * CHESTPLATE or CLOAK beside it.
 *
 * This module is the art table and the lookup. It owns no DOM beyond the one
 * node it returns.
 */
import { ITEM_ASSET_BASE_URL, loadItemAssetManifest } from './item-assets.js';

/**
 * Set token to pack key, most specific first.
 *
 * Order is load-bearing: CONDENSED_FERMENTO contains FERMENTO, and
 * DIAMOND_LOTUS contains LOTUS, so the general token must never be tested
 * before the specific one.
 *
 * BLOSSOM is a stand-in and is marked as one. The Blossom equipment has no
 * item of its own in the pack; `bachelors_rose` is a real blossom from the
 * Garden's own wild-rose line, which is in-family and reads better than a
 * letter badge. Its proper picture is the item's head texture, and that path
 * takes precedence whenever the sync supplies one.
 */
export const SET_ART = Object.freeze([
  ['CONDENSED_HELIANTHUS', 'condensed_helianthus'],
  ['CONDENSED_FERMENTO', 'condensed_fermento'],
  ['DIAMOND_LOTUS', 'diamond_lotus'],
  ['SILVER_LOTUS', 'silver_lotus'],
  ['GOLD_LOTUS', 'gold_lotus'],
  ['HELIANTHUS', 'helianthus'],
  ['FERMENTO', 'fermento'],
  ['CROPIE', 'cropie'],
  ['SQUASH', 'squash'],
  ['LOTUS', 'lotus'],
  ['BLOSSOM', 'bachelors_rose'],

  // Gemstones are not stand-ins: the pack ships the actual gem for every
  // Peridot tier, so an upgrade that *is* a gemstone gets its own picture
  // rather than the armour outline of whatever it was socketed into. Tier
  // order is load-bearing the same way CONDENSED_* is -- PERFECT_PERIDOT
  // contains PERIDOT, so the bare token has to be tested last.
  ['PERFECT_PERIDOT', 'perfect_peridot_gem'],
  ['FLAWLESS_PERIDOT', 'flawless_peridot_gem'],
  ['FINE_PERIDOT', 'fine_peridot_gem'],
  ['FLAWED_PERIDOT', 'flawed_peridot_gem'],
  ['ROUGH_PERIDOT', 'rough_peridot_gem'],
  ['PERIDOT', 'peridot_crystal'],

  // Reforges. Every reforge has a design, and where the pack ships the item
  // the reforge is named for, that item reads immediately: thorns for Thorny,
  // a root for Rooted. Both are in-family stand-ins in the same class as
  // BLOSSOM, and both give way to a head texture the moment one exists.
  ['THORNY', 'blooming_thorns'],
  ['ROOTED', 'deep_root'],
]);

/** Ids and names, flattened to one comparable shape. */
function haystack(item) {
  return [item?.id, item?.name]
    .map(value => String(value || '').toUpperCase().replace(/[^A-Z0-9]+/g, '_'))
    .join(' ');
}

/** The pack key for an item's set, or null when no set matches. */
export function packArtKeyFor(item) {
  if (!item) return null;
  const text = haystack(item);
  if (!text.replace(/[\s_]/g, '')) return null;
  for (const [token, key] of SET_ART) {
    if (text.includes(token)) return key;
  }
  return null;
}

let manifest = null;

export function setPackManifestForTests(value) {
  manifest = value;
}

/**
 * An `<img>` for the item's set, or null.
 *
 * Carries `coverage-item-art` so the sizing and centring rules the coverage
 * layer already defines apply unchanged.
 */
export function packArtNodeFor(item, label = '') {
  if (typeof document === 'undefined' || !manifest) return null;
  const key = packArtKeyFor(item);
  const asset = key ? manifest.items?.[key] : null;
  if (!asset?.texture) return null;

  const image = document.createElement('img');
  image.className = 'coverage-item-art pack-set-art';
  image.src = `${ITEM_ASSET_BASE_URL}${asset.texture}`;
  image.alt = '';
  image.loading = 'lazy';
  image.dataset.packSetArt = key;
  image.setAttribute('role', 'img');
  image.setAttribute('aria-label', `${label || item?.name || 'SkyBlock item'} set icon`);
  return image;
}

/**
 * Loads the manifest once, then lets the coverage pass run again.
 *
 * The coverage layer stamps a container with the identity of the art it placed
 * and will not replace art of the same identity, so a second pass alone would
 * leave the outline it drew before this manifest arrived. The stamp is cleared
 * once, here, and only once -- repeating it on every mutation would be two
 * modules taking turns rebuilding the same node, which is a hang, not a
 * refresh.
 */
async function adoptOnce() {
  manifest = await loadItemAssetManifest().catch(() => null);
  if (!manifest || typeof document === 'undefined' || typeof window === 'undefined') return;
  for (const container of document.querySelectorAll('[data-coverage-art]')) {
    delete container.dataset.coverageArt;
  }
  window.dispatchEvent(new Event('farming420:state-changed'));
}

if (typeof document !== 'undefined') adoptOnce();
