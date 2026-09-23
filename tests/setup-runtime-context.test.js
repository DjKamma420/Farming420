import assert from 'node:assert/strict';
import test from 'node:test';

import {
  MANTID_RECENT_KILL_CAP,
  normalizeRecentPestKills,
  normalizeSprayonatorActive,
  setupRuntimeContextForState,
} from '../src/setup-runtime-context.js';

test('missing Mantid runtime context stays unknown instead of becoming zero', () => {
  assert.equal(normalizeRecentPestKills(null), null);
  assert.equal(normalizeRecentPestKills(undefined), null);
  assert.equal(normalizeRecentPestKills(''), null);
  assert.equal(setupRuntimeContextForState({ profile: {} }).recentPestKills, null);
});

test('recent Pest kills are integer counts capped at the Mantid max-effect threshold', () => {
  assert.equal(MANTID_RECENT_KILL_CAP, 20);
  assert.equal(normalizeRecentPestKills(0), 0);
  assert.equal(normalizeRecentPestKills(7.9), 7);
  assert.equal(normalizeRecentPestKills(20), 20);
  assert.equal(normalizeRecentPestKills(999), 20);
  assert.equal(normalizeRecentPestKills(-1), null);
  assert.equal(normalizeRecentPestKills('nope'), null);
});

test('Sprayonator state is tri-state and never defaults to false', () => {
  assert.equal(normalizeSprayonatorActive(null), null);
  assert.equal(normalizeSprayonatorActive(''), null);
  assert.equal(normalizeSprayonatorActive('true'), true);
  assert.equal(normalizeSprayonatorActive('false'), false);
  assert.equal(normalizeSprayonatorActive(true), true);
  assert.equal(normalizeSprayonatorActive(false), false);
});

test('stored setup runtime context is normalized before objective evaluation', () => {
  const context = setupRuntimeContextForState({
    profile: {
      setupRuntimeContext: {
        recentPestKills: 57,
        sprayonatorActive: 'yes',
      },
    },
  });
  assert.deepEqual(context, {
    recentPestKills: 20,
    sprayonatorActive: true,
  });
});
