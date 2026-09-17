// Revenue-aware comparison helpers for Farming Fortune and Overbloom.
//
// Both stats are multiplicative relative to their own base stream. Normal crop
// farming uses a 100-point Fortune base, while Pest/Vacuum drop scaling uses
// the 600-point base already used by the activity-mode calculator. Overbloom
// keeps its own 100-point base.
//
// Therefore there is deliberately no universal fixed "1 Overbloom = X FF".
// The coin-equivalent value depends on activity mode, current stat levels and
// how much of the player's revenue comes from each stream.

function finiteNonNegative(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, number) : 0;
}

export function relativeFortuneGain(deltaFortune, currentFortune, fortuneBase = 100) {
  const delta = finiteNonNegative(deltaFortune);
  const current = finiteNonNegative(currentFortune);
  const base = finiteNonNegative(fortuneBase) || 100;
  return delta / (base + current);
}

export function relativeOverbloomGain(deltaOverbloom, currentOverbloom) {
  const delta = finiteNonNegative(deltaOverbloom);
  const current = finiteNonNegative(currentOverbloom);
  return delta / (100 + current);
}

export function marginalCoinsPerHour({
  deltaFortune = 0,
  deltaOverbloom = 0,
  currentFortune = 0,
  currentOverbloom = 0,
  fortuneBase = 100,
  normalCropCoinsPerHour = 0,
  rareCropCoinsPerHour = 0,
} = {}) {
  const normal = finiteNonNegative(normalCropCoinsPerHour);
  const rare = finiteNonNegative(rareCropCoinsPerHour);
  return normal * relativeFortuneGain(deltaFortune, currentFortune, fortuneBase)
    + rare * relativeOverbloomGain(deltaOverbloom, currentOverbloom);
}

/**
 * Express an Overbloom increase as the amount of Farming Fortune that would
 * produce the same marginal coins/hour in the supplied activity/loadout.
 *
 * Returns null when the Fortune-sensitive revenue stream is zero because an FF
 * equivalent is then undefined rather than infinite/useful.
 */
export function overbloomToFortuneEquivalent({
  deltaOverbloom = 1,
  currentFortune = 0,
  currentOverbloom = 0,
  fortuneBase = 100,
  normalCropCoinsPerHour = 0,
  rareCropCoinsPerHour = 0,
} = {}) {
  const normal = finiteNonNegative(normalCropCoinsPerHour);
  if (normal <= 0) return null;
  const rare = finiteNonNegative(rareCropCoinsPerHour);
  const delta = finiteNonNegative(deltaOverbloom);
  const base = finiteNonNegative(fortuneBase) || 100;
  return delta
    * (rare / normal)
    * ((base + finiteNonNegative(currentFortune)) / (100 + finiteNonNegative(currentOverbloom)));
}

export function coinsPerEffectiveFortune({ costCoins = 0, deltaFortuneEquivalent = 0 } = {}) {
  const cost = finiteNonNegative(costCoins);
  const gain = finiteNonNegative(deltaFortuneEquivalent);
  return gain > 0 ? cost / gain : null;
}

export function paybackHours({ costCoins = 0, marginalCoinsHour = 0 } = {}) {
  const cost = finiteNonNegative(costCoins);
  const gain = finiteNonNegative(marginalCoinsHour);
  return gain > 0 ? cost / gain : null;
}
