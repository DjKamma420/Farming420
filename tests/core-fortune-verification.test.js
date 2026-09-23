import assert from 'node:assert/strict';
import test from 'node:test';

import { UPGRADES } from '../src/data.js';
import {
  CORE_FORTUNE_FACTS,
  CORE_FORTUNE_SOURCE,
  CORE_FORTUNE_VERIFIED,
} from '../research/core-fortune.js';

const byId = new Map(UPGRADES.map(entry => [entry.id, entry]));

test('the core Fortune verification slice is current and uses the maintained wiki', () => {
  assert.equal(CORE_FORTUNE_VERIFIED, '2026-09-23');
  assert.equal(CORE_FORTUNE_SOURCE, 'https://hypixelskyblock.minecraft.wiki/w/Farming_Fortune');
  assert.ok(CORE_FORTUNE_VERIFIED >= '2026-08-01', 'verification predates the newest relevant farming changes');
  assert.ok(!CORE_FORTUNE_SOURCE.includes('wiki.hypixel.net'), 'the closed official wiki cannot be used');
  assert.ok(!CORE_FORTUNE_SOURCE.includes('fandom.com'), 'Fandom is not strong enough for this verified slice');
});

test('every verified core Fortune fact still matches src/data.js', () => {
  assert.equal(CORE_FORTUNE_FACTS.length, 13);

  for (const fact of CORE_FORTUNE_FACTS) {
    const upgrade = byId.get(fact.id);
    assert.ok(upgrade, `verified upgrade is missing from src/data.js: ${fact.id}`);
    assert.equal(upgrade.status, 'ACTIVE', `${fact.id} is no longer active`);
    assert.equal(upgrade.max, fact.max, `${fact.id} max drifted from the verified value`);
    assert.equal(upgrade.stepGain, fact.stepGain, `${fact.id} step gain drifted from the verified value`);
    assert.equal(fact.source, CORE_FORTUNE_SOURCE, `${fact.id} does not carry the verified source`);
    assert.equal(fact.lastVerified, CORE_FORTUNE_VERIFIED, `${fact.id} does not carry the verification date`);
  }
});

test('linear verified entries reproduce their published maximum', () => {
  for (const fact of CORE_FORTUNE_FACTS.filter(entry => !entry.nonlinear)) {
    assert.equal(
      fact.max * fact.stepGain,
      fact.publishedMaximum,
      `${fact.id} max × step does not reproduce the sourced maximum`,
    );
  }
});

test('Dedication stays nonlinear instead of being reduced to a fake per-level step', () => {
  const dedication = CORE_FORTUNE_FACTS.find(entry => entry.id === 'tool-enchant-dedication');
  assert.equal(dedication.nonlinear, true);
  assert.equal(dedication.stepGain, 0);
  assert.equal(dedication.publishedMaximum, 92);
});
