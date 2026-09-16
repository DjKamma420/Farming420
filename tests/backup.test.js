import assert from 'node:assert/strict';
import test from 'node:test';

import {
  APP_VERSION,
  BACKUP_FORMAT,
  BACKUP_VERSION,
  DATA_SCHEMA_VERSION,
} from '../src/config.js';
import { backupFilename, createBackupPayload, validateBackupPayload } from '../src/backup.js';

const CROP_UPGRADE_ID = 'crop-progression-crop-upgrade-selected-crop';

function backupOf(state, overrides = {}) {
  return { ...createBackupPayload(state), ...overrides };
}

test('a backup carries format, backup version, app version and schema version', () => {
  const payload = createBackupPayload({ schemaVersion: DATA_SCHEMA_VERSION, profile: {} });
  assert.equal(payload.format, BACKUP_FORMAT);
  assert.equal(payload.backupVersion, BACKUP_VERSION);
  assert.equal(payload.appVersion, APP_VERSION);
  assert.equal(payload.schemaVersion, DATA_SCHEMA_VERSION);
  assert.ok(!Number.isNaN(Date.parse(payload.exportedAt)));
});

test('a backup snapshots the state instead of referencing it', () => {
  const state = { schemaVersion: DATA_SCHEMA_VERSION, profile: { name: 'Before' } };
  const payload = createBackupPayload(state);
  state.profile.name = 'After';
  assert.equal(payload.state.profile.name, 'Before');
});

test('a fresh backup round-trips without losing user data', () => {
  const state = {
    schemaVersion: DATA_SCHEMA_VERSION,
    selectedCrop: 'cactus',
    profile: {
      name: 'Main',
      globalFortune: 812,
      cropFortune: { cactus: 240 },
      normalizedSnapshot: { modelVersion: 1, identity: { profileName: 'Mango' } },
      cropProgress: { cactus: { levels: { [CROP_UPGRADE_ID]: 9 }, owned: {}, costs: {}, manualGain: {} } },
    },
  };
  const restored = validateBackupPayload(createBackupPayload(state)).state;
  assert.deepEqual(restored, state);
});

test('restoring an older backup migrates it to the current schema', () => {
  const legacy = backupOf({}, {
    schemaVersion: 1,
    state: { schemaVersion: 1, selectedCrop: 'melon', profile: { levels: { [CROP_UPGRADE_ID]: 6 } } },
  });
  const result = validateBackupPayload(legacy);
  assert.equal(result.sourceSchemaVersion, 1);
  assert.deepEqual(result.applied, [2, 3, 4]);
  assert.equal(result.state.schemaVersion, DATA_SCHEMA_VERSION);
  assert.equal(result.state.profile.cropProgress.melon.levels[CROP_UPGRADE_ID], 6);
  assert.equal(result.state.profile.normalizedSnapshot, null);
});

test('a backup from a newer data schema is refused', () => {
  const future = backupOf({}, { schemaVersion: DATA_SCHEMA_VERSION + 1, state: { schemaVersion: DATA_SCHEMA_VERSION + 1 } });
  assert.throws(() => validateBackupPayload(future), /newer data schema/);
});

test('a backup from a newer backup format is refused', () => {
  const future = backupOf({}, { backupVersion: BACKUP_VERSION + 1 });
  assert.throws(() => validateBackupPayload(future), /newer than this app version/);
});

test('a foreign or malformed file is refused with an explanatory message', () => {
  assert.throws(() => validateBackupPayload(null), /not a JSON object/);
  assert.throws(() => validateBackupPayload([]), /not a JSON object/);
  assert.throws(() => validateBackupPayload({ some: 'json' }), /not a Farming420 backup/);
  assert.throws(() => validateBackupPayload(backupOf({}, { state: undefined })), /does not contain application state/);
  assert.throws(() => validateBackupPayload(backupOf({}, { state: [] })), /does not contain application state/);
  assert.throws(
    () => validateBackupPayload(backupOf({}, { schemaVersion: 'broken', state: { schemaVersion: 'broken' } })),
    /valid data schema version/,
  );
});

test('validation does not mutate the backup it was given', () => {
  const payload = backupOf({}, {
    schemaVersion: 1,
    state: { schemaVersion: 1, profile: { levels: { [CROP_UPGRADE_ID]: 2 } } },
  });
  const snapshot = structuredClone(payload);
  validateBackupPayload(payload);
  assert.deepEqual(payload, snapshot);
});

test('the backup filename is dated and stable', () => {
  assert.equal(backupFilename(new Date('2026-09-15T22:10:00Z')), 'farming420-backup-2026-09-15.json');
});
