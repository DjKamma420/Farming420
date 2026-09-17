import { INTERNET_FARMING_TIME_VALUE_COINS_PER_HOUR } from './upgrade-economics.js';

export const OUTPUT_MODES = Object.freeze({
  ACTIVE: 'ACTIVE',
  PASSIVE: 'PASSIVE',
  HYBRID: 'HYBRID',
  PASSIVE_UTILITY: 'PASSIVE_UTILITY',
});

function finiteNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function nonNegative(value) {
  return Math.max(0, finiteNumber(value));
}

/**
 * Normalize a bounded passive-production window into coins per real elapsed
 * hour. This deliberately uses wall-clock time rather than active play time.
 *
 * The caller must already account for storage caps, bait/input availability,
 * offline-only restrictions, crop decay/freeze, and other mechanic-specific
 * limits when calculating expectedStoredOutputValueCoins.
 */
export function passiveWindowNetCoinsPerRealHour({
  expectedStoredOutputValueCoins = 0,
  recurringInputCostCoins = 0,
  wallClockHours = 0,
  collectionMaintenanceActiveHours = 0,
  timeValueCoinsPerHour = INTERNET_FARMING_TIME_VALUE_COINS_PER_HOUR,
} = {}) {
  const hours = nonNegative(wallClockHours);
  if (hours <= 0) return null;

  const maintenanceOpportunityCost = nonNegative(collectionMaintenanceActiveHours)
    * nonNegative(timeValueCoinsPerHour);

  return (
    finiteNumber(expectedStoredOutputValueCoins)
    - nonNegative(recurringInputCostCoins)
    - maintenanceOpportunityCost
  ) / hours;
}

/**
 * Combine active and passive economics across one real-time schedule window.
 *
 * Always-on passive systems overlap both online and offline hours. Offline-only
 * systems, such as the current Disco Destination utility context, contribute
 * only during the supplied offline hours.
 */
export function scheduleNetCoinsPerRealHour({
  wallClockHours = 0,
  activeHours = 0,
  offlineHours = 0,
  activeNetCoinsPerHour = 0,
  alwaysOnPassiveNetCoinsPerHour = 0,
  offlineOnlyPassiveNetCoinsPerHour = 0,
} = {}) {
  const wall = nonNegative(wallClockHours);
  if (wall <= 0) return null;

  const active = Math.min(nonNegative(activeHours), wall);
  const offline = Math.min(nonNegative(offlineHours), wall);

  const totalValue = active * finiteNumber(activeNetCoinsPerHour)
    + wall * finiteNumber(alwaysOnPassiveNetCoinsPerHour)
    + offline * finiteNumber(offlineOnlyPassiveNetCoinsPerHour);

  return totalValue / wall;
}

/**
 * Economic value of a passive utility that only saves active handling time.
 * It must not be used to fabricate extra production.
 */
export function passiveUtilityTimeSavedCoins({
  activeHoursBefore = 0,
  activeHoursAfter = 0,
  timeValueCoinsPerHour = INTERNET_FARMING_TIME_VALUE_COINS_PER_HOUR,
} = {}) {
  const timeSaved = Math.max(
    0,
    nonNegative(activeHoursBefore) - nonNegative(activeHoursAfter),
  );
  return timeSaved * nonNegative(timeValueCoinsPerHour);
}

/**
 * Generic storage-cap helper for deterministic one-unit capture/production
 * cycles. It is useful for Pest/Mouse Trap baseline modeling, but mechanic-
 * specific modifiers such as Mosquito's next-capture acceleration must be
 * modeled before calling this helper if they change cycle timing.
 */
export function boundedCycleProduction({
  elapsedHours = 0,
  cycleHours = 0,
  capacity = 0,
  startingFill = 0,
  unitsPerCycle = 1,
} = {}) {
  const elapsed = nonNegative(elapsedHours);
  const cycle = nonNegative(cycleHours);
  const cap = Math.floor(nonNegative(capacity));
  const start = Math.min(Math.floor(nonNegative(startingFill)), cap);
  const perCycle = nonNegative(unitsPerCycle);

  if (cycle <= 0 || cap <= start || perCycle <= 0) {
    return {
      producedUnits: 0,
      endingFill: start,
      capacityLimited: cap <= start,
    };
  }

  const completedCycles = Math.floor(elapsed / cycle);
  const possibleUnits = completedCycles * perCycle;
  const remainingCapacity = cap - start;
  const producedUnits = Math.min(possibleUnits, remainingCapacity);

  return {
    producedUnits,
    endingFill: start + producedUnits,
    capacityLimited: possibleUnits >= remainingCapacity,
  };
}
