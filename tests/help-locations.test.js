import assert from 'node:assert/strict';
import test from 'node:test';

import { UPGRADES } from '../src/data.js';
import { MAPPABLE_ENTRY_IDS } from '../src/snapshot-apply.js';
import {
  LOCATION_STATUS,
  isSyncFilled,
  locationFor,
  manualEntries,
  manualEntrySummary,
} from '../src/help-locations.js';

test('every entry the sync fills reports itself as needing no lookup', () => {
  for (const id of MAPPABLE_ENTRY_IDS) {
    const location = locationFor(id);
    assert.equal(location.status, LOCATION_STATUS.SYNCED, `${id} should be synced`);
    assert.match(location.where, /automatically/i);
    assert.ok(isSyncFilled(id));
  }
});

test('the synced set is derived from the apply layer, so it cannot drift', () => {
  // A hand-maintained copy would silently disagree the moment a mapping
  // changes; these must be the same source of truth.
  const syncedByLookup = UPGRADES.filter(entry => locationFor(entry.id).status === LOCATION_STATUS.SYNCED);
  assert.equal(syncedByLookup.length, MAPPABLE_ENTRY_IDS.size);
});

test('an entry with no documented location says so instead of inventing one', () => {
  const location = locationFor('accessory-fermento-artifact');
  assert.equal(location.status, LOCATION_STATUS.NEEDS_RESEARCH);
  assert.equal(location.where, null, 'an unresearched location must stay empty');
  assert.match(location.source, /^https?:\/\//, 'the cited source is offered instead');
});

test('every manual entry still offers a source to look the value up in', () => {
  for (const row of manualEntries()) {
    assert.match(String(row.location.source || ''), /^https?:\/\//, `${row.entry.id} offers no source`);
  }
});

test('a location that is not verified carries a visible caveat', () => {
  for (const id of ['input:globalFortune', 'input:cropFortune']) {
    const location = locationFor(id);
    assert.equal(location.status, LOCATION_STATUS.UNVERIFIED);
    assert.ok(location.where);
    assert.ok(location.note, 'an unverified location must say what is uncertain');
    assert.ok(location.lastVerified, 'an unverified location must still be dated');
  }
});

test('no curated location is stated as verified without a date and a source', () => {
  for (const entry of UPGRADES) {
    const location = locationFor(entry.id);
    if (location.status !== LOCATION_STATUS.VERIFIED) continue;
    assert.ok(location.source, `${entry.id} claims VERIFIED without a source`);
    assert.ok(location.lastVerified, `${entry.id} claims VERIFIED without a date`);
  }
});

test('manual entries exclude everything a sync fills', () => {
  const ids = new Set(manualEntries().map(row => row.entry.id));
  for (const id of MAPPABLE_ENTRY_IDS) assert.ok(!ids.has(id), `${id} is synced and must not be listed`);
  assert.equal(ids.size + MAPPABLE_ENTRY_IDS.size, UPGRADES.length);
});

test('manual entries are ordered by the value they add', () => {
  const gains = manualEntries().map(row => Number(row.entry.stepGain || row.entry.rawMarginal || 0));
  const sorted = [...gains].sort((a, b) => b - a);
  assert.deepEqual(gains, sorted, 'the biggest wins must come first');
});

test('the summary adds up', () => {
  const summary = manualEntrySummary();
  assert.equal(summary.total, UPGRADES.length);
  assert.equal(summary.synced + summary.manual, summary.total);
  assert.equal(summary.synced, MAPPABLE_ENTRY_IDS.size);
  assert.ok(summary.documented <= summary.manual);
});

test('an unknown id degrades gracefully rather than throwing', () => {
  const location = locationFor('not-an-entry');
  assert.equal(location.status, LOCATION_STATUS.NEEDS_RESEARCH);
  assert.equal(location.where, null);
  assert.equal(location.source, null);
});

test('no curated location cites the closed official Hypixel wiki', () => {
  for (const id of ['input:globalFortune', 'input:cropFortune']) {
    const location = locationFor(id);
    assert.ok(!String(location.source || '').includes('wiki.hypixel.net'), `${id} cites the closed official wiki`);
    assert.match(location.source, /^https?:\/\//);
  }
});
