import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

/**
 * Three modules render into the planner page, and they all used to reach for
 * `.planner-list` by bare class name.
 *
 * `revenue-planner.js` inserts its own `.planner-list.revenue-list` *before*
 * the core list from `app.js`, so `document.querySelector('.planner-list')`
 * stopped meaning "the core list" the moment the revenue ranking existed. Since
 * `activity-mode-ui.js` loads after it and overwrites that element's innerHTML
 * wholesale, the visible cost and payback column was silently replaced by the
 * activity rows -- no error, no duplicate, just the wrong list on screen.
 *
 * So the rule is: whoever writes into the core list says which list it means.
 */

const read = name => readFileSync(new URL(`../src/${name}`, import.meta.url), 'utf8');

/** Every `.planner-list` selector string in a module, with its qualifiers. */
function plannerListSelectors(source) {
  // No newlines inside the match: a block comment mentioning the class would
  // otherwise be read as one enormous string literal.
  return [...source.matchAll(/'([^'\n]*\.planner-list[^'\n]*)'/g)].map(match => match[1]);
}

test('the revenue ranking owns its own list and marks the core one', () => {
  const planner = read('revenue-planner.js');
  // It claims the core list by class rather than by position, which is what
  // lets the other modules exclude it.
  assert.match(planner, /panel\.className = 'revenue-planner-v2'/);
  assert.match(planner, /class="planner-list revenue-list"/);
  assert.match(planner, /original\.classList\.add\('planner-v1-source'\)/);
  assert.match(planner, /original\.before\(panel\)/);
});

test('nothing writes into whichever planner list happens to come first', () => {
  for (const name of ['activity-mode-ui.js', 'ux-simplify.js']) {
    for (const selector of plannerListSelectors(read(name))) {
      assert.match(
        selector,
        /:not\(\.revenue-list\)[\s\S]*:not\(\.planner-mode-list\)/,
        `${name} selects "${selector}", which can match an enhancement's own list`,
      );
    }
  }
});

test('the enhancement lists carry the classes those exclusions name', () => {
  assert.match(read('revenue-planner.js'), /planner-list revenue-list/);
  assert.match(read('planner-mode-ui.js'), /planner-list planner-mode-list/);
});

test('the activity rows and the revenue rows stay separable', () => {
  // They are distinguished by their open-hooks, and `ux-simplify` filters on a
  // third one that only the core rows have. All three must stay distinct.
  assert.match(read('revenue-planner.js'), /data-revenue-open=/);
  assert.match(read('activity-mode-ui.js'), /data-mode-open=/);
  assert.match(read('ux-simplify.js'), /\.planner-row\[data-open\]/);
});

test('a goal mode leaves exactly one ranking on the page', () => {
  // `planner-mode-ui.js` sets `hidden` on the revenue panel, but a class rule
  // carrying `display` outranks the UA `[hidden] { display: none }`, so the
  // coin ranking stayed visible above the goal list -- two rankings at once.
  const modes = read('planner-mode-ui.js');
  assert.match(modes, /revenue\.hidden = true/);
  const css = read('revenue-planner.css').replace(/\/\*[\s\S]*?\*\//g, '');
  assert.match(css, /\.revenue-planner-v2\[hidden\]\s*\{[^}]*display:\s*none/);
  // And the rule that made `hidden` powerless is still the one being overridden.
  assert.match(css, /\.revenue-planner-v2\s*\{[^}]*display:\s*grid/);
});
