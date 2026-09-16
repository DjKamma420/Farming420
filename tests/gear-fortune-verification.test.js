import assert from 'node:assert/strict';
import test from 'node:test';

import '../src/runtime-data-patches.js';
import { UPGRADES } from '../src/data.js';
import {
  GEAR_FORTUNE_FACTS,
  GEAR_FORTUNE_VERIFIED,
  VERIFIED_GEAR_MODEL_GAPS,
} from '../research/gear-fortune.js';

const byId = new Map(UPGRADES.map(entry => [entry.id, entry]));

test('verified farming gear facts are dated after the 2026 farming changes', () => {
  assert.equal(GEAR_FORTUNE_VERIFIED, '2026-09-16');
  assert.ok(GEAR_FORTUNE_VERIFIED >= '2026-08-01');
});

test('verified gear facts remain mapped to active runtime entries', () => {
  assert.equal(GEAR_FORTUNE_FACTS.length, 8);

  for (const fact of GEAR_FORTUNE_FACTS) {
    const upgrade = byId.get(fact.id);
    assert.ok(upgrade, `verified gear upgrade is missing from runtime data: ${fact.id}`);
    assert.equal(upgrade.status, 'ACTIVE', `${fact.id} is no longer active`);
    if (fact.stepGain !== undefined) assert.equal(upgrade.stepGain, fact.stepGain, `${fact.id} drifted from the verified Fortune value`);
    if (fact.max !== undefined) assert.equal(upgrade.max, fact.max, `${fact.id} drifted from the verified max`);
    assert.match(fact.source, /^https:\/\/(hypixelskyblock\.minecraft\.wiki|hypixel\.net|hypixel-skyblock\.fandom\.com)\//);
    assert.equal(fact.lastVerified, GEAR_FORTUNE_VERIFIED);
  }
});

test('armor research distinguishes item-local mechanics from tiered bonuses', () => {
  const helianthus = GEAR_FORTUNE_FACTS.find(fact => fact.id === 'armor-helianthus-armor-base-stats');
  const feast = GEAR_FORTUNE_FACTS.find(fact => fact.id === 'armor-helianthus-feast-set-bonus');
  const mossy = GEAR_FORTUNE_FACTS.find(fact => fact.id === 'armor-reforge-mossy-on-full-armor');
  const pesterminator = GEAR_FORTUNE_FACTS.find(fact => fact.id === 'armor-enchant-pesterminator-vi-on-full-armor');
  assert.match(helianthus.note, /item-local/i);
  assert.match(feast.note, /tiered piece-count bonus/i);
  assert.match(mossy.note, /one armor item at a time/i);
  assert.match(pesterminator.note, /item-local/i);
});

test('Blossom base Fortune is modeled per piece and separately from Florist', () => {
  const base = byId.get('equipment-blossom-set-base-stats');
  const florist = byId.get('equipment-blossom-set-visitor-bonus');
  assert.equal(base.max, 4);
  assert.equal(base.stepGain, 7);
  assert.equal(base.max * base.stepGain, 28);
  assert.equal(florist.stepGain, 90);
  assert.notEqual(base.id, florist.id);
  assert.match(base.notes, /separate from the Florist visitor bonus/i);
});

test('there are no remaining verified gear model gaps in this research slice', () => {
  assert.deepEqual(VERIFIED_GEAR_MODEL_GAPS, []);
});
