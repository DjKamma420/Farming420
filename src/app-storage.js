import { DATA_SCHEMA_VERSION, STORAGE_KEY } from './config.js';
import { migrateState } from './migrations.js';

export function isUnsupportedState(state) {
  return Number(state?.schemaVersion) > DATA_SCHEMA_VERSION;
}

/** Reading never rewrites bytes, including fields unknown to this build. */
export function readStoredAppState(fallback = {}, storage = globalThis.localStorage) {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    return raw === null ? structuredClone(fallback) : JSON.parse(raw);
  } catch {
    return structuredClone(fallback);
  }
}

export function assertSupportedStorage(storage = globalThis.localStorage) {
  if (isUnsupportedState(readStoredAppState({}, storage))) {
    throw new Error('Stored data uses a newer schema. Update Farming420 before changing or restoring local data.');
  }
}

/** Recheck disk at every write: another tab can upgrade it after our read. */
export function writeStoredAppState(state, { strict = false, storage = globalThis.localStorage } = {}) {
  if (isUnsupportedState(state) || isUnsupportedState(readStoredAppState({}, storage))) {
    if (strict) throw new Error('Stored data uses a newer schema. Update Farming420 before changing or restoring local data.');
    return false;
  }
  storage.setItem(STORAGE_KEY, JSON.stringify(migrateState(state).state));
  return true;
}

export function resetStoredAppState(storage = globalThis.localStorage) {
  assertSupportedStorage(storage);
  storage.removeItem(STORAGE_KEY);
}
