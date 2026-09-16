import { CROPS } from './data.js';
import { STORAGE_KEY } from './config.js';
import { toolKeyForCropId } from './migrations.js';
import { FARMING_TOOL_REFORGES, cropReforgeRecommendations, reforgeById } from './farming-reforges.js';
import { TOOL_TIER_CHAIN, applyChainTier, highestChainTier } from './progression-chains.js';
import {
  GEMSTONE_QUALITIES,
  gemstoneUnlockCost,
  normalizeToolGemstoneSlots,
  toolGemstoneFortune,
  withGemstone,
  withGemstoneSlotCost,
  withGemstoneSlotUnlocked,
} from './gemstone-slots.js';

const LEGACY_REFORGE_ENTRY_IDS = Object.freeze({
  bountiful: 'tool-reforge-bountiful-reforge',
  blessed: 'tool-reforge-blessed-reforge',
});

const TOOL_LEVEL_ID = 'tool-tool-base-counter-fortune';
const OVERCLOCKER_ID = 'tool-overclocker-3000';
const DUMMIES_ID = 'tool-farming-for-dummies';
const RECOMB_ID = 'tool-recombobulator-effect-on-tool-stats';
const GEM_ENTRY_ID = 'tool-gem-perfect-peridot-on-farming-tool';
const TOOL_RARITIES = Object.freeze(['COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY', 'MYTHIC']);

// Exact official pack model keys that were verified in the July 2026 item-model
// audit. Other tools keep their text fallback until their exact pack model has
// been checked; no display-name guessing is used.
export const TOOL_PACK_ASSET_SOURCE = 'https://hypixel.net/threads/list-of-item-in-skyblock-major-update.6123513/';
export const TOOL_PACK_ASSETS = Object.freeze({
  mushroom: Object.freeze(['fungi_cutter', 'fungi_cutter_2', 'fungi_cutter_3']),
  'cocoa-beans': Object.freeze(['coco_chopper', 'coco_chopper_2', 'coco_chopper_3']),
  'nether-wart': Object.freeze(['theoretical_hoe_warts_1', 'theoretical_hoe_warts_2', 'theoretical_hoe_warts_3']),
});

function esc(value = '') {
  return String(value).replace(/[&<>'"]/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;'
  }[char]));
}

function readState() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'); } catch { return null; }
}

function writeState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function reloadFromStorage() {
  // app.js owns an in-memory copy of the state. Reloading is deliberately used
  // here instead of letting a second UI layer mutate a stale copy that could
  // later overwrite the new tool state.
  window.location.reload();
}

function cropForState(state) {
  return CROPS.find(crop => crop.id === state?.selectedCrop) || CROPS[0];
}

function toolBucket(state, cropId) {
  state.profile ||= {};
  state.profile.toolProgress ||= {};
  const key = toolKeyForCropId(cropId);
  const bucket = state.profile.toolProgress[key] ||= {};
  bucket.levels ||= {};
  bucket.owned ||= {};
  bucket.costs ||= {};
  bucket.manualGain ||= {};
  bucket.gemSlots = normalizeToolGemstoneSlots(bucket.gemSlots);
  return bucket;
}

function entryLevel(bucket, id) {
  return Math.max(0, Number(bucket?.levels?.[id] || 0));
}

function setEntryLevel(bucket, id, value, max) {
  const level = Math.max(0, Math.min(Number(max), Math.floor(Number(value) || 0)));
  if (level > 0) {
    bucket.levels[id] = level;
    bucket.owned[id] = true;
  } else {
    delete bucket.levels[id];
    delete bucket.owned[id];
  }
}

function selectedReforge(state, cropId) {
  const bucket = toolBucket(state, cropId);
  if (bucket.reforge && reforgeById(bucket.reforge)) return bucket.reforge;
  if (bucket.owned?.[LEGACY_REFORGE_ENTRY_IDS.bountiful]) return 'bountiful';
  if (bucket.owned?.[LEGACY_REFORGE_ENTRY_IDS.blessed]) return 'blessed';
  return null;
}

function setSelectedReforge(state, cropId, reforgeId) {
  const bucket = toolBucket(state, cropId);
  const next = reforgeById(reforgeId)?.id || null;
  bucket.reforge = next;
  for (const id of Object.values(LEGACY_REFORGE_ENTRY_IDS)) {
    delete bucket.levels[id];
    delete bucket.owned[id];
  }
  const legacyId = LEGACY_REFORGE_ENTRY_IDS[next];
  if (legacyId) {
    bucket.levels[legacyId] = 1;
    bucket.owned[legacyId] = true;
  }
}

function uniqueTools() {
  const byName = new Map();
  for (const crop of CROPS) {
    const existing = byName.get(crop.tool);
    if (existing) existing.crops.push(crop);
    else byName.set(crop.tool, { tool: crop.tool, cropId: crop.id, crops: [crop] });
  }
  return [...byName.values()];
}

function goalTag(label, id, activeId) {
  const item = reforgeById(id);
  return `<span class="workspace-goal ${id === activeId ? 'active' : ''}"><b>${esc(label)}</b>${esc(item?.name || id)}</span>`;
}

function recommendationBox(crop, activeId) {
  const rec = cropReforgeRecommendations(crop.id);
  return `<section class="workspace-recommendations">
    <div class="workspace-section-head"><div><h3>Recommended for ${esc(crop.name)}</h3><p>The best reforge depends on the goal, not just the crop name.</p></div></div>
    <div class="workspace-goals">
      ${goalTag('Coins', rec.money, activeId)}
      ${goalTag('Collection', rec.collection, activeId)}
      ${goalTag('Farming XP', rec.xp, activeId)}
      ${goalTag('Rare Crops / Greenhouse', rec.rareCrops, activeId)}
      ${goalTag('Feast Seasoning', rec.feastSeasoning, activeId)}
      ${goalTag('Sowdust', rec.sowdust, activeId)}
    </div>
  </section>`;
}

function reforgeRows(activeId) {
  return FARMING_TOOL_REFORGES.map(reforge => `<label class="workspace-choice ${reforge.id === activeId ? 'selected' : ''}">
    <input type="radio" name="workspace-reforge" value="${esc(reforge.id)}" ${reforge.id === activeId ? 'checked' : ''}>
    <span class="workspace-radio" aria-hidden="true"></span>
    <span class="workspace-choice-copy"><strong>${esc(reforge.name)}</strong><small>${esc(reforge.stone)}</small><em>${esc(reforge.summary)}</em></span>
  </label>`).join('');
}

function toolSelector(state) {
  const crop = cropForState(state);
  const tools = uniqueTools();
  const currentKey = toolKeyForCropId(crop.id);
  return `<label class="workspace-tool-picker"><span>Physical tool</span><select id="workspaceToolSelect">
    ${tools.map(entry => `<option value="${esc(entry.cropId)}" ${toolKeyForCropId(entry.cropId) === currentKey ? 'selected' : ''}>${esc(entry.tool)}${entry.crops.length > 1 ? ` — ${esc(entry.crops.map(c => c.name).join(' / '))}` : ''}</option>`).join('')}
  </select></label>`;
}

function tierControl(bucket) {
  const tier = highestChainTier(bucket, TOOL_TIER_CHAIN);
  return `<div class="workspace-level-row workspace-tier-row">
    <div><strong>Tool tier</strong><small>Sequential upgrade: Mk. III already includes Mk. II.</small></div>
    <select data-tool-tier>
      ${TOOL_TIER_CHAIN.options.map(option => `<option value="${option.value}" ${option.value === tier ? 'selected' : ''}>${esc(option.label)}</option>`).join('')}
    </select>
  </div>`;
}

function stepperRow(label, note, id, value, max) {
  return `<div class="workspace-level-row">
    <div><strong>${esc(label)}</strong><small>${esc(note)}</small></div>
    <div class="workspace-stepper" data-entry="${esc(id)}">
      <button type="button" data-tool-step="-1" data-tool-entry="${esc(id)}" aria-label="Decrease ${esc(label)}">−</button>
      <input type="number" min="0" max="${max}" value="${value}" data-tool-number="${esc(id)}" aria-label="${esc(label)}">
      <button type="button" data-tool-step="1" data-tool-entry="${esc(id)}" aria-label="Increase ${esc(label)}">+</button>
      <span>/ ${max}</span>
    </div>
  </div>`;
}

function rarityControl(bucket) {
  const rarity = String(bucket.toolRarity || '').toUpperCase();
  return `<div class="workspace-level-row">
    <div><strong>Displayed rarity</strong><small>Used for rarity-scaled reforge and Peridot calculations. Select the rarity shown on the item.</small></div>
    <select data-tool-rarity>
      <option value="" ${!rarity ? 'selected' : ''}>Unknown</option>
      ${TOOL_RARITIES.map(value => `<option value="${value}" ${rarity === value ? 'selected' : ''}>${value}</option>`).join('')}
    </select>
  </div>`;
}

function recombControl(bucket) {
  const on = entryLevel(bucket, RECOMB_ID) > 0 || bucket.owned?.[RECOMB_ID] === true;
  return `<label class="workspace-level-row workspace-toggle-row">
    <div><strong>Recombobulator 3000</strong><small>One physical item can be recombobulated once.</small></div>
    <input type="checkbox" data-tool-recomb ${on ? 'checked' : ''}>
  </label>`;
}

function gemOptions(selected) {
  const selectedValue = String(selected || '').toUpperCase();
  return `<option value="" ${!selectedValue ? 'selected' : ''}>Empty</option>${GEMSTONE_QUALITIES.map(quality => {
    const value = `${quality} PERIDOT`;
    return `<option value="${value}" ${selectedValue === value ? 'selected' : ''}>${quality[0]}${quality.slice(1).toLowerCase()} Peridot</option>`;
  }).join('')}`;
}

function gemstoneSection(bucket) {
  const slots = normalizeToolGemstoneSlots(bucket.gemSlots);
  const fortune = toolGemstoneFortune(slots, bucket.toolRarity);
  const unlockCost = gemstoneUnlockCost(slots);
  const summary = fortune == null
    ? 'Select the displayed item rarity to calculate Farming Fortune.'
    : `${fortune.toLocaleString('en-US')} Farming Fortune from equipped Peridot gemstones.`;
  return `<section class="workspace-gemstones">
    <div class="workspace-section-head"><div><h3>Gemstone slots</h3><p>Each slot is independent: unlock the slot, record its unlock cost, then choose the actual gemstone quality.</p></div></div>
    <div class="workspace-gem-summary"><strong>${esc(summary)}</strong><span>${unlockCost.toLocaleString('en-US')} Coins recorded as slot-unlock investment</span></div>
    <div class="workspace-gem-list">
      ${slots.map((slot, index) => `<div class="workspace-gem-slot ${slot.unlocked ? 'unlocked' : 'locked'}">
        <label class="workspace-slot-toggle"><input type="checkbox" data-gem-unlocked="${index}" ${slot.unlocked ? 'checked' : ''}><span>Slot ${index + 1}</span><small>${slot.unlocked ? 'Unlocked' : 'Locked'}</small></label>
        <label><span>Unlock cost</span><input type="number" min="0" step="1" inputmode="numeric" data-gem-cost="${index}" value="${slot.unlockCostCoins ?? ''}" placeholder="Coins" ${slot.unlocked ? '' : 'disabled'}></label>
        <label><span>Gemstone</span><select data-gem-value="${index}" ${slot.unlocked ? '' : 'disabled'}>${gemOptions(slot.gem)}</select></label>
      </div>`).join('')}
    </div>
  </section>`;
}

function toolAssetKey(cropId, tier) {
  const keys = TOOL_PACK_ASSETS[cropId];
  return keys?.[Math.max(1, Math.min(3, Number(tier) || 1)) - 1] || null;
}

function replaceToolPortrait(editor, crop, bucket) {
  const portrait = editor.querySelector('.item-portrait');
  if (!portrait) return;
  const key = toolAssetKey(crop.id, highestChainTier(bucket, TOOL_TIER_CHAIN));
  if (key) portrait.dataset.packAsset = key;
}

function upgradeControls(bucket) {
  return `${tierControl(bucket)}
    ${stepperRow('Farming Tool level', 'Crop-specific tool level. Levels 41–50 require Overclocker progression.', TOOL_LEVEL_ID, entryLevel(bucket, TOOL_LEVEL_ID), 50)}
    ${stepperRow('Overclocker 3000', 'Ten applications cover the level-cap extension from 41 through 50.', OVERCLOCKER_ID, entryLevel(bucket, OVERCLOCKER_ID), 10)}
    ${stepperRow('Farming for Dummies', 'Book applications on this physical tool.', DUMMIES_ID, entryLevel(bucket, DUMMIES_ID), 5)}
    ${rarityControl(bucket)}
    ${recombControl(bucket)}`;
}

function writeToolState(mutator) {
  const state = readState();
  if (!state) return;
  const crop = cropForState(state);
  const bucket = toolBucket(state, crop.id);
  mutator(bucket, state, crop);
  writeState(state);
  reloadFromStorage();
}

function enhanceToolsPage(root) {
  const editor = root.querySelector('[data-tool-editor="1"]');
  if (!editor || editor.dataset.workspaceEnhanced === '1') return;
  const state = readState();
  if (!state) return;
  const crop = cropForState(state);
  const bucket = toolBucket(state, crop.id);
  const activeId = selectedReforge(state, crop.id);
  const activeReforge = reforgeById(activeId);
  editor.dataset.workspaceEnhanced = '1';

  const status = editor.querySelector('.item-rarity');
  if (status) status.textContent = activeReforge ? `Reforge: ${activeReforge.name}` : 'No reforge selected';
  replaceToolPortrait(editor, crop, bucket);

  const content = root.querySelector('.content');
  const pageHead = content?.querySelector('.page-head');
  if (pageHead && !content.querySelector('.workspace-tool-picker')) {
    pageHead.insertAdjacentHTML('afterend', `<div class="workspace-context">${toolSelector(state)}</div>`);
  }

  const sections = [...editor.querySelectorAll('.item-editor-section')];
  const reforgeSection = sections.find(section => section.querySelector('h3')?.textContent.trim() === 'Reforge');
  if (reforgeSection) {
    reforgeSection.innerHTML = `<div class="workspace-section-head"><div><h3>Reforge</h3><p>Exactly one reforge can be active on this physical tool.</p></div></div><div class="workspace-choice-list">${reforgeRows(activeId)}</div>${recommendationBox(crop, activeId)}`;
  }

  const upgradesSection = sections.find(section => section.querySelector('h3')?.textContent.trim() === 'Tool upgrades');
  if (upgradesSection) {
    upgradesSection.innerHTML = `<div class="workspace-section-head"><div><h3>Tool progression</h3><p>Highest tier, levels and item-wide upgrades live in one progression block.</p></div></div><div class="workspace-level-list">${upgradeControls(bucket)}</div>`;
  }

  const finishSection = sections.find(section => section.querySelector('h3')?.textContent.trim() === 'Gemstone and rarity');
  if (finishSection) finishSection.innerHTML = gemstoneSection(bucket);

  const scoredHeading = [...content.querySelectorAll('.section-row')].find(row => row.querySelector('h2')?.textContent.includes('Every scored tool entry'));
  const scoredGrid = scoredHeading?.nextElementSibling;
  if (scoredHeading) scoredHeading.remove();
  if (scoredGrid?.classList.contains('card-grid')) scoredGrid.remove();

  root.querySelector('#workspaceToolSelect')?.addEventListener('change', event => {
    const cropSelect = root.querySelector('#cropSelect');
    if (!cropSelect) return;
    cropSelect.value = event.target.value;
    cropSelect.dispatchEvent(new Event('change', { bubbles: true }));
  });

  root.querySelectorAll('input[name="workspace-reforge"]').forEach(input => input.addEventListener('change', event => {
    const nextState = readState();
    if (!nextState) return;
    setSelectedReforge(nextState, cropForState(nextState).id, event.target.value);
    writeState(nextState);
    reloadFromStorage();
  }));

  root.querySelector('[data-tool-tier]')?.addEventListener('change', event => writeToolState(nextBucket => {
    applyChainTier(nextBucket, TOOL_TIER_CHAIN, event.target.value);
  }));

  root.querySelectorAll('[data-tool-step]').forEach(button => button.addEventListener('click', event => writeToolState(nextBucket => {
    const id = event.currentTarget.dataset.toolEntry;
    const max = id === TOOL_LEVEL_ID ? 50 : id === OVERCLOCKER_ID ? 10 : 5;
    setEntryLevel(nextBucket, id, entryLevel(nextBucket, id) + Number(event.currentTarget.dataset.toolStep || 0), max);
  })));

  root.querySelectorAll('[data-tool-number]').forEach(input => input.addEventListener('change', event => writeToolState(nextBucket => {
    const id = event.currentTarget.dataset.toolNumber;
    const max = id === TOOL_LEVEL_ID ? 50 : id === OVERCLOCKER_ID ? 10 : 5;
    setEntryLevel(nextBucket, id, event.target.value, max);
  })));

  root.querySelector('[data-tool-rarity]')?.addEventListener('change', event => writeToolState(nextBucket => {
    nextBucket.toolRarity = event.target.value || null;
  }));

  root.querySelector('[data-tool-recomb]')?.addEventListener('change', event => writeToolState(nextBucket => {
    setEntryLevel(nextBucket, RECOMB_ID, event.target.checked ? 1 : 0, 1);
  }));

  root.querySelectorAll('[data-gem-unlocked]').forEach(input => input.addEventListener('change', event => writeToolState(nextBucket => {
    nextBucket.gemSlots = withGemstoneSlotUnlocked(nextBucket.gemSlots, Number(event.currentTarget.dataset.gemUnlocked), event.target.checked);
  })));

  root.querySelectorAll('[data-gem-cost]').forEach(input => input.addEventListener('change', event => writeToolState(nextBucket => {
    nextBucket.gemSlots = withGemstoneSlotCost(nextBucket.gemSlots, Number(event.currentTarget.dataset.gemCost), event.target.value);
  })));

  root.querySelectorAll('[data-gem-value]').forEach(select => select.addEventListener('change', event => writeToolState(nextBucket => {
    nextBucket.gemSlots = withGemstone(nextBucket.gemSlots, Number(event.currentTarget.dataset.gemValue), event.target.value || null);
    const fortune = toolGemstoneFortune(nextBucket.gemSlots, nextBucket.toolRarity);
    const filled = normalizeToolGemstoneSlots(nextBucket.gemSlots).filter(slot => slot.unlocked && slot.gem).length;
    if (filled) {
      nextBucket.owned[GEM_ENTRY_ID] = true;
      nextBucket.levels[GEM_ENTRY_ID] = 1;
      if (fortune != null) nextBucket.manualGain[GEM_ENTRY_ID] = fortune;
      else delete nextBucket.manualGain[GEM_ENTRY_ID];
    } else {
      delete nextBucket.owned[GEM_ENTRY_ID];
      delete nextBucket.levels[GEM_ENTRY_ID];
      delete nextBucket.manualGain[GEM_ENTRY_ID];
    }
  })));
}

function simplifyGlobalContext(root) {
  const cropSwitch = root.querySelector('.topbar .crop-switch');
  if (cropSwitch) cropSwitch.classList.add('workspace-hidden-crop-switch');
  const search = root.querySelector('.topbar .search-wrap');
  if (search) search.setAttribute('aria-label', 'Search current workspace');
}

export function applyWorkspaceUI(root = document) {
  simplifyGlobalContext(root);
  enhanceToolsPage(root);
}

if (typeof document !== 'undefined') {
  applyWorkspaceUI(document);
  const app = document.getElementById('app');
  if (app && typeof MutationObserver !== 'undefined') {
    new MutationObserver(() => applyWorkspaceUI(document)).observe(app, { childList: true, subtree: true });
  }
}
