import { CROPS, UPGRADES } from './data.js';
import { STORAGE_KEY } from './config.js';
import { toolKeyForCropId } from './migrations.js';
import { activityModeForState } from './activity-mode.js';
import { contestEstimate } from './contest-estimate.js';
import { JACOB_BRACKETS, JACOB_PARTICIPATION_REWARD } from './jacob-contest-model.js';
import { plannerActivityContext } from './planner-activity-context.js';
import { PLANNER_MODES, plannerModeById, relevanceScore } from './planner-modes.js';
import { setTextIfChanged } from './set-text.js';

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

/** The crop-and-activity key the measured-baseline panel already writes. */
function measuredKey(raw) {
  return `${cropId(raw)}:${activityModeForState(raw)}`;
}

function measuredFor(raw) {
  return raw?.profile?.plannerMeasured?.[measuredKey(raw)] || {};
}

function personalBestFor(raw) {
  const stored = raw?.profile?.contestPersonalBest?.[cropId(raw)];
  return stored === undefined || stored === '' ? null : Number(stored);
}

function formatCollection(value) {
  return Number.isFinite(value) ? value.toLocaleString('en-US') : '\u2014';
}

/**
 * The contest panel.
 *
 * This mode used to rank upgrades by a keyword match on the word "contest",
 * which is a text search dressed as a model. `src/jacob-contest-model.js`
 * shipped with the brackets, the 20-minute duration, the personal-best Fortune
 * table and Anita's accessory tiers, all sourced, and no caller.
 *
 * It needs the same measurements the profit baseline already collects, so a
 * player who measured their farm once gets a contest estimate for free. The
 * one thing only they know -- their personal best for this crop -- is the one
 * input asked for here, because the sourced table turns it into contest-only
 * Crop Fortune.
 *
 * No medal is guessed. The model says why itself, and that sentence is shown
 * rather than paraphrased: a crop score cannot determine a percentile, because
 * the bracket depends on everyone else's scores that hour.
 */
function contestPanelMarkup(raw) {
  const context = plannerActivityContext(raw, cropId(raw));
  const estimate = contestEstimate({
    cropId: cropId(raw),
    measured: measuredFor(raw),
    stats: { farmingFortune: context.stats?.globalFortune, cropFortune: context.stats?.cropFortune },
    personalBest: personalBestFor(raw),
  });
  const minutes = Math.round(estimate.durationSeconds / 60);
  const pb = personalBestFor(raw);

  const note = estimate.complete
    ? estimate.bracketReason
    : `Still needs ${estimate.missing.join(', ')}. Measure your farm in the profit baseline above and it fills in here.`;

  return `<section class="contest-estimate">
    <div class="section-row">
      <div>
        <h2>Estimated contest score</h2>
        <p>A ${minutes}-minute contest at your measured breaking speed, from the ${esc(crop(raw)?.name || 'crop')} drop model.</p>
      </div>
    </div>
    <div class="contest-grid">
      <div class="contest-figure">
        <strong data-contest-collection>${formatCollection(estimate.expectedCollection)}</strong>
        <span>crops collected</span>
      </div>
      <div class="contest-figure">
        <strong data-contest-participation>${estimate.participationReached === null ? '\u2014' : (estimate.participationReached ? 'Reached' : 'Not reached')}</strong>
        <span>participation at ${estimate.participationThreshold}</span>
      </div>
      <div class="contest-figure">
        <strong data-contest-bonus>+${estimate.contestCropFortune}</strong>
        <span>contest-only Crop Fortune</span>
      </div>
      <label class="contest-pb">
        <span>Your personal best for this crop</span>
        <input data-contest-pb type="number" min="0" step="1000" value="${pb === null ? '' : esc(pb)}">
        <small>Optional. Converted to contest-only Crop Fortune by the sourced table.</small>
      </label>
    </div>
    <p class="contest-note" data-contest-note>${esc(note)}</p>
    <div class="contest-brackets">
      ${[...JACOB_BRACKETS, JACOB_PARTICIPATION_REWARD].map(bracket => `<div class="contest-bracket">
        <strong>${esc(bracket.label)}</strong>
        <span>top ${bracket.topPercent}%</span>
        <span>${bracket.jacobTickets} tickets${bracket.turboBook ? ' \u00b7 Turbo book' : ''}</span>
      </div>`).join('')}
    </div>
  </section>`;
}

/** Recompute in place. Storage is written; no render is dispatched. */
function refreshContestPanel(host, raw) {
  const context = plannerActivityContext(raw, cropId(raw));
  const estimate = contestEstimate({
    cropId: cropId(raw),
    measured: measuredFor(raw),
    stats: { farmingFortune: context.stats?.globalFortune, cropFortune: context.stats?.cropFortune },
    personalBest: personalBestFor(raw),
  });
  setTextIfChanged(host.querySelector('[data-contest-collection]'), formatCollection(estimate.expectedCollection));
  setTextIfChanged(
    host.querySelector('[data-contest-participation]'),
    estimate.participationReached === null ? '\u2014' : (estimate.participationReached ? 'Reached' : 'Not reached'),
  );
  setTextIfChanged(host.querySelector('[data-contest-bonus]'), `+${estimate.contestCropFortune}`);
  setTextIfChanged(host.querySelector('[data-contest-note]'), estimate.complete
    ? estimate.bracketReason
    : `Still needs ${estimate.missing.join(', ')}. Measure your farm in the profit baseline above and it fills in here.`);
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

    if (active.id === 'collection') {
      const contest = document.createElement('div');
      contest.className = 'contest-estimate-host';
      contest.innerHTML = contestPanelMarkup(raw);
      panel.before(contest);
      const input = contest.querySelector('[data-contest-pb]');
      // Typing writes the stored personal best and recomputes in place. A
      // render per keystroke would rebuild the panel under the cursor, which
      // is the loop shape rule 5 of docs/RENDER_FREEZE_SAFETY.md prevents.
      input?.addEventListener('input', () => {
        const next = load();
        ensureProfile(next);
        next.profile.contestPersonalBest ||= {};
        const typed = String(input.value || '').trim();
        if (typed === '') delete next.profile.contestPersonalBest[cropId(next)];
        else next.profile.contestPersonalBest[cropId(next)] = Math.max(0, Number(typed) || 0);
        save(next);
        refreshContestPanel(contest, next);
      });
    }
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
