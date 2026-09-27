import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = name => readFileSync(new URL(`../src/${name}`, import.meta.url), 'utf8');

test('the Pest analysis UI is wired into Info', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(html, /src\/pest-analysis-ui\.js/);
  assert.match(html, /src\/pest-ui\.css/);
});

test('Pest explanations and analysis share the Info workspace', () => {
  const pests = read('pest-analysis-ui.js');
  const app = read('app.js');

  assert.doesNotMatch(pests, /Two pipelines, different stats/);
  assert.doesNotMatch(pests, /Which pest, which plot/);
  assert.match(app, /function infoPestGuide\(\)/);
  assert.match(app, /Two pipelines, different stats/);
  assert.match(app, /Which pest, which crop/);
  assert.match(app, /Bonus Pest Chance belongs to spawning/);
  assert.match(app, /Overbloom affects the non-guaranteed roll/);
});

test('the Pest analysis UI keeps the analysis and conversion tools', () => {
  const page = read('pest-analysis-ui.js');
  assert.match(page, /Does your Vacuum one-shot a pest\?/);
  assert.match(page, /Pesthunter Phillip conversion/);
  assert.match(page, /Configure the physical Vacuum under Tools/);
});

test('the analysis renders once, not once per mutation', () => {
  const page = read('pest-analysis-ui.js');
  assert.match(page, /if \(!content \|\| content\.querySelector\('\.pest-analysis-addon'\)\) return;/);
  assert.match(page, /queueMicrotask\(applyPestAnalysis\)/);
  assert.match(page, /pageId\(\) !== 'info'/);
});

test('the optional converter stays a working details element', () => {
  const page = read('pest-analysis-ui.js');
  assert.match(page, /<summary><div class="pest-philip-head">/);
  const css = read('pest-ui.css').replace(/\/\*[\s\S]*?\*\//g, '');
  assert.match(css, /\.pest-philip-head \{[^}]*display: flex/);
  assert.doesNotMatch(css, /\.pest-philip\s*>\s*summary \{[^}]*display: flex/);
});

test('the analysis UI answers the render-freeze checklist', () => {
  const page = read('pest-analysis-ui.js');

  assert.match(page, /new MutationObserver\(\(\) => queueMicrotask\(applyPestAnalysis\)\)/);
  assert.match(page, /content\.querySelector\('\.pest-analysis-addon'\)\) return/);
  assert.match(page, /import \{ setTextIfChanged \} from '\.\/set-text\.js'/);
  assert.doesNotMatch(page, /\.textContent\s*=/);

  assert.doesNotMatch(page, /farming420:state-changed/);
  assert.doesNotMatch(page, /localStorage\.setItem/);
  assert.doesNotMatch(page, /data-vacuum-id|data-vacuum-books|data-vacuum-reforge/);
  assert.doesNotMatch(page, /cloneNode/);
});

test('Vacuum configuration belongs to Tools and Info analysis only reads it', () => {
  const pests = read('pest-analysis-ui.js');
  const capabilities = read('loadout-capabilities-ui.js');

  assert.match(capabilities, /if \(raw\.page !== 'tools'\) return/);
  assert.doesNotMatch(capabilities, /if \(raw\.page !== 'info'\) return/);
  assert.match(capabilities, /data-vacuum-panel/);
  assert.match(capabilities, /data-vacuum-section="reforge"/);

  assert.match(pests, /raw\?\.profile\?\.vacuumProgress/);
  assert.doesNotMatch(pests, /<select data-vacuum-id>/);
});

test('the Pest analysis UI does not import unrelated enhancers', () => {
  const page = read('pest-analysis-ui.js');
  for (const enhancer of ['setup-selection-ui.js', 'activity-mode-ui.js', 'ux-simplify.js', 'skyblock-redesign.js']) {
    assert.doesNotMatch(page, new RegExp(`from '\\.\\/${enhancer.replace('.', '\\.')}'`));
  }
});


test('Pest analysis mounts after the Info Pest guide, not on a standalone page', () => {
  const page = read('pest-analysis-ui.js');
  assert.match(page, /pageId\(\) !== 'info'/);
  assert.match(page, /querySelector\('#info-pests'\)/);
  assert.doesNotMatch(page, /pageId\(\) !== 'pests'/);
});
