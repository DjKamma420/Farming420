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
          { id: 'normal', name: 'Farming Set', slots: {} },
          { id: 'pest', name: 'Pest Spawning Set', slots: {} },
          { id: 'pest-kill', name: 'Pest Killing Set', slots: {} },
        ],
      },
    },
  };
}

test('planner uses crop Fortune scaling for Farm/Spawn and Pest scaling for Kill', () => {
  assert.equal(FORTUNE_BASE_BY_ACTIVITY[ACTIVITY_MODE.FARM], 100);
  assert.equal(FORTUNE_BASE_BY_ACTIVITY[ACTIVITY_MODE.PEST_SPAWN], 100);
  assert.equal(FORTUNE_BASE_BY_ACTIVITY[ACTIVITY_MODE.PEST_KILL], 600);
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

test('planner candidate filtering follows Farm/Spawn/Kill activity scope', () => {
  const farmingTool = {
    id: 'tool-reforge-blessed-reforge', section: 'tools', modeScope: 'Any', cropScope: 'Any',
  };
  const vacuum = {
    id: 'vacuum-reforge-beady-pest-only-farming-fortune', section: 'tools', category: 'Vacuum Reforge', modeScope: 'Pest Vacuum Drops', cropScope: 'Any',
  };

  const farm = state('normal');
  assert.equal(plannerItemApplies(farm, farmingTool, 'melon'), true);
  assert.equal(plannerItemApplies(farm, vacuum, 'melon'), false);

  const spawn = state('pest');
  assert.equal(plannerItemApplies(spawn, farmingTool, 'melon'), true);
  assert.equal(plannerItemApplies(spawn, vacuum, 'melon'), false);

  const kill = state('pest-kill');
  assert.equal(plannerItemApplies(kill, farmingTool, 'melon'), false);
  assert.equal(plannerItemApplies(kill, vacuum, 'melon'), true);
});

test('Farm, Spawn and Kill revenue baselines are stored separately', () => {
  const raw = state('normal');
  setPlannerEconomicsValue(raw, 'melon', ACTIVITY_MODE.FARM, 'normalCropCoinsPerHour', 20_000_000);
  setPlannerEconomicsValue(raw, 'melon', ACTIVITY_MODE.FARM, 'rareCropCoinsPerHour', 2_000_000);

  assert.deepEqual(plannerEconomicsBucket(raw, 'melon', ACTIVITY_MODE.FARM), {
    normalCropCoinsPerHour: 20_000_000,
    rareCropCoinsPerHour: 2_000_000,
  });
  assert.deepEqual(plannerEconomicsBucket(raw, 'melon', ACTIVITY_MODE.PEST_SPAWN), {
    normalCropCoinsPerHour: 0,
    rareCropCoinsPerHour: 0,
  });
  assert.deepEqual(plannerEconomicsBucket(raw, 'melon', ACTIVITY_MODE.PEST_KILL), {
    normalCropCoinsPerHour: 0,
    rareCropCoinsPerHour: 0,
  });

  setPlannerEconomicsValue(raw, 'melon', ACTIVITY_MODE.PEST_SPAWN, 'normalCropCoinsPerHour', 15_000_000);
  setPlannerEconomicsValue(raw, 'melon', ACTIVITY_MODE.PEST_KILL, 'normalCropCoinsPerHour', 12_000_000);
  assert.equal(plannerEconomicsBucket(raw, 'melon', ACTIVITY_MODE.FARM).normalCropCoinsPerHour, 20_000_000);
  assert.equal(plannerEconomicsBucket(raw, 'melon', ACTIVITY_MODE.PEST_SPAWN).normalCropCoinsPerHour, 15_000_000);
  assert.equal(plannerEconomicsBucket(raw, 'melon', ACTIVITY_MODE.PEST_KILL).normalCropCoinsPerHour, 12_000_000);
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
