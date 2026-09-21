/**
 * The Pests page.
 *
 * It held one entry -- a card with no art, marked VERIFY -- on a page whose
 * subject is two pipelines that take different stats. The page now teaches the
 * split, because the split is the whole mechanic: Bonus Pest Chance decides
 * whether a pest appears, Overbloom decides what a dead one gives, and Farming
 * Fortune touches only the guaranteed drops in between. A +100 Pest Farming
 * Fortune reforge buys nothing on the rare-drop side, and the number is large
 * enough that nobody guesses that on their own.
 *
 * Every figure here comes from `src/pest-model.js`, which cites its sources.
 */
import { STORAGE_KEY } from './config.js';
import { CROPS } from './data.js';
import {
  GARDEN_PESTS,
  LOOT_PIPELINE,
  PESTHUNTER_PHILIP,
  PEST_HEALTH,
  PEST_STAT_SIDES,
  SPAWN_PIPELINE,
  UNMODELLED_PESTS,
  guaranteedDropText,
  philipFortuneFor,
} from './pest-model.js';
import { VACUUM_BASE_STATS, VACUUM_REFORGES } from '../research/vacuum-damage.js';
import { oneShotAdvice, pullsToKill } from './vacuum-damage.js';
import { selectedVacuumReforge } from './item-capabilities.js';
import { setTextIfChanged } from './set-text.js';
import { cropArtUrl } from './skyblock-redesign.js';

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

function pipelineMarkup(steps) {
  return steps.map((entry, index) => `
    <li class="pest-step">
      <span class="pest-step-index">${index + 1}</span>
      <div><strong>${esc(entry.step)}</strong><p>${esc(entry.detail)}</p></div>
    </li>`).join('');
}

function sideMarkup() {
  return Object.entries(PEST_STAT_SIDES).map(([key, side]) => `
    <div class="pest-side" data-pest-side="${esc(key)}">
      <strong>${esc(side.label)}</strong>
      <p>${esc(side.note)}</p>
    </div>`).join('');
}

/** A crop's own art, with its initial as the placeholder underneath. */
function cropIcon(pest) {
  const url = cropArtUrl(pest.cropId);
  const letter = `<span class="pest-crop-letter">${esc(knownCropName(pest).slice(0, 1))}</span>`;
  if (!url) return `<span class="pest-crop-icon">${letter}</span>`;
  return `<span class="pest-crop-icon">${letter}<img src="${esc(url)}" alt="" loading="lazy" role="img" aria-label="${esc(knownCropName(pest))}"></span>`;
}

function knownCropName(pest) {
  return CROPS.find(crop => crop.id === pest.cropId)?.name || pest.cropId;
}

function pestTableMarkup() {
  return GARDEN_PESTS.map(pest => {
    const drop = guaranteedDropText(pest);
    // Null, not zero: for the three Greenhouse pests the research records that
    // the exact live scaling divisor still needs a current table.
    const perUnit = pest.fortunePerExtraUnit == null
      ? 'scaling not verified'
      : `+1 per ${pest.fortunePerExtraUnit} Fortune`;
    return `<div class="pest-row${pest.status === 'VERIFIED' ? '' : ' pest-row-unverified'}">
      ${cropIcon(pest)}
      <div class="pest-main"><strong>${esc(pest.name)}</strong><span>spawns on ${esc(knownCropName(pest))}</span></div>
      <div class="pest-drop"><strong>${esc(drop || '\u2014')}</strong><span>${esc(perUnit)}</span></div>
      <div class="pest-vinyl"><strong>${esc(pest.vinyl || '\u2014')}</strong><span>vinyl</span></div>
    </div>`;
  }).join('');
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
      <strong data-pest-philip-out>${result ? `+${result.fortune.toLocaleString('en-US')} Farming Fortune` : '—'}</strong>
      <span data-pest-philip-note>${result
        ? `${result.spent.toLocaleString('en-US')} pests for ${PESTHUNTER_PHILIP.durationMinutes} minutes${result.capped ? ` · capped at ${PESTHUNTER_PHILIP.pestCap}` : ''}`
        : 'Enter a pest count'}</span>
    </div>
    <p class="pest-note">${PESTHUNTER_PHILIP.fortunePerPest} Farming Fortune per pest, up to
      ${PESTHUNTER_PHILIP.maxFortune.toLocaleString('en-US')} at ${PESTHUNTER_PHILIP.pestCap} pests
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
  return `${result.damage.totalDamage.toLocaleString('en-US')} damage`;
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
    </div>
  </details>`;
}

function panelMarkup(raw) {
  return `
    <section class="pest-explainer">
      <div class="section-row">
        <div>
          <h2>Two pipelines, different stats</h2>
          <p>A pest has to spawn before it can drop anything, and the two halves do not
            share a stat. This is the part that costs coins when it is guessed.</p>
        </div>
      </div>
      <div class="pest-sides">${sideMarkup()}</div>
      <div class="pest-pipelines">
        <div class="pest-pipeline">
          <h3>Spawn</h3>
          <ol>${pipelineMarkup(SPAWN_PIPELINE)}</ol>
        </div>
        <div class="pest-pipeline">
          <h3>Loot</h3>
          <ol>${pipelineMarkup(LOOT_PIPELINE)}</ol>
        </div>
      </div>
      <p class="pest-rule">Since 2026-05-14 the listed non-guaranteed pest drops scale with
        Overbloom, not Farming Fortune. A +100 Pest Farming Fortune reforge changes the rare-drop
        chance by nothing at all.</p>
    </section>

    <section class="pest-bestiary">
      <div class="section-row">
        <div>
          <h2>Which pest, which plot</h2>
          <p>The plot's crop decides the pest, the pest decides its guaranteed drop and its vinyl.
            ${GARDEN_PESTS.length} standard types. The guaranteed drop is the one place Farming
            Fortune does work on pest loot.</p>
        </div>
      </div>
      <div class="pest-list">${pestTableMarkup()}</div>
      <p class="pest-note">${PEST_HEALTH.normal} HP each. ${esc(PEST_HEALTH.derpyNote)}</p>
      ${UNMODELLED_PESTS.length ? `<p class="pest-note">Not listed: ${UNMODELLED_PESTS.map(pest =>
        `${esc(pest.name)}${pest.notes ? ` \u2014 ${esc(pest.notes)}` : ''}`).join('; ')}</p>` : ''}
    </section>

    ${vacuumPanelMarkup(raw)}

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
  if (!content || content.querySelector('.pest-explainer')) return;
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
    setTextIfChanged(out, result ? `+${result.fortune.toLocaleString('en-US')} Farming Fortune` : '—');
    setTextIfChanged(note, result
      ? `${result.spent.toLocaleString('en-US')} pests for ${PESTHUNTER_PHILIP.durationMinutes} minutes${result.capped ? ` · capped at ${PESTHUNTER_PHILIP.pestCap}` : ''}`
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
