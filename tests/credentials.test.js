import assert from 'node:assert/strict';
import test from 'node:test';

import { API_KEY_STORAGE_KEY, clearApiKey, isPlausibleApiKey, maskApiKey, readApiKey, writeApiKey } from '../src/credentials.js';
import { STORAGE_KEY } from '../src/config.js';
import { createBackupPayload } from '../src/backup.js';
import { installLocalStorage, uninstallLocalStorage } from './local-storage-stub.js';

const KEY = '11111111-2222-3333-4444-555555555555';

test.afterEach(() => uninstallLocalStorage());

test('only dashed-UUID shaped keys are accepted', () => {
  assert.ok(isPlausibleApiKey(KEY));
  assert.ok(isPlausibleApiKey(KEY.toUpperCase()));
  for (const bad of ['', 'not-a-key', '1111111122223333444455555555', KEY.replaceAll('-', ''), null]) {
    assert.ok(!isPlausibleApiKey(bad), `${JSON.stringify(bad)} should be rejected`);
  }
});

test('a malformed key is rejected before it reaches storage', () => {
  const storage = installLocalStorage();
  assert.throws(() => writeApiKey('nonsense'), /does not look like a Hypixel API key/);
  assert.equal(storage.getItem(API_KEY_STORAGE_KEY), null);
});

test('a key round-trips and can be cleared', () => {
  installLocalStorage();
  writeApiKey(` ${KEY} `);
  assert.equal(readApiKey(), KEY);
  clearApiKey();
  assert.equal(readApiKey(), '');
  writeApiKey(KEY);
  writeApiKey('');
  assert.equal(readApiKey(), '', 'an empty value clears the stored key');
});

test('the key is stored outside the application state, so backups never carry it', () => {
  const storage = installLocalStorage();
  writeApiKey(KEY);
  storage.setItem(STORAGE_KEY, JSON.stringify({ schemaVersion: 3, profile: { name: 'Main', playerName: 'Notch' } }));

  const state = JSON.parse(storage.getItem(STORAGE_KEY));
  const backup = createBackupPayload(state);
  const serialized = JSON.stringify(backup);

  assert.ok(!serialized.includes(KEY), 'the API key leaked into the exported backup');
  assert.ok(serialized.includes('Notch'), 'the backup should still contain ordinary profile data');
  assert.notEqual(API_KEY_STORAGE_KEY, STORAGE_KEY);
});

test('a key is never displayed in full', () => {
  assert.equal(maskApiKey(''), 'Not stored');
  const masked = maskApiKey(KEY);
  assert.ok(!masked.includes(KEY));
  assert.ok(masked.startsWith('11111111'));
  assert.ok(masked.endsWith('5555'));
});

test('credential helpers do not throw where storage is unavailable', () => {
  uninstallLocalStorage();
  assert.equal(readApiKey(), '');
  assert.doesNotThrow(() => clearApiKey());
  assert.doesNotThrow(() => writeApiKey(''));
});
