import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

/**
 * A module that anchors to markup nobody renders is silently dead.
 *
 * Commit 546c4cb rewrote the dashboard into the read-only stats overview and
 * dropped `.hero-grid` and `.hero-card.primary`. It touched only `src/app.js`.
 * Three modules anchored to those classes, and from that commit on
 * `dashboard-guide.js` -- the Farming phase, the next armour milestone, the
 * "best next steps" list and the whole 0-60 roadmap -- never rendered again.
 * Nothing failed: the selector simply returned null and the module returned
 * early, which is exactly what it is supposed to do on every other page.
 *
 * No unit test saw it, because each module is correct in isolation. The sweep
 * did not see it either, because nothing crashed. What was missing was a check
 * that the two halves still agree, so this asserts the contract itself: every
 * class an enhancer looks for must be a class something in the app writes.
 */

const SRC = new URL('../src/', import.meta.url);
const files = readdirSync(SRC).filter(name => name.endsWith('.js'));
const sources = new Map(files.map(name => [name, readFileSync(new URL(name, SRC), 'utf8')]));

/**
 * Class names any module writes into the DOM, however it writes them.
 *
 * A class list is read token by token rather than whole, because most of them
 * are template literals: `class="item-card ${selected}"` writes `item-card`
 * for certain, and whatever `selected` holds is none of this check's business.
 * Discarding the whole attribute over the interpolation in it reported a third
 * of the app as orphaned on the first run.
 */
function producedClasses() {
  const produced = new Set();
  const addList = list => {
    for (const name of list.split(/\s+/)) {
      // Literal identifiers only: a token carrying `${`, a quote or a brace is
      // a computed fragment, not a class name this file can vouch for.
      if (/^[A-Za-z][A-Za-z0-9_-]*$/.test(name)) produced.add(name);
    }
  };
  for (const source of sources.values()) {
    for (const [, list] of source.matchAll(/class=["']([^"'`]*)["']/g)) addList(list);
    for (const [, list] of source.matchAll(/className\s*[=:]\s*['"`]([^'"`]*)['"`]/g)) addList(list);
    for (const [, args] of source.matchAll(/classList\.(?:add|toggle|remove|replace)\(([^)]*)\)/g)) {
      for (const [, name] of args.matchAll(/['"`]([A-Za-z][A-Za-z0-9_-]*)['"`]/g)) produced.add(name);
    }
  }
  return produced;
}

/**
 * The class each query anchors on, with the module it came from.
 *
 * Only the first class of a selector. `.sb-tool-card.selected` exists or does
 * not exist because of `sb-tool-card`; `selected` is a state this file cannot
 * see, because it is written as `${chosen ? 'selected' : ''}`. Checking every
 * class in the selector reported those state classes as missing markup, which
 * is noise that would have buried the real finding.
 */
function queriedAnchors() {
  const anchors = [];
  for (const [name, source] of sources) {
    for (const line of source.split('\n')) {
      // A query whose line also removes what it found is not an anchor at all.
      // Deleting markup an older build left behind is the one case where
      // looking for a class nothing writes any more is the correct thing to do.
      if (/\.remove\(\)/.test(line)) continue;
      for (const [, selector] of line.matchAll(/querySelector(?:All)?\(\s*['"]([^'"]+)['"]/g)) {
        const first = selector.match(/^\s*[^,]*?\.([A-Za-z][A-Za-z0-9_-]*)/);
        if (first) anchors.push({ module: name, selector, cls: first[1] });
      }
    }
  }
  return anchors;
}

/**
 * Anchors known to point at markup that is no longer rendered, and which the
 * change introducing this test does not repair.
 *
 * This list may only shrink. A new orphan fails the first assertion; an entry
 * repaired without being removed fails the second, so it cannot rot into a
 * blanket exemption.
 *
 * All three belong to a second dead region this same test found:
 * `enhancements.js` still targets the gear editor as it existed before
 * `item-editor.js`. That is not a rename -- the editor is `.item-editor` with
 * `.enchant-line` rows now, and the screenshot scanner writes into
 * `[data-ench-name]` inputs the current editor does not emit. Reviving it means
 * re-targeting every field and re-verifying the OCR, which is its own change.
 */
const KNOWN_ORPHANS = [
  // The rest of what commit 546c4cb orphaned. Unlike `dashboard-guide.js`,
  // which this change repairs, these are dead *simplification* passes over the
  // old dashboard -- hiding a stat tile, rewriting a hero card, folding pages
  // into a hub. The page they simplified no longer exists, so there is no
  // behaviour to restore; deleting them is a separate tidy-up.
  'activity-mode-ui.js .hero-card',
  'enhancements.js .hero-grid',
  'revenue-planner.js .hero-card',
  'ux-simplify.js .fortune-pill',
  'ux-simplify.js .hero-card',
  'ux-simplify.js .hero-grid',
  'enhancements.js .enchant-row',
  'enhancements.js .layer-tabs',
  'enhancements.js .slot-editor',
];

function orphanedAnchors() {
  const produced = producedClasses();
  const seen = new Map();
  for (const entry of queriedAnchors()) {
    if (produced.has(entry.cls)) continue;
    seen.set(`${entry.module} .${entry.cls}`, entry);
  }
  return seen;
}

test('no module anchors to markup nobody renders', () => {
  const unexpected = [...orphanedAnchors()]
    .filter(([key]) => !KNOWN_ORPHANS.includes(key))
    .map(([key, entry]) => `${key} - looks for "${entry.selector}"`);
  assert.deepEqual(unexpected, [], `orphaned anchors:\n${unexpected.join('\n')}`);
});

test('the known-orphan list holds nothing that has since been repaired', () => {
  const still = orphanedAnchors();
  const stale = KNOWN_ORPHANS.filter(key => !still.has(key));
  assert.deepEqual(stale, [], `repaired - delete these from KNOWN_ORPHANS:\n${stale.join('\n')}`);
});
