import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { ACTIVITY_MODE } from '../src/activity-mode.js';
import {
  DASHBOARD_REVENUE_STREAM,
  DASHBOARD_STREAM_STATUS,
  calculateDashboardEconomics,
} from '../src/dashboard-economics.js';
import { FARMING_CONTEXT } from '../src/farming-context.js';

const root = new URL('../', import.meta.url);
const read = path => readFileSync(new URL(path, root), 'utf8');

function stats(overrides = {}) {
  return {
    globalFortune: 200,
    cropFortune: 100,
    overbloom: 20,
    incomplete: {
      globalFortune: [],
      cropFortune: [],
      overbloom: [],
    },
    ...overrides,
  };
}

function input(overrides = {}) {
  return {
    cropId: 'melon',
    mode: ACTIVITY_MODE.FARM,
    context: FARMING_CONTEXT.NORMAL,
    measured: {
      breaksPerSecond: 20,
      uptimePercent: 90,
    },
    stats: stats(),
    cropUnitValueCoins: 10,
    feastMaterialCoins: 500,
    ...overrides,
  };
}

test('normal farming uses the shared crop engine and produces one complete known stream', () => {
  const result = calculateDashboardEconomics(input());
  assert.equal(result.complete, true);
  assert.ok(result.netCoinsPerHour > 0);
  assert.equal(result.netCoinsPerHour, result.knownCoinsPerHour);
  assert.deepEqual(result.streams.map(stream => stream.id), [
    DASHBOARD_REVENUE_STREAM.NORMAL_CROP,
  ]);
  assert.equal(result.streams[0].status, DASHBOARD_STREAM_STATUS.KNOWN);
  assert.ok(result.throughput.validBreaksPerHour > 0);
});

test('legacy manually entered coin values never affect Dashboard economics', () => {
  const first = calculateDashboardEconomics(input({
    measured: {
      breaksPerSecond: 20,
      uptimePercent: 90,
      coinsPerUnit: 1,
      feastMaterialCoins: 1,
    },
  }));
  const second = calculateDashboardEconomics(input({
    measured: {
      breaksPerSecond: 20,
      uptimePercent: 90,
      coinsPerUnit: 999_999_999,
      feastMaterialCoins: 999_999_999,
    },
  }));
  assert.equal(first.netCoinsPerHour, second.netCoinsPerHour);
});

test('Harvest Feast adds the sourced rare-crop stream when its market value is available', () => {
  const result = calculateDashboardEconomics(input({
    context: FARMING_CONTEXT.HARVEST_FEAST,
  }));
  const feast = result.streams.find(stream => stream.id === DASHBOARD_REVENUE_STREAM.FEAST_RARE_CROP);
  assert.equal(feast.status, DASHBOARD_STREAM_STATUS.KNOWN);
  assert.ok(feast.coinsPerHour > 0);
  assert.equal(result.complete, true);
  assert.ok(result.netCoinsPerHour > result.streams[0].coinsPerHour);
});

test('Grand Feast keeps progression rewards separate instead of inventing a coin value', () => {
  const result = calculateDashboardEconomics(input({
    context: FARMING_CONTEXT.GRAND_FEAST,
  }));
  const event = result.streams.find(stream => stream.id === DASHBOARD_REVENUE_STREAM.EVENT_REWARDS);
  assert.equal(event.status, DASHBOARD_STREAM_STATUS.UNMODELLED);
  assert.equal(event.coinsPerHour, null);
  assert.equal(result.complete, false);
  assert.equal(result.netCoinsPerHour, null);
  assert.ok(result.knownCoinsPerHour > 0);
});

test('Pest Spawning stays crop-neutral and never substitutes crop Coins/h', () => {
  const result = calculateDashboardEconomics(input({
    mode: ACTIVITY_MODE.PEST_SPAWN,
  }));
  assert.equal(result.cropId, null);
  assert.equal(result.knownCoinsPerHour, null);
  assert.equal(result.netCoinsPerHour, null);
  assert.equal(result.streams.length, 1);
  assert.equal(result.streams[0].id, DASHBOARD_REVENUE_STREAM.PEST_SYSTEM);
  assert.equal(result.streams[0].status, DASHBOARD_STREAM_STATUS.UNMODELLED);
  assert.equal(result.streams[0].coinsPerHour, null);
});

test('Pest Killing never substitutes crop Coins/h for Vacuum profit', () => {
  const result = calculateDashboardEconomics(input({
    mode: ACTIVITY_MODE.PEST_KILL,
  }));
  assert.equal(result.knownCoinsPerHour, null);
  assert.equal(result.netCoinsPerHour, null);
  assert.equal(result.streams.length, 1);
  assert.equal(result.streams[0].id, DASHBOARD_REVENUE_STREAM.PEST_SYSTEM);
  assert.equal(result.streams[0].coinsPerHour, null);
});

test('an incomplete Fortune axis blocks the dependent Coins/h stream', () => {
  const result = calculateDashboardEconomics(input({
    stats: stats({
      incomplete: {
        globalFortune: [{ id: 'unknown-source', reason: 'not modeled' }],
        cropFortune: [],
        overbloom: [],
      },
    }),
  }));
  assert.equal(result.streams[0].status, DASHBOARD_STREAM_STATUS.INCOMPLETE);
  assert.equal(result.streams[0].coinsPerHour, null);
  assert.equal(result.knownCoinsPerHour, null);
  assert.equal(result.netCoinsPerHour, null);
});

test('Dashboard has no throughput configuration fields and delegates economics to the shared model', () => {
  const app = read('src/app.js');
  assert.match(app, /calculateDashboardEconomics\(/);
  assert.match(app, /data-dashboard-open-planner/);
  assert.doesNotMatch(app, /data-dashboard-estimate|dashboard-estimate-inputs/);
  assert.doesNotMatch(app, /from '\.\/measured-baseline\.js'/);
  assert.match(app, /Current account state/);
  assert.match(app, /Coins\/hour model/);
});


test('Dashboard owns an FF-only crop selector and hides the global crop selector on Dashboard', () => {
  const app = read('src/app.js');
  assert.match(app, /dashboardCrop: 'melon'/);
  assert.match(app, /data-dashboard-crop/);
  assert.match(app, /state\.page === 'dashboard'/);
  assert.match(app, /computeStatTotals\(state, farmingMode \? selectedCrop\.id : null/);
  assert.match(app, /Crop selection exists only for Farming/);
  assert.match(app, /linked physical loadout: \$\{linkedSetLabel\}/);
  assert.match(app, /No crop-specific Fortune or tool state is included/);
});
