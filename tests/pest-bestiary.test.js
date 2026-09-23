import assert from 'node:assert/strict';
import test from 'node:test';

import {
  ELIGIBLE_PEST_BESTIARY_FAMILIES,
  eligiblePestBestiaryFromKills,
  pestBestiaryTierFromKills,
} from '../src/pest-bestiary.js';

test('Bracket 6 Pest thresholds match the current 15-tier table', () => {
  assert.equal(pestBestiaryTierFromKills(0, 6), 0);
  assert.equal(pestBestiaryTierFromKills(1, 6), 1);
  assert.equal(pestBestiaryTierFromKills(13, 6), 6);
  assert.equal(pestBestiaryTierFromKills(14, 6), 7);
  assert.equal(pestBestiaryTierFromKills(250, 6), 15);
  assert.equal(pestBestiaryTierFromKills(999, 6), 15);
});

test('Bracket 7 Pest thresholds match Field Mouse and Lunar Moth', () => {
  assert.equal(pestBestiaryTierFromKills(0, 7), 0);
  assert.equal(pestBestiaryTierFromKills(10, 7), 6);
  assert.equal(pestBestiaryTierFromKills(11, 7), 7);
  assert.equal(pestBestiaryTierFromKills(100, 7), 15);
});

test('the Brown Bandana family set contains exactly 15 eligible Pests', () => {
  assert.equal(ELIGIBLE_PEST_BESTIARY_FAMILIES.length, 15);
  assert.equal(ELIGIBLE_PEST_BESTIARY_FAMILIES.filter(row => row.bracket === 7).length, 2);
  assert.ok(ELIGIBLE_PEST_BESTIARY_FAMILIES.some(row => row.key === 'pest_lunar_moth_1'));
  assert.ok(ELIGIBLE_PEST_BESTIARY_FAMILIES.some(row => row.key === 'pest_mouse_1'));
  assert.ok(!ELIGIBLE_PEST_BESTIARY_FAMILIES.some(row => row.key.includes('zombuddy')));
  assert.ok(!ELIGIBLE_PEST_BESTIARY_FAMILIES.some(row => row.key.includes('timestalk')));
});

test('a present sparse Bestiary kill map treats unrecorded Pest families as tier zero', () => {
  const result = eligiblePestBestiaryFromKills({});
  assert.equal(result.complete, true);
  assert.equal(result.tierTotal, 0);
  assert.equal(result.maxTierTotal, 225);
  assert.equal(Object.keys(result.familyTiers).length, 15);
});

test('eligible Pest tiers are derived from each family bracket and exclude non-Pests', () => {
  const result = eligiblePestBestiaryFromKills({
    pest_fly_1: 250,
    pest_mouse_1: 100,
    pest_lunar_moth_1: 11,
    zombuddy_1: 999999,
    timestalk_clone_100: 999999,
  });
  assert.equal(result.complete, true);
  assert.equal(result.familyTiers.pest_fly_1, 15);
  assert.equal(result.familyTiers.pest_mouse_1, 15);
  assert.equal(result.familyTiers.pest_lunar_moth_1, 7);
  assert.equal(result.tierTotal, 37);
});

test('missing or malformed Bestiary data stays unknown instead of becoming zero', () => {
  assert.equal(eligiblePestBestiaryFromKills(null).complete, false);
  assert.equal(eligiblePestBestiaryFromKills(null).tierTotal, null);

  const malformed = eligiblePestBestiaryFromKills({ pest_fly_1: 'not-a-number' });
  assert.equal(malformed.complete, false);
  assert.equal(malformed.tierTotal, null);
  assert.ok(malformed.reasons.some(reason => reason.includes('Fly')));
});
