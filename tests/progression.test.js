import assert from 'node:assert/strict';
import test from 'node:test';

import {
  ARMOR_CHAIN,
  ENCHANT_LADDERS,
  OPTION_TIER,
  PET_OPTIONS,
  PHASE_LOADOUTS,
  PROGRESSION_SOURCE,
  PROGRESSION_VERIFIED,
  STAGES,
  TIER_LABEL,
  armorProgress,
  nextArmorSet,
  stageForLevel,
} from '../src/progression.js';

test('the stages cover Farming 0 to 60 without a gap or an overlap', () => {
  assert.equal(STAGES[0].levelFrom, 0);
  assert.equal(STAGES.at(-1).levelTo, 60);
  for (let i = 1; i < STAGES.length; i += 1) {
    assert.equal(STAGES[i].levelFrom, STAGES[i - 1].levelTo + 1, `gap before ${STAGES[i].id}`);
  }
  for (let level = 0; level <= 60; level += 1) {
    assert.ok(stageForLevel(level), `level ${level} has no stage`);
  }
});

test('a level maps to the stage that contains it', () => {
  assert.equal(stageForLevel(0).id, 'stage-1');
  assert.equal(stageForLevel(19).id, 'stage-1');
  assert.equal(stageForLevel(20).id, 'stage-2');
  assert.equal(stageForLevel(39).id, 'stage-3');
  assert.equal(stageForLevel(40).id, 'stage-4');
  assert.equal(stageForLevel(60).id, 'stage-5');
});

test('an unknown level yields no stage rather than a guess', () => {
  for (const input of [null, undefined, 'x', NaN]) assert.equal(stageForLevel(input), null);
});

test('a level past the cap stays in the final stage', () => {
  assert.equal(stageForLevel(99).id, 'stage-5');
});

test('every stage has a summary and real steps', () => {
  for (const stage of STAGES) {
    assert.ok(stage.name?.trim() && stage.summary?.trim(), `${stage.id} is incomplete`);
    assert.ok(stage.steps.length >= 3, `${stage.id} has too few steps to be a guide`);
    for (const step of stage.steps) assert.ok(step.trim().length > 20, `${stage.id} has a stub step`);
  }
});

test('the armour chain is ordered and its levels match the stage targets', () => {
  const levels = ARMOR_CHAIN.map(entry => entry.level);
  assert.deepEqual(levels, [...levels].sort((a, b) => a - b));
  const targets = new Set(STAGES.flatMap(stage => stage.armorTargets));
  for (const level of levels) assert.ok(targets.has(level), `armour at ${level} is in no stage`);
});

test('armour progress marks what is reached, and nothing when the level is unknown', () => {
  const at35 = armorProgress(35);
  assert.equal(at35.find(entry => entry.level === 35).reached, true);
  assert.equal(at35.find(entry => entry.level === 40).reached, false);
  assert.ok(armorProgress(null).every(entry => entry.reached === null));
});

test('the next armour set is the first one not yet reached', () => {
  assert.equal(nextArmorSet(0).set, 'Farmhand Armor');
  assert.equal(nextArmorSet(20).set, 'Cropie Armor');
  assert.equal(nextArmorSet(45).set, 'Helianthus Armor');
  assert.equal(nextArmorSet(50), null, 'nothing is left after the last set');
  assert.equal(nextArmorSet(null), null);
});

test('a disputed armour figure is flagged rather than presented as settled', () => {
  // The Farming Fortune page and the guide disagree from Tater upward; see
  // docs/VERIFIED_MECHANICS.md.
  for (const entry of ARMOR_CHAIN) {
    const expected = entry.level >= 20;
    assert.equal(entry.disputed, expected, `${entry.set} has the wrong disputed flag`);
  }
});

test('every pet phase offers a best option and at least one alternative', () => {
  for (const group of PET_OPTIONS) {
    assert.ok(group.options.length >= 2, `${group.phase} offers no alternative`);
    assert.equal(group.options.filter(option => option.tier === OPTION_TIER.BEST).length, 1, `${group.phase} needs exactly one best`);
    for (const option of group.options) {
      assert.ok(Object.values(OPTION_TIER).includes(option.tier), `${option.name} has an unknown tier`);
      assert.ok(TIER_LABEL[option.tier], `${option.tier} has no label`);
      assert.ok(option.note?.trim().length > 25, `${option.name} gives no reason`);
    }
  }
});

test('the phases the guide splits the loop into are all covered', () => {
  assert.deepEqual(PET_OPTIONS.map(group => group.phase), ['levelling', 'crops', 'spawning', 'killing']);
});

test('the quantitative pet comparison keeps its breakpoint', () => {
  const crops = PET_OPTIONS.find(group => group.phase === 'crops');
  const mooshroom = crops.options.find(option => option.name.startsWith('Mooshroom'));
  // A comparison without its breakpoint is not usable, and the number is
  // quoted from the source rather than derived here.
  assert.match(mooshroom.note, /1,429/);
  assert.match(mooshroom.note, /28\.57/);
});

test('every enchantment ladder says what a level gives and where it comes from', () => {
  for (const ladder of ENCHANT_LADDERS) {
    assert.ok(ladder.perLevel?.trim(), `${ladder.id} does not say what a level gives`);
    assert.ok(ladder.max?.trim(), `${ladder.id} has no maximum`);
    assert.ok(ladder.steps.length >= 1, `${ladder.id} has no acquisition steps`);
    for (const step of ladder.steps) {
      assert.ok(step.levels?.trim() && step.from?.trim(), `${ladder.id} has an incomplete step`);
    }
  }
});

test('Turbo-Crop records the medal gate, since owning the book is not enough', () => {
  const turbo = ENCHANT_LADDERS.find(ladder => ladder.id === 'turbo-crop');
  assert.match(turbo.gate, /Bronze/);
  assert.match(turbo.gate, /Silver/);
  assert.match(turbo.max, /VII/);
});

test('each loadout tier covers all three phases', () => {
  assert.deepEqual(PHASE_LOADOUTS.map(entry => entry.id), ['budget', 'late', 'hypermax']);
  for (const loadout of PHASE_LOADOUTS) {
    assert.equal(loadout.rows.length, 3, `${loadout.id} does not cover three phases`);
    for (const row of loadout.rows) {
      assert.ok(row.phase && row.armor && row.equipment && row.pet, `${loadout.id} has an incomplete row`);
    }
  }
});

test('the guide is sourced and its verification is not older than the newest game change', () => {
  assert.match(PROGRESSION_SOURCE, /^https?:\/\//);
  assert.ok(!PROGRESSION_SOURCE.includes('wiki.hypixel.net'), 'the official wiki is closed');
  assert.match(PROGRESSION_VERIFIED, /^\d{4}-\d{2}-\d{2}$/);
  assert.ok(PROGRESSION_VERIFIED >= '2026-08-01', 'predates the newest known game change');
});
