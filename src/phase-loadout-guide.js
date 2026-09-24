/**
 * What belongs in each phase loadout, on the page where you fill them in.
 *
 * The Setups page shows three tabs -- Farming, Spawning, Killing -- and nothing
 * about what to put in them. Worse, three empty wardrobes imply you need three,
 * and the research says plainly that you do not: the normal baseline is two
 * physical armor sets, with Farming and Killing wearing the same one, and the
 * third set is a luxury layer that "must not be treated as the prerequisite for
 * Pest farming".
 *
 * So this shows the researched loadout for the active phase, states the two-set
 * baseline, and offers the one action that baseline implies: reuse the Farming
 * armor in the Killing loadout.
 *
 * Slots remain self-contained records for backwards compatibility, but reused
 * pieces now carry one stable physicalItemId. Editing that object through any
 * linked loadout updates the other references instead of creating diverging
 * copies of what is physically one item.
 */
import { STORAGE_KEY } from './config.js';
import { ACTIVITY_MODE, activityLabel, activityModeForState, setupIdForActivity } from './activity-mode.js';
import {
  PEST_LOADOUT_CORE_RULE,
  PEST_LOADOUT_SOURCE,
  PEST_LOADOUT_TIERS,
  SPAWN_PHASE_IS_SHORT,
  baselineTiers,
} from '../research/pest-loadout-progression.js';
import { setTextIfChanged } from './set-text.js';
import { ensurePhysicalItemId } from './setups.js';

const ARMOR_SLOTS = Object.freeze(['helmet', 'chestplate', 'leggings', 'boots']);
const TIER_KEY = 'farming420-pest-loadout-tier';

function esc(value = '') {
  return String(value).replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;',
  }[char]));
}

function load() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch { return {}; }
}

function save(raw) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(raw)); } catch { /* a blocked store must not break the page */ }
}

function pageId() {
  return document.querySelector('.sidebar .nav-link.active')?.dataset.page || '';
}

function storedTier() {
  try { return localStorage.getItem(TIER_KEY) || PEST_LOADOUT_TIERS[0].id; }
  catch { return PEST_LOADOUT_TIERS[0].id; }
}

function tierById(id) {
  return PEST_LOADOUT_TIERS.find(tier => tier.id === id) || PEST_LOADOUT_TIERS[0];
}

function setupById(raw, id) {
  return (raw?.profile?.setups?.list || []).find(setup => setup.id === id) || null;
}

// The setup ids are not the mode names -- Farming is stored as `normal` and
// Spawning as `pest` -- so the mapping is imported rather than rebuilt here.
// Rebuilding it is how this module first looked up a setup that does not exist.

function filledArmorCount(setup) {
  return ARMOR_SLOTS.filter(slot => setup?.slots?.[slot]?.skyblockId).length;
}

function armorSetPurpose(mode, phase) {
  if (mode === ACTIVITY_MODE.PEST_SPAWN) return 'BPC set';
  if (mode === ACTIVITY_MODE.PEST_KILL && !phase?.reusesArmorFrom) return 'Kill set';
  return 'FF set';
}

function armorSetSummary(tier) {
  if (tier.status === 'luxury') return 'FF set + BPC set + Kill set';
  return 'FF set + BPC set';
}

function guidanceMarkup(raw) {
  const mode = activityModeForState(raw);
  const tier = tierById(storedTier());
  const phase = tier.phases[mode] || null;
  const farmSetup = setupById(raw, setupIdForActivity(ACTIVITY_MODE.FARM));
  const canCopyArmor = mode === ACTIVITY_MODE.PEST_KILL
    && Boolean(phase?.reusesArmorFrom)
    && filledArmorCount(farmSetup) > 0;

  const rows = [
    ['Armor', phase?.armor ? `${phase.armor} · ${armorSetPurpose(mode, phase)}` : null],
    ['Equipment', phase?.equipment],
    ['Pet', phase?.pet],
  ].filter(([, value]) => value);

  return `<section class="phase-guide">
    <div class="section-row">
      <div>
        <h2>${esc(activityLabel(mode))} — what goes in it</h2>
        <p>${esc(PEST_LOADOUT_CORE_RULE)}</p>
      </div>
      <label class="phase-guide-tier">
        <span>Progression</span>
        <select data-phase-tier>
          ${PEST_LOADOUT_TIERS.map(entry => `<option value="${esc(entry.id)}"${entry.id === tier.id ? ' selected' : ''}>${esc(entry.label)}</option>`).join('')}
        </select>
      </label>
    </div>

    <div class="phase-guide-rows" data-phase-rows>
      ${rows.length
        ? rows.map(([label, value]) => `<div class="phase-guide-row"><strong>${esc(label)}</strong><span>${esc(value)}</span></div>`).join('')
        : '<div class="phase-guide-row"><span>No researched loadout for this phase at this tier.</span></div>'}
    </div>

    ${phase?.timing ? `<p class="phase-guide-note">${esc(phase.timing)} ${esc(SPAWN_PHASE_IS_SHORT)}</p>` : ''}
    ${phase?.note ? `<p class="phase-guide-note">${esc(phase.note)}</p>` : ''}

    <div class="phase-guide-baseline">
      <strong data-phase-sets>${tier.physicalArmorSets} physical armor set${tier.physicalArmorSets === 1 ? '' : 's'} · ${esc(armorSetSummary(tier))}${tier.status === 'luxury' ? ' · optional' : ''}</strong>
      <span>${tier.status === 'luxury'
        ? 'A luxury layer. The research is explicit that it is not a prerequisite for Pest farming or for the two-set baseline.'
        : `Three phases, ${baselineTiers()[0].physicalArmorSets} sets: Farming and Killing wear the same armor. Three tabs here do not mean three wardrobes.`}</span>
    </div>

    ${canCopyArmor ? `<button class="ghost small" data-phase-copy-armor>Reuse the Farming armor in this loadout</button>` : ''}
    <p class="phase-guide-note"><a href="${esc(PEST_LOADOUT_SOURCE)}" target="_blank" rel="noreferrer">Source</a></p>
  </section>`;
}

function copyFarmingArmor() {
  const next = load();
  const farmSetup = setupById(next, setupIdForActivity(ACTIVITY_MODE.FARM));
  const killSetup = setupById(next, setupIdForActivity(ACTIVITY_MODE.PEST_KILL));
  if (!farmSetup || !killSetup) return;
  for (const slot of ARMOR_SLOTS) {
    const piece = farmSetup.slots?.[slot];
    if (!piece) {
      killSetup.slots[slot] = null;
      continue;
    }
    const linked = ensurePhysicalItemId(piece, `shared:${farmSetup.id}:${slot}`);
    farmSetup.slots[slot] = linked;
    killSetup.slots[slot] = JSON.parse(JSON.stringify(linked));
  }
  save(next);
  window.dispatchEvent(new Event('farming420:state-changed'));
}

function applyPhaseGuide() {
  if (pageId() !== 'setups') return;
  const content = document.querySelector('.content');
  if (!content || content.querySelector('.phase-guide')) return;
  const anchor = content.querySelector('.setup-bar');
  if (!anchor) return;

  const raw = load();
  const host = document.createElement('div');
  host.className = 'phase-guide-host';
  host.innerHTML = guidanceMarkup(raw);
  anchor.insertAdjacentElement('afterend', host);

  host.querySelector('[data-phase-tier]')?.addEventListener('change', event => {
    try { localStorage.setItem(TIER_KEY, event.target.value); } catch { /* ignore */ }
    // Re-render in place: the tier is a display choice, not profile state, so
    // it must not dispatch a render of the whole app.
    const fresh = document.createElement('div');
    fresh.innerHTML = guidanceMarkup(load());
    const rows = host.querySelector('[data-phase-rows]');
    const freshRows = fresh.querySelector('[data-phase-rows]');
    if (rows && freshRows) rows.innerHTML = freshRows.innerHTML;
    setTextIfChanged(host.querySelector('[data-phase-sets]'), fresh.querySelector('[data-phase-sets]')?.textContent || '');
    const baseline = host.querySelector('.phase-guide-baseline span');
    setTextIfChanged(baseline, fresh.querySelector('.phase-guide-baseline span')?.textContent || '');
  });

  // Copying armor is a user action, so this is where a state write and a render
  // belong.
  host.querySelector('[data-phase-copy-armor]')?.addEventListener('click', copyFarmingArmor);
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
