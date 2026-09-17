import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { CROPS } from '../src/data.js';
import { PESTS } from '../src/pest-mechanics-data.js';
import {
  GARDEN_PESTS,
  UNMODELLED_PESTS,
  guaranteedDropText,
  LOOT_PIPELINE,
  PESTHUNTER_PHILIP,
  PEST_HEALTH,
  PEST_STAT_SIDES,
  SPAWN_PIPELINE,
  pestForCrop,
  pestStatSide,
  philipFortuneFor,
} from '../src/pest-model.js';

const read = name => readFileSync(new URL(`../src/${name}`, import.meta.url), 'utf8');

test('the pest table is joined from the shared data, not copied', () => {
  // src/pest-mechanics-data.js already holds every pest with its crop, its
  // guaranteed drop and that drop's Fortune scaling. A second pest/crop table
  // here would have been the third duplicate of its kind in this repo, after
  // two rarity ladders and two taskbar rules -- and the first draft of this
  // module was exactly that.
  assert.match(read('pest-model.js'), /import \{ PESTS \} from '\.\/pest-mechanics-data\.js'/);
  assert.doesNotMatch(read('pest-model.js'), /cropId: 'wheat'/);

  const withCrops = Object.values(PESTS).filter(record => record.cropId).length;
  assert.equal(GARDEN_PESTS.length, withCrops);
  for (const pest of GARDEN_PESTS) {
    assert.equal(pest.cropId, PESTS[pest.id].cropId, pest.id);
    assert.equal(pest.guaranteedDropId, PESTS[pest.id].baseItemId, pest.id);
  }
});

test('every listed pest has a vinyl, and no invented ones exist', () => {
  // The research closes its mapping with "do not invent Stereo mappings for
  // special Pest types that are not part of this standard mapping".
  assert.equal(GARDEN_PESTS.length, 13);
  assert.equal(new Set(GARDEN_PESTS.map(pest => pest.vinyl)).size, 13);
  for (const pest of GARDEN_PESTS) assert.ok(pest.vinyl, `${pest.id} has no vinyl`);
});

test('a pest with no crop is recorded, not listed', () => {
  // Field Mouse hits a random crop, and the research says not to model it as a
  // normal crop-specific pest. A row of blanks would be worse than no row.
  assert.ok(UNMODELLED_PESTS.length > 0);
  for (const pest of UNMODELLED_PESTS) {
    assert.ok(!GARDEN_PESTS.some(listed => listed.id === pest.id), pest.id);
    assert.ok(!PESTS[pest.id].cropId, pest.id);
  }
  assert.match(read('pests-page.js'), /UNMODELLED_PESTS/);
});

test('an unverified Fortune divisor stays null, never zero', () => {
  // The three Greenhouse pests have no current scaling table. Zero would read
  // as "one extra unit per zero Fortune", which is free infinity.
  const unverified = GARDEN_PESTS.filter(pest => pest.status !== 'VERIFIED');
  assert.ok(unverified.length > 0);
  for (const pest of unverified) {
    assert.equal(pest.fortunePerExtraUnit, null, pest.id);
    assert.equal(guaranteedDropText(pest) === null, pest.guaranteedDropId == null);
  }
  for (const pest of GARDEN_PESTS.filter(row => row.status === 'VERIFIED')) {
    assert.ok(pest.fortunePerExtraUnit > 0, pest.id);
  }
});

test('a guaranteed drop reads as an item, not an id', () => {
  const earthworm = GARDEN_PESTS.find(pest => pest.id === 'earthworm');
  assert.equal(guaranteedDropText(earthworm), '5\u00d7 enchanted melon');
  assert.equal(guaranteedDropText(null), null);
  assert.equal(guaranteedDropText({ guaranteedDropId: 'X', guaranteedQuantity: null }), null);
});

test('a crop resolves to its pest, and an unknown crop to nothing', () => {
  assert.equal(pestForCrop('melon').name, 'Earthworm');
  assert.equal(pestForCrop('MELON').name, 'Earthworm');
  assert.equal(pestForCrop('not-a-crop'), null);
  assert.equal(pestForCrop(''), null);
});

test('the two pipelines stay two, in order', () => {
  assert.ok(SPAWN_PIPELINE.length >= 4);
  assert.ok(LOOT_PIPELINE.length >= 4);
  // Bonus Pest Chance is a spawn-side step and must never appear on the loot
  // side; Overbloom is the reverse.
  const spawn = SPAWN_PIPELINE.map(entry => entry.step).join(' ').toLowerCase();
  const loot = LOOT_PIPELINE.map(entry => entry.step).join(' ').toLowerCase();
  assert.match(spawn, /bonus pest chance/);
  assert.doesNotMatch(spawn, /overbloom/);
  assert.match(loot, /overbloom/);
  assert.doesNotMatch(loot, /bonus pest chance/);
});

test('a stat is placed on one side, or on none', () => {
  assert.equal(pestStatSide('Bonus Pest Chance'), 'spawn');
  assert.equal(pestStatSide('Pest Overbloom'), 'loot-rng');
  assert.equal(pestStatSide('Beady - Pest-only Farming Fortune'), 'loot-guaranteed');
  assert.equal(pestStatSide('Vacuum damage'), 'kill');
  // Null rather than a guess: placing an unknown stat on the rare-drop side
  // would tell a player Farming Fortune raises rare-drop chance, which is the
  // one claim the research forbids.
  assert.equal(pestStatSide('Visitor speed'), null);
  assert.equal(pestStatSide(''), null);
  assert.equal(pestStatSide(null), null);
  for (const side of ['spawn', 'kill', 'loot-guaranteed', 'loot-rng']) {
    assert.ok(PEST_STAT_SIDES[side]?.label, side);
  }
});

test('Phillip converts at the researched rate and stops at the cap', () => {
  assert.equal(PESTHUNTER_PHILIP.fortunePerPest, 5);
  assert.deepEqual(philipFortuneFor(0), { requested: 0, spent: 0, fortune: 0, capped: false, durationMinutes: 30 });
  assert.equal(philipFortuneFor(40).fortune, 200);
  assert.equal(philipFortuneFor(200).fortune, PESTHUNTER_PHILIP.maxFortune);

  const over = philipFortuneFor(500);
  assert.equal(over.spent, PESTHUNTER_PHILIP.pestCap);
  assert.equal(over.fortune, PESTHUNTER_PHILIP.maxFortune);
  assert.equal(over.capped, true, 'a swallowed spend must say it was capped');

  // A fractional count spends whole pests.
  assert.equal(philipFortuneFor(10.9).spent, 10);
});

test('a bad pest count is no answer, not zero Fortune', () => {
  for (const bad of [-1, NaN, 'abc', null, undefined, {}]) {
    assert.equal(philipFortuneFor(bad), null, String(bad));
  }
  // '' coerces to 0, which is a real answer: spending nothing buys nothing.
  assert.equal(philipFortuneFor('').fortune, 0);
});

test('the superseded cap is kept visible rather than dropped', () => {
  // Two sources disagree on the ceiling. Both agree on 5 per pest. The
  // version-tagged figure is used and the older one stays readable, so a
  // player on an older snapshot can tell which number is theirs.
  const older = PESTHUNTER_PHILIP.supersededSnapshot;
  assert.equal(older.pestCap, 40);
  assert.equal(older.maxFortune, 200);
  assert.ok(older.source, 'a superseded figure without its source is folklore');
  assert.ok(PESTHUNTER_PHILIP.maxFortune > older.maxFortune);
  assert.match(read('pests-page.js'), /supersededSnapshot/);
});

test('pest health carries its one documented exception', () => {
  assert.equal(PEST_HEALTH.normal, 600);
  assert.equal(PEST_HEALTH.derpy, 1200);
  assert.match(PEST_HEALTH.derpyNote, /Derpy/);
});
