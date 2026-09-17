import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { cropModel } from '../src/farming-mechanics-data.js';
import {
  JACOB_CONTEST_DURATION_SECONDS,
  JACOB_PARTICIPATION_COLLECTION,
  estimateJacobContestScore,
  personalBestCropFortune,
} from '../src/jacob-contest-model.js';
import { contestEstimate, describeContestMissing } from '../src/contest-estimate.js';

/**
 * The planner's "Collection / Contest" mode ranked upgrades by a keyword match
 * on the word "contest" -- a text search dressed as a model -- while
 * `src/jacob-contest-model.js` sat complete, sourced and reached by nothing.
 */

const root = new URL('../', import.meta.url);
const read = path => readFileSync(new URL(path, root), 'utf8');
const MEASURED = Object.freeze({ breaksPerSecond: 20, uptimePercent: 85 });
const STATS = Object.freeze({ farmingFortune: 240, cropFortune: 0 });

test('the contest model is no longer an orphan', () => {
  assert.match(read('src/contest-estimate.js'), /from '\.\/jacob-contest-model\.js'/);
  assert.match(read('src/planner-mode-ui.js'), /from '\.\/contest-estimate\.js'/);
  // And the mode that needed it is the one that got it.
  assert.match(read('src/planner-mode-ui.js'), /if \(active\.id === 'collection'\) \{/);
});

test('a measured farm produces a contest collection', () => {
  const result = contestEstimate({ cropId: 'melon', measured: MEASURED, stats: STATS });
  const perBreak = cropModel('melon').baseDrop.expected;
  const expected = 20 * JACOB_CONTEST_DURATION_SECONDS * 0.85 * perBreak * (1 + 240 / 100);
  assert.equal(result.complete, true);
  assert.equal(result.expectedCollection, Math.round(expected));
  assert.equal(result.participationReached, true);
  assert.equal(result.participationThreshold, JACOB_PARTICIPATION_COLLECTION);
});

test('the drop count comes from the crop, and an unverified one blocks the estimate', () => {
  // `wheat` has no source-verified expected drop count. Filling one in would
  // be exactly the fabrication the crop model refuses to make.
  assert.notEqual(cropModel('wheat').baseDrop.status, 'VERIFIED');
  const result = contestEstimate({ cropId: 'wheat', measured: MEASURED, stats: STATS });
  assert.equal(result.expectedCollection, null);
  assert.equal(result.complete, false);
  assert.deepEqual(result.missing, ['a verified drop count for this crop']);
});

test('an unknown crop is blocked the same way', () => {
  const result = contestEstimate({ cropId: 'not-a-crop', measured: MEASURED, stats: STATS });
  assert.equal(result.cropKnown, false);
  assert.equal(result.expectedCollection, null);
  assert.equal(result.cropDataStatus, 'UNKNOWN');
});

test('a personal best becomes contest-only Crop Fortune from the sourced table', () => {
  const without = contestEstimate({ cropId: 'melon', measured: MEASURED, stats: STATS });
  const with1m = contestEstimate({ cropId: 'melon', measured: MEASURED, stats: STATS, personalBest: 1_000_000 });
  assert.equal(without.contestCropFortune, 0);
  assert.equal(with1m.contestCropFortune, personalBestCropFortune('melon', 1_000_000));
  assert.ok(with1m.expectedCollection > without.expectedCollection);
});

test('no personal best is zero contest Fortune, not an unknown', () => {
  // Most profiles genuinely have none, and treating it as unknown would block
  // the whole estimate over a value that is legitimately zero.
  const result = contestEstimate({ cropId: 'melon', measured: MEASURED, stats: STATS, personalBest: null });
  assert.equal(result.contestCropFortune, 0);
  assert.equal(result.complete, true);
});

test('a missing measurement is named in words, not as a path', () => {
  const result = contestEstimate({ cropId: 'melon', measured: {}, stats: STATS });
  assert.equal(result.expectedCollection, null);
  assert.deepEqual(result.missing.sort(), [
    'how many crops you break per second',
    'how much of the contest you actually farm',
  ]);
  for (const path of [
    'directFarming.breaksPerSecond',
    'directFarming.uptimeRatio',
    'directFarming.baseUnitsPerBreak',
    'directFarming.farmingFortune',
    'directFarming.cropFortune',
    'directFarming.contestCropFortune',
    'durationSeconds',
  ]) {
    assert.doesNotMatch(describeContestMissing(path), /\./, path);
  }
});

test('no medal is guessed from a score', () => {
  // The model states why, and that sentence is shown rather than paraphrased:
  // a bracket depends on everyone else's scores that hour.
  const result = contestEstimate({ cropId: 'melon', measured: MEASURED, stats: STATS });
  assert.match(result.bracketReason, /cannot determine a live\/final percentile bracket/);
  assert.match(read('src/planner-mode-ui.js'), /estimate\.bracketReason/);
  // The brackets are shown as the reward table, never as a prediction.
  assert.doesNotMatch(read('src/planner-mode-ui.js'), /predicted|you will place|expected bracket/i);
});

test('an absent input is never read as a measured zero', () => {
  // `Number(null)`, `Number(undefined)` and `Number('')` are all 0, and 0 is a
  // valid non-negative number -- so every absent input used to pass as a
  // measurement. A missing breaksPerSecond made the estimate *complete*, with
  // a collection of 0 and participation not reached: a confident wrong answer
  // instead of a question.
  for (const absent of [null, undefined, '']) {
    const result = estimateJacobContestScore({
      directFarming: {
        breaksPerSecond: absent,
        baseUnitsPerBreak: 5,
        farmingFortune: 100,
        cropFortune: 0,
        contestCropFortune: 0,
        uptimeRatio: 0.85,
      },
    });
    assert.equal(result.complete, false, `breaksPerSecond=${String(absent)} passed as a measurement`);
    assert.ok(result.missing.includes('directFarming.breaksPerSecond'));
    assert.equal(result.expectedCollection, null);
    assert.equal(result.participationReached, null);
  }
  // An absent uptime is the same, and a real zero is still a real answer.
  const noUptime = estimateJacobContestScore({
    directFarming: { breaksPerSecond: 20, baseUnitsPerBreak: 5, farmingFortune: 0, cropFortune: 0, contestCropFortune: 0, uptimeRatio: null },
  });
  assert.equal(noUptime.complete, false);
  const zeroUptime = estimateJacobContestScore({
    directFarming: { breaksPerSecond: 20, baseUnitsPerBreak: 5, farmingFortune: 0, cropFortune: 0, contestCropFortune: 0, uptimeRatio: 0 },
  });
  assert.equal(zeroUptime.complete, true);
  assert.equal(zeroUptime.expectedCollection, 0);
});

test('the panel recomputes in place and dispatches no render', () => {
  const source = read('src/planner-mode-ui.js');
  const handler = source.match(/input\?\.addEventListener\('input'[\s\S]*?\n      \}\);/)[0];
  assert.match(handler, /save\(next\)/);
  assert.match(handler, /refreshContestPanel\(contest, next\)/);
  assert.doesNotMatch(handler, /farming420:state-changed/);
  assert.match(source, /setTextIfChanged\(/);
  assert.doesNotMatch(source, /\.textContent\s*=/);
  // An emptied field clears the stored value rather than storing zero.
  assert.match(handler, /if \(typed === ''\) delete next\.profile\.contestPersonalBest\[cropId\(next\)\];/);
});

test('the deleted workspace patch is gone, and nothing referenced it', () => {
  // `workspace-capability-refresh.js` was not an unwired fix but an unwired
  // regression: it rewrote the gemstone copy's verified threshold of 5 into an
  // unsourced 1, contradicting `gemstone-slots.js` and its own test. It also
  // wrote `textContent` unconditionally from a state-changed handler.
  const files = readdirSync(new URL('src/', root));
  assert.ok(!files.includes('workspace-capability-refresh.js'));
  for (const name of [...files.filter(f => f.endsWith('.js')), '../index.html']) {
    const source = name.startsWith('..') ? read('index.html') : read(`src/${name}`);
    assert.doesNotMatch(source, /workspace-capability-refresh/, name);
  }
  // And the copy it would have changed still matches the verified thresholds.
  assert.match(read('src/gemstone-slots.js'), /TOOL_GEMSTONE_LEVEL_THRESHOLDS = Object\.freeze\(\[5, 15, 25, 50\]\)/);
  assert.match(read('src/workspace-ui.js'), /level 5 \/ 15 \/ 25 \/ 50/);
});
