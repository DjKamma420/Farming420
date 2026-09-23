import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

/**
 * Two boot costs that were measured, fixed, and are easy to undo by accident.
 *
 * Measured at 412px with 4x CPU throttling, by instrumenting `render` directly:
 *
 * | | renders | build | innerHTML | bind | scroll | total |
 * |---|---:|---:|---:|---:|---:|---:|
 * | before | 3 | 135.6 | 29.1 | 8.0 | 165.9 | 338.6 ms |
 * | after | 2 | 66.7 | 12.6 | 3.3 | 0.0 | 82.6 ms |
 *
 * Neither number is asserted here. Timing in CI is flaky, and the honest
 * observable -- the `farming420:state-changed` dispatch that
 * `computed-stats-ui.js` used to fire -- happens before `load`, so the browser
 * harness cannot see it from outside either. (That was checked: a post-load
 * shell-rebuild counter reports 1 both with and without the fix, so shipping it
 * as a guard would have proven nothing.)
 *
 * What is asserted is the mechanism, so neither fix can be reverted silently.
 */

const app = readFileSync(new URL('../src/app.js', import.meta.url), 'utf8');

test('scroll is restored only when there is something to restore', () => {
  // Assigning `scrollTop` and calling `window.scrollTo` force a full layout of
  // the markup assigned one line earlier. At boot every captured value is zero,
  // because the document was just created at the origin -- 166 ms of forced
  // layout to move the page from 0 to 0.
  assert.match(app, /const hasScrollToRestore = Boolean\(scrollState && \(/);
  assert.match(app, /if \(hasScrollToRestore\) \{/);
  assert.doesNotMatch(app, /\n  if \(scrollState\) \{/, 'the unguarded restore is back');

  // The guard must still let a real scroll position through, including one
  // held only by the relative anchor.
  const condition = app.match(/const hasScrollToRestore = Boolean\(scrollState && \(([\s\S]*?)\)\);/)[1];
  for (const field of ['scrollState.main', 'scrollState.nav', 'scrollState.windowX', 'scrollState.windowY', 'relativeAnchor']) {
    assert.ok(condition.includes(field), `${field} would no longer be restored`);
  }
});

test('the derived stat cache is warm before the first paint', () => {
  // Otherwise `computed-stats-ui.js` finds the stored cache stale on its first
  // observer pass, writes it, and dispatches `farming420:state-changed` to make
  // the core pick it up -- a second full render of the page that was just
  // rendered, and a rule 5 violation in docs/RENDER_FREEZE_SAFETY.md.
  assert.match(app, /import \{ applyComputedStatsToState, computeStatTotals \} from '\.\/computed-stats\.js';/);

  const warm = app.indexOf('applyComputedStatsToState(state);');
  const boot = app.search(/^render\(\);$/m);
  assert.ok(warm > 0, 'the core no longer warms the derived cache');
  assert.ok(boot > 0, 'the boot render call moved');
  assert.ok(warm < boot, 'the cache is warmed after the first render, which defeats the point');

  // Warming in memory is not enough: the enhancer compares against *stored*
  // state, so the warm value has to be persisted or it will dispatch anyway.
  const between = app.slice(warm, boot);
  assert.match(between, /saveState\(\);/, 'the warmed cache is never saved');
});
