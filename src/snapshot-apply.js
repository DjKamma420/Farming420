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
import {
  helianthusBaseFortune,
  helianthusFeastFortune,
  helianthusPieceCount,
  mossyFortuneForPieces,
  mossyPieceCount,
  pesterminatorTotalLevel,
  perfectPeridotCountOnArmor,
  perfectPeridotFortuneOnArmor,
  sunsetTotalLevel,
} from './armor-fortune.js';

const AUTO_SOURCE = 'hypixel-sync';

const TOOL_COUNTERS = Object.freeze({
  farmingForDummies: 'tool-farming-for-dummies',
  overclockerLevel: 'tool-overclocker-3000',
});

const TOOL_ENCHANTS = Object.freeze({
  dedication: 'tool-enchant-dedication',
  cultivating: 'tool-enchant-cultivating-x',
  harvesting: 'tool-enchant-harvesting-vi',
  feast: 'tool-enchant-feast-v',
  replenish: 'tool-enchant-replenish',
  delicate: 'tool-enchant-delicate-v',
  ultimate_crop_fever: 'tool-enchant-crop-fever-v',
});

const TOOL_REFORGES = Object.freeze({
  blessed: 'tool-reforge-blessed-reforge',
  bountiful: 'tool-reforge-bountiful-reforge',
  beady: 'vacuum-reforge-beady-pest-only-farming-fortune',
});

const EQUIPMENT_REFORGES = Object.freeze({ rooted: 'equipment-reforge-rooted-on-full-equipment' });
const EQUIPMENT_ENCHANTS = Object.freeze({ green_thumb: 'equipment-enchant-green-thumb-v-on-equipment' });

const BLOSSOM_BASE_ID = 'equipment-blossom-set-base-stats';
const ROOTED_ID = EQUIPMENT_REFORGES.rooted;
const GREEN_THUMB_ID = EQUIPMENT_ENCHANTS.green_thumb;
const HELIANTHUS_BASE_ID = 'armor-helianthus-armor-base-stats';
const HELIANTHUS_FEAST_ID = 'armor-helianthus-feast-set-bonus';
const MOSSY_ID = 'armor-reforge-mossy-on-full-armor';
const PESTERMINATOR_ID = 'armor-enchant-pesterminator-vi-on-full-armor';
const SUNSET_ID = 'armor-enchant-sunset-v-day-overbloom';
const ARMOR_PERIDOT_ID = 'armor-gem-perfect-peridot-on-full-armor';
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

const TURBO_KEYS_BY_CROP = Object.freeze({
  wheat: Object.freeze(['turbo_wheat']),
  carrot: Object.freeze(['turbo_carrot']),
  potato: Object.freeze(['turbo_potato']),
  pumpkin: Object.freeze(['turbo_pumpkin']),
  melon: Object.freeze(['turbo_melon']),
  mushroom: Object.freeze(['turbo_mushrooms', 'turbo_mushroom']),
  cactus: Object.freeze(['turbo_cactus', 'turbo_cacti']),
  'sugar-cane': Object.freeze(['turbo_cane']),
  'cocoa-beans': Object.freeze(['turbo_coco', 'turbo_cocoa']),
  'nether-wart': Object.freeze(['turbo_warts', 'turbo_wart']),
  sunflower: Object.freeze(['turbo_sunflower']),
  moonflower: Object.freeze(['turbo_moonflower']),
  'wild-rose': Object.freeze(['turbo_rose', 'turbo_wild_rose']),
});

/** Reads only the Turbo enchant that belongs to the selected crop. */
export function turboCropLevelFor(enchantments, cropId) {
  if (!enchantments || typeof enchantments !== 'object') return 0;
  const keys = TURBO_KEYS_BY_CROP[cropId] || [];
  let level = 0;
  for (const key of keys) {
    const parsed = Number(enchantments[key]);
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

const GEAR_DERIVED_ENTRY_IDS = Object.freeze([
  HELIANTHUS_BASE_ID,
  HELIANTHUS_FEAST_ID,
  MOSSY_ID,
  PESTERMINATOR_ID,
  SUNSET_ID,
  ARMOR_PERIDOT_ID,
  ...Object.values(EQUIPMENT_REFORGES),
  ...Object.values(EQUIPMENT_ENCHANTS),
  BLOSSOM_BASE_ID,
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
    applyValue(store, scope, 'tool-enchant-turbo-crop', turboCropLevelFor(item.enchantments, cropId), applied);

    const reforgeId = TOOL_REFORGES[String(item.reforge || '').toLowerCase()];
    if (reforgeId) applyValue(store, scope, reforgeId, 1, applied);

    if (item.recombobulated >= 1) applyValue(store, scope, 'tool-recombobulator-effect-on-tool-stats', 1, applied);
    if (hasPerfectGem(item.gems)) applyValue(store, scope, 'tool-gem-perfect-peridot-on-farming-tool', 1, applied);
  }
}

function missingRarityFor(pieces, predicate) {
  return pieces.some(piece => predicate(piece) && !String(piece?.rarity || '').trim());
}

function applyArmorDerived(pieces, state, autoApplied, applied, skipped) {
  if (!pieces.length) return;
  const scope = autoApplied.account ||= {};
  const store = state.profile;

  const helianthusCount = helianthusPieceCount(pieces);
  if (helianthusCount > 0) {
    applyDynamicValue(store, scope, HELIANTHUS_BASE_ID, helianthusCount, helianthusBaseFortune(pieces), applied);
    applyDynamicValue(store, scope, HELIANTHUS_FEAST_ID, helianthusCount, helianthusFeastFortune(pieces), applied);
  }

  const mossyCount = mossyPieceCount(pieces);
  if (mossyCount > 0) {
    const unknownMossyRarity = missingRarityFor(pieces, piece => String(piece?.reforge || '').toLowerCase() === 'mossy');
    if (unknownMossyRarity) {
      applyValue(store, scope, MOSSY_ID, mossyCount, applied);
      skipped.push('Mossy was detected on equipped armor, but at least one Mossy piece has unknown rarity, so its Farming Fortune was not guessed.');
    } else {
      applyDynamicValue(store, scope, MOSSY_ID, mossyCount, mossyFortuneForPieces(pieces), applied);
    }
  }

  const pesterminatorLevels = pesterminatorTotalLevel(pieces);
  if (pesterminatorLevels > 0) applyValue(store, scope, PESTERMINATOR_ID, pesterminatorLevels, applied);

  const sunsetLevels = sunsetTotalLevel(pieces);
  if (sunsetLevels > 0) applyValue(store, scope, SUNSET_ID, sunsetLevels, applied);

  const peridotCount = perfectPeridotCountOnArmor(pieces);
  if (peridotCount > 0) {
    const unknownGemRarity = missingRarityFor(pieces, piece => hasPerfectGem(piece?.gems));
    if (unknownGemRarity) {
      applyValue(store, scope, ARMOR_PERIDOT_ID, peridotCount, applied);
      skipped.push('Perfect Peridot was detected on equipped armor, but at least one host piece has unknown rarity, so its Farming Fortune was not guessed.');
    } else {
      applyDynamicValue(store, scope, ARMOR_PERIDOT_ID, peridotCount, perfectPeridotFortuneOnArmor(pieces), applied);
    }
  }
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
  if (!rootedPieces.length) return;
  if (rootedPieces.some(piece => !String(piece?.rarity || '').trim())) {
    applyValue(store, scope, ROOTED_ID, rootedPieces.length, applied);
    skipped.push('Rooted was detected on equipped equipment, but at least one Rooted piece has unknown rarity, so its Farming Fortune was not guessed.');
    return;
  }
  const rootedGain = rootedFortuneForPieces(rootedPieces);
  if (rootedGain > 0) applyDynamicValue(store, scope, ROOTED_ID, rootedPieces.length, rootedGain, applied);
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

  clearAccountAutoApplied(state, autoApplied, GEAR_DERIVED_ENTRY_IDS);
  const armorSource = gearPiecesFor(state, snapshot, SETUP_ARMOR_SLOTS, isArmorContainer);
  applyArmorDerived(armorSource.pieces, state, autoApplied, applied, skipped);

  const equipmentSource = gearPiecesFor(state, snapshot, SETUP_EQUIPMENT_SLOTS, isEquipmentContainer);
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
  ...Object.values(EQUIPMENT_REFORGES), ...Object.values(EQUIPMENT_ENCHANTS),
  HELIANTHUS_BASE_ID, HELIANTHUS_FEAST_ID, MOSSY_ID, PESTERMINATOR_ID, SUNSET_ID, ARMOR_PERIDOT_ID,
  BLOSSOM_BASE_ID,
  'tool-enchant-turbo-crop', 'tool-recombobulator-effect-on-tool-stats',
  'tool-gem-perfect-peridot-on-farming-tool',
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
