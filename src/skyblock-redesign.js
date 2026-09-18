import { CROPS } from './data.js';
import { STORAGE_KEY } from './config.js';
import { toolKeyForCropId } from './migrations.js';
import { TOOL_TIER_CHAIN, highestChainTier } from './progression-chains.js';
import { ITEM_ASSET_BASE_URL, loadItemAssetManifest } from './item-assets.js';

const GOAL_KEY = 'farming420-reforge-goal-v1';

const REFORGES = Object.freeze([
  { id: 'bountiful', label: 'Bountiful', item: 'golden_ball', purpose: 'Coins', detail: '+0.2 Coins per crop gained; default money choice.' },
  { id: 'blessed', label: 'Blessed', item: 'blessed_fruit', purpose: 'Collection / XP', detail: 'Farming Wisdom plus its enchanted-crop bonus; strong collection/XP option.' },
  { id: 'earthy', label: 'Earthy', item: 'large_walnut', purpose: 'Sowdust', detail: 'Sowdust-focused reforge; use when Sowdust is the target.' },
  { id: 'deep-fried', label: 'Deep Fried', item: 'hashbrown', purpose: 'Feast Seasoning', detail: 'Harvest Feast Seasoning / milestone-focused reforge.' },
  { id: 'overpriced', label: 'Overpriced', item: 'overpriced_drink', purpose: 'Overbloom', detail: 'Overbloom and high Fortune for Rare Crops, Greenhouse and Feast drops.' },
]);

const GOALS = Object.freeze([
  ['coins', 'Coins'],
  ['collection', 'Collection'],
  ['xp', 'Farming XP'],
  ['sowdust', 'Sowdust'],
  ['rare', 'Rare Crops'],
  ['seasoning', 'Feast Seasoning'],
]);

/**
 * Nav art, by page, in preference order.
 *
 * Every key here was checked against `assets/hypixel-pack/manifest.json`; a
 * name that matches nothing silently degrades to a bare letter, which is how
 * twelve of sixteen entries ended up as letters (`garden`, `personal_bank`,
 * `wardrobe`, `calculator` and friends are not in the pack at all). The pack
 * ships SkyBlock's own items only -- there is no book, paper, clock or armour
 * texture in it -- so the pages without a literal match take the SkyBlock item
 * that means the same thing: a blueprint for what is not built yet, a
 * diagnostics tool for mechanics, a ruler for the figures you type in, a box of
 * seeds for starting out. Every page has art; none falls back to a letter.
 * `tests/nav-art.test.js` fails if a key stops resolving.
 */
const NAV_ART = Object.freeze({
  dashboard: ['garden_scythe'],
  account: ['visitors_gratitude'],
  accessories: ['honeycomb_talisman'],
  crops: ['cropie'],
  tools: ['theoretical_hoe_wheat_3', 'melon_dicer_3'],
  setups: ['fermento'],
  gear: ['squash'],
  pets: ['jolly_pink_rock'],
  chips: ['cropshot_chip', 'hypercharge_chip'],
  shards: ['earth_shard'],
  buffs: ['goblin_omelette'],
  pests: ['pest_trap', 'sprayonator'],
  planner: ['wishing_compass'],
  guide: ['box_of_seeds'],
  setup: ['builders_ruler'],
  research: ['plant_diagnostics_tool'],
  coming: ['greenhouse_blueprint'],
});

/**
 * Art for each crop, in preference order.
 *
 * Thirteen crop tiles were drawing bare letters -- W, C, P, Pu, Mu, WR and the
 * rest. The pack ships SkyBlock's own items only, so there is no plain wheat,
 * melon or cocoa texture in it; what it does have is each crop's own SkyBlock
 * produce, and those are used wherever one exists.
 *
 * Wheat, potato, melon, sugar cane and cocoa have no produce texture at all, so
 * they fall back to that crop's Mk. I tool. That is a deliberate second choice:
 * it repeats the art the Tools page uses, but the crop tile names the tool
 * directly beside it, and a recognisable tool beats a letter.
 *
 * Every key is checked against the shipped manifest by `tests/crop-art.test.js`,
 * because a name that matches nothing degrades silently back to the letter.
 */
export const CROP_ART = Object.freeze({
  wheat: ['theoretical_hoe_wheat_1'],
  carrot: ['carrot_bait'],
  potato: ['theoretical_hoe_potato_1'],
  pumpkin: ['polished_pumpkin'],
  melon: ['melon_dicer'],
  mushroom: ['glowing_mushroom'],
  cactus: ['potted_cactus'],
  'sugar-cane': ['theoretical_hoe_cane_1'],
  'cocoa-beans': ['coco_chopper'],
  'nether-wart': ['mutant_nether_wart'],
  sunflower: ['compacted_sunflower'],
  moonflower: ['compacted_moonflower'],
  'wild-rose': ['compacted_wild_rose'],
});

/**
 * The pack key for each tool, per tier, in the order Mk. I, Mk. II, Mk. III.
 *
 * Every key below was checked against `assets/hypixel-pack/manifest.json`. The
 * table used to list only `_3` first and fall back to `_1`, so every tool was
 * drawn as its fully upgraded model no matter what the player owned. Sunflower,
 * Moonflower and Wild Rose have a single art entry each because the pack ships
 * no tiered variant for them.
 */
const TOOL_TIER_ART = Object.freeze({
  wheat: ['theoretical_hoe_wheat_1', 'theoretical_hoe_wheat_2', 'theoretical_hoe_wheat_3'],
  carrot: ['theoretical_hoe_carrot_1', 'theoretical_hoe_carrot_2', 'theoretical_hoe_carrot_3'],
  potato: ['theoretical_hoe_potato_1', 'theoretical_hoe_potato_2', 'theoretical_hoe_potato_3'],
  pumpkin: ['pumpkin_dicer', 'pumpkin_dicer_2', 'pumpkin_dicer_3'],
  melon: ['melon_dicer', 'melon_dicer_2', 'melon_dicer_3'],
  mushroom: ['fungi_cutter', 'fungi_cutter_2', 'fungi_cutter_3'],
  cactus: ['cactus_knife', 'cactus_knife_2', 'cactus_knife_3'],
  'sugar-cane': ['theoretical_hoe_cane_1', 'theoretical_hoe_cane_2', 'theoretical_hoe_cane_3'],
  // coco_chopper, not cocoa_chopper. The old spelling matched nothing, which is
  // why the Cocoa Chopper was the one tool showing a bare letter placeholder.
  'cocoa-beans': ['coco_chopper', 'coco_chopper_2', 'coco_chopper_3'],
  'nether-wart': ['theoretical_hoe_warts_1', 'theoretical_hoe_warts_2', 'theoretical_hoe_warts_3'],
  sunflower: ['theoretical_hoe_sunflower_1'],
  moonflower: ['theoretical_hoe_sunflower_1'],
  'wild-rose': ['theoretical_hoe_wild_rose_1'],
});

/** Mk. I when nothing is recorded: an unset tool is the base model, not a blank. */
function toolTierFor(state, cropId) {
  const bucket = state?.profile?.toolProgress?.[toolKeyForCropId(cropId)] || {};
  return highestChainTier(bucket, TOOL_TIER_CHAIN);
}

function tierLabel(tier) {
  return TOOL_TIER_CHAIN.options.find(option => option.value === Number(tier))?.label
    || TOOL_TIER_CHAIN.options[0].label;
}

/** The art for the tier the player actually has, falling back to Mk. I. */
function toolArtForTier(cropId, tier) {
  const byTier = TOOL_TIER_ART[cropId];
  if (!byTier?.length) return [];
  const index = Math.max(1, Math.min(byTier.length, Math.floor(Number(tier) || 1))) - 1;
  // The lower tiers are the fallbacks, so a missing variant degrades downwards
  // rather than jumping to a model the player has not built.
  return byTier.slice(0, index + 1).reverse();
}

let manifest = null;
let applying = false;

function readState() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch { return {}; }
}

function writeState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  window.dispatchEvent(new Event('farming420:state-changed'));
}

function pageId() {
  return document.querySelector('.sidebar .nav-link.active')?.dataset.page || '';
}

function activeCropId() {
  return document.querySelector('#cropSelect')?.value || readState()?.selectedCrop || 'melon';
}

function currentGoal() {
  return localStorage.getItem(GOAL_KEY) || 'coins';
}

/**
 * The pack art for a crop, or null while the manifest is still loading.
 *
 * Exported so a page that needs a crop's picture borrows this table instead of
 * starting a second one. The app has had two rarity ladders and two taskbar
 * rules already; a second crop-art table would be the third of that kind.
 */
export function cropArtUrl(cropId) {
  return assetByCandidates(CROP_ART[String(cropId || '').trim().toLowerCase()] || []);
}

function assetByCandidates(candidates = []) {
  const items = manifest?.items;
  if (!items) return null;
  const keys = Object.keys(items);
  for (const candidate of candidates) {
    const exact = items[String(candidate).toLowerCase()];
    if (exact?.texture) return `${ITEM_ASSET_BASE_URL}${exact.texture}`;
  }
  for (const candidate of candidates) {
    const needle = String(candidate).toLowerCase();
    const key = keys.find(value => value.includes(needle));
    if (key && items[key]?.texture) return `${ITEM_ASSET_BASE_URL}${items[key].texture}`;
  }
  return null;
}

function img(url, alt = '') {
  if (!url) return '';
  return `<img class="sb-pack-icon" src="${url}" alt="${alt}" loading="lazy" decoding="async">`;
}

function uniqueTools() {
  const tools = new Map();
  for (const crop of CROPS) {
    const key = toolKeyForCropId(crop.id);
    if (!tools.has(key)) tools.set(key, { key, name: crop.tool, crops: [], primaryCrop: crop.id });
    tools.get(key).crops.push(crop);
  }
  return [...tools.values()];
}

function setCrop(cropId) {
  const select = document.querySelector('#cropSelect');
  if (!select) return;
  select.value = cropId;
  select.dispatchEvent(new Event('change', { bubbles: true }));
}

function recommendation(cropId, goal) {
  if (goal === 'coins') return 'bountiful';
  if (goal === 'xp') return 'blessed';
  if (goal === 'sowdust') return 'earthy';
  if (goal === 'rare') return 'overpriced';
  if (goal === 'seasoning') return 'deep-fried';
  if (goal === 'collection') return cropId === 'melon' ? 'overpriced' : 'blessed';
  return 'bountiful';
}

function selectedReforge(state, toolKey) {
  const explicit = state?.profile?.toolReforges?.[toolKey];
  if (REFORGES.some(reforge => reforge.id === explicit)) return explicit;
  const bucket = state?.profile?.toolProgress?.[toolKey];
  if (Number(bucket?.levels?.['tool-reforge-bountiful-reforge']) > 0 || bucket?.owned?.['tool-reforge-bountiful-reforge']) return 'bountiful';
  if (Number(bucket?.levels?.['tool-reforge-blessed-reforge']) > 0 || bucket?.owned?.['tool-reforge-blessed-reforge']) return 'blessed';
  return null;
}

function storeReforge(reforgeId) {
  // An empty id is the explicit "no reforge" answer, not a missing value.
  const state = readState();
  const cropId = activeCropId();
  const key = toolKeyForCropId(cropId);
  state.profile ||= {};
  state.profile.toolReforges ||= {};
  if (reforgeId) state.profile.toolReforges[key] = reforgeId;
  else delete state.profile.toolReforges[key];
  state.profile.toolProgress ||= {};
  state.profile.toolProgress[key] ||= { levels: {}, owned: {}, costs: {}, manualGain: {} };
  const bucket = state.profile.toolProgress[key];
  bucket.levels ||= {};
  bucket.owned ||= {};
  for (const id of ['tool-reforge-bountiful-reforge', 'tool-reforge-blessed-reforge']) {
    delete bucket.levels[id];
    delete bucket.owned[id];
  }
  const scoredId = reforgeId === 'bountiful'
    ? 'tool-reforge-bountiful-reforge'
    : reforgeId === 'blessed' ? 'tool-reforge-blessed-reforge' : null;
  if (scoredId) {
    bucket.levels[scoredId] = 1;
    bucket.owned[scoredId] = true;
  }
  writeState(state);
}

function decorateNavigation() {
  const sidebar = document.querySelector('.sidebar');
  if (!sidebar) return;
  sidebar.classList.add('sb-rail');
  sidebar.querySelectorAll('.nav-link').forEach(button => {
    const page = button.dataset.page;
    const label = button.textContent.trim();
    button.dataset.label = label;
    if (button.querySelector('.sb-nav-icon')) return;
    const icon = document.createElement('span');
    icon.className = 'sb-nav-icon';
    const url = assetByCandidates(NAV_ART[page] || []);
    if (url) {
      const image = document.createElement('img');
      image.src = url;
      image.alt = '';
      image.loading = 'lazy';
      icon.append(image);
    } else {
      icon.textContent = label.slice(0, 1);
    }
    const text = document.createElement('span');
    text.className = 'sb-nav-label';
    text.textContent = label;
    button.textContent = '';
    button.append(icon, text);
  });
}

/**
 * Fills the crop tiles with pack art.
 *
 * The tile carries its crop in `data-crop` on the card; the dashboard's single
 * focus tile has no card, so it reads the selected crop from stored state. The
 * letter stays in the DOM as the fallback and is only hidden, so nothing is
 * removed that the re-rendering core will put back.
 *
 * Writes only when the icon is missing: this module re-enters through a
 * MutationObserver on the same subtree it writes into.
 */
function decorateCropIcons() {
  for (const icon of document.querySelectorAll('.crop-icon')) {
    if (icon.querySelector('.sb-crop-art')) continue;
    const cropId = icon.closest('[data-crop]')?.dataset.crop || activeCropId();
    const url = assetByCandidates(CROP_ART[cropId] || []);
    if (!url) continue;

    const letter = document.createElement('span');
    letter.className = 'sb-crop-letter';
    letter.textContent = icon.textContent.trim();

    const image = document.createElement('img');
    image.className = 'sb-crop-art';
    image.src = url;
    image.alt = '';
    image.loading = 'lazy';

    icon.textContent = '';
    icon.append(letter, image);
  }
}


function toolPicker() {
  if (pageId() !== 'tools') return;
  const content = document.querySelector('.content');
  if (!content) return;
  const head = content.querySelector('.page-head');
  if (!head) return;
  // Hidden, never removed. enhancements.js recreates this strip whenever it is
  // missing, so removing it starts a fight between two observers that rebuild
  // and delete the same node until the tab dies.
  content.querySelector('.tool-context-addon')?.classList.add('sb-hidden-context');

  const cropId = activeCropId();
  const state = readState();
  const selectedKey = toolKeyForCropId(cropId);
  const section = document.createElement('section');
  section.className = 'sb-tool-picker';
  section.innerHTML = `<div class="sb-block-title"><div><span class="eyebrow">Farming Toolkit</span><h2>Choose a physical tool</h2></div><span class="sb-hint">No global crop dropdown. The selected tool defines the crop context.</span></div>
    <div class="sb-tool-grid">${uniqueTools().map(tool => {
      const firstCrop = tool.crops[0];
      const tier = toolTierFor(state, firstCrop.id);
      const iconUrl = assetByCandidates(toolArtForTier(firstCrop.id, tier));
      return `<button class="sb-tool-card ${tool.key === selectedKey ? 'selected' : ''}" data-sb-tool-crop="${firstCrop.id}">
        <span class="sb-tool-art">${img(iconUrl, `${tool.name} ${tierLabel(tier)}`)}<span class="sb-tool-fallback">${firstCrop.icon}</span></span>
        <span class="sb-tool-copy"><strong>${tool.name}</strong><small>${tool.crops.map(crop => crop.name).join(' / ')}</small></span>
        <span class="sb-tool-tier">${tierLabel(tier)}</span>
        <span class="sb-state-dot" aria-hidden="true"></span>
      </button>`;
    }).join('')}</div>`;
  // Rebuilt only when the selection or a tier actually changed. Rebuilding on
  // every pass would feed the observer that calls this and wedge the page.
  const signature = `${selectedKey}|${uniqueTools().map(tool => toolTierFor(state, tool.crops[0].id)).join(',')}`;
  const existing = content.querySelector('.sb-tool-picker');
  if (existing?.dataset.sbSignature === signature) return;
  section.dataset.sbSignature = signature;
  if (existing) existing.replaceWith(section);
  else head.insertAdjacentElement('afterend', section);
  section.querySelectorAll('[data-sb-tool-crop]').forEach(button => button.addEventListener('click', () => setCrop(button.dataset.sbToolCrop)));
}

/**
 * Puts the tool's editor directly beneath the tool it belongs to.
 *
 * The page used to list twelve tool cards and then, 4800 pixels down, one
 * editor for whichever was selected -- so choosing a tool meant scrolling past
 * every other tool to reach its settings.
 *
 * There is still exactly one editor. It is moved, not copied, which is what
 * makes "clicking another tool closes the first one" fall out for free: the
 * editor cannot be in two places, so the previous card simply no longer has it.
 *
 * Moving a node is itself a mutation, and this module re-enters through an
 * observer on the same subtree, so the move is idempotent: once the editor is
 * the selected card's next sibling there is nothing left to do.
 */
function dockToolEditor() {
  if (pageId() !== 'tools') return;
  const grid = document.querySelector('.sb-tool-picker .sb-tool-grid');
  const editor = document.querySelector('[data-tool-editor="1"]');
  if (!grid || !editor) return;
  const selected = grid.querySelector('.sb-tool-card.selected')
    || grid.querySelector('.sb-tool-card');
  if (!selected) return;
  if (!editor.classList.contains('sb-docked-editor')) editor.classList.add('sb-docked-editor');
  if (selected.nextElementSibling === editor) return;
  selected.insertAdjacentElement('afterend', editor);
}

function reforgePanel() {
  if (pageId() !== 'tools') return;
  const editor = document.querySelector('[data-tool-editor]');
  if (!editor) return;
  // Replace the panel when one is already there. Taking the first section that
  // is *not* the panel picks Enchantments once the panel exists, and each pass
  // would then eat another section of the editor.
  const existingPanel = editor.querySelector('.sb-reforge-panel');
  const target = existingPanel || editor.querySelector('.item-editor-section');
  if (!target) return;

  const cropId = activeCropId();
  const crop = CROPS.find(entry => entry.id === cropId) || CROPS[0];
  const state = readState();
  const key = toolKeyForCropId(cropId);
  const chosen = selectedReforge(state, key);
  const goal = currentGoal();
  const recommended = recommendation(cropId, goal);

  const panel = document.createElement('section');
  panel.className = 'sb-reforge-panel item-editor-section';
  panel.innerHTML = `<div class="sb-block-title"><div><span class="eyebrow">Reforge</span><h3>Pick what is actually on the tool</h3><p>Every current Farming Tool reforge stays selectable. The recommendation changes by goal instead of hiding non-meta choices.</p></div></div>
    <div class="sb-goal-tabs" role="group" aria-label="Reforge recommendation goal">${GOALS.map(([id, label]) => `<button class="${goal === id ? 'active' : ''}" data-sb-goal="${id}">${label}</button>`).join('')}</div>
    <div class="sb-recommendation">Recommended for <strong>${crop.name}</strong> · <strong>${GOALS.find(([id]) => id === goal)?.[1] || 'Coins'}</strong>: <span>${REFORGES.find(reforge => reforge.id === recommended)?.label}</span></div>
    <div class="sb-reforge-grid" role="radiogroup" aria-label="Reforge on this tool">
      <button class="sb-reforge-card sb-reforge-none ${chosen ? '' : 'selected'}" role="radio" aria-checked="${chosen ? 'false' : 'true'}" data-sb-reforge="">
        <span class="sb-reforge-art"><span class="sb-reforge-fallback">&ndash;</span></span>
        <span class="sb-reforge-copy"><strong>No reforge</strong><small>Nothing on it</small><span>Pick this when the tool carries no reforge yet. It is a real answer, not a blank.</span></span>
        <span class="sb-state-dot" aria-hidden="true"></span>
      </button>
      ${REFORGES.map(reforge => {
      const iconUrl = assetByCandidates([reforge.item, reforge.id.replace('-', '_')]);
      return `<button class="sb-reforge-card ${chosen === reforge.id ? 'selected' : ''} ${recommended === reforge.id ? 'recommended' : ''}" role="radio" aria-checked="${chosen === reforge.id ? 'true' : 'false'}" data-sb-reforge="${reforge.id}">
        <span class="sb-reforge-art">${img(iconUrl, reforge.label)}<span class="sb-reforge-fallback">${reforge.label.slice(0, 1)}</span></span>
        <span class="sb-reforge-copy"><strong>${reforge.label}</strong><small>${reforge.purpose}</small><span>${reforge.detail}</span></span>
        ${recommended === reforge.id ? '<em>Recommended</em>' : ''}
        <span class="sb-state-dot" aria-hidden="true"></span>
      </button>`;
    }).join('')}</div>
    <p class="sb-research-note">Recommendation basis updated 2026-09-16: Bountiful for direct crop coins; Blessed for Farming XP and most collection targets; Earthy for Sowdust; Overpriced for Overbloom/Rare Crops and Melon collection; Deep Fried for Harvest Feast Seasoning.</p>`;
  // Keyed by everything the panel shows, so an unchanged panel is left alone.
  // It is rebuilt by a MutationObserver, and replacing it unconditionally is
  // what wedged the page before.
  const signature = `${cropId}|${chosen || 'none'}|${goal}`;
  if (existingPanel?.dataset.sbSignature === signature) return;
  panel.dataset.sbSignature = signature;
  target.replaceWith(panel);

  panel.querySelectorAll('[data-sb-reforge]').forEach(button => button.addEventListener('click', () => storeReforge(button.dataset.sbReforge)));
  panel.querySelectorAll('[data-sb-goal]').forEach(button => button.addEventListener('click', () => {
    localStorage.setItem(GOAL_KEY, button.dataset.sbGoal);
    reforgePanel();
  }));
}

function toolPortrait() {
  if (pageId() !== 'tools') return;
  const portrait = document.querySelector('[data-tool-editor] .item-portrait');
  if (!portrait) return;
  const cropId = activeCropId();
  const tier = toolTierFor(readState(), cropId);
  const url = assetByCandidates(toolArtForTier(cropId, tier));
  if (!url) return;
  // Keyed by tool and tier, so the portrait follows an upgrade instead of
  // keeping whatever was painted first, and repainting the same thing is a
  // no-op rather than a mutation the observer would come back for.
  const signature = `${cropId}:${tier}`;
  if (portrait.dataset.sbToolArt === signature) return;
  portrait.querySelector('.sb-pack-icon')?.remove();
  portrait.dataset.sbToolArt = signature;
  portrait.insertAdjacentHTML('afterbegin', img(url, `${CROPS.find(crop => crop.id === cropId)?.tool || 'Farming tool'} ${tierLabel(tier)}`));
}

function restyleCards() {
  document.querySelectorAll('.item-card').forEach(card => card.classList.add('sb-inventory-card'));
  document.querySelectorAll('.lever').forEach(lever => lever.classList.add('sb-toggle'));
}

function apply() {
  if (applying) return;
  applying = true;
  try {
    decorateNavigation();
    decorateCropIcons();
    toolPicker();
    dockToolEditor();
    reforgePanel();
    toolPortrait();
    restyleCards();
    document.documentElement.classList.add('skyblock-redesign');
  } finally {
    applying = false;
  }
}

async function boot() {
  manifest = await loadItemAssetManifest();
  apply();
  const root = document.querySelector('#app');
  if (root && typeof MutationObserver === 'function') {
    const observer = new MutationObserver(() => queueMicrotask(apply));
    observer.observe(root, { childList: true, subtree: true });
  }
  window.addEventListener('farming420:state-changed', apply);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
else boot();
