import { STORAGE_KEY } from './config.js';
import { CROPS, UPGRADES } from './data.js';
import { toolKeyForCropId } from './migrations.js';
import { applySnapshotToProgress } from './snapshot-apply.js';
import { computeStatTotals } from './computed-stats.js';
import {
  ACTIVITY_MODE,
  activityLabel,
  activityModeForState,
  isVacuumItemEntry,
  itemAppliesToActivity,
  normalizeActivityMode,
  setActivityModeOnState,
} from './activity-mode.js';
import { formatNumber } from './format-number.js';
import {
  BPC_SETUP_ID,
  FF_SETUP_ID,
  THIRD_SETUP_ID,
  prepareFfBpcSetups,
  setPhysicalSetupCount,
  setThirdSetupName,
  thirdSetupName,
  visiblePhysicalSetupIds,
} from './setups.js';

let scheduled = false;
let applying = false;

const MODE_SWITCH_PAGES = new Set(['dashboard', 'focus', 'planner']);
const PHYSICAL_SET_SWITCH_PAGE = 'setups';

function load() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch { return {}; }
}

function save(raw) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(raw));
}

function esc(value = '') {
  return String(value).replace(/[&<>'"]/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;',
  }[character]));
}

function selectedCropId(raw) {
  return CROPS.some(crop => crop.id === raw.selectedCrop) ? raw.selectedCrop : 'melon';
}

function cropName(cropId) {
  return CROPS.find(crop => crop.id === cropId)?.name || cropId;
}

function progressBucket(raw, item, cropId) {
  const profile = raw.profile || {};
  if (isVacuumItemEntry(item)) return profile.vacuumProgress || {};
  if (item.section === 'crops') return profile.cropProgress?.[cropId] || {};
  if (item.section === 'tools') return profile.toolProgress?.[toolKeyForCropId(cropId)] || {};
  return profile;
}

function currentLevel(raw, item, cropId) {
  const store = progressBucket(raw, item, cropId);
  const max = Math.max(1, Number(item.max || 1));
  const level = Number(store.levels?.[item.id] || 0);
  if (Number.isFinite(level) && level > 0) return Math.min(max, level);
  return store.owned?.[item.id] ? 1 : 0;
}

function isMaxed(raw, item, cropId) {
  return currentLevel(raw, item, cropId) >= Math.max(1, Number(item.max || 1));
}

function gainFor(raw, item, cropId) {
  const store = progressBucket(raw, item, cropId);
  const manual = store.manualGain?.[item.id];
  if (manual !== undefined && manual !== '' && Number.isFinite(Number(manual))) return Number(manual);
  if (item.name === 'Switch to best farming pet') return Number(item.rawMarginal || 0);
  return Number(item.stepGain || item.rawMarginal || 0);
}

function appliesToCrop(item, cropId) {
  return item.cropScope === 'Any' || item.cropScope === cropName(cropId);
}

function relativeGain(item, gain, stats, mode) {
  if (!gain) return 0;
  if (item.metric === 'Crop Yield') {
    const base = mode === ACTIVITY_MODE.PEST_KILL ? 600 : 100;
    const denominator = base + Number(stats.effectiveFortune || 0);
    return denominator > 0 ? (gain / denominator) * 100 : 0;
  }
  if (item.metric === 'Rare Crops') {
    const denominator = 100 + Number(stats.overbloom || 0);
    return denominator > 0 ? (gain / denominator) * 100 : 0;
  }
  return gain;
}

function plannerCandidates(raw) {
  const cropId = selectedCropId(raw);
  const mode = activityModeForState(raw);
  const stats = computeStatTotals(raw, cropId, mode);

  return UPGRADES
    .filter(item => item.status === 'ACTIVE')
    .filter(item => itemAppliesToActivity(item, mode))
    .filter(item => appliesToCrop(item, cropId))
    .filter(item => !isMaxed(raw, item, cropId))
    .map(item => {
      const gain = gainFor(raw, item, cropId);
      const cost = Number(progressBucket(raw, item, cropId).costs?.[item.id] || 0);
      const rel = relativeGain(item, gain, stats, mode);
      const efficiency = cost > 0 ? rel / (cost / 1_000_000) : null;
      return { item, gain, rel, cost, efficiency };
    })
    .filter(candidate => candidate.gain > 0)
    .sort((a, b) => {
      const aEfficiency = a.efficiency ?? -1;
      const bEfficiency = b.efficiency ?? -1;
      if (aEfficiency !== bEfficiency) return bEfficiency - aEfficiency;
      return b.rel - a.rel;
    });
}

function openDrawer(itemId) {
  const raw = load();
  raw.drawer = itemId;
  save(raw);
  window.dispatchEvent(new Event('farming420:state-changed'));
}

function setMode(mode) {
  const raw = load();
  const normalized = setActivityModeOnState(raw, normalizeActivityMode(mode));
  raw.profile ||= {};
  raw.profile.lastApply = applySnapshotToProgress(raw, raw.profile.normalizedSnapshot || {});
  save(raw);
  window.dispatchEvent(new CustomEvent('farming420:activity-mode-changed', { detail: { mode: normalized } }));
  window.dispatchEvent(new Event('farming420:state-changed'));
}

function preparedPhysicalSetups(raw) {
  raw.profile ||= {};
  raw.profile.setups = prepareFfBpcSetups(raw.profile.setups);
  return raw.profile.setups;
}

function physicalSetLabel(setupId, setups) {
  if (setupId === FF_SETUP_ID) return 'FF Set';
  if (setupId === BPC_SETUP_ID) return 'BPC Set';
  if (setupId === THIRD_SETUP_ID) return thirdSetupName(setups);
  return 'Set';
}

function physicalSetTitle(setupId, setups) {
  if (setupId === FF_SETUP_ID) return 'FF (Farming Fortune) Set';
  if (setupId === BPC_SETUP_ID) return 'BPC (Bonus Pest Chance) Set';
  return physicalSetLabel(setupId, setups);
}

function persistPhysicalSetChange(mutator) {
  const raw = load();
  const setups = preparedPhysicalSetups(raw);
  mutator(setups);
  save(raw);
  window.dispatchEvent(new Event('farming420:state-changed'));
}

function closeAddSetDialog(dialog) {
  if (!dialog) return;
  if (dialog.open) dialog.close();
  dialog.remove();
}

function openAddSetDialog() {
  document.querySelector('[data-add-set-dialog]')?.remove();
  const dialog = document.createElement('dialog');
  dialog.className = 'physical-set-dialog';
  dialog.dataset.addSetDialog = '1';
  dialog.setAttribute('aria-labelledby', 'add-set-dialog-title');
  dialog.innerHTML = `
    <form method="dialog" class="physical-set-dialog-card" data-add-set-form>
      <div class="eyebrow">Custom loadout</div>
      <h2 id="add-set-dialog-title">Add Set</h2>
      <p>Choose the name for your third physical set.</p>
      <label>
        <span>Set name</span>
        <input type="text" maxlength="48" required autocomplete="off"
          data-new-set-name placeholder="e.g. Mushroom Set">
      </label>
      <div class="physical-set-dialog-actions">
        <button type="submit" value="cancel" class="ghost">Cancel</button>
        <button type="submit" value="add" class="primary">Add Set</button>
      </div>
    </form>`;

  document.body.append(dialog);
  const form = dialog.querySelector('[data-add-set-form]');
  const input = dialog.querySelector('[data-new-set-name]');

  form?.addEventListener('submit', event => {
    if (event.submitter?.value === 'cancel') return;
    event.preventDefault();
    const name = String(input?.value || '').trim();
    if (!name) {
      input?.setCustomValidity('Enter a set name.');
      input?.reportValidity();
      return;
    }
    input?.setCustomValidity('');
    persistPhysicalSetChange(next => {
      setPhysicalSetupCount(next, 3);
      setThirdSetupName(next, name);
      next.activeId = THIRD_SETUP_ID;
    });
    closeAddSetDialog(dialog);
  });

  input?.addEventListener('input', () => input.setCustomValidity(''));
  dialog.addEventListener('close', () => dialog.remove(), { once: true });
  dialog.addEventListener('click', event => {
    if (event.target === dialog) closeAddSetDialog(dialog);
  });
  dialog.showModal();
  input?.focus({ preventScroll: true });
}

function injectPhysicalSetHeader(raw, topbar, main, control) {
  const setups = preparedPhysicalSetups(raw);
  const visibleIds = visiblePhysicalSetupIds(setups);
  const activeId = visibleIds.includes(setups.activeId) ? setups.activeId : FF_SETUP_ID;
  const hasThirdSet = visibleIds.includes(THIRD_SETUP_ID);
  const name = hasThirdSet ? thirdSetupName(setups) : '';
  const signature = [hasThirdSet ? 3 : 2, activeId, name].join(':');

  topbar.classList.remove('activity-mode-topbar-shared');
  main?.classList.remove('activity-mode-page-shared');

  if (!control) {
    control = document.createElement('div');
    const anchor = topbar.querySelector('.search-wrap');
    topbar.insertBefore(control, anchor || null);
  }
  control.className = 'activity-mode-switch physical-set-switch';
  control.setAttribute('aria-label', 'Physical farming sets');
  if (control.dataset.physicalSignature === signature) return;

  delete control.dataset.mode;
  control.dataset.physicalSignature = signature;
  control.innerHTML = `
    <span>Sets</span>
    <div class="physical-set-tabs">
      ${visibleIds.map(setupId => `<button type="button" data-physical-setup="${esc(setupId)}"
        class="${setupId === activeId ? 'active' : ''}" aria-pressed="${setupId === activeId}"
        title="${esc(physicalSetTitle(setupId, setups))}">${esc(physicalSetLabel(setupId, setups))}</button>`).join('')}
    </div>
    ${hasThirdSet
      ? '<button type="button" class="remove-set-button" data-remove-physical-set title="Hide the custom set">Remove Set</button>'
      : '<button type="button" class="add-set-button" data-add-physical-set>+ Add Set</button>'}`;

  control.querySelectorAll('[data-physical-setup]').forEach(button => button.addEventListener('click', () => {
    if (button.dataset.physicalSetup === activeId) return;
    persistPhysicalSetChange(next => {
      const allowed = visiblePhysicalSetupIds(next);
      if (allowed.includes(button.dataset.physicalSetup)) next.activeId = button.dataset.physicalSetup;
    });
  }));

  control.querySelector('[data-add-physical-set]')?.addEventListener('click', openAddSetDialog);
  control.querySelector('[data-remove-physical-set]')?.addEventListener('click', () => {
    persistPhysicalSetChange(next => setPhysicalSetupCount(next, 2));
  });
}

function injectHeaderSwitch(raw) {
  const topbar = document.querySelector('.topbar');
  if (!topbar) return;
  const main = topbar.closest('.main');
  const page = String(raw?.page || '');
  let control = topbar.querySelector('.activity-mode-switch');

  if (page === PHYSICAL_SET_SWITCH_PAGE) {
    injectPhysicalSetHeader(raw, topbar, main, control);
    return;
  }

  // The logical phase selector belongs only where Farming/Spawning/Killing
  // changes calculations. Loadouts instead shows physical set tabs plus the
  // Add Set naming flow above.
  if (!MODE_SWITCH_PAGES.has(page)) {
    control?.remove();
    topbar.classList.add('activity-mode-topbar-shared');
    main?.classList.add('activity-mode-page-shared');
    return;
  }

  topbar.classList.remove('activity-mode-topbar-shared');
  main?.classList.remove('activity-mode-page-shared');

  const mode = activityModeForState(raw);
  if (control?.classList.contains('physical-set-switch')) {
    control.remove();
    control = null;
  }
  if (!control) {
    control = document.createElement('div');
    control.className = 'activity-mode-switch';
    const anchor = topbar.querySelector('.search-wrap');
    topbar.insertBefore(control, anchor || null);
  }
  if (control.dataset.mode === mode) return;

  control.className = 'activity-mode-switch';
  delete control.dataset.physicalSignature;
  control.dataset.mode = mode;
  control.setAttribute('aria-label', 'Active farming phase');
  control.innerHTML = `
    <span>Phase</span>
    <button type="button" data-activity-mode="farm" class="${mode === ACTIVITY_MODE.FARM ? 'active' : ''}" aria-pressed="${mode === ACTIVITY_MODE.FARM}">FF Set · Farming</button>
    <button type="button" data-activity-mode="pest-spawn" class="${mode === ACTIVITY_MODE.PEST_SPAWN ? 'active' : ''}" aria-pressed="${mode === ACTIVITY_MODE.PEST_SPAWN}">BPC Set · Spawning</button>
    <button type="button" data-activity-mode="pest-kill" class="${mode === ACTIVITY_MODE.PEST_KILL ? 'active' : ''}" aria-pressed="${mode === ACTIVITY_MODE.PEST_KILL}">FF Set · Killing</button>`;
  control.querySelectorAll('[data-activity-mode]').forEach(button => button.addEventListener('click', () => {
    if (button.dataset.activityMode === mode) return;
    setMode(button.dataset.activityMode);
  }));
}

/**
 * The core planner list from `app.js` -- never one an enhancement built.
 *
 * `revenue-planner.js` inserts its own `.planner-list.revenue-list` *before*
 * the core list, so a bare `.planner-list` lookup matched the revenue ranking
 * and this module overwrote it wholesale. Both lists are planner rankings, and
 * the later module simply won; the visible cost/payback column was replaced by
 * these rows without anything reporting a conflict.
 */
function corePlannerList() {
  return document.querySelector('.planner-list:not(.revenue-list):not(.planner-mode-list)');
}

function renderPlanner(raw) {
  const list = corePlannerList();
  if (!list) return;
  const mode = activityModeForState(raw);
  const cropId = selectedCropId(raw);
  const stats = computeStatTotals(raw, cropId, mode);
  const candidates = plannerCandidates(raw).slice(0, 20);
  const signature = `${mode}:${cropId}:${candidates.map(candidate => `${candidate.item.id}:${candidate.gain}:${candidate.cost}`).join('|')}`;
  if (list.dataset.activityPlanner === signature) return;
  list.dataset.activityPlanner = signature;

  const context = document.querySelector('.planner-context');
  if (context) {
    context.innerHTML = `
      <div><span>Crop</span><strong>${esc(cropName(cropId))}</strong></div>
      <div><span>Set</span><strong>${esc(activityLabel(mode))}</strong></div>
      <div><span>Effective FF</span><strong>${formatNumber(Number(stats.effectiveFortune || 0))}</strong></div>
      <div><span>Overbloom</span><strong>${formatNumber(Number(stats.overbloom || 0))}</strong></div>`;
  }

  list.innerHTML = candidates.length ? candidates.map((candidate, index) => `
    <button class="planner-row" data-mode-open="${esc(candidate.item.id)}">
      <div class="rank">${index + 1}</div>
      <div class="planner-main"><strong>${esc(candidate.item.name)}</strong><span>${esc(candidate.item.category)} · ${esc(candidate.item.metric)}</span></div>
      <div class="planner-number"><strong>+${formatNumber(candidate.gain)}</strong><span>marginal</span></div>
      <div class="planner-number"><strong>${candidate.rel.toFixed(2)}%</strong><span>relative</span></div>
      <div class="planner-number"><strong>${candidate.cost ? `${formatNumber(Math.round(candidate.cost))} Coins` : '—'}</strong><span>${candidate.efficiency !== null ? `${candidate.efficiency.toFixed(3)} / 1M` : 'Cost missing'}</span></div>
    </button>`).join('') : '<div class="empty">No calculated upgrades for the current crop and set.</div>';

  list.querySelectorAll('[data-mode-open]').forEach(button => button.addEventListener('click', () => openDrawer(button.dataset.modeOpen)));
}

function apply() {
  if (applying) return;
  applying = true;
  try {
    const raw = load();
    injectHeaderSwitch(raw);
    renderPlanner(raw);
  } finally {
    applying = false;
  }
}

function schedule() {
  if (scheduled) return;
  scheduled = true;
  queueMicrotask(() => {
    scheduled = false;
    apply();
  });
}

function boot() {
  apply();
  const app = document.getElementById('app');
  if (!app || typeof MutationObserver === 'undefined') return;
  new MutationObserver(schedule).observe(app, { childList: true, subtree: true });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
else boot();
