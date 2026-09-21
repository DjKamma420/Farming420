import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ACTIVITY_MODE, setupIdForActivity } from '../src/activity-mode.js';
import {
  PEST_LOADOUT_LAST_VERIFIED,
  PEST_LOADOUT_TIERS,
  baselineTiers,
  pestLoadoutTier,
} from '../research/pest-loadout-progression.js';

/**
 * The Setups page showed three tabs and said nothing about what belongs in
 * them -- and three empty wardrobes imply you need three, which the research
 * denies outright: the normal baseline is two physical armor sets, with Farming
 * and Killing wearing the same one.
 */

const root = new URL('../', import.meta.url);
const read = path => readFileSync(new URL(path, root), 'utf8');
const master = JSON.parse(read('research/hypixel_farming_master_ai_2026-09-16.json'));
const researched = master.pest_loadout_progression;

test('the runtime tiers match the master research file', () => {
  // The master JSON is research input and is not loaded by the app, so the
  // runtime mirrors it. This is the check that stops the two drifting.
  assert.equal(PEST_LOADOUT_LAST_VERIFIED, researched.last_verified);
  assert.equal(pestLoadoutTier('midgame').physicalArmorSets, researched.midgame_pre_rose_dragon.normal_physical_armor_sets);
  assert.equal(pestLoadoutTier('endgame').physicalArmorSets, researched.endgame_two_armor_baseline.physical_armor_sets);
  assert.equal(pestLoadoutTier('ultra-minmax').status, researched.ultra_minmax_optional_third_set.status);
});

test('every baseline tier is two armor sets, not three', () => {
  // This is the correction the panel exists to make.
  const baselines = baselineTiers();
  assert.ok(baselines.length >= 2);
  for (const tier of baselines) {
    assert.equal(tier.physicalArmorSets, 2, `${tier.id} is not the two-set baseline`);
  }
  const luxury = PEST_LOADOUT_TIERS.filter(tier => tier.status === 'luxury');
  assert.equal(luxury.length, 1);
  assert.equal(luxury[0].physicalArmorSets, 3);
});

/** Source with comments removed: what the reader actually sees on screen. */
function withoutComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

test('the third set is never presented as a prerequisite', () => {
  const guide = read('src/phase-loadout-guide.js');
  assert.match(guide, /not a prerequisite/);
  // Comments stripped: the module's own doc comment quotes the wrong claim in
  // order to reject it, and an assertion that forbids its own explanation is
  // worse than none. This is the third time I wrote that assertion the naive
  // way, hence the shared helper.
  assert.doesNotMatch(withoutComments(guide), /you need three|requires three (armor )?sets/i);
  // The research says so in its own words too.
  assert.match(read('research/knowledge-base/50-three-phase-farming-pest-loadouts.md'),
    /must not be treated as the prerequisite/);
});

test('Killing reuses the Farming armor at both baseline tiers', () => {
  for (const tier of baselineTiers()) {
    assert.equal(tier.phases['pest-kill'].reusesArmorFrom, 'farm', tier.id);
  }
  // And the luxury tier is the one where it does not.
  assert.equal(pestLoadoutTier('ultra-minmax').phases['pest-kill'].reusesArmorFrom, undefined);
});

test('every phase key is a real activity mode', () => {
  const modes = new Set([ACTIVITY_MODE.FARM, ACTIVITY_MODE.PEST_SPAWN, ACTIVITY_MODE.PEST_KILL]);
  for (const tier of PEST_LOADOUT_TIERS) {
    for (const key of Object.keys(tier.phases)) {
      assert.ok(modes.has(key), `${tier.id} names a phase "${key}" the app does not have`);
    }
    assert.equal(Object.keys(tier.phases).length, 3, `${tier.id} must cover all three phases`);
  }
});

test('the setup id mapping is imported, never rebuilt', () => {
  // The ids are not the mode names: Farming is stored as `normal` and Spawning
  // as `pest`. Rebuilding that mapping is how this module first looked up a
  // setup that does not exist, and the Spawning phase silently showed the
  // Farming loadout.
  const guide = read('src/phase-loadout-guide.js');
  assert.match(guide, /setupIdForActivity/);
  assert.doesNotMatch(guide, /\? 'normal' :/);
  assert.equal(setupIdForActivity(ACTIVITY_MODE.FARM), 'normal');
  assert.equal(setupIdForActivity(ACTIVITY_MODE.PEST_SPAWN), 'pest');
  assert.equal(setupIdForActivity(ACTIVITY_MODE.PEST_KILL), 'pest-kill');
});

test('reused armor shares a physical identity without sharing one JS object', () => {
  // The slot records stay separate for compatibility, but the shared
  // physicalItemId is what makes edits propagate across phase references.
  const guide = read('src/phase-loadout-guide.js');
  const copy = guide.match(/function copyFarmingArmor[\s\S]*?\n}/)[0];
  assert.match(copy, /ensurePhysicalItemId\(piece/);
  assert.match(copy, /farmSetup\.slots\[slot\] = linked/);
  assert.match(copy, /JSON\.parse\(JSON\.stringify\(linked\)\)/);
  assert.match(copy, /farming420:state-changed/, 'a user action may dispatch a render');
});

test('the tier choice does not rerender the whole app', () => {
  // The progression tier is a display preference, not profile state.
  const guide = read('src/phase-loadout-guide.js');
  const handler = guide.match(/\[data-phase-tier\]'\)\?\.addEventListener[\s\S]*?\n  \}\);/)[0];
  assert.doesNotMatch(handler, /farming420:state-changed/);
  assert.match(handler, /setTextIfChanged\(/);
  assert.doesNotMatch(guide, /\.textContent\s*=/);
});

test('the page renders one panel, not one per mutation', () => {
  const guide = read('src/phase-loadout-guide.js');
  assert.match(guide, /content\.querySelector\('\.phase-guide'\)\) return;/);
  assert.match(guide, /queueMicrotask\(applyPhaseGuide\)/);
  assert.match(guide, /pageId\(\) !== 'setups'/);
});

test('the spawn phase is labelled short, because that changes the numbers', () => {
  // "Applying the lower-Fortune spawn gear for the entire cooldown would
  // materially understate crop output."
  assert.match(read('research/pest-loadout-progression.js'), /SPAWN_PHASE_IS_SHORT/);
  assert.match(read('src/phase-loadout-guide.js'), /SPAWN_PHASE_IS_SHORT/);
  assert.equal(typeof pestLoadoutTier('midgame').phases['pest-spawn'].timing, 'string');
});

test('the guide is wired into the app', () => {
  const html = read('index.html');
  assert.match(html, /src\/phase-loadout-guide\.js/);
  assert.match(html, /src\/phase-loadout-guide\.css/);
});
