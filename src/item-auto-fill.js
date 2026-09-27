import { CROPS } from './data.js';
import { FARMING_TOOL_ITEM_IDS, GARDEN_VACUUM_ITEMS } from './exact-farming-items.js';
import { applyVacuumReforge } from './item-capabilities.js';
import { normalizeVacuumPhysicalState } from './vacuum-state.js';
import { ensureProgressBucket, toolKeyForCropId } from './migrations.js';
import { applyChainTier, TOOL_TIER_CHAIN } from './progression-chains.js';
import { snapshotSectionCanAutoFill } from './profile-trust.js';

export const PHYSICAL_ITEM_SOURCE = Object.freeze({
  SYNC: 'hypixel-sync',
  MANUAL: 'manual',
});

const TOOL_BY_ID = new Map();
for (const [toolName, ids] of Object.entries(FARMING_TOOL_ITEM_IDS)) {
  ids.forEach((id, index) => TOOL_BY_ID.set(String(id).toUpperCase(), Object.freeze({
    toolName,
    tier: index + 1,
  })));
}
const VACUUM_IDS = new Set(GARDEN_VACUUM_ITEMS.map(item => item.id));

function exactToolDescriptor(item) {
  return TOOL_BY_ID.get(String(item?.skyblockId || '').trim().toUpperCase()) || null;
}

function exactVacuum(item) {
  return VACUUM_IDS.has(String(item?.skyblockId || '').trim().toUpperCase());
}

function gemQuality(value) {
  const quality = typeof value === 'string' ? value : value?.quality;
  const normalized = String(quality || '').trim().toUpperCase();
  return ['ROUGH', 'FLAWED', 'FINE', 'FLAWLESS', 'PERFECT'].includes(normalized) ? normalized : null;
}

export function observedGemstoneSlots(gems, type = 'PERIDOT') {
  if (!gems || typeof gems !== 'object' || Array.isArray(gems)) return [];
  const wanted = String(type || '').trim().toUpperCase();
  return Object.entries(gems)
    .map(([key, value]) => {
      const match = new RegExp(`^${wanted}_(\\d+)$`).exec(String(key).toUpperCase());
      const quality = gemQuality(value);
      if (!match || !quality) return null;
      return { index: Number(match[1]), gem: `${quality} ${wanted}` };
    })
    .filter(Boolean)
    .sort((a, b) => a.index - b.index);
}

function replaceObservedGems(current, observed) {
  const next = Array.isArray(current)
    ? current.map(slot => ({ ...(slot || {}), gem: null }))
    : [];
  for (const row of observed) {
    next[row.index] = {
      ...(next[row.index] || {}),
      id: `slot-${row.index + 1}`,
      unlocked: true,
      gem: row.gem,
    };
  }
  return next;
}

function setSyncedLevel(bucket, id, rawValue, max = null) {
  bucket.levels ||= {};
  bucket.owned ||= {};
  const value = Math.max(0, Math.floor(Number(rawValue) || 0));
  if (!value) {
    delete bucket.levels[id];
    delete bucket.owned[id];
    return;
  }
  const level = max == null ? value : Math.min(max, value);
  bucket.levels[id] = level;
  bucket.owned[id] = true;
}

function fillToolBucket(bucket, item, descriptor) {
  if (bucket.physicalSource === PHYSICAL_ITEM_SOURCE.MANUAL) return false;
  applyChainTier(bucket, TOOL_TIER_CHAIN, descriptor.tier);
  bucket.reforge = String(item?.reforge || '').trim().toLowerCase() || null;
  bucket.gemSlots = replaceObservedGems(bucket.gemSlots, observedGemstoneSlots(item?.gems));
  bucket.syncedSkyblockId = String(item?.skyblockId || '').trim().toUpperCase() || null;
  bucket.syncedItemUuid = item?.itemUuid || null;
  bucket.physicalSource = PHYSICAL_ITEM_SOURCE.SYNC;
  return true;
}

function fillVacuumBucket(bucket, item) {
  if (bucket.physicalSource === PHYSICAL_ITEM_SOURCE.MANUAL) return false;
  normalizeVacuumPhysicalState(bucket);
  bucket.skyblockId = String(item?.skyblockId || '').trim().toUpperCase() || null;
  bucket.recombobulated = Number(item?.recombobulated || 0) >= 1;
  bucket.enchantments = { ...(item?.enchantments || {}) };
  applyVacuumReforge(bucket, String(item?.reforge || '').trim().toLowerCase());
  bucket.gemSlots = replaceObservedGems(bucket.gemSlots, observedGemstoneSlots(item?.gems));
  setSyncedLevel(bucket, 'vacuum-farming-for-dummies', item?.farmingForDummies, 5);
  setSyncedLevel(bucket, 'vacuum-enchant-bug-blender', item?.enchantments?.bug_blender, 5);
  bucket.syncedItemUuid = item?.itemUuid || null;
  bucket.physicalSource = PHYSICAL_ITEM_SOURCE.SYNC;
  return true;
}

/**
 * Copies only unambiguous physical items into their item editors. Multiple
 * copies are ownership facts, not evidence for which one the player intends to
 * model, so Auto-Fill leaves that editor untouched instead of guessing.
 */
export function autoFillPhysicalItems(state, snapshot) {
  const applied = [];
  const skipped = [];
  if (!snapshotSectionCanAutoFill(snapshot, 'items')) {
    skipped.push('Item Auto-Fill was skipped because the current API payload does not expose reliable item data.');
    return { applied, skipped };
  }

  const items = Array.isArray(snapshot?.items) ? snapshot.items : [];
  state.profile ||= {};
  state.profile.toolProgress ||= {};

  const toolGroups = new Map();
  for (const item of items) {
    const descriptor = exactToolDescriptor(item);
    if (!descriptor) continue;
    const rows = toolGroups.get(descriptor.toolName) || [];
    rows.push({ item, descriptor });
    toolGroups.set(descriptor.toolName, rows);
  }

  for (const [toolName, rows] of toolGroups.entries()) {
    if (rows.length !== 1) {
      skipped.push(`${toolName} physical Auto-Fill was skipped because ${rows.length} owned copies were decoded.`);
      continue;
    }
    const { item, descriptor } = rows[0];
    for (const crop of CROPS.filter(entry => entry.tool === toolName)) {
      const bucket = ensureProgressBucket(state.profile.toolProgress, toolKeyForCropId(crop.id));
      if (fillToolBucket(bucket, item, descriptor)) applied.push(`tool:${crop.id}`);
      else skipped.push(`${toolName} physical Auto-Fill kept the manual ${crop.name} tool state.`);
    }
  }

  const vacuums = items.filter(exactVacuum);
  if (vacuums.length === 1) {
    const bucket = state.profile.vacuumProgress ||= {};
    if (fillVacuumBucket(bucket, vacuums[0])) applied.push('vacuum');
    else skipped.push('Vacuum physical Auto-Fill kept the manual Vacuum state.');
  } else if (vacuums.length > 1) {
    skipped.push(`Vacuum physical Auto-Fill was skipped because ${vacuums.length} owned Vacuums were decoded.`);
  }

  return { applied, skipped };
}

export function markPhysicalItemManual(bucket) {
  if (bucket && typeof bucket === 'object') bucket.physicalSource = PHYSICAL_ITEM_SOURCE.MANUAL;
  return bucket;
}
