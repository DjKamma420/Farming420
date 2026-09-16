import './runtime-data-patches.js';
import { CROPS, UPGRADES } from './data.js';
import { ensureProgressBucket, toolKeyForCropId } from './migrations.js';
import { activeSetup } from './setups.js';
import { exclusiveGroupForEntry } from './exclusivity.js';
import {
  blossomPieceCount,
  greenThumbMarginalPerLevel,
  greenThumbTotalLevel,
  rootedFortuneForPieces,
} from './equipment-fortune.js';

const AUTO_SOURCE = 'hypixel-sync';

const TOOL_COUNTERS = Object.freeze({
  farmingForDummies: 'tool-farming-for-dummies',
  overclockerLevel: 'tool-overclocker-3000',
});

const TOOL_ENCHANTS = Object.freeze({
  dedication: 'tool-enchant-dedication',
  cultivating: 'tool-enchant-cultivating-x',
  harvesting: 'tool-enchant-harvesting-vi',
});

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
const BLOSSOM_BASE_ID = 'equipment-blossom-set-base-stats';
const ROOTED_ID = EQUIPMENT_REFORGES.rooted;
const GREEN_THUMB_ID = EQUIPMENT_ENCHANTS.green_thumb;
const upgradeById = new Map(UPGRADES.map(item => [item.id, item]));

function maxFor(itemId) {
  return Number(upgradeById.get(itemId)?.max || 1);
}

export function stripFormatting(value) {
  return String(value ?? '').replace(/§[0-9a-fk-or]/gi, '').trim();
}

function comparableName(value) {
  return stripFormatting(value).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

const TOOL_NOUNS = Object.freeze(['sickle', 'shovel', 'cutter', 'dicer', 'knife', 'chopper', 'hoe', 'axe']);

export function cropsForToolItem(item) {
  const name = comparableName(item?.displayName);
  if (!name) return [];
  if (!TOOL_NOUNS.some(noun => name.split(' ').includes(noun))) return [];
  return CROPS
    .filter(crop => name.includes(comparableName(crop.toolMatch || crop.tool)))
    .map(crop => crop.id);
}

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

export function gearPiecesFor(state, snapshot, slotIds, containerPredicate) {
  const setup = state?.profile?.setups ? activeSetup(state.profile.setups) : null;
  const fromSetup = slotIds.map(id => setup?.slots?.[id]).filter(Boolean);
  if (fromSetup.length) return { pieces: fromSetup, source: 'setup' };
  const items = Array.isArray(snapshot?.items) ? snapshot.items : [];
  return { pieces: itemsInContainers(items, containerPredicate), source: 'sync' };
}

const SET_WIDE_ENTRY_IDS = Object.freeze([
  ...Object.values(ARMOR_REFORGES), ...Object.values(ARMOR_ENCHANTS),
  ...Object.values(EQUIPMENT_REFORGES), ...Object.values(EQUIPMENT_ENCHANTS),
  'armor-gem-perfect-peridot-on-full-armor', BLOSSOM_BASE_ID,
]);

function clearAutoAppliedFromStore(store, scope, entryIds) {
  if (!scope) return;
  for (const entryId of entryIds) {
    const marker = scope[entryId];
    if (!marker) continue;
    delete scope[entryId];
    delete store.levels?.[entryId];
    delete store.owned?.[entryId];
    if (marker.manualGain !== undefined) delete store.manualGain?.[entryId];
  }
}

function clearAccountAutoApplied(state, autoApplied, entryIds) {
  clearAutoAppliedFromStore(state.profile, autoApplied.account, entryIds);
}

function farmingToolReforgeEntryIds() {
  const seed = TOOL_REFORGES.blessed;
  const group = exclusiveGroupForEntry(seed);
  return group?.members || [TOOL_REFORGES.blessed, TOOL_REFORGES.bountiful];
}

const FARMING_TOOL_REFORGE_ENTRY_IDS = Object.freeze([...farmingToolReforgeEntryIds()]);

function applyValue(store, autoScope, itemId, rawLevel, applied) {
  const max = maxFor(itemId);
  const level = Math.max(0, Math.min(max, Math.round(Number(rawLevel) || 0)));
  if (level <= 0) return;
  store.levels[itemId] = level;
  store.owned[itemId] = true;
  autoScope[itemId] = { value: level, source: AUTO_SOURCE };
  applied.push({ id: itemId, level });
}

function applyDynamicValue(store, autoScope, itemId, rawLevel, manualGain, applied) {
  applyValue(store, autoScope, itemId, rawLevel, applied);
  if (!autoScope[itemId]) return;
  const gain = Number(manualGain);
  if (!Number.isFinite(gain) || gain < 0) return;
  store.manualGain ||= {};
  store.manualGain[itemId] = gain;
  autoScope[itemId].manualGain = gain;
}

function applyToolItem(state, cropIds, item, autoApplied, applied) {
  for (const cropId of cropIds) {
    const toolKey = toolKeyForCropId(cropId);
    const store = ensureProgressBucket(state.profile.toolProgress, toolKey);
    const scope = autoApplied[`tool:${toolKey}`] ||= {};

    clearAutoAppliedFromStore(store, scope, FARMING_TOOL_REFORGE_ENTRY_IDS);

    for (const [field, itemId] of Object.entries(TOOL_COUNTERS)) {
      applyValue(store, scope, itemId, item[field], applied);
    }
    for (const [enchant, itemId] of Object.entries(TOOL_ENCHANTS)) {
      applyValue(store, scope, itemId, item.enchantments?.[enchant], applied);
    }
    applyValue(store, scope, 'tool-enchant-turbo-crop', turboCropLevel(item.enchantments), applied);

    const reforgeId = TOOL_REFORGES[String(item.reforge || '').toLowerCase()];
    if (reforgeId) applyValue(store, scope, reforgeId, 1, applied);

    if (item.recombobulated >= 1) applyValue(store, scope, 'tool-recombobulator-effect-on-tool-stats', 1, applied);
    if (hasPerfectGem(item.gems)) applyValue(store, scope, 'tool-gem-perfect-peridot-on-farming-tool', 1, applied);
  }
}

function applySetWide(pieces, expectedSlots, reforgeMap, enchantMap, gemItemId, state, autoApplied, applied, skipped, label, source = 'sync') {
  if (!pieces.length) return;
  const scope = autoApplied.account ||= {};
  const store = state.profile;
  if (pieces.length < expectedSlots) {
    const where = source === 'setup' ? 'filled in your active setup' : 'visible in your profile';
    skipped.push(`Only ${pieces.length} of ${expectedSlots} ${label} pieces are ${where}, so set-wide ${label} bonuses were not applied.`);
    return;
  }
  for (const [reforge, itemId] of Object.entries(reforgeMap)) {
    if (pieces.every(piece => String(piece.reforge || '').toLowerCase() === reforge)) applyValue(store, scope, itemId, 1, applied);
  }
  for (const [enchant, itemId] of Object.entries(enchantMap)) {
    const levels = pieces.map(piece => Number(piece.enchantments?.[enchant] || 0));
    if (levels.every(level => level > 0)) applyValue(store, scope, itemId, Math.min(...levels), applied);
  }
  if (gemItemId && pieces.every(piece => hasPerfectGem(piece.gems))) applyValue(store, scope, gemItemId, 1, applied);
}

function applyEquipmentDerived(pieces, state, snapshot, autoApplied, applied, skipped) {
  if (!pieces.length) return;
  const scope = autoApplied.account ||= {};
  const store = state.profile;

  const blossomCount = blossomPieceCount(pieces);
  if (blossomCount > 0) applyValue(store, scope, BLOSSOM_BASE_ID, blossomCount, applied);

  const greenThumbLevel = greenThumbTotalLevel(pieces);
  if (greenThumbLevel > 0) {
    const uniqueVisitors = snapshot?.garden?.visitors?.uniqueNpcsServed;
    const marginal = greenThumbMarginalPerLevel(uniqueVisitors);
    if (marginal === null) {
      applyValue(store, scope, GREEN_THUMB_ID, greenThumbLevel, applied);
      skipped.push('Green Thumb was detected on equipment, but the unique Garden visitor count is unavailable, so its marginal Farming Fortune was not guessed.');
    } else {
      applyDynamicValue(store, scope, GREEN_THUMB_ID, greenThumbLevel, marginal, applied);
    }
  }

  const rootedPieces = pieces.filter(piece => String(piece?.reforge || '').toLowerCase() === 'rooted');
  if (rootedPieces.length !== EQUIPMENT_SLOTS) return;
  const missingRarity = rootedPieces.some(piece => !String(piece?.rarity || '').trim());
  if (missingRarity) {
    applyDynamicValue(store, scope, ROOTED_ID, 1, 0, applied);
    skipped.push('Rooted is present on all four equipment pieces, but at least one rarity is unknown, so Farming420 did not assume a Rooted Fortune value.');
    return;
  }
  const rootedGain = rootedFortuneForPieces(rootedPieces);
  if (rootedGain > 0) applyDynamicValue(store, scope, ROOTED_ID, 1, rootedGain, applied);
}

export function applySnapshotToProgress(state, snapshot) {
  const applied = [];
  const skipped = [];
  state.profile ||= {};
  state.profile.levels ||= {};
  state.profile.owned ||= {};
  state.profile.manualGain ||= {};
  state.profile.cropProgress ||= {};
  state.profile.toolProgress ||= {};
  const autoApplied = state.profile.autoApplied ||= {};

  const accountScope = autoApplied.account ||= {};
  if (Number.isFinite(snapshot?.skills?.farming?.level)) {
    applyValue(state.profile, accountScope, 'account-skill-farming-skill-level', snapshot.skills.farming.level, applied);
  }
  if (Number.isFinite(snapshot?.garden?.unlockedPlotCount)) {
    applyValue(state.profile, accountScope, 'garden-garden-plots-unlocked', snapshot.garden.unlockedPlotCount, applied);
  }

  for (const [cropId, level] of Object.entries(snapshot?.garden?.cropUpgrades || {})) {
    if (!CROPS.some(crop => crop.id === cropId)) continue;
    const store = ensureProgressBucket(state.profile.cropProgress, cropId);
    const scope = autoApplied[`crop:${cropId}`] ||= {};
    applyValue(store, scope, 'crop-progression-crop-upgrade-selected-crop', level, applied);
  }

  const items = Array.isArray(snapshot?.items) ? snapshot.items : [];
  const unmatchedTools = [];
  for (const item of items) {
    const cropIds = cropsForToolItem(item);
    if (cropIds.length) applyToolItem(state, cropIds, item, autoApplied, applied);
  }

  clearAccountAutoApplied(state, autoApplied, SET_WIDE_ENTRY_IDS);
  const armorSource = gearPiecesFor(state, snapshot, SETUP_ARMOR_SLOTS, isArmorContainer);
  applySetWide(
    armorSource.pieces, ARMOR_SLOTS,
    ARMOR_REFORGES, ARMOR_ENCHANTS, 'armor-gem-perfect-peridot-on-full-armor',
    state, autoApplied, applied, skipped, 'armor', armorSource.source,
  );
  const equipmentSource = gearPiecesFor(state, snapshot, SETUP_EQUIPMENT_SLOTS, isEquipmentContainer);
  applySetWide(
    equipmentSource.pieces, EQUIPMENT_SLOTS,
    {}, {}, null,
    state, autoApplied, applied, skipped, 'equipment', equipmentSource.source,
  );
  applyEquipmentDerived(equipmentSource.pieces, state, snapshot, autoApplied, applied, skipped);

  if (items.length && !applied.some(entry => entry.id.startsWith('tool-'))) {
    unmatchedTools.push('No decoded item matched a known farming tool name, so no tool progress was filled in.');
  }

  return {
    applied,
    skipped: [...skipped, ...unmatchedTools],
    unmapped: unmappedEntryIds(applied),
  };
}

export const MAPPABLE_ENTRY_IDS = Object.freeze(new Set([
  ...Object.values(TOOL_COUNTERS), ...Object.values(TOOL_ENCHANTS), ...Object.values(TOOL_REFORGES),
  ...Object.values(ARMOR_REFORGES), ...Object.values(ARMOR_ENCHANTS), ...Object.values(EQUIPMENT_REFORGES),
  ...Object.values(EQUIPMENT_ENCHANTS),
  BLOSSOM_BASE_ID,
  'tool-enchant-turbo-crop', 'tool-recombobulator-effect-on-tool-stats',
  'tool-gem-perfect-peridot-on-farming-tool', 'armor-gem-perfect-peridot-on-full-armor',
  'account-skill-farming-skill-level', 'garden-garden-plots-unlocked',
  'crop-progression-crop-upgrade-selected-crop',
]));

function unmappedEntryIds(applied) {
  const filled = new Set(applied.map(entry => entry.id));
  return UPGRADES.filter(entry => !MAPPABLE_ENTRY_IDS.has(entry.id) && !filled.has(entry.id)).map(entry => entry.id);
}

export function isAutoApplied(state, scopeKey, itemId) {
  return Boolean(state?.profile?.autoApplied?.[scopeKey]?.[itemId]);
}
