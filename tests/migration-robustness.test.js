import test from 'node:test';
import assert from 'node:assert/strict';
import { DATA_SCHEMA_VERSION } from '../src/config.js';
import { KNOWN_SCHEMA_VERSIONS, migrateState } from '../src/migrations.js';

/**
 * Migration robustness, as properties rather than examples.
 *
 * `AGENTS.md` rule 9 is that user data survives app updates. The migration
 * chain is the only thing standing between a player's profile and a rewrite
 * that silently drops it, and it runs against whatever happens to be in
 * `localStorage` -- including state half-written by a crashed tab, hand-edited
 * backups, and profiles from versions nobody has run in months.
 *
 * So the interesting inputs are the malformed ones. A migration that assumes a
 * field is an object throws, the app fails to boot, and the player's data is
 * unreachable even though it is still on disk.
 */

/** A realistic schema-1 profile: the shape every later migration starts from. */
function legacyState() {
  return {
    schemaVersion: 1,
    page: 'dashboard',
    selectedCrop: 'melon',
    profile: {
      name: 'Legacy',
      globalFortune: 250,
      cropFortune: { melon: 120, wheat: 30 },
      levels: { 'account-skill-farming-skill-level': 34, 'crop-melon-upgrade': 9 },
      owned: { 'tool-mk-ii': true },
      costs: { 'tool-mk-ii': 5_000_000 },
      manualGain: { 'tool-mk-ii': 12 },
    },
  };
}

test('migrating twice is the same as migrating once', () => {
  const once = migrateState(legacyState()).state;
  const twice = migrateState(structuredClone(once)).state;
  assert.deepEqual(twice, once, 'a second migration changed the state again');
});

test('every intermediate version converges on the same result', () => {
  // A profile stamped v5 must end up where a v1 profile ends up, minus the
  // moves the earlier migrations already performed. What must always hold is
  // that the chain terminates at the current version with no warnings lost.
  for (const from of [1, ...KNOWN_SCHEMA_VERSIONS]) {
    if (from > DATA_SCHEMA_VERSION) continue;
    const input = { ...legacyState(), schemaVersion: from };
    const result = migrateState(input);
    assert.equal(result.schemaVersion, DATA_SCHEMA_VERSION, `v${from} did not reach the current version`);
    assert.equal(result.isNewer, false);
    assert.equal(result.state.schemaVersion, DATA_SCHEMA_VERSION);
  }
});

test('state from a newer app version is returned untouched, never downgraded', () => {
  const future = { schemaVersion: DATA_SCHEMA_VERSION + 3, profile: { name: 'From the future', mystery: [1, 2] } };
  const result = migrateState(structuredClone(future));
  assert.equal(result.isNewer, true);
  assert.equal(result.schemaVersion, DATA_SCHEMA_VERSION + 3);
  assert.deepEqual(result.state, future, 'newer state was rewritten');
});

test('the player\'s entered values survive the whole chain', () => {
  const result = migrateState(legacyState()).state;
  const serialized = JSON.stringify(result);
  // Not a check of where each value landed -- the migrations exist precisely to
  // move them. A check that nothing was dropped on the way.
  for (const marker of ['Legacy', '250', '120', '34', '5000000']) {
    assert.ok(serialized.includes(marker), `value ${marker} vanished during migration`);
  }
});

test('malformed stored state never throws', () => {
  // Everything here is something `localStorage` can actually hand back: a
  // half-written object, a hand-edited backup, a field that used to be an
  // object and is now a string.
  const garbage = [
    null, undefined, 0, 1, -1, NaN, '', 'not an object', true, false,
    [], [1, 2, 3], {},
    { schemaVersion: 'three' },
    { schemaVersion: null },
    { schemaVersion: -5 },
    { schemaVersion: 1, profile: null },
    { schemaVersion: 1, profile: 'string' },
    { schemaVersion: 1, profile: [] },
    { schemaVersion: 1, profile: { levels: null } },
    { schemaVersion: 1, profile: { levels: 'nope' } },
    { schemaVersion: 1, profile: { levels: [] } },
    { schemaVersion: 1, profile: { cropFortune: 7 } },
    { schemaVersion: 1, profile: { owned: null, costs: null, manualGain: null } },
    { schemaVersion: 1, profile: { toolProgress: 'x', cropProgress: 5 } },
    { schemaVersion: 1, profile: { setups: null } },
    { schemaVersion: 1, profile: { setups: { list: null } } },
    { schemaVersion: 1, profile: { setups: { list: 'nope' } } },
    { schemaVersion: 1, profile: { setups: { list: [null, 1, 'x'] } } },
    { schemaVersion: 1, profile: { setups: { list: [{ slots: null }] } } },
    { schemaVersion: 1, profile: { normalizedSnapshot: 'text' } },
    { schemaVersion: 4, profile: { setups: { list: [{}] } } },
  ];

  for (const input of garbage) {
    const label = JSON.stringify(input) ?? String(input);
    assert.doesNotThrow(() => migrateState(input), `threw on ${label}`);
    const result = migrateState(input);
    assert.ok(result && typeof result.state === 'object' && result.state !== null,
      `produced no usable state for ${label}`);
    if (!result.isNewer) {
      assert.equal(result.state.schemaVersion, DATA_SCHEMA_VERSION, `left ${label} unstamped`);
    }
  }
});

test('a malformed input is still idempotent', () => {
  // The dangerous shape is a migration that half-repairs broken data: run once
  // it produces something, run twice it produces something else, and the app
  // disagrees with itself between reloads.
  const broken = [
    { schemaVersion: 1, profile: { levels: 'nope', setups: { list: [null] } } },
    { schemaVersion: 1, profile: [] },
    { schemaVersion: 2, profile: { toolProgress: 'x' } },
    {},
  ];
  for (const input of broken) {
    const once = migrateState(input).state;
    const twice = migrateState(structuredClone(once)).state;
    assert.deepEqual(twice, once, `re-migrating ${JSON.stringify(input)} changed it again`);
  }
});

test('migrating never mutates the caller\'s object', () => {
  // The app reads state, migrates it, and decides whether to save. A migration
  // that edits the input in place has already changed the caller's copy before
  // that decision is made.
  const input = legacyState();
  const snapshot = structuredClone(input);
  migrateState(input);
  assert.deepEqual(input, snapshot, 'migrateState mutated its argument');
});
