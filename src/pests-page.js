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

function save(raw) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(raw)); } catch { /* a full or blocked store must not break the page */ }
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

/** The Vacuum build the player last chose, stored with the rest of the profile. */
function vacuumBuild(raw) {
  const stored = raw?.profile?.pestVacuumBuild || {};
  return {
    vacuumId: stored.vacuumId || 'INFINI_VACUUM',
    bookwormBooks: Number(stored.bookwormBooks) || 0,
    reforge: stored.reforge || '',
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
  const result = pullsToKill(build);
  const advice = oneShotAdvice(build);
  const rows = result?.contexts || [];

  return `<details class="pest-vacuum">
    <summary>
      <div class="pest-vacuum-head">
        <div><div class="eyebrow">Kill side</div><h2>Does your Vacuum one-shot a pest?</h2></div>
        <span class="pest-note">${esc(killResultText(result))}</span>
      </div>
    </summary>
    <div class="pest-vacuum-body">
      <label><span>Vacuum</span>
        <select data-vacuum-id>
          ${Object.entries(VACUUM_BASE_STATS).map(([id, stats]) => `<option value="${esc(id)}"${build.vacuumId === id ? ' selected' : ''}>${esc(id.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase()))} \u00b7 ${stats.damage}</option>`).join('')}
        </select>
        <small>Base damage from the 0.27 table.</small>
      </label>
      <label><span>Bookworm books</span>
        <input data-vacuum-books type="number" min="0" max="5" step="1" value="${build.bookwormBooks}">
        <small>+20 damage each, up to five.</small>
      </label>
      <label><span>Reforge</span>
        <select data-vacuum-reforge>
          <option value=""${build.reforge ? '' : ' selected'}>\u2014 none \u2014</option>
          ${Object.values(VACUUM_REFORGES).map(reforge => `<option value="${esc(reforge.id)}"${build.reforge === reforge.id ? ' selected' : ''}>${esc(reforge.label)}</option>`).join('')}
        </select>
        <small>A Vacuum has one reforge, so these are alternatives.</small>
      </label>
      <div class="pest-vacuum-out">
        <strong data-vacuum-damage>${esc(killResultText(result))}</strong>
        <span data-vacuum-breakdown>${esc(killBreakdownText(result))}</span>
      </div>
      <div class="pest-vacuum-pulls" data-vacuum-pulls>
        ${rows.map(row => `<div class="pest-vacuum-pull${row.oneShot ? ' one-shot' : ''}">
          <strong>${row.pulls} pull${row.pulls === 1 ? '' : 's'}</strong>
          <span>${esc(row.label)} \u00b7 ${row.health} HP</span>
        </div>`).join('')}
      </div>
      <p class="pest-note" data-vacuum-advice>${esc(killAdviceText(result, advice))}</p>
      <p class="pest-note">Pulls, not seconds: pull rate, range and travel are not in the
        research, so no time estimate is claimed. Beady trades this threshold for
        +100 Pest-only Farming Fortune \u2014 which raises guaranteed pest drops, not the
        rare-drop roll \u2014 so neither reforge wins outright.</p>
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

  // The Vacuum build recomputes in place and writes only the stored build. A
  // render per keystroke would rebuild the panel under the cursor, which is the
  // loop shape rule 5 of docs/RENDER_FREEZE_SAFETY.md exists to prevent.
  const vacuumFields = {
    vacuumId: host.querySelector('[data-vacuum-id]'),
    bookwormBooks: host.querySelector('[data-vacuum-books]'),
    reforge: host.querySelector('[data-vacuum-reforge]'),
  };
  const refreshVacuum = () => {
    const next = load();
    next.profile ||= {};
    next.profile.pestVacuumBuild = {
      vacuumId: vacuumFields.vacuumId?.value || 'INFINI_VACUUM',
      bookwormBooks: Math.max(0, Math.min(5, Number(vacuumFields.bookwormBooks?.value) || 0)),
      reforge: vacuumFields.reforge?.value || '',
    };
    save(next);

    const build = vacuumBuild(next);
    const result = pullsToKill(build);
    const advice = oneShotAdvice(build);
    setTextIfChanged(host.querySelector('[data-vacuum-damage]'), killResultText(result));
    setTextIfChanged(host.querySelector('[data-vacuum-breakdown]'), killBreakdownText(result));
    setTextIfChanged(host.querySelector('[data-vacuum-advice]'), killAdviceText(result, advice));
    const summaryNote = host.querySelector('.pest-vacuum-head .pest-note');
    setTextIfChanged(summaryNote, killResultText(result));

    const pulls = host.querySelector('[data-vacuum-pulls]');
    for (const [index, row] of (result?.contexts || []).entries()) {
      const node = pulls?.children?.[index];
      if (!node) continue;
      setTextIfChanged(node.querySelector('strong'), `${row.pulls} pull${row.pulls === 1 ? '' : 's'}`);
      node.classList.toggle('one-shot', row.oneShot);
    }
  };
  for (const field of Object.values(vacuumFields)) {
    field?.addEventListener(field.tagName === 'SELECT' ? 'change' : 'input', refreshVacuum);
  }

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
