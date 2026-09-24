/**
 * Research guidance for the two visible physical sets.
 *
 * FF owns the armor/equipment used by both Farming and Killing. BPC is the
 * separate spawning set. Killing may keep a separate pet, but never a separate
 * armor/equipment copy in the application model.
 */
import { STORAGE_KEY } from './config.js';
import { ACTIVITY_MODE } from './activity-mode.js';
import {
  PEST_LOADOUT_CORE_RULE,
  PEST_LOADOUT_SOURCE,
  SPAWN_PHASE_IS_SHORT,
  baselineTiers,
} from '../research/pest-loadout-progression.js';

const TIER_KEY = 'farming420-pest-loadout-tier';

function esc(value = '') {
  return String(value).replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;',
  }[char]));
}

function load() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch { return {}; }
}

function pageId() {
  return document.querySelector('.sidebar .nav-link.active')?.dataset.page || '';
}

function tiers() {
  return baselineTiers();
}

function storedTier() {
  const fallback = tiers()[0]?.id || '';
  try { return localStorage.getItem(TIER_KEY) || fallback; }
  catch { return fallback; }
}

function tierById(id) {
  return tiers().find(tier => tier.id === id) || tiers()[0];
}

function visibleMode(raw) {
  return raw?.profile?.setups?.activeId === 'pest'
    ? ACTIVITY_MODE.PEST_SPAWN
    : ACTIVITY_MODE.FARM;
}

function armorSetPurpose(mode) {
  if (mode === ACTIVITY_MODE.PEST_SPAWN) return 'BPC set';
  return 'FF set';
}

function armorSetSummary() {
  return 'FF set + BPC set';
}

function guidanceMarkup(raw) {
  const mode = visibleMode(raw);
  const tier = tierById(storedTier());
  if (!tier) return '';
  const farming = tier.phases[ACTIVITY_MODE.FARM] || {};
  const spawning = tier.phases[ACTIVITY_MODE.PEST_SPAWN] || {};
  const killing = tier.phases[ACTIVITY_MODE.PEST_KILL] || {};
  const isBpc = mode === ACTIVITY_MODE.PEST_SPAWN;
  const rows = isBpc
    ? [
        ['Armor', spawning.armor ? `${spawning.armor} · ${armorSetPurpose(mode)}` : null],
        ['Equipment', spawning.equipment],
        ['Pet', spawning.pet],
      ]
    : [
        ['Armor', farming.armor ? `${farming.armor} · ${armorSetPurpose(mode)}` : null],
        ['Equipment', farming.equipment],
        ['Farming Pet', farming.pet],
        ['Killing Pet', killing.pet],
      ];

  return `<section class="phase-guide">
    <div class="section-row">
      <div>
        <h2>${isBpc ? 'BPC Set' : 'FF Set'} — role guide</h2>
        <p>${esc(PEST_LOADOUT_CORE_RULE)}</p>
      </div>
      <label class="phase-guide-tier">
        <span>Progression</span>
        <select data-phase-tier>
          ${tiers().map(entry => `<option value="${esc(entry.id)}"${entry.id === tier.id ? ' selected' : ''}>${esc(entry.label)}</option>`).join('')}
        </select>
      </label>
    </div>

    <div class="phase-guide-rows">
      ${rows.filter(([, value]) => value).map(([label, value]) =>
        `<div class="phase-guide-row"><strong>${esc(label)}</strong><span>${esc(value)}</span></div>`).join('')}
    </div>

    ${isBpc && spawning.timing ? `<p class="phase-guide-note">${esc(spawning.timing)} ${esc(SPAWN_PHASE_IS_SHORT)}</p>` : ''}
    <div class="phase-guide-baseline">
      <strong>2 physical sets: ${esc(armorSetSummary())}</strong>
      <span>Killing automatically reuses FF Armor and Equipment. Only the Killing Pet can differ; the pet switch can make Farming and Killing use one pet as well.</span>
    </div>
    <p class="phase-guide-note"><a href="${esc(PEST_LOADOUT_SOURCE)}" target="_blank" rel="noreferrer">Source</a></p>
  </section>`;
}

function bindGuide(host) {
  host.querySelector('[data-phase-tier]')?.addEventListener('change', event => {
    try { localStorage.setItem(TIER_KEY, event.target.value); } catch { /* ignore */ }
    host.innerHTML = guidanceMarkup(load());
    bindGuide(host);
  });
}

function applyPhaseGuide() {
  if (pageId() !== 'setups') return;
  const content = document.querySelector('.content');
  if (!content || content.querySelector('.phase-guide-host')) return;
  const anchor = content.querySelector('.setup-bar');
  if (!anchor) return;

  const host = document.createElement('div');
  host.className = 'phase-guide-host';
  host.innerHTML = guidanceMarkup(load());
  anchor.insertAdjacentElement('afterend', host);
  bindGuide(host);
}

function boot() {
  applyPhaseGuide();
  const root = document.querySelector('#app');
  if (!root) return;
  new MutationObserver(() => queueMicrotask(applyPhaseGuide)).observe(root, { childList: true, subtree: true });
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
}
