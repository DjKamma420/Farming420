import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

/**
 * The Pests page held one card, with no art, marked VERIFY -- on a page whose
 * whole subject is that two pipelines take different stats.
 */

const read = name => readFileSync(new URL(`../src/${name}`, import.meta.url), 'utf8');

test('the page is wired into the app', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(html, /src\/pests-page\.js/);
  assert.match(html, /src\/pests-page\.css/);
});

test('the page states the rule that costs coins when guessed', () => {
  const page = read('pests-page.js');
  assert.match(page, /Overbloom, not Farming Fortune/);
  assert.match(page, /rare-drop\s*\n?\s*chance by nothing/);
});

test('the crop art table is borrowed, not copied', () => {
  // The app has already had two rarity ladders and two taskbar rules. A second
  // crop-art table would be the third of that kind.
  assert.match(read('pests-page.js'), /import \{ cropArtUrl \} from '\.\/skyblock-redesign\.js'/);
  assert.match(read('skyblock-redesign.js'), /export const CROP_ART/);
  assert.match(read('skyblock-redesign.js'), /export function cropArtUrl/);
  assert.doesNotMatch(read('pests-page.js'), /theoretical_hoe_wheat|compacted_sunflower/);
});

test('the page renders once, not once per mutation', () => {
  // Every enhancement here is observer-driven over a core that rewrites #app
  // wholesale, so the guard is the difference between one panel and a hang.
  const page = read('pests-page.js');
  assert.match(page, /if \(!content \|\| content\.querySelector\('\.pest-explainer'\)\) return;/);
  assert.match(page, /queueMicrotask\(applyPestsPage\)/);
  assert.match(page, /pageId\(\) !== 'pests'/);
});

test('the icon placeholder is covered, not stacked', () => {
  const css = read('pests-page.css').replace(/\/\*[\s\S]*?\*\//g, '');
  // The letter shows while the manifest loads; the texture then covers it.
  assert.match(css, /\.pest-crop-icon img \{[^}]*position: absolute/);
  assert.match(css, /\.pest-crop-icon img \{[^}]*z-index: 1/);
  // And the icon's layering stays inside its own box, the way the Tools page
  // icon had to after it painted over the sticky topbar.
  assert.match(css, /\.pest-crop-icon \{[^}]*isolation: isolate/);
});

test('the optional converter stays a working <details>', () => {
  const page = read('pests-page.js');
  // A <summary> given `display: flex` stops being the disclosure summary, so
  // the flex row lives on an inner div -- the same trap the planner hit.
  assert.match(page, /<summary><div class="pest-philip-head">/);
  const css = read('pests-page.css').replace(/\/\*[\s\S]*?\*\//g, '');
  assert.match(css, /\.pest-philip-head \{[^}]*display: flex/);
  assert.doesNotMatch(css, /\.pest-philip\s*>\s*summary \{[^}]*display: flex/);
});

test('the page answers the render-freeze checklist', () => {
  // docs/RENDER_FREEZE_SAFETY.md, rules 1-3 and 8. This module observes the
  // same subtree it writes into, which is the shape that froze the app in
  // PR #90.
  const page = read('pests-page.js');

  // What wakes it up, and what makes the second pass a no-op.
  assert.match(page, /new MutationObserver\(\(\) => queueMicrotask\(applyPestsPage\)\)/);
  assert.match(page, /content\.querySelector\('\.pest-explainer'\)\) return;/);

  // Text inside the observed subtree goes through the shared guard rather than
  // being assigned unconditionally -- assigning the same string still replaces
  // the text node and emits another childList mutation.
  assert.match(page, /import \{ setTextIfChanged \} from '\.\/setup-selection-ui\.js'/);
  assert.doesNotMatch(page, /\.textContent\s*=/);

  // Rule 5: no storage write and no state-changed dispatch at all, so the
  // observer cannot cause a render.
  assert.doesNotMatch(page, /localStorage\.setItem|farming420:state-changed/);

  // Rule 6: nothing interactive is cloned.
  assert.doesNotMatch(page, /cloneNode/);
});

test('one writer per concern: nothing else builds this panel', () => {
  // Rule 7. The planner page already had three modules writing one list.
  const owners = ['pests-page.js', 'skyblock-redesign.js', 'ux-simplify.js', 'activity-mode-ui.js']
    .filter(name => /pest-page-addon|pest-explainer/.test(read(name)));
  assert.deepEqual(owners, ['pests-page.js']);
});
