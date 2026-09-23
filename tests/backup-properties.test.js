import test from 'node:test';
import assert from 'node:assert/strict';
import { BACKUP_FORMAT, BACKUP_VERSION, DATA_SCHEMA_VERSION } from '../src/config.js';
import { createBackupPayload, validateBackupPayload } from '../src/backup.js';

/**
 * Backup is the only way a player moves a profile between devices, and the only
 * way back from a broken one. A restore that throws something unintended leaves
 * them with an unexplained failure on the file that was supposed to be their
 * safety net, so the interesting inputs are the damaged ones.
 *
 * These are properties rather than examples: the example tests next door pin
 * the happy path, which is exactly the path that does not lose anyone's data.
 */

function realisticState() {
  return {
    schemaVersion: DATA_SCHEMA_VERSION,
    page: 'dashboard',
    selectedCrop: 'melon',
    profile: {
      name: 'Round trip',
      globalFortune: 812,
      cropFortune: { melon: 430, wheat: 90 },
      levels: { 'account-skill-farming-skill-level': 47 },
      owned: { 'tool-mk-ii': true },
      costs: { 'tool-mk-ii': 5_000_000 },
      manualGain: {},
      cropProgress: {},
      toolProgress: {},
    },
  };
}

test('a backup round-trips without losing anything the player entered', () => {
  const state = realisticState();
  const restored = validateBackupPayload(createBackupPayload(state)).state;
  const serialized = JSON.stringify(restored);
  for (const marker of ['Round trip', '812', '430', '47', '5000000']) {
    assert.ok(serialized.includes(marker), `${marker} did not survive the round trip`);
  }
});

test('restoring is stable: exporting what was restored restores the same thing', () => {
  // A round trip that keeps changing the state would drift a profile a little
  // further on every device hop.
  const once = validateBackupPayload(createBackupPayload(realisticState())).state;
  const twice = validateBackupPayload(createBackupPayload(once)).state;
  assert.deepEqual(twice, once);
});

test('creating a backup never mutates the state it was given', () => {
  const state = realisticState();
  const before = structuredClone(state);
  createBackupPayload(state);
  assert.deepEqual(state, before, 'createBackupPayload edited the live state');
});

test('creating a backup from junk never throws', () => {
  // `createBackupPayload` runs on whatever is in memory when the player clicks
  // Export -- including, after a bad restore or a failed migration, something
  // that is not a state at all. Refusing to produce a file is worse than
  // producing an odd one: the file is the only copy.
  for (const junk of [null, undefined, 0, '', 'text', true, [], [1, 2], { a: 1 }]) {
    assert.doesNotThrow(() => createBackupPayload(junk), `threw on ${JSON.stringify(junk) ?? String(junk)}`);
    const payload = createBackupPayload(junk);
    assert.equal(payload.format, BACKUP_FORMAT);
    assert.ok(Number.isFinite(payload.schemaVersion));
  }
});

test('every rejected file fails with an explanation, never a crash', () => {
  // The distinction that matters to a player: "This file is not a Farming420
  // backup" is an answer, `Cannot read properties of undefined` is not.
  const good = createBackupPayload(realisticState());
  const bad = [
    null, undefined, 0, 1, '', 'text', true, [], [good],
    {},
    { format: 'something-else', state: {} },
    { format: BACKUP_FORMAT },
    { format: BACKUP_FORMAT, state: null },
    { format: BACKUP_FORMAT, state: 'text' },
    { format: BACKUP_FORMAT, state: [] },
    { format: BACKUP_FORMAT, state: {}, backupVersion: BACKUP_VERSION + 1 },
    { format: BACKUP_FORMAT, state: {}, schemaVersion: DATA_SCHEMA_VERSION + 1 },
    { format: BACKUP_FORMAT, state: {}, schemaVersion: 0 },
    { format: BACKUP_FORMAT, state: {}, schemaVersion: -3 },
    { format: BACKUP_FORMAT, state: {}, schemaVersion: 'abc' },
    { format: BACKUP_FORMAT, state: {}, schemaVersion: {} },
    { format: BACKUP_FORMAT, state: {}, schemaVersion: [] },
  ];

  for (const payload of bad) {
    let thrown = null;
    let result = null;
    try { result = validateBackupPayload(payload); } catch (error) { thrown = error; }
    const label = (() => { try { return JSON.stringify(payload) ?? String(payload); } catch { return '(unserializable)'; } })();

    if (thrown) {
      assert.ok(thrown instanceof Error, `${label} threw a non-Error`);
      assert.ok(thrown.message.length > 12, `${label} threw without an explanation: ${thrown.message}`);
      assert.doesNotMatch(
        thrown.message,
        /Cannot read|undefined is not|is not a function|Assignment to constant/,
        `${label} surfaced an internal error to the player: ${thrown.message}`,
      );
    } else {
      // Accepting it is allowed, but only if what comes back is loadable.
      assert.ok(result?.state && typeof result.state === 'object', `${label} was accepted but returned no state`);
      assert.equal(result.state.schemaVersion, DATA_SCHEMA_VERSION, `${label} was accepted at the wrong schema`);
    }
  }
});

test('a file that carries no state is refused, not restored as an empty profile', () => {
  // Accepting it would hand the app a blank profile and save it over the real
  // one. "Nothing in the file" has to be an error, not an empty result.
  for (const payload of [
    { format: BACKUP_FORMAT, backupVersion: BACKUP_VERSION },
    { format: BACKUP_FORMAT, backupVersion: BACKUP_VERSION, state: null },
    { format: BACKUP_FORMAT, backupVersion: BACKUP_VERSION, state: 'text' },
    { format: BACKUP_FORMAT, backupVersion: BACKUP_VERSION, state: [] },
  ]) {
    assert.throws(
      () => validateBackupPayload(payload),
      /state/i,
      `${JSON.stringify(payload)} was restored instead of refused`,
    );
  }
});

test('a backup from a newer app version is refused, not partially read', () => {
  // Reading half of it and saving the result is how an older build silently
  // destroys data it does not understand.
  for (const payload of [
    { format: BACKUP_FORMAT, backupVersion: BACKUP_VERSION + 1, state: { profile: { name: 'future' } } },
    { format: BACKUP_FORMAT, schemaVersion: DATA_SCHEMA_VERSION + 1, state: { profile: { name: 'future' } } },
  ]) {
    assert.throws(() => validateBackupPayload(payload), /newer/i);
  }
});

test('a damaged profile inside a valid envelope still restores', () => {
  // The envelope is intact, the contents are not. Refusing the whole file would
  // strand every other value in it -- the migration layer quarantines the
  // unusable parts instead, and the restore has to let it.
  const payload = {
    format: BACKUP_FORMAT,
    backupVersion: BACKUP_VERSION,
    schemaVersion: 1,
    state: { profile: 'this was a profile once', page: 'dashboard' },
  };
  const result = validateBackupPayload(payload);
  assert.equal(result.state.schemaVersion, DATA_SCHEMA_VERSION);
  assert.equal(result.state.unmigratableValues?.profile, 'this was a profile once',
    'the unusable value was dropped instead of quarantined');
});
