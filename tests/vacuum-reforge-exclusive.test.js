import assert from 'node:assert/strict';
import test from 'node:test';

import { ACTIVITY_MODE } from '../src/activity-mode.js';
import { computeTotalsFromEntries } from '../src/computed-stats.js';
import { VACUUM_REFORGE_EFFECT_ENTRY_IDS } from '../src/item-capabilities.js';

const beady = {
  id: VACUUM_REFORGE_EFFECT_ENTRY_IDS.beady,
  category: 'Vacuum Reforge',
  section: 'tools',
  metric: 'Crop Yield',
  modeScope: 'Pest Vacuum Drops',
  cropScope: 'Any',
  status: 'ACTIVE',
  max: 1,
  stepGain: 100,
};

function state(reforge) {
  return {
    selectedCrop: 'melon',
    profile: {
      levels: {}, owned: {}, costs: {}, manualGain: {},
      cropProgress: {}, toolProgress: {},
      vacuumProgress: {
        reforge,
        levels: { [beady.id]: 1 },
        owned: { [beady.id]: true },
        costs: {}, manualGain: {},
      },
    },
  };
}

test('Buzzing never inherits stale Beady Pest Fortune', () => {
  const totals = computeTotalsFromEntries(state('buzzing'), [beady], 'melon', ACTIVITY_MODE.PEST);
  assert.equal(totals.pestFortune, 0);
});

test('Beady contributes its Pest-only Farming Fortune when selected', () => {
  const totals = computeTotalsFromEntries(state('beady'), [beady], 'melon', ACTIVITY_MODE.PEST);
  assert.equal(totals.pestFortune, 100);
});

test('legacy pre-exclusive Beady storage remains readable when no explicit reforge exists', () => {
  const totals = computeTotalsFromEntries(state(undefined), [beady], 'melon', ACTIVITY_MODE.PEST);
  assert.equal(totals.pestFortune, 100);
});
