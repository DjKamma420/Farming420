/**
 * Hypixel credentials are stored OUTSIDE the application state on purpose.
 *
 * `src/backup.js` serializes the whole state into an exportable file. A secret
 * that lives in the state would therefore travel inside every backup the user
 * downloads, mails to themselves or posts when asking for help. Keeping the key
 * in its own storage entry keeps it out of every backup by construction.
 */
const API_KEY_STORAGE_KEY = 'farming420-hypixel-api-key';

function storage() {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

/** Hypixel keys are dashed UUIDs; anything else is rejected before it is stored. */
export function isPlausibleApiKey(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(value || '').trim());
}

export function readApiKey() {
  return storage()?.getItem(API_KEY_STORAGE_KEY) || '';
}

export function writeApiKey(value) {
  const key = String(value || '').trim();
  if (!key) {
    storage()?.removeItem(API_KEY_STORAGE_KEY);
    return '';
  }
  if (!isPlausibleApiKey(key)) {
    throw new Error('That does not look like a Hypixel API key. Keys are dashed UUIDs issued at developer.hypixel.net.');
  }
  storage()?.setItem(API_KEY_STORAGE_KEY, key);
  return key;
}

export function clearApiKey() {
  storage()?.removeItem(API_KEY_STORAGE_KEY);
}

/** Never render a key in full; Settings shows only this. */
export function maskApiKey(value) {
  const key = String(value || '').trim();
  if (!key) return 'Not stored';
  return `${key.slice(0, 8)}…${key.slice(-4)}`;
}

export { API_KEY_STORAGE_KEY };
