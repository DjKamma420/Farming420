/**
 * What the Greenhouse model can actually tell a player, and what it cannot.
 *
 * `src/greenhouse-model.js` shipped with the 55 live loot multipliers from the
 * August 20, 2026 balance patch, the Garden level that unlocks the Greenhouse,
 * its grid size, the 72-hour base-crop decay window and three announced-but-
 * unreleased follow-ups -- all sourced, and reached by nothing. The planner's
 * Sowdust mode meanwhile filtered upgrades by the words "sowdust" or
 * "greenhouse".
 *
 * This deliberately produces **no coins**. That model's own comment says why:
 * the multipliers "are NOT sufficient to infer a plant's base harvest amount,
 * growth duration, water requirement, mutation spread chance, or minigame
 * outcome". Turning them into a Coins/h figure would need every one of those,
 * so what the page gets is the ranked table, the rules with numbers, and the
 * announced changes marked as not scored.
 */
import {
  GREENHOUSE_BASE_CROP_DECAY_HOURS,
  GREENHOUSE_GRID_PLOTS,
  GREENHOUSE_GRID_SIDE,
  GREENHOUSE_LIVE_LOOT_MULTIPLIERS,
  GREENHOUSE_PLANNED_FOLLOWUPS,
  GREENHOUSE_UNLOCK_GARDEN_LEVEL,
  greenhouseBaseCropDecayState,
} from './greenhouse-model.js';

/** The facts with numbers, each one from the model rather than restated. */
export const GREENHOUSE_FACTS = Object.freeze([
  Object.freeze({
    label: 'Unlocks at',
    value: `Garden level ${GREENHOUSE_UNLOCK_GARDEN_LEVEL}`,
  }),
  Object.freeze({
    label: 'Grid',
    value: `${GREENHOUSE_GRID_SIDE} × ${GREENHOUSE_GRID_SIDE} = ${GREENHOUSE_GRID_PLOTS} plots`,
  }),
  Object.freeze({
    label: 'Base-crop decay',
    value: `${GREENHOUSE_BASE_CROP_DECAY_HOURS} h after maturity`,
  }),
]);

/**
 * Plants ranked by loot multiplier, highest first, with their kind.
 *
 * Base crops and mutations are kept apart because they are not alternatives:
 * a base crop is what you plant, a mutation is what you hope spreads. Ranking
 * them in one list would suggest planting Snoozling.
 */
export function greenhousePlantsByYield(kind = null) {
  const rows = GREENHOUSE_LIVE_LOOT_MULTIPLIERS
    .filter(plant => kind === null || plant.kind === kind);
  return [...rows].sort((a, b) => b.lootMultiplier - a.lootMultiplier || a.name.localeCompare(b.name));
}

/** The highest and lowest multiplier in a kind, for a summary line. */
export function greenhouseYieldRange(kind) {
  const rows = greenhousePlantsByYield(kind);
  if (!rows.length) return null;
  return { top: rows[0], bottom: rows[rows.length - 1], count: rows.length };
}

/**
 * How a plant is doing against the decay window.
 *
 * `unknown` for an absent figure and `boundary` at exactly 72 hours are the
 * model's own answers -- it refuses to guess server tick order at the instant
 * the timer expires, and this keeps that refusal rather than rounding it into
 * "safe" or "decayed".
 */
export function decayStateFor(hoursSinceMature) {
  return greenhouseBaseCropDecayState(hoursSinceMature);
}

export const DECAY_STATE_WORDS = Object.freeze({
  safe: 'Still growing',
  boundary: 'Exactly at the boundary — the model will not guess which side',
  decayed: 'Decayed',
  unknown: 'Enter hours since maturity',
});

/** Announced but not released, and therefore not scored anywhere. */
export const GREENHOUSE_UPCOMING = GREENHOUSE_PLANNED_FOLLOWUPS;
