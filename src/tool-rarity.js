/**
 * Rarity is derived, not chosen.
 *
 * The editor used to ask for an item's rarity through a dropdown that started
 * at "Unknown", which is a question the app can already answer: the official
 * item resource states each item's rarity, and a Recombobulator raises it by
 * exactly one step. Two facts the app holds, turned into a third the user was
 * being asked to supply.
 *
 * Pure: no DOM, no network, no storage. The ladder itself lives in
 * `exact-farming-items.js`, which already had one for the vacuums; a second
 * copy here would be two tables to keep in step.
 */
import { RARITY_ORDER as RARITY_LADDER, bumpRarity } from './exact-farming-items.js';

export { RARITY_LADDER, bumpRarity };

function normalise(rarity) {
  const key = String(rarity || '').trim().toUpperCase().replace(/\s+/g, '_');
  return RARITY_LADDER.includes(key) ? key : null;
}

/**
 * The rarity an item actually has.
 *
 * `base` is the item's own rarity as the official resource states it. Returns
 * null when that is unknown, because a guess here would silently change
 * rarity-scaled Fortune values; the caller falls back to whatever was recorded
 * by hand and says so.
 */
export function deriveRarity({ base, recombobulated = false } = {}) {
  const key = normalise(base);
  if (!key) return null;
  return recombobulated ? bumpRarity(key, 1) : key;
}

/**
 * How to describe the derived rarity in one line.
 *
 * Names the reason when a Recombobulator moved it, so the number is never a
 * bare assertion the user has to trust.
 */
export function describeRarity({ base, recombobulated = false } = {}) {
  const derived = deriveRarity({ base, recombobulated });
  if (!derived) return null;
  const from = normalise(base);
  if (!recombobulated) return { rarity: derived, note: 'from the official item data' };
  if (derived === from) {
    return { rarity: derived, note: `already at ${from}; a Recombobulator adds nothing` };
  }
  return { rarity: derived, note: `recombobulated from ${from}` };
}
