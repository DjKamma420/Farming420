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
import { CROPS } from './data.js';
import {
  GARDEN_PESTS,
  LOOT_PIPELINE,
  PESTHUNTER_PHILIP,
  PEST_HEALTH,
  PEST_STAT_SIDES,
  SPAWN_PIPELINE,
  philipFortuneFor,
} from './pest-model.js';
import { setTextIfChanged } from './setup-selection-ui.js';
import { cropArtUrl } from './skyblock-redesign.js';

function esc(value = '') {
  return String(value).replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;',
  }[char]));
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
  const letter = `<span class="pest-crop-letter">${esc(pest.crop.slice(0, 1))}</span>`;
  if (!url) return `<span class="pest-crop-icon">${letter}</span>`;
  return `<span class="pest-crop-icon">${letter}<img src="${esc(url)}" alt="" loading="lazy" role="img" aria-label="${esc(pest.crop)}"></span>`;
}

function knownCropName(pest) {
  return CROPS.find(crop => crop.id === pest.cropId)?.name || pest.crop;
}

function pestTableMarkup() {
  return GARDEN_PESTS.map(pest => `
    <div class="pest-row">
      ${cropIcon(pest)}
      <div class="pest-main"><strong>${esc(pest.name)}</strong><span>spawns on ${esc(knownCropName(pest))}</span></div>
      <div class="pest-vinyl"><strong>${esc(pest.vinyl)}</strong><span>vinyl</span></div>
    </div>`).join('');
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

function panelMarkup() {
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
          <p>The plot's crop decides the pest, and the pest decides the vinyl.
            ${GARDEN_PESTS.length} standard types; special types are not in this mapping.</p>
        </div>
      </div>
      <div class="pest-list">${pestTableMarkup()}</div>
      <p class="pest-note">${PEST_HEALTH.normal} HP each. ${esc(PEST_HEALTH.derpyNote)}</p>
    </section>

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

  const host = document.createElement('div');
  host.className = 'pest-page-addon';
  host.innerHTML = panelMarkup();
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
