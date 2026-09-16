import { UPGRADES } from './data.js';
import { MAPPABLE_ENTRY_IDS } from './snapshot-apply.js';

/**
 * "Where do I find this value?"
 *
 * Knowing what a number means is useless if you cannot find it in the game, so
 * every entry the app asks for by hand needs a findable location.
 *
 * This file is the source-controlled table for those locations. It follows the
 * same discipline as the rest of the data layer: an in-game menu path is a
 * claim about the game, so `AGENTS.md` rule 1 applies to it exactly as it does
 * to a formula. A guessed path is worse than none -- it sends a player hunting
 * for a menu that may not exist -- so an unresearched entry stays
 * `NEEDS_RESEARCH` rather than being filled in from memory.
 *
 * See `docs/FINDING_VALUES.md` for how to research and add one.
 */

export const LOCATION_STATUS = Object.freeze({
  /** Filled by a profile sync; the player never has to look it up. */
  SYNCED: 'SYNCED',
  /** An in-game location verified against a cited source. */
  VERIFIED: 'VERIFIED',
  /** A location from community sources, not yet confirmed against an official one. */
  UNVERIFIED: 'UNVERIFIED',
  /** No location documented yet. The entry's own source link is all we have. */
  NEEDS_RESEARCH: 'NEEDS_RESEARCH',
});

/**
 * Curated in-game locations.
 *
 * Every entry needs `where`, `status`, `source` and `lastVerified`. Add one only
 * after checking the source; leave it out otherwise.
 */
const CURATED = Object.freeze({
  // Not an upgrade entry but the two numbers the app asks for directly on the
  // Account and Crops pages, which is where most people get stuck first.
  'input:globalFortune': {
    where: 'Farming Fortune is shown with your other stats in the SkyBlock Menu. Note that it has no effect at all on your Private Island \u2014 it only applies in The Garden and other farming areas.',
    status: LOCATION_STATUS.UNVERIFIED,
    source: 'https://hypixelskyblock.minecraft.wiki/w/Farming_Fortune',
    lastVerified: '2026-09-16',
    note: 'The stat and the Private Island exception come from the community wiki. The exact menu path has not been confirmed against a current in-game capture.',
  },
  'input:cropFortune': {
    where: 'Crop Fortune is the per-crop stat, kept separate from your total Farming Fortune, and appears in the same stat breakdown. The Crop Upgrades that raise it are bought at the Desk in The Garden for Copper, +5 Crop Fortune each up to +45.',
    status: LOCATION_STATUS.UNVERIFIED,
    source: 'https://hypixelskyblock.minecraft.wiki/w/Crop_Fortune',
    lastVerified: '2026-09-16',
    note: 'The Desk location and the +5 per upgrade come from the community wiki. The exact menu path for reading the stat has not been confirmed against a current in-game capture.',
  },
});

const SYNCED_LOCATION = Object.freeze({
  where: 'Nothing to look up. Farming420 fills this in automatically, from your profile sync and — for gear bonuses — from your active setup.',
  status: LOCATION_STATUS.SYNCED,
  source: null,
  lastVerified: null,
  note: null,
});

function fallbackFor(entry) {
  return {
    where: null,
    status: LOCATION_STATUS.NEEDS_RESEARCH,
    source: entry?.source || null,
    lastVerified: null,
    note: entry?.notes || null,
  };
}

/**
 * The location record for one upgrade entry, or for one of the direct number
 * inputs when given an `input:` key.
 */
export function locationFor(entryId) {
  if (CURATED[entryId]) return { ...CURATED[entryId] };
  if (MAPPABLE_ENTRY_IDS.has(entryId)) return { ...SYNCED_LOCATION };
  return fallbackFor(UPGRADES.find(entry => entry.id === entryId));
}

/** True when a profile sync fills this entry, so it never needs hunting down. */
export function isSyncFilled(entryId) {
  return MAPPABLE_ENTRY_IDS.has(entryId);
}

/**
 * Everything the player still has to enter by hand, most valuable first.
 *
 * `stepGain` is the app's own per-step figure, so ordering by it puts the
 * entries that move the planner most at the top instead of listing 57 cards in
 * data-file order.
 */
export function manualEntries({ includeVerifyStatus = true } = {}) {
  return UPGRADES
    .filter(entry => !MAPPABLE_ENTRY_IDS.has(entry.id))
    .filter(entry => includeVerifyStatus || entry.status === 'ACTIVE')
    .map(entry => ({ entry, location: locationFor(entry.id) }))
    .sort((a, b) => Number(b.entry.stepGain || b.entry.rawMarginal || 0) - Number(a.entry.stepGain || a.entry.rawMarginal || 0));
}

/** Counts for the checklist header. */
export function manualEntrySummary() {
  const manual = manualEntries();
  return {
    total: UPGRADES.length,
    synced: UPGRADES.length - manual.length,
    manual: manual.length,
    documented: manual.filter(row => row.location.status !== LOCATION_STATUS.NEEDS_RESEARCH).length,
  };
}
