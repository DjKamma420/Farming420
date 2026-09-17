import assert from 'node:assert/strict';
import test from 'node:test';

import { ACTIVITY_MODE } from '../src/activity-mode.js';
import { computeStatTotals } from '../src/computed-stats.js';
import { toolKeyForCropId } from '../src/migrations.js';
import {
  TOOL_GEM_ENTRY_ID,
  TOOL_LEVEL_ENTRY_ID,
  TOOL_RECOMB_ENTRY_ID,
  toolGemstoneContribution,
} from '../src/tool-gemstone-contribution.js';

function stateWithTool({ level = 50, mk2 = true, mk3 = true, recomb = true, gems = 4, legacy = false } = {}) {
  const key = toolKeyForCropId('melon');
  const levels = { [TOOL_LEVEL_ENTRY_ID]: level };
  const owned = { [TOOL_LEVEL_ENTRY_ID]: level > 0 };
  if (mk2) { levels['tool-mk-ii'] = 1; owned['tool-mk-ii'] = true; }
  if (mk3) { levels['tool-mk-iii'] = 1; owned['tool-mk-iii'] = true; }
  if (recomb) { levels[TOOL_RECOMB_ENTRY_ID] = 1; owned[TOOL_RECOMB_ENTRY_ID] = true; }
  if (legacy) { levels[TOOL_GEM_ENTRY_ID] = 1; owned[TOOL_GEM_ENTRY_ID] = true; }
  return {
    selectedCrop: 'melon',
    profile: {
      toolProgress: {
        [key]: {
          levels,
          owned,
          gemSlots: Array.from({ length: gems }, () => ({ unlocked: true, gem: 'PERFECT PERIDOT' })),
        },
      },
    },
  };
}

test('four max-tool Perfect Peridots derive +32 from the actual slots and rarity', () => {
  const contribution = toolGemstoneContribution(stateWithTool(), 'melon');
  assert.equal(contribution.available, 4);
  assert.equal(contribution.filled, 4);
  assert.equal(contribution.rarity, 'LEGENDARY');
  assert.equal(contribution.value, 32);
  assert.equal(contribution.incomplete, false);
});

test('the old one-shot +30 flag cannot double count the real gemstone slots', () => {
  const withoutLegacy = computeStatTotals(stateWithTool({ legacy: false }), 'melon', ACTIVITY_MODE.FARM);
  const withLegacy = computeStatTotals(stateWithTool({ legacy: true }), 'melon', ACTIVITY_MODE.FARM);
  assert.equal(withLegacy.derived.toolPeridotFortune.value, 32);
  assert.equal(withLegacy.cropFortune, withoutLegacy.cropFortune);
});

test('legacy one-shot gemstone state becomes incomplete instead of fabricating +30', () => {
  const state = stateWithTool({ gems: 0, legacy: true });
  const contribution = toolGemstoneContribution(state, 'melon');
  assert.equal(contribution.active, true);
  assert.equal(contribution.value, 0);
  assert.equal(contribution.incomplete, true);
  assert.match(contribution.reason, /per-slot selection/);
});

test('Pest mode never counts the crop tool Peridot contribution', () => {
  const totals = computeStatTotals(stateWithTool(), 'melon', ACTIVITY_MODE.PEST);
  assert.equal(totals.derived.toolPeridotFortune.active, false);
  assert.equal(totals.derived.toolPeridotFortune.value, 0);
});
