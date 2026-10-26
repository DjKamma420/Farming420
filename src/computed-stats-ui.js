import { readStoredAppState, writeStoredAppState } from './app-storage.js';
import { STORAGE_KEY } from './config.js';
import { CROPS } from './data.js';
import { applyComputedStatsToState, computeStatTotals } from './computed-stats.js';

let applying = false;
let scheduled = false;

function load() {
  try { return readStoredAppState({}); } catch { return {}; }
}

function save(raw) {
  return writeStoredAppState(raw);
}

function sameJson(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function incompleteCount(stats) {
  return Object.values(stats?.incomplete || {}).reduce((sum, rows) => sum + rows.length, 0);
}

function shortValue(value) {
  const number = Number(value || 0);
  return Number.isInteger(number) ? String(number) : number.toFixed(1).replace(/\.0$/, '');
}

function removeTopbarStats() {
  document.querySelector('.computed-stats-strip')?.remove();
  document.querySelector('.fortune-pill')?.remove();
}

function replaceGlobalInput(raw) {
  const input = document.querySelector('#globalFortune');
  if (!input) return;
  const stats = computeStatTotals(raw, raw.selectedCrop || 'melon');
  const strip = input.closest('.input-strip');
  if (!strip) return;
  const missing = stats.incomplete.globalFortune.length;
  const sourceCount = Number(stats.sourceCount?.globalFortune || 0);

  strip.className = 'computed-output-panel';
  strip.innerHTML = `
    <div class="computed-output-value"><span class="eyebrow">Calculated total</span><strong>${shortValue(stats.globalFortune)} Farming Fortune</strong></div>
    <p>${sourceCount
      ? `This total is derived from ${sourceCount} configured source${sourceCount === 1 ? '' : 's'} and cannot be entered manually.${missing ? ` ${missing} source${missing === 1 ? '' : 's'} still need${missing === 1 ? 's' : ''} an exact total formula or input, so this value is marked incomplete.` : ''}`
      : 'No global Farming Fortune sources are configured yet. The displayed 0 is an empty result, not a completed calculation.'}</p>`;
}

function replaceCropInput(raw) {
  const input = document.querySelector('#cropFortune');
  if (!input) return;
  const stats = computeStatTotals(raw, raw.selectedCrop || 'melon');
  const label = input.closest('label');
  if (!label) return;
  const missing = stats.incomplete.cropFortune.length;
  const sourceCount = Number(stats.sourceCount?.cropFortune || 0);
  label.className = 'inline-output computed-crop-output';
  label.innerHTML = `<span>${sourceCount ? 'Calculated Crop Fortune' : 'Crop Fortune'}</span><strong>${shortValue(stats.cropFortune)}</strong>${missing
    ? `<small>~ ${missing} unresolved source${missing === 1 ? '' : 's'}</small>`
    : sourceCount
      ? `<small>${sourceCount} configured source${sourceCount === 1 ? '' : 's'}</small>`
      : '<small>No configured crop sources yet</small>'}`;
}

function addAccountAudit(raw) {
  const content = document.querySelector('.content');
  if (!content || content.querySelector('.computed-stat-audit')) return;
  const heading = content.querySelector('.page-head h1')?.textContent || '';
  if (!heading.includes('Global Account Progression')) return;
  const stats = computeStatTotals(raw, raw.selectedCrop || 'melon');
  const unresolved = stats.incomplete.globalFortune;
  const sourceCount = Number(stats.sourceCount?.globalFortune || 0);
  const cow = stats.derived?.mooshroomCow;
  const cowText = cow?.active
    ? ` Active Mooshroom Cow contributes ${shortValue(cow.value)} known FF${cow.incomplete ? ' and is not fully resolved yet.' : '.'}`
    : '';
  const panel = document.createElement('section');
  panel.className = 'computed-stat-audit';
  const coverage = unresolved.length
    ? `${unresolved.length} of ${sourceCount} configured source${sourceCount === 1 ? '' : 's'} cannot yet be converted to an exact total. The displayed total is therefore a known minimum, not a guessed result.`
    : sourceCount
      ? `All ${sourceCount} configured global source${sourceCount === 1 ? '' : 's'} currently have modeled total contributions.`
      : 'No global Farming Fortune sources are configured yet. The displayed 0 is an empty result, not a completed calculation.';
  panel.innerHTML = `<div><span class="eyebrow">Coverage check</span><h2>${shortValue(stats.globalFortune)} Global Farming Fortune</h2><p>${coverage}${cowText}</p></div>`;
  const firstPanel = content.querySelector('.computed-output-panel');
  (firstPanel || content.querySelector('.page-head'))?.insertAdjacentElement('afterend', panel);
}

function syncDerivedCache(raw) {
  const before = {
    globalFortune: raw.profile?.globalFortune,
    cropFortune: raw.profile?.cropFortune,
    computedStats: raw.profile?.computedStats,
    plannerEconomics: Object.fromEntries(CROPS.map(crop => [crop.id, raw.profile?.plannerEconomics?.[crop.id]?.overbloom])),
  };
  applyComputedStatsToState(raw);
  const after = {
    globalFortune: raw.profile?.globalFortune,
    cropFortune: raw.profile?.cropFortune,
    computedStats: raw.profile?.computedStats,
    plannerEconomics: Object.fromEntries(CROPS.map(crop => [crop.id, raw.profile?.plannerEconomics?.[crop.id]?.overbloom])),
  };
  if (sameJson(before, after)) return false;
  return save(raw);
}

function apply() {
  if (applying) return;
  applying = true;
  try {
    const raw = load();
    const changed = syncDerivedCache(raw);
    removeTopbarStats();
    replaceGlobalInput(raw);
    replaceCropInput(raw);
    addAccountAudit(raw);
    if (changed) window.dispatchEvent(new Event('farming420:state-changed'));
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
