import assert from 'node:assert/strict';
import test from 'node:test';

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

test('verified gear values still match the runtime data', () => {
  assert.equal(GEAR_FORTUNE_FACTS.length, 5);

  for (const fact of GEAR_FORTUNE_FACTS) {
    const upgrade = byId.get(fact.id);
    assert.ok(upgrade, `verified gear upgrade is missing from src/data.js: ${fact.id}`);
    assert.equal(upgrade.status, 'ACTIVE', `${fact.id} is no longer active`);
    assert.equal(upgrade.stepGain, fact.stepGain, `${fact.id} drifted from the verified Fortune value`);
    assert.ok(fact.source.startsWith('https://hypixelskyblock.minecraft.wiki/'));
    assert.equal(fact.lastVerified, GEAR_FORTUNE_VERIFIED);
  }
});

test('the Blossom base-stat omission remains explicit until the runtime model is fixed', () => {
  assert.equal(VERIFIED_GEAR_MODEL_GAPS.length, 1);
  const gap = VERIFIED_GEAR_MODEL_GAPS[0];
  assert.equal(gap.id, 'equipment-blossom-set-base-stats');
  assert.equal(gap.missingFortune, 28);
  assert.equal(byId.has(gap.id), false, 'remove this gap record after adding the separate +28 Blossom base-stat runtime entry');
});
