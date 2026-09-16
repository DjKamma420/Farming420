import { CROPS, UPGRADES } from './data.js';
import { STORAGE_KEY } from './config.js';
import { toolKeyForCropId } from './migrations.js';
import { PLANNER_MODES, plannerModeById, relevanceScore } from './planner-modes.js';

function esc(value = '') {
  return String(value).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#039;' }[c]));
}

function load() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch { return {}; }
}

function save(raw) { localStorage.setItem(STORAGE_KEY, JSON.stringify(raw)); }

function cropId(raw) { return document.querySelector('#cropSelect')?.value || raw.selectedCrop || 'melon'; }
function crop(raw) { return CROPS.find(entry => entry.id === cropId(raw)) || CROPS[0]; }

function ensureProfile(raw) {
  raw.profile ||= {};
  raw.profile.levels ||= {};
  raw.profile.owned ||= {};
  raw.profile.costs ||= {};
  raw.profile.manualGain ||= {};
  raw.profile.cropProgress ||= {};
  raw.profile.toolProgress ||= {};
  return raw.profile;
}

function bucket(raw, item) {
  const profile = ensureProfile(raw);
  if (item.section === 'crops') {
    profile.cropProgress[cropId(raw)] ||= {};
    const target = profile.cropProgress[cropId(raw)];
    target.levels ||= {}; target.owned ||= {}; target.costs ||= {}; target.manualGain ||= {};
    return target;
  }
  if (item.section === 'tools') {
    const key = toolKeyForCropId(cropId(raw));
    profile.toolProgress[key] ||= {};
    const target = profile.toolProgress[key];
    target.levels ||= {}; target.owned ||= {}; target.costs ||= {}; target.manualGain ||= {};
    return target;
  }
  return profile;
}

function currentLevel(raw, item) {
  return Math.max(0, Math.min(Number(item.max || 1), Number(bucket(raw, item).levels?.[item.id] || 0)));
}

function maxed(raw, item) { return currentLevel(raw, item) >= Number(item.max || 1); }
function applies(raw, item) { return item.cropScope === 'Any' || item.cropScope === crop(raw)?.name; }
function gain(raw, item) {
  const manual = bucket(raw, item).manualGain?.[item.id];
  if (manual !== undefined && manual !== '' && Number.isFinite(Number(manual))) return Number(manual);
  return Number(item.stepGain || item.rawMarginal || 0);
}

function modeId(raw) { return raw.profile?.plannerMode || 'profit'; }

function relevantRows(raw, mode) {
  if (mode.kind === 'revenue') return [];
  return UPGRADES
    .filter(item => item.status === 'ACTIVE')
    .filter(item => applies(raw, item))
    .filter(item => !maxed(raw, item))
    .filter(item => mode.match?.(item))
    .map(item => ({ item, gain: gain(raw, item), level: currentLevel(raw, item), score: relevanceScore(item, gain(raw, item)) }))
    .sort((a, b) => b.score - a.score || b.gain - a.gain || a.item.name.localeCompare(b.item.name));
}

function rowMarkup(row, index) {
  const max = Number(row.item.max || 1);
  const gainText = row.gain > 0 ? `+${row.gain.toLocaleString('en-US')}` : 'dynamic';
  return `<button class="planner-row planner-mode-row" data-mode-open="${esc(row.item.id)}">
    <div class="rank">${index + 1}</div>
    <div class="planner-main"><strong>${esc(row.item.name)}</strong><span>${esc(row.item.category)} · ${esc(row.item.metric)}</span></div>
    <div class="planner-number"><strong>${gainText}</strong><span>next marginal</span></div>
    <div class="planner-number"><strong>${row.level}/${max}</strong><span>current level</span></div>
    <div class="planner-number"><strong>${esc(row.item.modeScope)}</strong><span>context</span></div>
  </button>`;
}

function openItem(id) {
  const raw = load(); raw.drawer = id; save(raw);
  window.dispatchEvent(new Event('farming420:state-changed'));
}

function applyModeUI() {
  const content = document.querySelector('.content');
  const revenue = content?.querySelector('.revenue-planner-v2');
  if (!content || !revenue || content.dataset.plannerModesReady === '1') return;
  content.dataset.plannerModesReady = '1';

  const raw = load();
  ensureProfile(raw);
  const active = plannerModeById(modeId(raw));
  const tabs = document.createElement('section');
  tabs.className = 'planner-mode-shell';
  tabs.innerHTML = `<div class="planner-mode-tabs">${PLANNER_MODES.map(mode => `<button type="button" class="planner-mode-tab ${mode.id === active.id ? 'active' : ''}" data-planner-mode="${esc(mode.id)}"><strong>${esc(mode.label)}</strong><span>${esc(mode.kind === 'revenue' ? 'Coins / payback' : 'Goal-specific')}</span></button>`).join('')}</div>
    <p class="planner-mode-description">${esc(active.description)}</p>`;
  revenue.before(tabs);

  if (active.kind !== 'revenue') {
    revenue.hidden = true;
    const rows = relevantRows(raw, active);
    const panel = document.createElement('section');
    panel.className = 'planner-mode-results';
    panel.innerHTML = `<div class="section-row"><div><h2>${esc(active.label)}</h2><p>Only upgrades relevant to this goal are shown. Coin payback is intentionally not used for this mode.</p></div></div>
      <div class="planner-list planner-mode-list">${rows.length ? rows.slice(0, 40).map(rowMarkup).join('') : '<div class="empty">No active unmatched upgrades for this goal in the current crop/setup.</div>'}</div>`;
    tabs.after(panel);
    panel.querySelectorAll('[data-mode-open]').forEach(button => button.addEventListener('click', () => openItem(button.dataset.modeOpen)));
  }

  tabs.querySelectorAll('[data-planner-mode]').forEach(button => button.addEventListener('click', () => {
    const next = load(); ensureProfile(next); next.profile.plannerMode = button.dataset.plannerMode; save(next);
    window.dispatchEvent(new Event('farming420:state-changed'));
  }));
}

function boot() {
  applyModeUI();
  const root = document.querySelector('#app');
  if (!root) return;
  new MutationObserver(() => queueMicrotask(applyModeUI)).observe(root, { childList: true, subtree: true });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
else boot();
