import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync, readdirSync } from 'node:fs';
import { DATA_SCHEMA_VERSION, STORAGE_KEY } from '../src/config.js';
import { assertSupportedStorage, readStoredAppState, resetStoredAppState, writeStoredAppState } from '../src/app-storage.js';

function memory(raw = null) {
  return { raw, writes: 0, getItem() { return this.raw; }, setItem(key, value) { assert.equal(key, STORAGE_KEY); this.raw = value; this.writes++; }, removeItem() { this.raw = null; this.writes++; } };
}

test('future-schema raw bytes survive reads, writes, restore and reset attempts', () => {
  const bytes = '{ "schemaVersion": 11, "unknown": {"future": [1,null,"x"]}, "profile": {} }\n';
  const storage = memory(bytes);
  const detached = readStoredAppState({}, storage);
  detached.profile.name = 'Changed';
  assert.equal(writeStoredAppState(detached, { storage }), false);
  assert.equal(writeStoredAppState({ schemaVersion: DATA_SCHEMA_VERSION, profile: {} }, { storage }), false);
  assert.throws(() => writeStoredAppState({}, { storage, strict: true }), /newer schema/);
  assert.throws(() => resetStoredAppState(storage), /newer schema/);
  assert.throws(() => assertSupportedStorage(storage), /newer schema/);
  assert.equal(storage.raw, bytes);
  assert.equal(storage.writes, 0);
});

test('a cross-tab upgrade between read and write prevents stale overwrite', () => {
  const storage = memory('{"schemaVersion":10,"profile":{"name":"Before"}}');
  const state = readStoredAppState({}, storage);
  storage.raw = '{ "schemaVersion": 12, "newField": true }';
  assert.equal(writeStoredAppState(state, { storage }), false);
  assert.equal(storage.raw, '{ "schemaVersion": 12, "newField": true }');
});

test('supported writes migrate old states and preserve current unknown fields', () => {
  const storage = memory();
  assert.equal(writeStoredAppState({ schemaVersion: 1, profile: {} }, { storage }), true);
  assert.equal(JSON.parse(storage.raw).schemaVersion, DATA_SCHEMA_VERSION);
  const current = { schemaVersion: DATA_SCHEMA_VERSION, extra: { value: 0 }, profile: {} };
  assert.equal(writeStoredAppState(current, { storage }), true);
  assert.deepEqual(JSON.parse(storage.raw), current);
  resetStoredAppState(storage);
  assert.equal(storage.raw, null);
});

test('runtime modules cannot bypass the single main-state storage writer', () => {
  for (const file of readdirSync(new URL('../src/', import.meta.url)).filter(file => file.endsWith('.js') && file !== 'app-storage.js')) {
    const source = readFileSync(new URL(`../src/${file}`, import.meta.url), 'utf8');
    assert.doesNotMatch(source, /localStorage\.(?:setItem|removeItem)\(STORAGE_KEY/, file);
  }
});
