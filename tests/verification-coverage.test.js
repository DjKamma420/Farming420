import test from 'node:test';
import assert from 'node:assert/strict';
import { UPGRADES } from '../src/data.js';

/**
 * Enforce rule 2 of `AGENTS.md`: every ACTIVE planner mechanic must carry a
 * source and an honest `lastVerified` date. Uncertain/profile-dependent
 * mechanics belong in VERIFY instead of receiving an invented static value.
 */

const active = UPGRADES.filter(entry => entry.status === 'ACTIVE');
const undated = active.filter(entry => !entry.lastVerified).map(entry => entry.id).sort();

test('every ACTIVE entry has a verification date', () => {
  assert.deepEqual(undated, [], `ACTIVE without lastVerified:\n${undated.join('\n')}`);
});

test('profile-dependent pet switching is not ranked as a flat ACTIVE gain', () => {
  const entry = UPGRADES.find(item => item.id === 'pet-switch-to-best-farming-pet');
  assert.ok(entry, 'pet-switch upgrade entry exists');
  assert.equal(entry.status, 'VERIFY');
  assert.equal(entry.rawMarginal, 0);
  assert.equal(entry.manualDefault, null);
});

test('every ACTIVE entry cites a source, dated or not', () => {
  // Weaker than rule 2 and still worth pinning: a number with no source at all
  // cannot be checked by anyone later, so it must never reach ACTIVE.
  const sourceless = active.filter(entry => !String(entry.source || '').trim()).map(entry => entry.id);
  assert.deepEqual(sourceless, [], `ACTIVE with no source:\n${sourceless.join('\n')}`);
});

test('a date that is present is a real date', () => {
  for (const entry of active.filter(item => item.lastVerified)) {
    assert.match(entry.lastVerified, /^\d{4}-\d{2}-\d{2}$/, `${entry.id} has a malformed date`);
    assert.ok(Number.isFinite(Date.parse(entry.lastVerified)), `${entry.id} has an unparseable date`);
  }
});

test('no ACTIVE entry cites the wiki that closed in July 2026', () => {
  // `AGENTS.md` rule 3. A citation to a page that no longer exists is worse
  // than none: it reads as verifiable and cannot be checked.
  const closed = active
    .filter(entry => String(entry.source || '').includes('wiki.hypixel.net'))
    .map(entry => entry.id);
  assert.deepEqual(closed, [], `citing the closed official wiki:\n${closed.join('\n')}`);
});
