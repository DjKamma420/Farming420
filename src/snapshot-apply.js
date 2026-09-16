import { CROPS, UPGRADES } from './data.js';
import { ensureProgressBucket, toolKeyForCropId } from './migrations.js';
import { activeSetup } from './setups.js';

/**
 * Writes values from a normalized profile snapshot into the progression store
 * the app's cards read, so a sync is visible in the UI instead of only in the
 * snapshot.
 *
 * What this file may map is deliberately narrow. `AGENTS.md` rule 1 forbids
 * inventing a mechanic, value or API field, so a mapping is only allowed when
 * the link is self-evident rather than remembered:
 *
 * - **Counters** whose decoded NBT field names the mechanic itself, such as
 *   `farming_for_dummies_count` or `levelable_overclocks`.
 * - **Enchantments**, because `ExtraAttributes.enchantments` is keyed by the
 *   enchantment's own lowercase id, so `dedication` is the Dedication level.
 * - **Reforges**, because `ExtraAttributes.modifier` is the reforge's own
 *   lowercase name.
 * - **Gemstones**, by reading the slot type and quality already present in the
 *   decoded `gems` object.
 * - **Which crop a tool belongs to**, by matching the item's display name
 *   against the tool names already listed in `src/data.js`.
 *
 * Anything that would need an item-id table this repository has not verified --
 * Mk. II/Mk. III tiers, armour and accessory set identity, pet-item effects --
 * is deliberately NOT mapped. Those are reported as unmapped so the user knows
 * to enter them, rather than silently left at zero as if the API had said so.
 */

const AUTO_SOURCE = 'hypixel-sync';

/** Counter fields on a farming tool, keyed by their normalized item field. */
const TOOL_COUNTERS = Object.freeze({
  farmingForDummies: 'tool-farming-for-dummies',
  overclockerLevel: 'tool-overclocker-3000',
});

/** Enchantment id -> upgrade entry, for enchantments that sit on the tool. */
const TOOL_ENCHANTS = Object.freeze({
  dedication: 'tool-enchant-dedication',
  cultivating: 'tool-enchant-cultivating-x',
  harvesting: 'tool-enchant-harvesting-vi',
});

/** Reforge name -> upgrade entry, per equipment class. */
const TOOL_REFORGES = Object.freeze({
  blessed: 'tool-reforge-blessed-reforge',
  bountiful: 'tool-reforge-bountiful-reforge',
  beady: 'vacuum-reforge-beady-pest-only-farming-fortune',
});

const ARMOR_REFORGES = Object.freeze({ mossy: 'armor-reforge-mossy-on-full-armor' });
const EQUIPMENT_REFORGES = Object.freeze({ rooted: 'equipment-reforge-rooted-on-full-equipment' });

const ARMOR_ENCHANTS = Object.freeze({
  pesterminator: 'armor-enchant-pesterminator-vi-on-full-armor',
  sunset: 'armor-enchant-sunset-v-day-overbloom',
});

const EQUIPMENT_ENCHANTS = Object.freeze({ green_thumb: 'equipment-enchant-green-thumb-v-on-equipment' });

const ARMOR_SLOTS = 4;
const EQUIPMENT_SLOTS = 4;

const upgradeById = new Map(UPGRADES.map(item => [item.id, item]));

function maxFor(itemId) {
  return Number(upgradeById.get(itemId)?.max || 1);
}

/** Minecraft display names carry section-sign colour codes; strip them. */
export function stripFormatting(value) {
  return String(value ?? '').replace(/§[0-9a-fk-or]/gi, '').trim();
}

function comparableName(value) {
  return stripFormatting(value).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

/**
 * The tool nouns Hypixel has used for specialised farming tools.
 *
 * Verified 2026-09-16 against the community wiki's Farming Tools page. The
 * list exists so a tool is recognised by its crop-distinctive part plus *any*
 * of these, which survives a rename: the tools were renamed once already
 * (Hoe -> Sickle/Shovel/Cutter) and matching the full name silently broke
 * detection for seven of thirteen crops until it was noticed.
 */
const TOOL_NOUNS = Object.freeze(['sickle', 'shovel', 'cutter', 'dicer', 'knife', 'chopper', 'hoe', 'axe']);

/**
 * Which crops a decoded item is the farming tool for.
 *
 * Matched against `toolMatch` in `src/data.js` -- the part of the name that
 * identifies the crop -- rather than an item-id table, so no identifier is
 * invented here. Requiring a tool noun as well keeps a stack of the crop itself
 * ("Wild Rose", "Melon Slice") from being mistaken for the tool.
 *
 * Sunflower and Moonflower share one tool, so an item can match two crops.
 */
export function cropsForToolItem(item) {
  const name = comparableName(item?.displayName);
  if (!name) return [];
  if (!TOOL_NOUNS.some(noun => name.split(' ').includes(noun))) return [];
  return CROPS
    .filter(crop => name.includes(comparableName(crop.toolMatch || crop.tool)))
    .map(crop => crop.id);
}

/**
 * True when an item carries a perfect gem of this type.
 *
 * Two shapes reach this: the decoded NBT object (`{PERIDOT_0: 'PERFECT'}`) and
 * the setup editor's list (`['PERFECT PERIDOT']`). Both are read here so the
 * gear rules do not care which source filled the slot.
 */
export function hasPerfectGem(gems, gemType = 'PERIDOT') {
  const wanted = gemType.toUpperCase();
  if (Array.isArray(gems)) {
    return gems.some(entry => {
      const text = String(entry || '').toUpperCase();
      return text.includes('PERFECT') && text.includes(wanted);
    });
  }
  if (!gems || typeof gems !== 'object') return false;
  for (const [slot, value] of Object.entries(gems)) {
    if (!slot.toUpperCase().includes(wanted)) continue;
    const quality = typeof value === 'string' ? value : value?.quality;
    if (String(quality || '').toUpperCase() === 'PERFECT') return true;
  }
  return false;
}

/**
 * Turbo-Crop is one upgrade entry but a family of crop-specific enchantment
 * ids. Matching the `turbo_` prefix avoids having to know each suffix.
 */
export function turboCropLevel(enchantments) {
  if (!enchantments || typeof enchantments !== 'object') return 0;
  let level = 0;
  for (const [key, value] of Object.entries(enchantments)) {
    if (!key.toLowerCase().startsWith('turbo_')) continue;
    const parsed = Number(value);
    if (Number.isFinite(parsed)) level = Math.max(level, parsed);
  }
  return level;
}

function itemsInContainers(items, predicate) {
  return items.filter(item => predicate(String(item?.container || '')));
}

const isArmorContainer = container => container === 'armor' || container.startsWith('loadout.armor.');
const isEquipmentContainer = container => container === 'equipment' || container.startsWith('loadout.equipment.');

const SETUP_ARMOR_SLOTS = Object.freeze(['helmet', 'chestplate', 'leggings', 'boots']);
const SETUP_EQUIPMENT_SLOTS = Object.freeze(['equipment1', 'equipment2', 'equipment3', 'equipment4']);

/**
 * Where the gear rules read their pieces from.
 *
 * The active setup wins when it holds any piece of that class: it is what the
 * player says they wear, and it is editable. Only when a class is untouched
 * does the worn gear from the last sync stand in, so a player who has not
 * opened the Setups page still gets their detected gear evaluated.
 *
 * Deciding per class matters: a filled armour setup must not silence the
 * detected equipment.
 */
export function gearPiecesFor(state, snapshot, slotIds, containerPredicate) {
  const setup = state?.profile?.setups ? activeSetup(state.profile.setups) : null;
  const fromSetup = slotIds.map(id => setup?.slots?.[id]).filter(Boolean);
  if (fromSetup.length) return { pieces: fromSetup, source: 'setup' };

  const items = Array.isArray(snapshot?.items) ? snapshot.items : [];
  return { pieces: itemsInContainers(items, containerPredicate), source: 'sync' };
}

/**
 * Every entry the set-wide gear rules can produce.
 *
 * These are recomputed from scratch on each run, so removing a reforge from a
 * setup clears the card again instead of leaving a value nothing supports.
 * Applying alone was enough while the only source was a sync, which never
 * retracts; an editable setup can.
 */
const SET_WIDE_ENTRY_IDS = Object.freeze([
  ...Object.values(ARMOR_REFORGES), ...Object.values(ARMOR_ENCHANTS),
  ...Object.values(EQUIPMENT_REFORGES), ...Object.values(EQUIPMENT_ENCHANTS),
  'armor-gem-perfect-peridot-on-full-armor',
]);

/**
 * Drops the previous auto-derived value of an entry.
 *
 * Only entries this layer stamped as auto are cleared: a value the player typed
 * in themselves is never in `autoApplied`, so their work is untouched.
 */
function clearAutoApplied(state, autoApplied, entryIds) {
  const scope = autoApplied.account;
  if (!scope) return;
  for (const entryId of entryIds) {
    if (!scope[entryId]) continue;
    delete scope[entryId];
    delete state.profile.levels?.[entryId];
    delete state.profile.owned?.[entryId];
  }
}

/** Records one applied value and stamps it as auto so the UI can mark it. */
function applyValue(store, autoScope, itemId, rawLevel, applied) {
  const max = maxFor(itemId);
  const level = Math.max(0, Math.min(max, Math.round(Number(rawLevel) || 0)));
  if (level <= 0) return;
  store.levels[itemId] = level;
  store.owned[itemId] = true;
  autoScope[itemId] = { value: level, source: AUTO_SOURCE };
  applied.push({ id: itemId, level });
}

function applyToolItem(state, cropIds, item, autoApplied, applied) {
  for (const cropId of cropIds) {
    const toolKey = toolKeyForCropId(cropId);
    const store = ensureProgressBucket(state.profile.toolProgress, toolKey);
    const scope = autoApplied[`tool:${toolKey}`] ||= {};

    for (const [field, itemId] of Object.entries(TOOL_COUNTERS)) {
      applyValue(store, scope, itemId, item[field], applied);
    }
    for (const [enchant, itemId] of Object.entries(TOOL_ENCHANTS)) {
      applyValue(store, scope, itemId, item.enchantments?.[enchant], applied);
    }
    applyValue(store, scope, 'tool-enchant-turbo-crop', turboCropLevel(item.enchantments), applied);

    const reforgeId = TOOL_REFORGES[String(item.reforge || '').toLowerCase()];
    if (reforgeId) applyValue(store, scope, reforgeId, 1, applied);

    if (item.recombobulated >= 1) {
      applyValue(store, scope, 'tool-recombobulator-effect-on-tool-stats', 1, applied);
    }
    if (hasPerfectGem(item.gems)) {
      applyValue(store, scope, 'tool-gem-perfect-peridot-on-farming-tool', 1, applied);
    }
  }
}

/**
 * "on full armor" / "on full equipment" entries require every slot to carry the
 * effect, so an incomplete set is reported rather than counted.
 */
function applySetWide(pieces, expectedSlots, reforgeMap, enchantMap, gemItemId, state, autoApplied, applied, skipped, label, source = 'sync') {
  if (!pieces.length) return;
  const scope = autoApplied.account ||= {};
  const store = state.profile;

  if (pieces.length < expectedSlots) {
    const where = source === 'setup'
      ? `filled in your active setup`
      : 'visible in your profile';
    skipped.push(`Only ${pieces.length} of ${expectedSlots} ${label} pieces are ${where}, so set-wide ${label} bonuses were not applied.`);
    return;
  }

  for (const [reforge, itemId] of Object.entries(reforgeMap)) {
    if (pieces.every(piece => String(piece.reforge || '').toLowerCase() === reforge)) {
      applyValue(store, scope, itemId, 1, applied);
    }
  }
  for (const [enchant, itemId] of Object.entries(enchantMap)) {
    const levels = pieces.map(piece => Number(piece.enchantments?.[enchant] || 0));
    if (levels.every(level => level > 0)) applyValue(store, scope, itemId, Math.min(...levels), applied);
  }
  if (gemItemId && pieces.every(piece => hasPerfectGem(piece.gems))) {
    applyValue(store, scope, gemItemId, 1, applied);
  }
}

/**
 * @param {object} state a migrated application state (mutated in place)
 * @param {object} snapshot a normalized profile snapshot
 * @returns {{applied: object[], skipped: string[], unmapped: string[]}}
 */
export function applySnapshotToProgress(state, snapshot) {
  const applied = [];
  const skipped = [];
  state.profile ||= {};
  state.profile.levels ||= {};
  state.profile.owned ||= {};
  state.profile.cropProgress ||= {};
  state.profile.toolProgress ||= {};
  const autoApplied = state.profile.autoApplied ||= {};

  // Account scope: values the normalizer already derived.
  const accountScope = autoApplied.account ||= {};
  if (Number.isFinite(snapshot?.skills?.farming?.level)) {
    applyValue(state.profile, accountScope, 'account-skill-farming-skill-level', snapshot.skills.farming.level, applied);
  }
  if (Number.isFinite(snapshot?.garden?.unlockedPlotCount)) {
    applyValue(state.profile, accountScope, 'garden-garden-plots-unlocked', snapshot.garden.unlockedPlotCount, applied);
  }

  // Crop scope: Garden crop upgrades.
  for (const [cropId, level] of Object.entries(snapshot?.garden?.cropUpgrades || {})) {
    if (!CROPS.some(crop => crop.id === cropId)) continue;
    const store = ensureProgressBucket(state.profile.cropProgress, cropId);
    const scope = autoApplied[`crop:${cropId}`] ||= {};
    applyValue(store, scope, 'crop-progression-crop-upgrade-selected-crop', level, applied);
  }

  // Item scope.
  const items = Array.isArray(snapshot?.items) ? snapshot.items : [];
  const unmatchedTools = [];
  for (const item of items) {
    const cropIds = cropsForToolItem(item);
    if (cropIds.length) applyToolItem(state, cropIds, item, autoApplied, applied);
  }

  clearAutoApplied(state, autoApplied, SET_WIDE_ENTRY_IDS);
  const armorSource = gearPiecesFor(state, snapshot, SETUP_ARMOR_SLOTS, isArmorContainer);
  applySetWide(
    armorSource.pieces, ARMOR_SLOTS,
    ARMOR_REFORGES, ARMOR_ENCHANTS, 'armor-gem-perfect-peridot-on-full-armor',
    state, autoApplied, applied, skipped, 'armor', armorSource.source,
  );
  const equipmentSource = gearPiecesFor(state, snapshot, SETUP_EQUIPMENT_SLOTS, isEquipmentContainer);
  applySetWide(
    equipmentSource.pieces, EQUIPMENT_SLOTS,
    EQUIPMENT_REFORGES, EQUIPMENT_ENCHANTS, null,
    state, autoApplied, applied, skipped, 'equipment', equipmentSource.source,
  );

  if (items.length && !applied.some(entry => entry.id.startsWith('tool-'))) {
    unmatchedTools.push('No decoded item matched a known farming tool name, so no tool progress was filled in.');
  }

  return {
    applied,
    skipped: [...skipped, ...unmatchedTools],
    unmapped: unmappedEntryIds(applied),
  };
}

/**
 * Every entry a sync is able to fill.
 *
 * Exported so the "where do I find this?" layer can tell synced entries from
 * manual ones without keeping a second copy of the list, which would drift.
 */
export const MAPPABLE_ENTRY_IDS = Object.freeze(new Set([
  ...Object.values(TOOL_COUNTERS), ...Object.values(TOOL_ENCHANTS), ...Object.values(TOOL_REFORGES),
  ...Object.values(ARMOR_REFORGES), ...Object.values(ARMOR_ENCHANTS), ...Object.values(EQUIPMENT_REFORGES),
  ...Object.values(EQUIPMENT_ENCHANTS),
  'tool-enchant-turbo-crop', 'tool-recombobulator-effect-on-tool-stats',
  'tool-gem-perfect-peridot-on-farming-tool', 'armor-gem-perfect-peridot-on-full-armor',
  'account-skill-farming-skill-level', 'garden-garden-plots-unlocked',
  'crop-progression-crop-upgrade-selected-crop',
]));

/** Entries the sync cannot currently fill, so the UI can ask for them. */
function unmappedEntryIds(applied) {
  const filled = new Set(applied.map(entry => entry.id));
  return UPGRADES.filter(entry => !MAPPABLE_ENTRY_IDS.has(entry.id) && !filled.has(entry.id)).map(entry => entry.id);
}

/** True when this entry's current value came from a sync rather than the user. */
export function isAutoApplied(state, scopeKey, itemId) {
  return Boolean(state?.profile?.autoApplied?.[scopeKey]?.[itemId]);
}
