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
 * `base` is the item's own rarity as the official resource states it, so the
 * starting rung is already per item rather than a class-wide assumption.
 *
 * `canRecombobulate` is the other half of that, and the research is explicit
 * about why it is needed: the Recombobulator is "+1 item rarity tier **where
 * applicable**", and "do not assign a fixed Farming Fortune delta globally"
 * (research/special-farming-item-costs-2026-09-17.json,
 * tool_and_vacuum_modifiers[3]). Applying the step to an item that cannot take
 * one would invent a rarity the game never shows, and every reforge and
 * gemstone value that scales with rarity would be wrong with it. Callers pass
 * `canRecombobulateItem()`, which answers per item and falls back to the item
 * family only when the official data is silent.
 *
 * Returns null when the base rarity is unknown, because a guess there would
 * silently change rarity-scaled Fortune; the caller falls back to whatever was
 * recorded by hand and says so.
 */
export function deriveRarity({ base, recombobulated = false, canRecombobulate = true } = {}) {
  const key = normalise(base);
  if (!key) return null;
  return recombobulated && canRecombobulate !== false ? bumpRarity(key, 1) : key;
}

/**
 * How to describe the derived rarity in one line.
 *
 * Names the reason when a Recombobulator moved it, so the number is never a
 * bare assertion the user has to trust.
 */
export function describeRarity({ base, recombobulated = false, canRecombobulate = true } = {}) {
  const derived = deriveRarity({ base, recombobulated, canRecombobulate });
  if (!derived) return null;
  const from = normalise(base);
  if (!recombobulated) return { rarity: derived, note: 'from the official item data' };
  if (canRecombobulate === false) {
    return { rarity: derived, note: `this item cannot be recombobulated, so it stays ${from}` };
  }
  if (derived === from) {
    return { rarity: derived, note: `already at ${from}; a Recombobulator adds nothing` };
  }
  return { rarity: derived, note: `recombobulated from ${from}` };
}
