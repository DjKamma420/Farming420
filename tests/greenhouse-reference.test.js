import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  GREENHOUSE_BASE_CROP_DECAY_HOURS,
  GREENHOUSE_GRID_PLOTS,
  GREENHOUSE_LIVE_LOOT_MULTIPLIERS,
  GREENHOUSE_UNLOCK_GARDEN_LEVEL,
} from '../src/greenhouse-model.js';
import {
  DECAY_STATE_WORDS,
  GREENHOUSE_FACTS,
  GREENHOUSE_UPCOMING,
  decayStateFor,
  greenhousePlantsByYield,
  greenhouseYieldRange,
} from '../src/greenhouse-reference.js';

/**
 * `greenhouse-model.js` held 55 sourced live loot multipliers, the unlock
 * level, the grid size, the 72-hour decay window and three announced-but-
 * unreleased changes, and was reached by nothing -- while the planner's Sowdust
 * mode filtered upgrades by the words "sowdust" or "greenhouse".
 */

const read = name => readFileSync(new URL(`../src/${name}`, import.meta.url), 'utf8');

test('the greenhouse model is no longer an orphan', () => {
  assert.match(read('greenhouse-reference.js'), /from '\.\/greenhouse-model\.js'/);
  assert.match(read('planner-mode-ui.js'), /from '\.\/greenhouse-reference\.js'/);
  assert.match(read('planner-mode-ui.js'), /if \(active\.id === 'sowdust'\) \{/);
});

test('no Coins per hour is claimed anywhere on the panel', () => {
  // The model's own note: the multipliers "are NOT sufficient to infer a
  // plant's base harvest amount, growth duration, water requirement, mutation
  // spread chance, or minigame outcome". Every one of those would be needed.
  const reference = read('greenhouse-reference.js');
  assert.doesNotMatch(reference, /coinsPerHour|CoinsPerHour|coinsPerUnit/);
  const panel = read('planner-mode-ui.js').match(/function greenhousePanelMarkup[\s\S]*?\n}/)[0];
  // The panel says the words "Coins/h" exactly once, to say it is not claiming
  // one. What it must not do is print a coin figure, so no formatter is called.
  assert.match(panel, /no Coins\/h is claimed/);
  assert.equal((panel.match(/Coins\/h/g) || []).length, 1);
  assert.doesNotMatch(panel, /compactCoins|toLocaleString/);
});

test('every plant is carried over, none invented', () => {
  const all = greenhousePlantsByYield();
  assert.equal(all.length, GREENHOUSE_LIVE_LOOT_MULTIPLIERS.length);
  const names = new Set(GREENHOUSE_LIVE_LOOT_MULTIPLIERS.map(plant => plant.name));
  for (const plant of all) assert.ok(names.has(plant.name), plant.name);
});

test('base crops and mutations stay two lists', () => {
  // A base crop is what you plant; a mutation is what you hope spreads.
  // Ranking them together would read as advice to plant Snoozling.
  const base = greenhouseYieldRange('base-crop');
  const mutation = greenhouseYieldRange('mutation');
  assert.ok(base.count > 0 && mutation.count > 0);
  assert.equal(base.count + mutation.count, GREENHOUSE_LIVE_LOOT_MULTIPLIERS.length);
  assert.ok(mutation.top.lootMultiplier > base.top.lootMultiplier * 10,
    'if the two ranges were comparable, one list would be fine');
  for (const plant of greenhousePlantsByYield('base-crop')) assert.equal(plant.kind, 'base-crop');
});

test('each list is ordered by yield, highest first', () => {
  for (const kind of ['base-crop', 'mutation']) {
    const rows = greenhousePlantsByYield(kind);
    for (let i = 1; i < rows.length; i += 1) {
      assert.ok(rows[i - 1].lootMultiplier >= rows[i].lootMultiplier,
        `${rows[i - 1].name} before ${rows[i].name}`);
    }
  }
});

test('the facts are read from the model, not restated', () => {
  const values = GREENHOUSE_FACTS.map(fact => fact.value).join(' ');
  assert.match(values, new RegExp(`Garden level ${GREENHOUSE_UNLOCK_GARDEN_LEVEL}`));
  assert.match(values, new RegExp(`${GREENHOUSE_GRID_PLOTS} plots`));
  assert.match(values, new RegExp(`${GREENHOUSE_BASE_CROP_DECAY_HOURS} h`));
  // No literal duplicates of those numbers in the module.
  const source = read('greenhouse-reference.js').replace(/\/\*[\s\S]*?\*\//g, '');
  assert.doesNotMatch(source, /Garden level 7/);
  assert.doesNotMatch(source, /72 h after/);
});

test('the decay boundary keeps the model\'s refusal to guess', () => {
  // Exactly 72 hours is `boundary`, not rounded into safe or decayed: the
  // model will not guess server tick order at the instant the timer expires.
  assert.equal(decayStateFor(0), 'safe');
  assert.equal(decayStateFor(GREENHOUSE_BASE_CROP_DECAY_HOURS - 1), 'safe');
  assert.equal(decayStateFor(GREENHOUSE_BASE_CROP_DECAY_HOURS), 'boundary');
  assert.equal(decayStateFor(GREENHOUSE_BASE_CROP_DECAY_HOURS + 1), 'decayed');
  assert.equal(decayStateFor(null), 'unknown');
  assert.equal(decayStateFor(''), 'unknown');
  assert.equal(decayStateFor(-1), 'unknown');
  // And each state has words, including the two that are not answers.
  for (const state of ['safe', 'boundary', 'decayed', 'unknown']) {
    assert.ok(DECAY_STATE_WORDS[state], state);
  }
  assert.match(DECAY_STATE_WORDS.boundary, /will not guess/);
});

test('announced changes are shown as not scored', () => {
  assert.ok(GREENHOUSE_UPCOMING.length > 0);
  for (const entry of GREENHOUSE_UPCOMING) {
    assert.equal(entry.status, 'PLANNED');
    assert.equal(entry.scoreInLiveCalculator, false);
    assert.ok(entry.source, `${entry.id} has no source`);
  }
  const panel = read('planner-mode-ui.js');
  assert.match(panel, /Announced, not scored/);
});

test('the decay read-out stores nothing and renders nothing', () => {
  // The answer depends on nothing the app persists, so a storage write and a
  // render would both be noise.
  const handler = read('planner-mode-ui.js').match(/hours\?\.addEventListener\('input'[\s\S]*?\n      \}\);/)[0];
  assert.doesNotMatch(handler, /save\(|localStorage|farming420:state-changed/);
  assert.match(handler, /setTextIfChanged\(/);
});
