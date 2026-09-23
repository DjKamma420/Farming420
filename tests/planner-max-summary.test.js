import assert from 'node:assert/strict';
import test from 'node:test';

import { UPGRADES } from '../src/data.js';
import {
  farmingMaxItemEligible,
  plannerMaxSummary,
} from '../src/planner-max-summary.js';

test('earned progression contributes to farming max percentage without becoming coin cost', () => {
  const farmingSkill = UPGRADES.find(item => item.id === 'account-skill-farming-skill-level');
  const state = {
    selectedCrop: 'melon',
    profile: {
      levels: { [farmingSkill.id]: 30 },
      owned: {},
    },
  };

  const summary = plannerMaxSummary(state, { items: [farmingSkill] });
  assert.equal(summary.currentSteps, 30);
  assert.equal(summary.totalSteps, 60);
  assert.equal(summary.completionPercent, 50);
  assert.equal(summary.knownCostCoins, 0);
  assert.equal(summary.remainingEarnedSteps, 30);
  assert.equal(summary.remainingUnknownPriceSteps, 0);
  assert.equal(summary.costComplete, true);
});

test('the maxing meter excludes temporary buffs, included duplicate effects and tool reforge alternatives', () => {
  assert.equal(farmingMaxItemEligible({
    id: 'temporary-example',
    status: 'ACTIVE',
    section: 'accessories',
    category: 'Accessory',
    max: 1,
  }), false);
  assert.equal(farmingMaxItemEligible({
    id: 'tool-reforge-example',
    status: 'ACTIVE',
    section: 'tools',
    category: 'Tool Reforge',
    max: 1,
  }), false);

  const included = UPGRADES.find(item => item.id === 'armor-helianthus-armor-bpc');
  assert.ok(included);
  assert.equal(farmingMaxItemEligible(included), false);
});

test('known remaining prices are summed while unknown price steps stay explicit', () => {
  const items = [
    { id: 'earned', name: 'Earned', status: 'ACTIVE', section: 'account', category: 'Account', max: 10 },
    { id: 'buyable', name: 'Buyable', status: 'ACTIVE', section: 'account', category: 'Account', max: 2 },
    { id: 'unknown', name: 'Unknown', status: 'ACTIVE', section: 'account', category: 'Account', max: 1 },
  ];
  const state = {
    selectedCrop: 'melon',
    profile: {
      levels: { earned: 5, buyable: 1, unknown: 0 },
      owned: {},
    },
  };
  const summarizePrice = (store, item) => {
    const currentLevel = Number(store.levels?.[item.id] || 0);
    if (item.id === 'earned') {
      return {
        currentLevel,
        maxLevel: 10,
        costToMaxCoins: 0,
        remainingEarnedSteps: 5,
        remainingUnknownSteps: 0,
      };
    }
    if (item.id === 'buyable') {
      return {
        currentLevel,
        maxLevel: 2,
        costToMaxCoins: 12_500_000,
        remainingEarnedSteps: 0,
        remainingUnknownSteps: 0,
      };
    }
    return {
      currentLevel,
      maxLevel: 1,
      costToMaxCoins: null,
      remainingEarnedSteps: 0,
      remainingUnknownSteps: 1,
    };
  };

  const summary = plannerMaxSummary(state, {
    items,
    summarizePrice,
    resolveCost: () => ({ acquisitionMode: 'UNKNOWN' }),
  });

  assert.equal(summary.knownCostCoins, 12_500_000);
  assert.equal(summary.currentSteps, 6);
  assert.equal(summary.totalSteps, 13);
  assert.equal(summary.remainingEarnedSteps, 5);
  assert.equal(summary.remainingUnknownPriceSteps, 1);
  assert.equal(summary.costComplete, false);
});

test('crop progression expands across crops instead of only counting the selected crop', () => {
  const item = {
    id: 'crop-upgrade',
    name: 'Crop upgrade',
    status: 'ACTIVE',
    section: 'crops',
    category: 'Crop Progression',
    max: 4,
    cropScope: 'Any',
  };
  const state = {
    selectedCrop: 'alpha',
    profile: {
      cropProgress: {
        alpha: { levels: { 'crop-upgrade': 4 } },
        beta: { levels: { 'crop-upgrade': 2 } },
      },
    },
  };
  const summarizePrice = (store, row) => ({
    currentLevel: Number(store.levels?.[row.id] || 0),
    maxLevel: 4,
    costToMaxCoins: 0,
    remainingEarnedSteps: 0,
    remainingUnknownSteps: 0,
  });

  const summary = plannerMaxSummary(state, {
    items: [item],
    crops: [
      { id: 'alpha', name: 'Alpha' },
      { id: 'beta', name: 'Beta' },
    ],
    summarizePrice,
  });

  assert.equal(summary.trackedTargets, 2);
  assert.equal(summary.currentSteps, 6);
  assert.equal(summary.totalSteps, 8);
  assert.equal(summary.completionPercent, 75);
});
