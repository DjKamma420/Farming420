import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

/**
 * Money is kept, not shown.
 *
 * The planner answers "what should I upgrade next". Coin figures are an input
 * to that ranking, not something the reader has to hold in their head, so the
 * economics inputs live behind a disclosure that starts closed and the ranking
 * works without them.
 */
const read = path => readFileSync(new URL(`../src/${path}`, import.meta.url), 'utf8');

test('the economics panel is a disclosure, closed by default', () => {
  const src = read('revenue-planner.js');
  assert.match(src, /<details class="revenue-panel revenue-economics">/, 'the panel must be a <details>');
  assert.ok(
    !/<details class="revenue-panel revenue-economics"[^>]*\bopen\b/.test(src),
    'it must not ship open',
  );
});

test('the summary stays block-level', () => {
  // A <summary> given `display: flex` stops counting as the disclosure summary
  // in Chromium: the <details> is left without one and every child renders as
  // if the panel were permanently open.
  const src = read('revenue-planner.js');
  assert.match(src, /<summary class="revenue-summary">/, 'the summary must not carry the flex head class');
  assert.match(
    src,
    /<summary class="revenue-summary">\s*<div class="revenue-panel-head">/,
    'the flex row belongs to an inner div',
  );
});

test('the coin total is gone from the gemstone summary', () => {
  assert.ok(
    !/Coins in recorded unlock costs/.test(read('workspace-ui.js')),
    'the Fortune is the answer there; the coin total beside it read "0 Coins" until costs happened to be recorded',
  );
});

test('the per-slot cost inputs are still there', () => {
  // Prices stay in the app. Only the reader is spared them.
  assert.match(read('workspace-ui.js'), /data-gem-cost=/, 'recording unlock costs must remain possible');
});
