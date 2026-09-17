import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { CROPS } from '../src/data.js';
import {
  GARDEN_PESTS,
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

test('the mapping is the researched thirteen, and no invented rows', () => {
  // The research table closes with "do not invent Stereo mappings for special
  // Pest types that are not part of this standard mapping".
  assert.equal(GARDEN_PESTS.length, 13);
  assert.equal(new Set(GARDEN_PESTS.map(pest => pest.id)).size, 13);
  assert.equal(new Set(GARDEN_PESTS.map(pest => pest.cropId)).size, 13);
  assert.equal(new Set(GARDEN_PESTS.map(pest => pest.vinyl)).size, 13);
  for (const pest of GARDEN_PESTS) {
    assert.ok(pest.name && pest.crop && pest.vinyl, pest.id);
  }
});

test('every pest points at a crop the app actually has', () => {
  // The rows borrow their crop's art, so a crop id that does not exist means a
  // row with a letter placeholder and nobody noticing.
  const known = new Set(CROPS.map(crop => crop.id));
  for (const pest of GARDEN_PESTS) {
    assert.ok(known.has(pest.cropId), `${pest.id} points at unknown crop ${pest.cropId}`);
  }
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
