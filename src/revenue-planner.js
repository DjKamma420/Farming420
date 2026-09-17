import { CROPS, UPGRADES } from './data.js';
import { STORAGE_KEY } from './config.js';
import { toolKeyForCropId } from './migrations.js';
import { evaluateUpgrade, rankEvaluatedUpgrades } from './revenue-ranking.js';
import { costOriginNote, resolveUpgradeCost } from './upgrade-cost-resolution.js';
import { INTERNET_FARMING_TIME_VALUE_COINS_PER_HOUR } from './upgrade-economics.js';

function esc(value = '') {
  return String(value).replace(/[&<>'"]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#039;', '"':'&quot;' }[c]));
}

function load() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch { return {}; }
}

function save(raw) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(raw));
}

function selectedCropId(raw) {
  return document.querySelector('#cropSelect')?.value || raw.selectedCrop || 'melon';
}

function cropFor(raw) {
  const id = selectedCropId(raw);
  return CROPS.find(crop => crop.id === id) || CROPS[0];
}

function ensureProfile(raw) {
  raw.profile ||= {};
  raw.profile.levels ||= {};
  raw.profile.owned ||= {};
  raw.profile.costs ||= {};
  raw.profile.grindHours ||= {};
  raw.profile.manualGain ||= {};
  raw.profile.cropFortune ||= {};
  raw.profile.cropProgress ||= {};
  raw.profile.toolProgress ||= {};
  raw.profile.plannerEconomics ||= {};
  return raw.profile;
}

function ensureBucketShape(bucket) {
  bucket.levels ||= {};
  bucket.owned ||= {};
  bucket.costs ||= {};
  bucket.grindHours ||= {};
  bucket.manualGain ||= {};
  return bucket;
}

function progressBucket(raw, item) {
  const profile = ensureProfile(raw);
  const cropId = selectedCropId(raw);
  if (item.section === 'crops') {
    profile.cropProgress[cropId] ||= {};
    return ensureBucketShape(profile.cropProgress[cropId]);
  }
  if (item.section === 'tools') {
    const key = toolKeyForCropId(cropId);
    profile.toolProgress[key] ||= {};
    return ensureBucketShape(profile.toolProgress[key]);
  }
  return ensureBucketShape(profile);
}

function level(raw, item) {
  const max = Math.max(1, Number(item.max || 1));
  return Math.max(0, Math.min(max, Number(progressBucket(raw, item).levels?.[item.id] || 0)));
}

function maxed(raw, item) {
  return level(raw, item) >= Math.max(1, Number(item.max || 1));
}

function appliesToCrop(raw, item) {
  const current = cropFor(raw);
  return item.cropScope === 'Any' || item.cropScope === current?.name;
}

function gain(raw, item) {
  const manual = progressBucket(raw, item).manualGain?.[item.id];
  if (manual !== undefined && manual !== '' && Number.isFinite(Number(manual))) return Number(manual);
  return Number(item.stepGain || item.rawMarginal || 0);
}

function economics(raw) {
  const profile = ensureProfile(raw);
  const cropId = selectedCropId(raw);
  profile.plannerEconomics[cropId] ||= {
    normalCropCoinsPerHour: 0,
    rareCropCoinsPerHour: 0,
    overbloom: 0,
  };
  return profile.plannerEconomics[cropId];
}

function timeValueFor(raw) {
  const econ = economics(raw);
  const measured = Math.max(0, Number(econ.normalCropCoinsPerHour || 0))
    + Math.max(0, Number(econ.rareCropCoinsPerHour || 0));
  if (measured > 0) return { coinsPerHour: measured, source: 'player_baseline' };
  return {
    coinsPerHour: INTERNET_FARMING_TIME_VALUE_COINS_PER_HOUR,
    source: 'internet_benchmark',
  };
}

function earnedRouteRows(raw) {
  return UPGRADES
    .filter(item => item.status === 'ACTIVE')
    .filter(item => appliesToCrop(raw, item))
    .filter(item => !maxed(raw, item))
    .map(item => {
      const store = progressBucket(raw, item);
      const costSource = resolveUpgradeCost(store, item.id);
      return { item, store, costSource, itemGain: gain(raw, item) };
    })
    .filter(row => row.costSource.acquisitionMode === 'EARNED' && row.itemGain > 0);
}

function evaluatedRows(raw) {
  const profile = ensureProfile(raw);
  const econ = economics(raw);
  const timeValue = timeValueFor(raw);
  const currentFortune = Number(profile.globalFortune || 0) + Number(profile.cropFortune?.[selectedCropId(raw)] || 0);
  return rankEvaluatedUpgrades(UPGRADES
    .filter(item => item.status === 'ACTIVE')
    .filter(item => appliesToCrop(raw, item))
    .filter(item => !maxed(raw, item))
    .map(item => {
      const itemGain = gain(raw, item);
      const store = progressBucket(raw, item);
      const costSource = resolveUpgradeCost(store, item.id);
      const storedHours = store.grindHours?.[item.id];
      const activeGrindHours = storedHours === undefined || storedHours === '' ? null : Number(storedHours);
      return {
        item,
        ...evaluateUpgrade({
          item,
          gain: itemGain,
          costCoins: costSource.coins,
          acquisitionMode: costSource.acquisitionMode,
          directCoinCost: costSource.directCoinCost,
          activeGrindHours,
          timeValueCoinsPerHour: timeValue.coinsPerHour,
          timeValueSource: timeValue.source,
          currentFortune,
          currentOverbloom: Number(econ.overbloom || 0),
          normalCropCoinsPerHour: Number(econ.normalCropCoinsPerHour || 0),
          rareCropCoinsPerHour: Number(econ.rareCropCoinsPerHour || 0),
        }),
        costSource,
      };
    })
    .filter(row => row.modeled && row.gain > 0));
}

function compactCoins(value) {
  if (!Number.isFinite(value)) return '—';
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(2)}b`;
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}m`;
  if (abs >= 1_000) return `${(value / 1_000).toFixed(1)}k`;
  return Math.round(value).toLocaleString('en-US');
}

function formatPayback(hours) {
  if (!Number.isFinite(hours)) return '—';
  if (hours < 1) return `${Math.round(hours * 60)} min`;
  if (hours < 100) return `${hours.toFixed(1)} h`;
  return `${Math.round(hours).toLocaleString('en-US')} h`;
}

function formatHours(hours) {
  if (!Number.isFinite(hours)) return '—';
  if (hours < 10) return `${hours.toFixed(1)} h`;
  return `${Math.round(hours).toLocaleString('en-US')} h`;
}

function openItem(itemId) {
  const raw = load();
  raw.drawer = itemId;
  save(raw);
  window.dispatchEvent(new Event('farming420:state-changed'));
}

function economicsPanel(raw) {
  const crop = cropFor(raw);
  const econ = economics(raw);
  return `<details class="revenue-panel revenue-economics">
    <summary class="revenue-summary">
      <div class="revenue-panel-head">
        <div><div class="eyebrow">${esc(crop?.name || 'Crop')} economics</div><h2>Profit baseline</h2></div>
        <span class="revenue-note">Optional. Sharpens profit, payback and earned-time value.</span>
      </div>
    </summary>
    <div class="revenue-inputs">
      <label><span>Normal crop Coins/h</span><input data-revenue-input="normalCropCoinsPerHour" type="number" min="0" step="1000" value="${Number(econ.normalCropCoinsPerHour || 0)}"></label>
      <label><span>RARE CROP Coins/h</span><input data-revenue-input="rareCropCoinsPerHour" type="number" min="0" step="1000" value="${Number(econ.rareCropCoinsPerHour || 0)}"></label>
      <label><span>Current Overbloom</span><input data-revenue-input="overbloom" type="number" min="0" step="0.1" value="${Number(econ.overbloom || 0)}"></label>
    </div>
    <p class="revenue-help">Overbloom is valued from the actual RARE-CROP stream. When Coins/h is entered, the total measured baseline also becomes the opportunity cost of active EARNED grind time.</p>
  </details>`;
}

function earnedAssumptionsPanel(raw) {
  const rows = earnedRouteRows(raw);
  if (!rows.length) return '';
  const timeValue = timeValueFor(raw);
  const sourceLabel = timeValue.source === 'player_baseline' ? 'your measured farming baseline' : 'Internet fallback';
  return `<details class="revenue-panel revenue-economics earned-routes">
    <summary class="revenue-summary">
      <div class="revenue-panel-head">
        <div><div class="eyebrow">Acquisition routes</div><h2>Earned upgrade time</h2></div>
        <span class="revenue-note">${compactCoins(timeValue.coinsPerHour)} Coins/h · ${esc(sourceLabel)}</span>
      </div>
    </summary>
    <div class="earned-route-list">
      ${rows.map(({ item, store }) => {
        const stored = store.grindHours?.[item.id];
        const value = stored === undefined || stored === '' ? '' : Math.max(0, Number(stored) || 0);
        return `<label class="earned-route-row">
          <span><strong>${esc(item.name)}</strong><small>${esc(item.category)} · active grind time</small></span>
          <input data-earned-hours="${esc(item.id)}" type="number" min="0" step="0.1" placeholder="hours" value="${value}">
        </label>`;
      }).join('')}
    </div>
    <p class="revenue-help">Only active grind time belongs here. Empty stays unknown. Farming420 converts entered time to opportunity cost and labels it EARNED — time converted to coins.</p>
  </details>`;
}

function rankingMarkup(rows, ready) {
  if (!rows.length) return '<div class="empty">No modeled Fortune/Overbloom upgrades for the current state.</div>';
  return rows.slice(0, 30).map((row, index) => {
    const costKnown = row.costKnown === true;
    const marginalKnown = Number.isFinite(row.marginalCoinsHour);
    const valueLabel = row.modeled === 'overbloom'
      ? `+${row.gain.toLocaleString('en-US')} Overbloom`
      : `+${row.gain.toLocaleString('en-US')} FF`;
    const equivalent = row.modeled === 'overbloom' && row.fortuneEquivalent > 0
      ? `≈ ${row.fortuneEquivalent.toFixed(2)} FF eq.`
      : row.modeled === 'fortune' ? `${row.fortuneEquivalent.toFixed(2)} FF eq.` : '—';
    const costLabel = costKnown
      ? `${compactCoins(row.cost)} ${row.acquisitionMode === 'EARNED' ? 'Coins eq.' : 'Coins'}`
      : '—';
    const costNote = row.acquisitionMode === 'EARNED' && costKnown
      ? `EARNED — time converted to coins · ${formatHours(row.activeGrindHours)} @ ${compactCoins(row.timeValueCoinsPerHour)}/h${row.directCoinCost > 0 ? ` + ${compactCoins(row.directCoinCost)} direct` : ''}`
      : costKnown && row.coinsPerEffectiveFortune
        ? `${compactCoins(row.coinsPerEffectiveFortune)} / FF eq. · ${costOriginNote(row.costSource)}`
        : costOriginNote(row.costSource);
    return `<button class="planner-row revenue-row" data-revenue-open="${esc(row.item.id)}">
      <div class="rank">${index + 1}</div>
      <div class="planner-main"><strong>${esc(row.item.name)}</strong><span>${esc(row.item.category)} · ${esc(row.modeled === 'overbloom' ? 'Overbloom' : 'Farming Fortune')}</span></div>
      <div class="planner-number"><strong>${valueLabel}</strong><span>${equivalent}</span></div>
      <div class="planner-number"><strong>${marginalKnown ? `+${compactCoins(row.marginalCoinsHour)}/h` : '—'}</strong><span>${ready ? 'marginal profit' : 'enter baseline'}</span></div>
      <div class="planner-number"><strong>${costLabel}</strong><span>${esc(costNote)}</span></div>
      <div class="planner-number"><strong>${costKnown && row.payback !== null ? formatPayback(row.payback) : '—'}</strong><span>payback</span></div>
    </button>`;
  }).join('');
}

function enhancePlanner() {
  const content = document.querySelector('.content');
  const original = content?.querySelector('.planner-list');
  if (!content || !original || content.dataset.revenuePlannerReady === '1') return;
  content.dataset.revenuePlannerReady = '1';

  const raw = load();
  const econ = economics(raw);
  const ready = Number(econ.normalCropCoinsPerHour || 0) > 0 || Number(econ.rareCropCoinsPerHour || 0) > 0;
  const rows = evaluatedRows(raw);

  original.classList.add('planner-v1-source');
  const panel = document.createElement('div');
  panel.className = 'revenue-planner-v2';
  panel.innerHTML = `${economicsPanel(raw)}
    ${earnedAssumptionsPanel(raw)}
    <div class="section-row revenue-ranking-head"><div><h2>${ready ? 'Best value now' : 'Best value per Coin'}</h2><p>${ready ? 'Resolved BUYABLE and EARNED costs are ordered by shortest payback; unresolved acquisition costs follow.' : 'BUYABLE costs use recorded/researched Coins. EARNED time is converted at your baseline or the 20m/h fallback; empty grind time remains unknown.'}</p></div></div>
    <div class="planner-list revenue-list">${rankingMarkup(rows, ready)}</div>`;
  original.before(panel);

  panel.querySelectorAll('[data-revenue-input]').forEach(input => input.addEventListener('change', event => {
    const next = load();
    const bucket = economics(next);
    bucket[event.target.dataset.revenueInput] = Math.max(0, Number(event.target.value || 0));
    save(next);
    window.dispatchEvent(new Event('farming420:state-changed'));
  }));

  panel.querySelectorAll('[data-earned-hours]').forEach(input => input.addEventListener('change', event => {
    const next = load();
    const item = UPGRADES.find(entry => entry.id === event.target.dataset.earnedHours);
    if (!item) return;
    const store = progressBucket(next, item);
    const rawValue = String(event.target.value || '').trim();
    if (!rawValue) delete store.grindHours[item.id];
    else store.grindHours[item.id] = Math.max(0, Number(rawValue) || 0);
    save(next);
    window.dispatchEvent(new Event('farming420:state-changed'));
  }));

  panel.querySelectorAll('[data-revenue-open]').forEach(button => button.addEventListener('click', () => openItem(button.dataset.revenueOpen)));
}

function enhanceDashboard() {
  const hero = document.querySelector('.hero-card.primary');
  if (!hero || hero.dataset.revenueHeroReady === '1') return;
  const raw = load();
  const econ = economics(raw);
  const ready = Number(econ.normalCropCoinsPerHour || 0) > 0 || Number(econ.rareCropCoinsPerHour || 0) > 0;
  if (!ready) return;
  const best = evaluatedRows(raw)[0];
  if (!best || best.payback === null) return;
  hero.dataset.revenueHeroReady = '1';
  hero.innerHTML = `<div class="eyebrow">Next upgrade by payback</div>
    <h2>${esc(best.item.name)}</h2>
    <p>+${compactCoins(best.marginalCoinsHour)}/h marginal profit · ${formatPayback(best.payback)} payback at the current ${esc(cropFor(raw)?.name || '')} baseline.</p>
    <button class="primary-btn" data-revenue-hero-open="${esc(best.item.id)}">Open details</button>`;
  hero.querySelector('[data-revenue-hero-open]')?.addEventListener('click', () => openItem(best.item.id));
}

function apply() {
  enhancePlanner();
  enhanceDashboard();
}

function boot() {
  apply();
  const root = document.querySelector('#app');
  if (!root) return;
  new MutationObserver(() => queueMicrotask(apply)).observe(root, { childList: true, subtree: true });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
else boot();
