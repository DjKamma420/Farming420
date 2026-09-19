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

function fallbackWhereFor(entry) {
  if (!entry) {
    return 'Check the relevant SkyBlock or Garden menu, item tooltip, or active-effect screen for this value. If it is not visible there, use the linked source for the current unlock or acquisition route.';
  }

  const name = entry.name || 'this upgrade';
  const category = entry.category || '';

  if (category === 'Account/Skill') {
    return `Open the SkyBlock Menu, go to Skills, then open Farming and read the current value for ${name}. Use the linked source if you need the current leveling requirements.`;
  }
  if (category === 'Anita') {
    return `Open Anita's in-game menu and look for ${name}. The purchased tier shown there is the value to enter; use the linked source for current unlock requirements.`;
  }
  if (category === 'Garden' || category === 'Crop Progression') {
    return `While in The Garden, open the Garden progression or Desk menus and look for ${name}. Enter the value shown there; use the linked source if the option is locked or you need its unlock route.`;
  }
  if (category === 'Account Upgrade') {
    return `Open the Community Shop account-upgrade menu and look for ${name}. Enter the purchased level shown there; use the linked source for the current upgrade requirements.`;
  }
  if (category === 'Greenhouse') {
    return `In The Garden, open the Greenhouse progression screens and look for ${name}. Enter the unlocked level or reward shown there; use the linked source for the current progression requirements.`;
  }
  if (category === 'Accessory') {
    return `Open your Accessory Bag and look for ${name}, then inspect its tooltip or current state. If you do not own it, use the linked source for the current acquisition or upgrade route.`;
  }
  if (category === 'Jacob') {
    return `Open the Jacob's Farming Contest progression/reward screens and look for ${name}. Enter the value shown for the selected crop; use the linked source for the current unlock requirements.`;
  }
  if (category === 'Chocolate Factory') {
    return `Open the Chocolate Factory menu and look for ${name}. Enter the current purchased or permanent value shown there; use the linked source for the current acquisition requirements.`;
  }
  if (category === 'Garden Chip') {
    return `In The Garden, open the chip/progression interface and look for ${name}. Enter the installed or unlocked level shown there; use the linked source for the current way to obtain or upgrade it.`;
  }
  if (category === 'Tool Level' || category === 'Tool Tier' || category === 'Tool Level Gate' || category === 'Tool' || category === 'Tool Enchant' || category === 'Tool Reforge' || category === 'Tool Gem') {
    return `Inspect the farming tool you actually use for this crop and read its tooltip for ${name}. If it is missing, use the linked source for the current way to apply, unlock, or obtain it.`;
  }
  if (category === 'Armor' || category === 'Armor Reforge' || category === 'Armor Gem' || category === 'Armor Enchant') {
    return `Inspect the armor pieces in the setup you actually farm with and look for ${name} on their tooltips or set-bonus text. If it is missing, use the linked source for the current way to obtain or apply it.`;
  }
  if (category === 'Equipment' || category === 'Equipment Reforge' || category === 'Equipment Enchant') {
    return `Inspect the equipment pieces in the setup you actually use and look for ${name} on their tooltips or bonus text. If it is missing, use the linked source for the current way to obtain or apply it.`;
  }
  if (category === 'Pet' || category === 'Pet Item') {
    return `Open the Pets menu, inspect the relevant pet and its held item, and look for ${name}. If you do not have it, use the linked source for the current acquisition or upgrade route.`;
  }
  if (category === 'Attribute Shard') {
    return `Inspect the shard or attribute configuration used by your farming setup and look for ${name}. If the shard is not present, use the linked source for its current drop, fusion, or acquisition details.`;
  }
  if (category === 'Vacuum Reforge') {
    return `Inspect the vacuum used for Pest farming and read its tooltip for ${name}. If it is missing, use the linked source for the current way to apply or obtain that reforge.`;
  }
  if (category === 'Consumable' || category === 'Temporary Buff' || category === 'Mixin' || category === 'Temporary' || category === 'Harvest Feast' || category === 'Buff') {
    return `Check your active effects/buffs and the item or menu associated with ${name}. Enter only the state that is currently active or permanently consumed; use the linked source for activation or acquisition details.`;
  }
  if (category === 'Pest') {
    return `Check the Pest-specific accessory/equipment setup you actually use and look for ${name} on the relevant item or bonus text. Use the linked source if you need the current acquisition or setup requirements.`;
  }
  if (category === 'Permanent Crop Item') {
    return `Check your inventory, storage, and the selected crop's progression for ${name}, then inspect the item's tooltip if owned. Use the linked source for the current unlock or acquisition route.`;
  }

  return `Check the in-game menu, item tooltip, or progression screen associated with ${name} (${category || 'this upgrade'}). If it is not owned or unlocked, use the linked source for the current acquisition or unlock route.`;
}

function fallbackFor(entry) {
  return {
    where: fallbackWhereFor(entry),
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
