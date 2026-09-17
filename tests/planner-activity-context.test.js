import test from 'node:test';
import assert from 'node:assert/strict';

import { ACTIVITY_MODE } from '../src/activity-mode.js';
import {
  FORTUNE_BASE_BY_ACTIVITY,
  plannerEconomicsBucket,
  plannerItemApplies,
  plannerProgressBucket,
  setPlannerEconomicsValue,
} from '../src/planner-activity-context.js';

function bucket() {
  return { levels: {}, owned: {}, costs: {}, grindHours: {}, manualGain: {} };
}

function state(activeId = 'normal') {
  return {
    selectedCrop: 'melon',
    profile: {
      levels: {},
      owned: {},
      costs: {},
      grindHours: {},
      manualGain: {},
      cropProgress: { melon: bucket() },
      toolProgress: { 'melon-dicer': bucket() },
      vacuumProgress: bucket(),
      plannerEconomics: {},
      setups: {
        activeId,
        list: [
          { id: 'normal', name: 'Farm Set', slots: {} },
          { id: 'pest', name: 'Pest Set', slots: {} },
        ],
      },
    },
  };
}

test('planner shares the same 100 Farm / 600 Pest Fortune bases as activity calculations', () => {
  assert.equal(FORTUNE_BASE_BY_ACTIVITY[ACTIVITY_MODE.FARM], 100);
  assert.equal(FORTUNE_BASE_BY_ACTIVITY[ACTIVITY_MODE.PEST], 600);
});

test('planner routes Vacuum progress to vacuumProgress instead of the crop tool bucket', () => {
  const raw = state('pest');
  const vacuum = {
    id: 'vacuum-reforge-beady-pest-only-farming-fortune',
    section: 'tools',
    category: 'Vacuum Reforge',
    modeScope: 'Pest Vacuum Drops',
  };
  const farmingTool = {
    id: 'tool-reforge-blessed-reforge',
    section: 'tools',
    category: 'Tool Reforge',
    modeScope: 'Any',
  };

  assert.equal(plannerProgressBucket(raw, vacuum, 'melon'), raw.profile.vacuumProgress);
  assert.equal(plannerProgressBucket(raw, farmingTool, 'melon'), raw.profile.toolProgress['melon-dicer']);
});

test('planner candidate filtering follows Farm/Pest activity scope', () => {
  const farmingTool = {
    id: 'tool-reforge-blessed-reforge', section: 'tools', modeScope: 'Any', cropScope: 'Any',
  };
  const vacuum = {
    id: 'vacuum-reforge-beady-pest-only-farming-fortune', section: 'tools', category: 'Vacuum Reforge', modeScope: 'Pest Vacuum Drops', cropScope: 'Any',
  };

  const farm = state('normal');
  assert.equal(plannerItemApplies(farm, farmingTool, 'melon'), true);
  assert.equal(plannerItemApplies(farm, vacuum, 'melon'), false);

  const pest = state('pest');
  assert.equal(plannerItemApplies(pest, farmingTool, 'melon'), false);
  assert.equal(plannerItemApplies(pest, vacuum, 'melon'), true);
});

test('Farm and Pest revenue baselines are stored separately', () => {
  const raw = state('normal');
  setPlannerEconomicsValue(raw, 'melon', ACTIVITY_MODE.FARM, 'normalCropCoinsPerHour', 20_000_000);
  setPlannerEconomicsValue(raw, 'melon', ACTIVITY_MODE.FARM, 'rareCropCoinsPerHour', 2_000_000);

  assert.deepEqual(plannerEconomicsBucket(raw, 'melon', ACTIVITY_MODE.FARM), {
    normalCropCoinsPerHour: 20_000_000,
    rareCropCoinsPerHour: 2_000_000,
  });
  assert.deepEqual(plannerEconomicsBucket(raw, 'melon', ACTIVITY_MODE.PEST), {
    normalCropCoinsPerHour: 0,
    rareCropCoinsPerHour: 0,
  });

  setPlannerEconomicsValue(raw, 'melon', ACTIVITY_MODE.PEST, 'normalCropCoinsPerHour', 12_000_000);
  assert.equal(plannerEconomicsBucket(raw, 'melon', ACTIVITY_MODE.FARM).normalCropCoinsPerHour, 20_000_000);
  assert.equal(plannerEconomicsBucket(raw, 'melon', ACTIVITY_MODE.PEST).normalCropCoinsPerHour, 12_000_000);
});

test('legacy flat economics migrate only to the activity that owned them', () => {
  const raw = state('pest');
  raw.profile.plannerEconomics.melon = {
    normalCropCoinsPerHour: 18_000_000,
    rareCropCoinsPerHour: 3_000_000,
    activityMode: 'pest',
  };

  assert.deepEqual(plannerEconomicsBucket(raw, 'melon', ACTIVITY_MODE.PEST), {
    normalCropCoinsPerHour: 18_000_000,
    rareCropCoinsPerHour: 3_000_000,
  });
  assert.deepEqual(plannerEconomicsBucket(raw, 'melon', ACTIVITY_MODE.FARM), {
    normalCropCoinsPerHour: 0,
    rareCropCoinsPerHour: 0,
  });
});
