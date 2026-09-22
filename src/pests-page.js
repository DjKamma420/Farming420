/**
 * The Pests page.
 *
 * Explanations and beginner Pest strategy live on the Info page. This page is
 * now limited to Pest-specific analysis: the configured Vacuum's kill threshold
 * and Pesthunter Phillip's temporary-Fortune conversion.
 */
import { STORAGE_KEY } from './config.js';
import {
  PESTHUNTER_PHILIP,
  philipFortuneFor,
} from './pest-model.js';
import { oneShotAdvice, pullsToKill } from './vacuum-damage.js';
import { selectedVacuumReforge } from './item-capabilities.js';
import { setTextIfChanged } from './set-text.js';
import { formatNumber } from './format-number.js';

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

function philipMarkup(pests) {
  const result = philipFortuneFor(pests);
  const older = PESTHUNTER_PHILIP.supersededSnapshot;
  return `
    <label class="pest-philip-input">
      <span>Pests to spend</span>
      <input data-pest-philip type="number" min="0" step="1" value="${result ? result.requested : 0}">
    </label>
    <div class="pest-philip-result">
      <strong data-pest-philip-out>${result ? `+${formatNumber(result.fortune)} Farming Fortune` : '—'}</strong>
      <span data-pest-philip-note>${result
        ? `${formatNumber(result.spent)} pests for ${PESTHUNTER_PHILIP.durationMinutes} minutes${result.capped ? ` · capped at ${PESTHUNTER_PHILIP.pestCap}` : ''}`
        : 'Enter a pest count'}</span>
    </div>
    <p class="pest-note">${PESTHUNTER_PHILIP.fortunePerPest} Farming Fortune per pest, up to
      ${formatNumber(PESTHUNTER_PHILIP.maxFortune)} at ${PESTHUNTER_PHILIP.pestCap} pests
      (version ${esc(PESTHUNTER_PHILIP.version)}). An earlier snapshot caps at
      +${older.maxFortune} for ${older.pestCap} pests; if that is what you see in game, yours is the older one.</p>
    <p class="pest-note">${esc(PESTHUNTER_PHILIP.alternativeUseNote)}</p>`;
}

/** The Pests page reads the physical Vacuum configured under Tools. */
function vacuumBuild(raw) {
  const bucket = raw?.profile?.vacuumProgress || {};
  const legacy = raw?.profile?.pestVacuumBuild || {};
  return {
    vacuumId: bucket.skyblockId || legacy.vacuumId || null,
    bookwormBooks: Number(bucket.levels?.['vacuum-bookworms-favorite-book'] ?? legacy.bookwormBooks) || 0,
    reforge: selectedVacuumReforge(bucket) || legacy.reforge || '',
  };
}

function killResultText(result) {
  if (!result) return '\u2014';
  return `${formatNumber(result.damage.totalDamage)} damage`;
}

/**
 * How the damage breaks down, in the order it is actually applied.
 *
 * Spelling out the order is the point: the flat additions come first and
 * Buzzing doubles afterwards, which is why the research had to warn against the
 * stale 900 figure that older Hooverius guides still quote.
 */
function killBreakdownText(result) {
  if (!result) return 'Pick a Vacuum';
  const d = result.damage;
  const parts = [`${d.baseDamage} base`];
  if (d.bookwormDamage) parts.push(`+${d.bookwormDamage} books`);
  if (d.reforgeFlatDamage) parts.push(`+${d.reforgeFlatDamage} reforge`);
  const sum = parts.join(' ');
  return d.multiplier > 1 ? `(${sum}) \u00d7${d.multiplier}` : sum;
}

function killAdviceText(result, advice) {
  if (!result) return '';
  if (advice?.alreadyOneShot) return 'One pull per pest.';
  if (advice?.reachable) return advice.steps.join(' ');
  return 'No combination in this model reaches one pull on this Vacuum.';
}

/**
 * Can this Vacuum take a pest down in one pull?
 *
 * The page already said a pest has 600 HP and that damage is judged against
 * that rather than in the abstract, and then left the reader to do it. The
 * numbers were in research/VACUUM_RESEARCH.md and reached by nothing.
 *
 * It counts pulls, not seconds. Pull rate, range and travel are not in the
 * research, so a seconds-per-kill figure would turn a verified threshold into
 * an invented one.
 */
function vacuumPanelMarkup(raw) {
  const build = vacuumBuild(raw);
  const result = build.vacuumId ? pullsToKill(build) : null;
  const advice = build.vacuumId ? oneShotAdvice(build) : null;
  const rows = result?.contexts || [];
  const vacuumName = build.vacuumId
    ? build.vacuumId.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, character => character.toUpperCase())
    : 'No Vacuum selected';

  return `<details class="pest-vacuum">
    <summary>
      <div class="pest-vacuum-head">
        <div><div class="eyebrow">Kill analysis</div><h2>Does your Vacuum one-shot a pest?</h2></div>
        <span class="pest-note">${esc(killResultText(result))}</span>
      </div>
    </summary>
    <div class="pest-vacuum-body">
      <div class="pest-vacuum-out">
        <strong>${esc(vacuumName)}</strong>
        <span>${build.vacuumId ? `${build.bookwormBooks} Bookworm book${build.bookwormBooks === 1 ? '' : 's'} · ${build.reforge || 'no reforge'}` : 'Configure the physical Vacuum under Tools.'}</span>
      </div>
      <div class="pest-vacuum-out">
        <strong data-vacuum-damage>${esc(killResultText(result))}</strong>
        <span data-vacuum-breakdown>${esc(killBreakdownText(result))}</span>
      </div>
      <div class="pest-vacuum-pulls" data-vacuum-pulls>
        ${rows.map(row => `<div class="pest-vacuum-pull${row.oneShot ? ' one-shot' : ''}">
          <strong>${row.pulls} pull${row.pulls === 1 ? '' : 's'}</strong>
          <span>${esc(row.label)} · ${row.health} HP</span>
        </div>`).join('')}
      </div>
      <p class="pest-note" data-vacuum-advice>${build.vacuumId ? esc(killAdviceText(result, advice)) : 'Choose a Vacuum under Tools first.'}</p>
      <p class="pest-note">Vacuum selection, Reforge, books, Recombobulator and gemstones are configured under Tools. This page only analyzes the resulting Pest kill threshold.</p>
      <p class="pest-note">Pulls, not seconds: pull rate, range and travel are not modeled, so no time estimate is claimed.</p>
    </div>
  </details>`;
}

function panelMarkup(raw) {
  return `${vacuumPanelMarkup(raw)}

    <details class="pest-philip">
      <summary><div class="pest-philip-head"><div><div class="eyebrow">Pest currency</div>
        <h2>Pesthunter Phillip conversion</h2></div>
        <span class="pest-note">Optional. Temporary Fortune, not progression.</span></div></summary>
      <div class="pest-philip-body">${philipMarkup(0)}</div>
    </details>`;
}

function applyPestsPage() {
  if (pageId() !== 'pests') return;
  const content = document.querySelector('.content');
  if (!content || content.querySelector('.pest-page-addon')) return;
  const anchor = content.querySelector('.filter-line') || content.querySelector('.page-head');
  if (!anchor) return;

  const raw = load();
  const host = document.createElement('div');
  host.className = 'pest-page-addon';
  host.innerHTML = panelMarkup(raw);
  anchor.insertAdjacentElement('afterend', host);

  const input = host.querySelector('[data-pest-philip]');
  input?.addEventListener('input', () => {
    const result = philipFortuneFor(input.value);
    const out = host.querySelector('[data-pest-philip-out]');
    const note = host.querySelector('[data-pest-philip-note]');
    if (!out || !note) return;
    // A bad input is not zero Fortune: it is no answer, and says so.
    // Written through `setTextIfChanged` because these nodes sit inside the
    // observed subtree: assigning the same string still replaces the text node
    // and emits another childList mutation. That is rule 2 of
    // docs/RENDER_FREEZE_SAFETY.md and the exact shape of the PR #90 freeze.
    setTextIfChanged(out, result ? `+${formatNumber(result.fortune)} Farming Fortune` : '—');
    setTextIfChanged(note, result
      ? `${formatNumber(result.spent)} pests for ${PESTHUNTER_PHILIP.durationMinutes} minutes${result.capped ? ` · capped at ${PESTHUNTER_PHILIP.pestCap}` : ''}`
      : 'Enter a pest count');
  });
}

function boot() {
  applyPestsPage();
  const root = document.querySelector('#app');
  if (!root) return;
  new MutationObserver(() => queueMicrotask(applyPestsPage)).observe(root, { childList: true, subtree: true });
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
}
