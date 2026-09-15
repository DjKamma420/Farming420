import {
  APP_VERSION,
  BACKUP_FORMAT,
  BACKUP_VERSION,
  DATA_SCHEMA_VERSION,
} from './config.js';
import { migrateState } from './migrations.js';

/**
 * Wraps a local state in the versioned backup envelope. Every backup carries
 * the backup format version, the app version and the data schema version so a
 * future app version can migrate it instead of guessing its shape.
 */
export function createBackupPayload(state, exportedAt = new Date()) {
  const source = (state && typeof state === 'object') ? state : {};
  return {
    format: BACKUP_FORMAT,
    backupVersion: BACKUP_VERSION,
    appVersion: APP_VERSION,
    schemaVersion: Number(source.schemaVersion || DATA_SCHEMA_VERSION),
    exportedAt: exportedAt.toISOString(),
    state: structuredClone(source),
  };
}

/**
 * Validates a backup file and returns the state it contains, migrated to the
 * current data schema.
 *
 * A backup from a newer app version is rejected rather than partially read, so
 * an older app version can never overwrite newer local data with a shape it
 * does not understand.
 *
 * @throws {Error} with a message that explains what failed
 * @returns {{state: object, applied: number[], warnings: string[], sourceSchemaVersion: number}}
 */
export function validateBackupPayload(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new Error('The backup is not a JSON object.');
  }
  if (payload.format !== BACKUP_FORMAT) {
    throw new Error('This file is not a Farming420 backup.');
  }
  if (Number(payload.backupVersion) > BACKUP_VERSION) {
    throw new Error('This backup format is newer than this app version. Update Farming420 before restoring it.');
  }
  if (!payload.state || typeof payload.state !== 'object' || Array.isArray(payload.state)) {
    throw new Error('The backup does not contain application state.');
  }

  const declared = Number(payload.schemaVersion || payload.state.schemaVersion || 1);
  if (!Number.isFinite(declared) || declared < 1) {
    throw new Error('The backup does not declare a valid data schema version.');
  }
  if (declared > DATA_SCHEMA_VERSION) {
    throw new Error('This backup uses a newer data schema. Update Farming420 before restoring it.');
  }

  const result = migrateState({ ...structuredClone(payload.state), schemaVersion: declared });
  return {
    state: result.state,
    applied: result.applied,
    warnings: result.warnings,
    sourceSchemaVersion: declared,
  };
}

export function backupFilename(date = new Date()) {
  return `farming420-backup-${date.toISOString().slice(0, 10)}.json`;
}

export function downloadJson(filename, payload) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export async function readJsonFile(file) {
  if (!file) throw new Error('No file selected.');
  if (file.size > 25 * 1024 * 1024) throw new Error('The selected JSON file is too large.');
  try {
    return JSON.parse(await file.text());
  } catch {
    throw new Error('The selected file is not valid JSON.');
  }
}
