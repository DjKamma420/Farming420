import { STORAGE_KEY } from './config.js';
import { CROPS, UPGRADES } from './data.js';
import { toolKeyForCropId } from './migrations.js';
import { applySnapshotToProgress } from './snapshot-apply.js';
import { computeStatTotals } from './computed-stats.js';
import {
  ACTIVITY_MODE,
  activityLabel,
  activityModeForState,
  isPestVacuumEntry,
  itemAppliesToActivity,
  normalizeActivityMode,
  setActivityModeOnState,
} from './activity-mode.js';

let scheduled = false;
let applying = false;

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
  if (isPestVacuumEntry(item)) return profile.vacuumProgress || {};
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
    const base = mode === ACTIVITY_MODE.PEST ? 600 : 100;
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

function injectHeaderSwitch(raw) {
  const topbar = document.querySelector('.topbar');
  if (!topbar) return;
  const mode = activityModeForState(raw);
  let control = topbar.querySelector('.activity-mode-switch');
  if (!control) {
    control = document.createElement('div');
    control.className = 'activity-mode-switch';
    const anchor = topbar.querySelector('.search-wrap');
    topbar.insertBefore(control, anchor || null);
  }
  if (control.dataset.mode === mode) return;

  control.dataset.mode = mode;
  control.setAttribute('aria-label', 'Active calculation set');
  control.innerHTML = `
    <span>Set</span>
    <button type="button" data-activity-mode="farm" class="${mode === ACTIVITY_MODE.FARM ? 'active' : ''}" aria-pressed="${mode === ACTIVITY_MODE.FARM}">Farm</button>
    <button type="button" data-activity-mode="pest" class="${mode === ACTIVITY_MODE.PEST ? 'active' : ''}" aria-pressed="${mode === ACTIVITY_MODE.PEST}">Pest</button>`;
  control.querySelectorAll('[data-activity-mode]').forEach(button => button.addEventListener('click', () => {
    if (button.dataset.activityMode === mode) return;
    setMode(button.dataset.activityMode);
  }));
}

function renderStatsStrip(raw) {
  const strip = document.querySelector('.computed-stats-strip');
  if (!strip) return;
  const mode = activityModeForState(raw);
  const cropId = selectedCropId(raw);
  const stats = computeStatTotals(raw, cropId, mode);
  const unresolvedFortune = stats.incomplete.globalFortune.length
    + stats.incomplete.cropFortune.length
    + stats.incomplete.pestFortune.length;
  const signature = [
    mode,
    stats.effectiveFortune,
    stats.pestFortune,
    stats.overbloom,
    stats.bonusPestChance,
    unresolvedFortune,
    stats.incomplete.overbloom.length,
    stats.incomplete.bonusPestChance.length,
  ].join(':');
  if (strip.dataset.activityStats === signature) return;
  strip.dataset.activityStats = signature;

  strip.innerHTML = `
    <div class="computed-stat" title="Fortune from the active ${esc(activityLabel(mode))}">
      <span>${mode === ACTIVITY_MODE.PEST ? 'Pest FF' : 'Farm FF'}</span><strong>${Number(stats.effectiveFortune || 0).toLocaleString('en-US')}</strong>${unresolvedFortune ? '<em>~</em>' : ''}
    </div>
    ${mode === ACTIVITY_MODE.PEST ? `<div class="computed-stat" title="Farming Fortune that applies to Pest/Vacuum drops only. It is separate from normal crop Fortune.">
      <span>Pest Drop FF</span><strong>${Number(stats.pestFortune || 0).toLocaleString('en-US')}</strong>${stats.incomplete.pestFortune.length ? '<em>~</em>' : ''}
    </div>` : ''}
    <div class="computed-stat" title="Overbloom for the active set. Pest-only Overbloom is excluded from Farm Set totals.">
      <span>OB</span><strong>${Number(stats.overbloom || 0).toLocaleString('en-US')}</strong>${stats.incomplete.overbloom.length ? '<em>~</em>' : ''}
    </div>
    <div class="computed-stat" title="Bonus Pest Chance produced by the currently selected Farm or Pest loadout.">
      <span>BPC</span><strong>${Number(stats.bonusPestChance || 0).toLocaleString('en-US')}</strong>${stats.incomplete.bonusPestChance.length ? '<em>~</em>' : ''}
    </div>`;
}

function simplifySetupEditor(raw) {
  const content = document.querySelector('.content');
  if (!content) return;
  const title = content.querySelector('.page-head h1')?.textContent || '';
  if (!title.includes('Your gear, item by item')) return;

  const mode = activityModeForState(raw);
  const tabs = content.querySelector('.setup-tabs');
  if (tabs && tabs.dataset.modeSurface !== mode) {
    tabs.dataset.modeSurface = mode;
    tabs.innerHTML = `<div class="mode-editor-banner"><strong>${esc(activityLabel(mode))}</strong> is being edited. Armor, equipment and pet selections are stored separately for Farm and Pest. Change the active set with the switch in the header.</div>`;
  }

  const nameInput = content.querySelector('#setupName');
  nameInput?.closest('label')?.remove();
  content.querySelector('[data-setup-remove]')?.remove();
  content.querySelector('[data-setup-add]')?.remove();
}

function renderDashboardCandidate(raw) {
  const hero = document.querySelector('.hero-card.primary');
  if (!hero) return;
  const mode = activityModeForState(raw);
  const cropId = selectedCropId(raw);
  const candidate = plannerCandidates(raw)[0];
  const signature = `${mode}:${cropId}:${candidate?.item?.id || 'none'}:${candidate?.gain || 0}:${candidate?.rel || 0}`;
  if (hero.dataset.activityCandidate === signature) return;
  hero.dataset.activityCandidate = signature;

  hero.innerHTML = candidate ? `
    <div class="eyebrow">Next upgrade · ${esc(activityLabel(mode))}</div>
    <h2>${esc(candidate.item.name)}</h2>
    <p>+${candidate.gain.toLocaleString('en-US')} marginal stat · about ${candidate.rel.toFixed(2)}% relative gain in the current ${esc(cropName(cropId))} ${esc(activityLabel(mode))}.</p>
    <button class="primary-btn" data-mode-open="${esc(candidate.item.id)}">Open details</button>
    <div class="planner-mode-note">Farm uses the crop farming tool. Pest uses the Vacuum instead. Armor, equipment and pet come from the selected set.</div>` : `
    <div class="eyebrow">Next upgrade · ${esc(activityLabel(mode))}</div>
    <h2>No calculated upgrade</h2>
    <p>No active upgrade with a calculated marginal gain is available for this crop and set.</p>`;

  hero.querySelector('[data-mode-open]')?.addEventListener('click', event => openDrawer(event.currentTarget.dataset.modeOpen));
}

function renderPlanner(raw) {
  const list = document.querySelector('.planner-list');
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
      <div><span>Effective FF</span><strong>${Number(stats.effectiveFortune || 0).toLocaleString('en-US')}</strong></div>
      <div><span>Overbloom</span><strong>${Number(stats.overbloom || 0).toLocaleString('en-US')}</strong></div>`;
  }

  list.innerHTML = candidates.length ? candidates.map((candidate, index) => `
    <button class="planner-row" data-mode-open="${esc(candidate.item.id)}">
      <div class="rank">${index + 1}</div>
      <div class="planner-main"><strong>${esc(candidate.item.name)}</strong><span>${esc(candidate.item.category)} · ${esc(candidate.item.metric)}</span></div>
      <div class="planner-number"><strong>+${candidate.gain.toLocaleString('en-US')}</strong><span>marginal</span></div>
      <div class="planner-number"><strong>${candidate.rel.toFixed(2)}%</strong><span>relative</span></div>
      <div class="planner-number"><strong>${candidate.cost ? `${Math.round(candidate.cost).toLocaleString('en-US')} Coins` : '—'}</strong><span>${candidate.efficiency !== null ? `${candidate.efficiency.toFixed(3)} / 1M` : 'Cost missing'}</span></div>
    </button>`).join('') : '<div class="empty">No calculated upgrades for the current crop and set.</div>';

  list.querySelectorAll('[data-mode-open]').forEach(button => button.addEventListener('click', () => openDrawer(button.dataset.modeOpen)));
}

function apply() {
  if (applying) return;
  applying = true;
  try {
    const raw = load();
    injectHeaderSwitch(raw);
    renderStatsStrip(raw);
    simplifySetupEditor(raw);
    renderDashboardCandidate(raw);
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
