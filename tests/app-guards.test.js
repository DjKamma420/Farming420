import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

/**
 * Static guards on `src/app.js`.
 *
 * The render loop cannot be imported into Node, so these check the source for
 * shapes that caused real defects. They are deliberately narrow: each one
 * pins a specific bug that shipped, not a style preference.
 */
const app = readFileSync(new URL('../src/app.js', import.meta.url), 'utf8');

test('the item catalogue loader cannot re-enter through its own re-render', () => {
  // The bug: `ensureItemCatalog` returned early only when items had been
  // loaded, and re-rendered afterwards. A resource that came back empty or
  // failed therefore triggered a render, which called the loader again, which
  // rendered again -- an endless loop pegging the CPU.
  const body = /async function ensureItemCatalog\(\)\s*\{([\s\S]*?)\n\}/.exec(app)?.[1];
  assert.ok(body, 'ensureItemCatalog not found');

  const guardIndex = body.indexOf('if (catalogRequested) return;');
  const flagIndex = body.indexOf('catalogRequested = true;');
  const awaitIndex = body.indexOf('await ');

  assert.ok(guardIndex >= 0, 'the loader must return early once a load was requested');
  assert.ok(flagIndex >= 0, 'the loader must record that it was requested');
  assert.ok(flagIndex < awaitIndex, 'the flag must be set before awaiting, or two renders race into two loads');
  assert.ok(guardIndex < flagIndex, 'the guard must come first');
  assert.ok(!/if \(itemCatalog\.length\) return;/.test(body), 'guarding on the result re-enters when the result is empty');
});

test('the repaint after loading depends on the result, not only on the page', () => {
  // Repainting whenever the page happens to be open is what closed the loop.
  const body = /async function ensureItemCatalog\(\)\s*\{([\s\S]*?)\n\}/.exec(app)?.[1] || '';
  const repaint = /if \((.+?)\)\s*render\(\);/.exec(body)?.[1];
  assert.ok(repaint, 'the loader must repaint through a guarded condition');
  assert.match(repaint, /result\./, 'the condition must inspect the load result');
});

test('the setups page binds its handlers after every render', () => {
  // Re-rendering replaces the DOM, so handlers bound once would go dead.
  assert.match(app, /bindSetups\(\);/, 'bindSetups must be called from render');
});
