import test from 'node:test';
import assert from 'node:assert/strict';

import {
  ANITA_ACCESSORY_CONTEST_CROP_FORTUNE,
  JACOB_BRACKETS,
  JACOB_CONTEST_CROPS_PER_EVENT,
  JACOB_CONTEST_DURATION_SECONDS,
  JACOB_CONTEST_INTERVAL_SECONDS,
  JACOB_PARTICIPATION_COLLECTION,
  anitaContestCropFortune,
  compareJacobContestScores,
  estimateJacobContestScore,
  jacobBracketFromFinalPercentile,
  jacobRewardForBracket,
  personalBestCropFortune,
  personalBestScoreForFortune,
} from '../src/jacob-contest-model.js';

test('Jacob timing and current bracket boundaries are explicit', () => {
  assert.equal(JACOB_CONTEST_DURATION_SECONDS, 1200);
  assert.equal(JACOB_CONTEST_INTERVAL_SECONDS, 3600);
  assert.equal(JACOB_CONTEST_CROPS_PER_EVENT, 3);
  assert.equal(JACOB_PARTICIPATION_COLLECTION, 100);
  assert.deepEqual(JACOB_BRACKETS.map(row => [row.id, row.topPercent]), [
    ['diamond', 2],
    ['platinum', 5],
    ['gold', 10],
    ['silver', 30],
    ['bronze', 60],
  ]);
});

test('final percentile maps to reward bracket only after participation', () => {
  assert.equal(jacobBracketFromFinalPercentile(1.9, 100)?.id, 'diamond');
  assert.equal(jacobBracketFromFinalPercentile(5, 100)?.id, 'platinum');
  assert.equal(jacobBracketFromFinalPercentile(10, 100)?.id, 'gold');
  assert.equal(jacobBracketFromFinalPercentile(30, 100)?.id, 'silver');
  assert.equal(jacobBracketFromFinalPercentile(60, 100)?.id, 'bronze');
  assert.equal(jacobBracketFromFinalPercentile(61, 100)?.id, 'participation');
  assert.equal(jacobBracketFromFinalPercentile(1, 99), null);
});

test('Diamond and Platinum reward the extra lower medal currencies', () => {
  const diamond = jacobRewardForBracket('diamond');
  const platinum = jacobRewardForBracket('platinum');
  assert.deepEqual(diamond.medals, { gold: 1, silver: 1, bronze: 0 });
  assert.equal(diamond.jacobTickets, 35);
  assert.equal(diamond.carnivalTickets, 3);
  assert.deepEqual(platinum.medals, { gold: 1, silver: 0, bronze: 1 });
  assert.equal(platinum.jacobTickets, 30);
  assert.equal(platinum.carnivalTickets, 2);
});

test('personal best crop fortune uses crop-specific divisors and caps at 100', () => {
  assert.equal(personalBestCropFortune('Wheat', 1_000_000), 100);
  assert.equal(personalBestCropFortune('Carrot', 1_500_000), 50);
  assert.equal(personalBestCropFortune('Melon', 1_904_500), 38.09);
  assert.equal(personalBestCropFortune('Wild Rose', 2_000_000), 100);
  assert.equal(personalBestCropFortune('Moonflower', 4_000_000), 100);
  assert.equal(personalBestScoreForFortune('Sunflower', 100), 2_000_000);
  assert.equal(personalBestCropFortune('unknown-crop', 1_000_000), null);
});

test('score model sums direct farming and only explicit collection streams', () => {
  const result = estimateJacobContestScore({
    directFarming: {
      breaksPerSecond: 20,
      baseUnitsPerBreak: 1,
      farmingFortune: 100,
      cropFortune: 50,
      contestCropFortune: 25,
      uptimeRatio: 0.9,
    },
    collectionStreams: [
      { id: 'pre-spawned-pests', units: 10_000, source: 'manual-observation' },
      { id: 'greenhouse-harvest', units: 20_000, source: 'greenhouse-model' },
    ],
  });

  assert.equal(result.complete, true);
  assert.equal(result.direct.validBreaks, 21_600);
  assert.equal(result.direct.multiplier, 2.75);
  assert.equal(result.directCollection, 59_400);
  assert.equal(result.explicitCollection, 30_000);
  assert.equal(result.expectedCollection, 89_400);
  assert.equal(result.participationReached, true);
  assert.equal(result.bracket, null);
});

test('unknown contest fortune and uptime are not silently converted to zero/full uptime', () => {
  const result = estimateJacobContestScore({
    directFarming: {
      breaksPerSecond: 20,
      baseUnitsPerBreak: 1,
      farmingFortune: 100,
      cropFortune: 50,
    },
  });
  assert.equal(result.complete, false);
  assert.equal(result.expectedCollection, null);
  assert.ok(result.missing.includes('directFarming.contestCropFortune'));
  assert.ok(result.missing.includes('directFarming.uptimeRatio'));
});

test('explicit collection streams can model a contest strategy without pretending they are block breaks', () => {
  const result = estimateJacobContestScore({
    collectionStreams: [
      { id: 'pest-drop', units: 50_000 },
      { id: 'greenhouse', units: 100_000 },
    ],
  });
  assert.equal(result.complete, true);
  assert.equal(result.directCollection, 0);
  assert.equal(result.expectedCollection, 150_000);
});

test('contest score comparison uses collection objective rather than coins', () => {
  const before = estimateJacobContestScore({ collectionStreams: [{ units: 1000 }] });
  const after = estimateJacobContestScore({ collectionStreams: [{ units: 1250 }] });
  assert.deepEqual(compareJacobContestScores(before, after), {
    complete: true,
    deltaCollection: 250,
    relativeGain: 0.25,
  });
});

test('Anita accessory bonus is conditional on the player-specific selected contest crop', () => {
  assert.deepEqual(ANITA_ACCESSORY_CONTEST_CROP_FORTUNE, { talisman: 5, ring: 15, artifact: 25 });
  assert.equal(anitaContestCropFortune('artifact', true), 25);
  assert.equal(anitaContestCropFortune('artifact', false), 0);
  assert.equal(anitaContestCropFortune('artifact', null), null);
});
