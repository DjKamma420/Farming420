import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = name => readFileSync(new URL(`../src/${name}`, import.meta.url), 'utf8');

test('the Pest analysis page is wired into the app', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(html, /src\/pests-page\.js/);
  assert.match(html, /src\/pests-page\.css/);
});

test('Pest explanations moved to Info instead of staying on the analysis page', () => {
  const pests = read('pests-page.js');
  const app = read('app.js');

  assert.doesNotMatch(pests, /Two pipelines, different stats/);
  assert.doesNotMatch(pests, /Which pest, which plot/);
  assert.match(app, /function infoPestGuide\(\)/);
  assert.match(app, /Two pipelines, different stats/);
  assert.match(app, /Which pest, which crop/);
  assert.match(app, /Bonus Pest Chance belongs to spawning/);
  assert.match(app, /Overbloom affects the non-guaranteed roll/);
});

test('the Pests page now keeps only analysis and conversion tools', () => {
  const page = read('pests-page.js');
  assert.match(page, /Does your Vacuum one-shot a pest\?/);
  assert.match(page, /Pesthunter Phillip conversion/);
  assert.match(page, /Configure the physical Vacuum under Tools/);
});

test('the page renders once, not once per mutation', () => {
  const page = read('pests-page.js');
  assert.match(page, /if \(!content \|\| content\.querySelector\('\.pest-page-addon'\)\) return;/);
  assert.match(page, /queueMicrotask\(applyPestsPage\)/);
  assert.match(page, /pageId\(\) !== 'pests'/);
});

test('the optional converter stays a working details element', () => {
  const page = read('pests-page.js');
  assert.match(page, /<summary><div class="pest-philip-head">/);
  const css = read('pests-page.css').replace(/\/\*[\s\S]*?\*\//g, '');
  assert.match(css, /\.pest-philip-head \{[^}]*display: flex/);
  assert.doesNotMatch(css, /\.pest-philip\s*>\s*summary \{[^}]*display: flex/);
});

test('the analysis page answers the render-freeze checklist', () => {
  const page = read('pests-page.js');

  assert.match(page, /new MutationObserver\(\(\) => queueMicrotask\(applyPestsPage\)\)/);
  assert.match(page, /content\.querySelector\('\.pest-page-addon'\)\) return/);
  assert.match(page, /import \{ setTextIfChanged \} from '\.\/set-text\.js'/);
  assert.doesNotMatch(page, /\.textContent\s*=/);

  assert.doesNotMatch(page, /farming420:state-changed/);
  assert.doesNotMatch(page, /localStorage\.setItem/);
  assert.doesNotMatch(page, /data-vacuum-id|data-vacuum-books|data-vacuum-reforge/);
  assert.doesNotMatch(page, /cloneNode/);
});

test('Vacuum configuration belongs to Tools and Pests only reads it', () => {
  const pests = read('pests-page.js');
  const capabilities = read('loadout-capabilities-ui.js');

  assert.match(capabilities, /if \(raw\.page !== 'tools'\) return/);
  assert.doesNotMatch(capabilities, /if \(raw\.page !== 'pests'\) return/);
  assert.match(capabilities, /data-vacuum-panel/);
  assert.match(capabilities, /Pest Vacuum/);

  assert.match(pests, /raw\?\.profile\?\.vacuumProgress/);
  assert.doesNotMatch(pests, /<select data-vacuum-id>/);
});

test('the Pest analysis enhancer does not import unrelated enhancers', () => {
  const page = read('pests-page.js');
  for (const enhancer of ['setup-selection-ui.js', 'activity-mode-ui.js', 'ux-simplify.js', 'skyblock-redesign.js']) {
    assert.doesNotMatch(page, new RegExp(`from '\\.\\/${enhancer.replace('.', '\\.')}'`));
  }
});
