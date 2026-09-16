import { CROPS } from './data.js';
import { STORAGE_KEY } from './config.js';
import { toolKeyForCropId } from './migrations.js';
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

const NAV_ART = Object.freeze({
  dashboard: ['garden', 'farming'],
  account: ['personal_bank', 'profile'],
  crops: ['cropie', 'wheat'],
  tools: ['farming_toolkit', 'theoretical_hoe_wheat_3', 'melon_dicer_3'],
  setups: ['wardrobe', 'armor'],
  gear: ['fermento', 'armor'],
  pets: ['elephant', 'rabbit'],
  chips: ['cropshot_chip', 'hypercharge_chip'],
  shards: ['shard', 'attribute'],
  buffs: ['booster_cookie', 'god_potion'],
  pests: ['vacuum', 'pest'],
  guide: ['book', 'guide'],
  setup: ['paper', 'checklist'],
  planner: ['calculator', 'abacus'],
  research: ['enchanted_book', 'book'],
  coming: ['clock', 'barrier'],
});

const TOOL_ART = Object.freeze({
  wheat: ['theoretical_hoe_wheat_3', 'theoretical_hoe_wheat_1'],
  carrot: ['theoretical_hoe_carrot_3', 'theoretical_hoe_carrot_1'],
  potato: ['theoretical_hoe_potato_3', 'theoretical_hoe_potato_1'],
  pumpkin: ['pumpkin_dicer_3', 'pumpkin_dicer'],
  melon: ['melon_dicer_3', 'melon_dicer'],
  mushroom: ['fungi_cutter'],
  cactus: ['cactus_knife'],
  'sugar-cane': ['theoretical_hoe_cane_3', 'theoretical_hoe_cane_1'],
  'cocoa-beans': ['cocoa_chopper'],
  'nether-wart': ['theoretical_hoe_warts_3', 'theoretical_hoe_warts_1'],
  sunflower: ['theoretical_hoe_sunflower_3', 'theoretical_hoe_sunflower_1'],
  moonflower: ['theoretical_hoe_sunflower_3', 'theoretical_hoe_sunflower_1'],
  'wild-rose': ['theoretical_hoe_wild_rose_3', 'theoretical_hoe_wild_rose_1'],
});

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
  const state = readState();
  const cropId = activeCropId();
  const key = toolKeyForCropId(cropId);
  state.profile ||= {};
  state.profile.toolReforges ||= {};
  state.profile.toolReforges[key] = reforgeId;
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

function toolPicker() {
  if (pageId() !== 'tools') return;
  const content = document.querySelector('.content');
  if (!content || content.querySelector('.sb-tool-picker')) return;
  const head = content.querySelector('.page-head');
  if (!head) return;
  content.querySelector('.tool-context-addon')?.classList.add('sb-hidden-context');

  const cropId = activeCropId();
  const selectedKey = toolKeyForCropId(cropId);
  const section = document.createElement('section');
  section.className = 'sb-tool-picker';
  section.innerHTML = `<div class="sb-block-title"><div><span class="eyebrow">Farming Toolkit</span><h2>Choose a physical tool</h2></div><span class="sb-hint">No global crop dropdown. The selected tool defines the crop context.</span></div>
    <div class="sb-tool-grid">${uniqueTools().map(tool => {
      const firstCrop = tool.crops[0];
      const iconUrl = assetByCandidates(TOOL_ART[firstCrop.id] || []);
      return `<button class="sb-tool-card ${tool.key === selectedKey ? 'selected' : ''}" data-sb-tool-crop="${firstCrop.id}">
        <span class="sb-tool-art">${img(iconUrl, tool.name)}<span class="sb-tool-fallback">${firstCrop.icon}</span></span>
        <span class="sb-tool-copy"><strong>${tool.name}</strong><small>${tool.crops.map(crop => crop.name).join(' / ')}</small></span>
        <span class="sb-state-dot" aria-hidden="true"></span>
      </button>`;
    }).join('')}</div>`;
  head.insertAdjacentElement('afterend', section);
  section.querySelectorAll('[data-sb-tool-crop]').forEach(button => button.addEventListener('click', () => setCrop(button.dataset.sbToolCrop)));
}

function reforgePanel() {
  if (pageId() !== 'tools') return;
  const editor = document.querySelector('[data-tool-editor]');
  if (!editor || editor.querySelector('.sb-reforge-panel')) return;
  const firstSection = editor.querySelector('.item-editor-section');
  if (!firstSection) return;
  firstSection.classList.add('sb-native-reforge-section');

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
    <div class="sb-reforge-grid">${REFORGES.map(reforge => {
      const iconUrl = assetByCandidates([reforge.item, reforge.id.replace('-', '_')]);
      return `<button class="sb-reforge-card ${chosen === reforge.id ? 'selected' : ''} ${recommended === reforge.id ? 'recommended' : ''}" data-sb-reforge="${reforge.id}">
        <span class="sb-reforge-art">${img(iconUrl, reforge.label)}<span class="sb-reforge-fallback">${reforge.label.slice(0, 1)}</span></span>
        <span class="sb-reforge-copy"><strong>${reforge.label}</strong><small>${reforge.purpose}</small><span>${reforge.detail}</span></span>
        ${recommended === reforge.id ? '<em>Recommended</em>' : ''}
        <span class="sb-state-dot" aria-hidden="true"></span>
      </button>`;
    }).join('')}</div>
    <p class="sb-research-note">Recommendation basis updated 2026-09-16: Bountiful for direct crop coins; Blessed for Farming XP and most collection targets; Earthy for Sowdust; Overpriced for Overbloom/Rare Crops and Melon collection; Deep Fried for Harvest Feast Seasoning.</p>`;
  firstSection.replaceWith(panel);

  panel.querySelectorAll('[data-sb-reforge]').forEach(button => button.addEventListener('click', () => storeReforge(button.dataset.sbReforge)));
  panel.querySelectorAll('[data-sb-goal]').forEach(button => button.addEventListener('click', () => {
    localStorage.setItem(GOAL_KEY, button.dataset.sbGoal);
    panel.remove();
    reforgePanel();
  }));
}

function toolPortrait() {
  if (pageId() !== 'tools') return;
  const portrait = document.querySelector('[data-tool-editor] .item-portrait');
  if (!portrait || portrait.querySelector('.sb-pack-icon')) return;
  const cropId = activeCropId();
  const url = assetByCandidates(TOOL_ART[cropId] || []);
  if (!url) return;
  portrait.insertAdjacentHTML('afterbegin', img(url, CROPS.find(crop => crop.id === cropId)?.tool || 'Farming tool'));
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
    toolPicker();
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
