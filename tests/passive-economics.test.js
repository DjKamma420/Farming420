import test from 'node:test';
import assert from 'node:assert/strict';
import {
  OUTPUT_MODES,
  passiveWindowNetCoinsPerRealHour,
  scheduleNetCoinsPerRealHour,
  passiveUtilityTimeSavedCoins,
  boundedCycleProduction,
} from '../src/passive-economics.js';

test('passive output modes stay independent from acquisition mode', () => {
  assert.equal(OUTPUT_MODES.PASSIVE, 'PASSIVE');
  assert.equal(OUTPUT_MODES.PASSIVE_UTILITY, 'PASSIVE_UTILITY');
});

test('passive production uses wall-clock hours and subtracts maintenance opportunity cost', () => {
  const value = passiveWindowNetCoinsPerRealHour({
    expectedStoredOutputValueCoins: 30_000_000,
    recurringInputCostCoins: 2_000_000,
    wallClockHours: 10,
    collectionMaintenanceActiveHours: 0.1,
    timeValueCoinsPerHour: 20_000_000,
  });

  assert.equal(value, 2_600_000);
});

test('zero wall-clock duration is incomplete rather than divide-by-zero', () => {
  assert.equal(passiveWindowNetCoinsPerRealHour({
    expectedStoredOutputValueCoins: 1_000_000,
    wallClockHours: 0,
  }), null);
});

test('always-on passive output overlaps active farming while offline-only output does not', () => {
  const value = scheduleNetCoinsPerRealHour({
    wallClockHours: 24,
    activeHours: 4,
    offlineHours: 20,
    activeNetCoinsPerHour: 20_000_000,
    alwaysOnPassiveNetCoinsPerHour: 1_000_000,
    offlineOnlyPassiveNetCoinsPerHour: 300_000,
  });

  // 80m active + 24m always-on passive + 6m offline-only = 110m/day.
  assert.equal(value, 110_000_000 / 24);
});

test('passive utility only values verified time saved and never fabricates negative value', () => {
  assert.equal(passiveUtilityTimeSavedCoins({
    activeHoursBefore: 0.25,
    activeHoursAfter: 0.1,
    timeValueCoinsPerHour: 20_000_000,
  }), 3_000_000);

  assert.equal(passiveUtilityTimeSavedCoins({
    activeHoursBefore: 0.1,
    activeHoursAfter: 0.2,
    timeValueCoinsPerHour: 20_000_000,
  }), 0);
});

test('bounded cycles stop producing once storage is full', () => {
  const trap = boundedCycleProduction({
    elapsedHours: 2,
    cycleHours: 0.25,
    capacity: 3,
    startingFill: 0,
  });

  assert.deepEqual(trap, {
    producedUnits: 3,
    endingFill: 3,
    capacityLimited: true,
  });
});

test('bounded cycles preserve partial starting fill', () => {
  const trap = boundedCycleProduction({
    elapsedHours: 0.5,
    cycleHours: 0.25,
    capacity: 3,
    startingFill: 2,
  });

  assert.deepEqual(trap, {
    producedUnits: 1,
    endingFill: 3,
    capacityLimited: true,
  });
});
