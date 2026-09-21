import { STORAGE_KEY } from './config.js';
import { STAGES, armorProgress, nextArmorSet, stageForLevel } from './progression.js';

const FARMING_LEVEL_ENTRY = 'account-skill-farming-skill-level';

function esc(value = '') {
  return String(value).replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  }[char]));
}

function readState() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); }
  catch { return {}; }
}

function farmingLevel(raw) {
  const synced = raw?.profile?.normalizedSnapshot?.skills?.farming?.level;
  if (Number.isFinite(synced)) return synced;
  const entered = Number(raw?.profile?.levels?.[FARMING_LEVEL_ENTRY]);
  return Number.isFinite(entered) && entered > 0 ? entered : null;
}

function activePage() {
  return document.querySelector('.sidebar .nav-link.active')?.dataset.page || '';
}

function stageProgress(level, stage) {
  if (level == null || !stage) return null;
  const span = Math.max(1, stage.levelTo - stage.levelFrom + 1);
  return Math.max(0, Math.min(100, ((level - stage.levelFrom + 1) / span) * 100));
}

function tipMarkup(stage) {
  const tips = stage?.steps?.slice(0, 4) || STAGES[0].steps.slice(0, 4);
  return tips.map((tip, index) => `
    <li class="dashboard-tip">
      <span>${index + 1}</span>
      <p>${esc(tip)}</p>
    </li>`).join('');
}

function roadmapMarkup(level, currentStage) {
  return STAGES.map(stage => {
    const reached = level != null && level > stage.levelTo;
    const current = stage.id === currentStage?.id;
    return `
      <details class="dashboard-roadmap-stage ${current ? 'current' : ''} ${reached ? 'done' : ''}" ${current ? 'open' : ''}>
        <summary>
          <span class="dashboard-roadmap-range">${stage.levelFrom}–${stage.levelTo}</span>
          <strong>${esc(stage.name)}</strong>
          <small>${current ? 'Current' : reached ? 'Done' : 'Later'}</small>
        </summary>
        <p>${esc(stage.summary)}</p>
        <ul>${stage.steps.map(step => `<li>${esc(step)}</li>`).join('')}</ul>
      </details>`;
  }).join('');
}

function armorMarkup(level) {
  const rows = armorProgress(level);
  const nextIndex = rows.findIndex(entry => entry.reached === false);
  const start = Math.max(0, nextIndex < 0 ? rows.length - 3 : nextIndex - 1);
  return rows.slice(start, start + 3).map(entry => `
    <div class="dashboard-armor-step ${entry.reached ? 'done' : ''}">
      <span>Farming ${entry.level}</span>
      <strong>${esc(entry.set)}</strong>
      <small>${entry.reached ? 'Reached' : 'Next target'}</small>
    </div>`).join('');
}

function bindJumpButtons(section) {
  section.querySelectorAll('[data-dashboard-jump]').forEach(button => {
    button.addEventListener('click', () => {
      const page = button.dataset.dashboardJump;
      document.querySelector(`.nav-link[data-page="${page}"]`)?.click();
    });
  });
}

export function applyDashboardGuide() {
  if (activePage() !== 'dashboard') return;
  const content = document.querySelector('.content');
  /**
   * The four calculated-stat tiles, which the guide is inserted after.
   *
   * This used to read `.hero-grid`. Commit 546c4cb rewrote the dashboard into
   * the read-only stats overview, dropped that element and touched only
   * `src/app.js` -- so from then on this selector returned null, the function
   * returned early on its own landing page, and the Farming phase, the next
   * armour milestone, the "best next steps" list and the 0-60 roadmap were
   * simply gone. Nothing threw, so nothing caught it.
   */
  const statsGrid = content?.querySelector('.dashboard-results-grid');
  if (!content || !statsGrid || content.querySelector('.dashboard-guide-merge')) return;

  const raw = readState();
  const level = farmingLevel(raw);
  const current = level == null ? null : stageForLevel(level);
  const stage = current || STAGES[0];
  const nextArmor = level == null ? null : nextArmorSet(level);
  const progress = stageProgress(level, stage);
  const nextStage = current ? STAGES[STAGES.findIndex(entry => entry.id === current.id) + 1] : STAGES[0];

  const section = document.createElement('section');
  section.className = 'dashboard-guide-merge';
  section.innerHTML = `
    <div class="dashboard-guide-head">
      <div>
        <div class="eyebrow">Farming progress & tips</div>
        <h2>${level == null ? 'Start your Farming path' : `Farming ${level} · ${esc(stage.name)}`}</h2>
        <p>${esc(stage.summary)}</p>
      </div>
      <button type="button" class="ghost" data-dashboard-jump="planner">Open upgrade planner</button>
    </div>

    <div class="dashboard-progress-grid">
      <article>
        <span>Farming level</span>
        <strong>${level == null ? 'Unknown' : level}</strong>
        <small>${level == null ? 'Sync or enter it on Account' : `Stage ${STAGES.findIndex(entry => entry.id === stage.id) + 1}/${STAGES.length}`}</small>
      </article>
      <article>
        <span>Current phase</span>
        <strong>${esc(stage.name)}</strong>
        <small>${level == null ? 'Starter path' : `${stage.levelFrom}–${stage.levelTo}`}</small>
      </article>
      <article>
        <span>Next armour</span>
        <strong>${esc(nextArmor ? nextArmor.set : level == null ? 'Unknown' : 'All reached')}</strong>
        <small>${nextArmor ? `Farming ${nextArmor.level}` : level == null ? 'Set your Farming level first' : 'Armor level gates complete'}</small>
      </article>
      <article>
        <span>Next phase</span>
        <strong>${esc(nextStage?.name || 'Maxing out')}</strong>
        <small>${nextStage && nextStage !== stage ? `Starts at Farming ${nextStage.levelFrom}` : 'Current endgame phase'}</small>
      </article>
    </div>

    ${progress == null ? '' : `<div class="dashboard-stage-progress"><span style="width:${progress.toFixed(1)}%"></span></div>`}

    <div class="dashboard-guide-grid">
      <article class="dashboard-tips-card">
        <div class="dashboard-card-head">
          <div><span class="eyebrow">Focus now</span><h3>Best next steps for this phase</h3></div>
          ${level == null ? '<button type="button" class="ghost small" data-dashboard-jump="account">Set Farming level</button>' : ''}
        </div>
        <ol class="dashboard-tip-list">${tipMarkup(stage)}</ol>
      </article>

      <article class="dashboard-armor-card">
        <span class="eyebrow">Gear progression</span>
        <h3>Nearby armour milestones</h3>
        <div class="dashboard-armor-list">${armorMarkup(level)}</div>
      </article>
    </div>

    <div class="dashboard-roadmap-head">
      <div><span class="eyebrow">0–60 roadmap</span><h3>Full Farming progression</h3></div>
      <p>Only the current phase is expanded by default. Open another stage when you want the deeper guide.</p>
    </div>
    <div class="dashboard-roadmap">${roadmapMarkup(level, current)}</div>
  `;

  statsGrid.insertAdjacentElement('afterend', section);
  bindJumpButtons(section);
}

function scheduleApply() {
  queueMicrotask(applyDashboardGuide);
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', applyDashboardGuide, { once: true });
  else applyDashboardGuide();

  document.addEventListener('click', event => {
    if (event.target.closest?.('[data-page], [data-open], [data-close-drawer], [data-crop]')) scheduleApply();
  });
  document.addEventListener('change', event => {
    if (event.target.matches?.('#cropSelect, #globalFortune, #cropFortune')) scheduleApply();
  });
  window.addEventListener('farming420:state-changed', scheduleApply);
}
