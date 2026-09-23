import test from 'node:test';
import assert from 'node:assert/strict';
import { UPGRADES } from '../src/data.js';

/**
 * A ratchet on rule 2 of `AGENTS.md`: every non-trivial mechanic carries a
 * source and a `lastVerified` date.
 *
 * Today 72 entries are `ACTIVE` -- they feed live recommendations -- and only 12
 * of them carry a date. The other 60 drive the planner's rankings with no record
 * of when anyone last checked them against the game. `tasks/todo.md` has called
 * that the highest-priority gap for a while, and it is real work: it needs the
 * current sources opened one mechanic at a time, not a mass date-stamp, which
 * rule 2 exists to prevent.
 *
 * This file does not do that work. It stops the gap growing while it is done.
 *
 * The list below may only shrink. Dating an entry fails the second test, which
 * asks you to delete its line; adding a new undated `ACTIVE` entry fails the
 * first, which names it. Both failures are one-line edits, and both keep the
 * number honest instead of letting it drift upward unnoticed.
 */

/** `ACTIVE` entries with no `lastVerified`. Delete a line when you date one. */
const UNDATED_ACTIVE = [
  'armor-enchant-sunset-v-day-overbloom',
  'consumable-feast-burger-permanent-overbloom',
  'equipment-reforge-thorny-on-full-mythic-equipment-ff',
  'equipment-reforge-thorny-on-full-mythic-equipment-overbloom',
  'harvest-feast-feast-crashers-iii',
  'mixin-celestial-mason-jar',
  'mixin-celestial-mason-jar-wisdom',
  'pet-item-lucky-clover-poignant-lucky-clover',
  'pet-orchid-mantis-intelligent-specimen',
  'pet-switch-to-best-farming-pet',
  'tool-mk-ii',
  'tool-mk-iii',
  'tool-overclocker-3000',
  'tool-tool-base-counter-fortune',
  'vacuum-reforge-beady-pest-only-farming-fortune',
];

const active = UPGRADES.filter(entry => entry.status === 'ACTIVE');
const undated = active.filter(entry => !entry.lastVerified).map(entry => entry.id).sort();

test('no new ACTIVE entry arrives without a verification date', () => {
  const added = undated.filter(id => !UNDATED_ACTIVE.includes(id));
  assert.deepEqual(added, [],
    `these ACTIVE entries are new and undated -- verify them, or mark them VERIFY:\n${added.join('\n')}`);
});

test('the undated list holds nothing that has since been verified', () => {
  const fixed = UNDATED_ACTIVE.filter(id => !undated.includes(id));
  assert.deepEqual(fixed, [],
    `verified since this list was written -- delete these lines:\n${fixed.join('\n')}`);
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
