import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

/**
 * `assetByCandidates` looks an item icon up in a 1,100-key manifest, falling
 * back to a substring scan across every key, for every candidate. It is called
 * once per rendered item.
 *
 * Measured at 412px with 4x CPU throttling, instrumenting the function itself:
 *
 * | | calls | time |
 * |---|---:|---:|
 * | boot, before | 14 | 9.4 ms |
 * | boot, after | 14 | **0.9 ms** |
 * | Tools navigation, before | 73 | 27.0 ms |
 * | Tools navigation, after | 73 | **4.1 ms** |
 *
 * 103,400 string comparisons and 73 freshly allocated 1,100-element key arrays
 * per navigation, for answers that do not change between renders.
 *
 * At page level the Tools navigation's script time moved from a median 196 ms
 * to 164 ms over three runs each; the ranges overlap, so the isolated numbers
 * above are the honest measurement and the page-level one is the noisy
 * corroboration. This does **not** fix the Tools page: 164 ms of script, 28 ms
 * of style and ~90 ms of layout remain, and the bulk of the script time is the
 * enhancement layer, not this function.
 *
 * The module cannot be imported here -- it touches `document` at load -- so this
 * pins the mechanism rather than the behaviour.
 */

const source = readFileSync(new URL('../src/skyblock-redesign.js', import.meta.url), 'utf8');

test('the manifest key list is built once, not per call', () => {
  const body = source.match(/function assetByCandidates\([\s\S]*?\n}/)[0];

  // Exactly one `Object.keys`, and it has to sit inside the invalidation
  // branch. Asserting it is simply absent would be wrong -- the fix needs that
  // call, just not on every invocation.
  const keysCalls = [...body.matchAll(/Object\.keys\(/g)];
  assert.equal(keysCalls.length, 1, 'Object.keys should appear once, inside the invalidation branch');

  const guard = body.indexOf('if (assetMemoManifest !== items) {');
  const lookup = body.indexOf('assetMemo.has(memoKey)');
  assert.ok(guard >= 0, 'the manifest-identity guard is gone');
  assert.ok(keysCalls[0].index > guard, 'Object.keys ran before the identity guard, so it runs every call');
  assert.ok(keysCalls[0].index < lookup, 'the key list is built after the memo lookup, which defeats the memo');
});

test('the memo is invalidated by manifest identity, not left to go stale', () => {
  // A manifest that arrives or changes later must drop the whole memo. Keying
  // on anything weaker would serve answers derived from the previous one.
  const body = source.match(/function assetByCandidates\([\s\S]*?\n}/)[0];
  assert.match(body, /if \(assetMemoManifest !== items\) \{/);
  assert.match(body, /assetMemo\.clear\(\);/);
  assert.match(body, /assetMemoManifest = items;/);
});

test('a cached miss is remembered too', () => {
  // "No icon for this item" is the expensive answer -- it is the one that ran
  // the full substring scan and found nothing. Caching only the hits would
  // leave every miss paying full price on every render.
  const body = source.match(/function assetByCandidates\([\s\S]*?\n}/)[0];
  assert.match(body, /assetMemo\.set\(memoKey, found\);/);
  assert.doesNotMatch(body, /if \(found\) assetMemo\.set/, 'misses are no longer cached');
});
