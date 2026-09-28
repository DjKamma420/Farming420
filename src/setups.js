/**
 * Farming setups: item-centric, mutually exclusive alternatives.
 *
 * `docs/PRODUCT_SPEC.md` requires that the app never adds up gear the player
 * cannot wear at the same time. A setup is therefore one complete, wearable
 * configuration, and setups sit beside each other rather than stacking.
 *
 * An item is edited as an item -- which piece it is, its reforge, its
 * enchantments, whether it is recombobulated, its gemstones -- instead of as a
 * scatter of separate stat entries.
 *
 * The farming tool is deliberately absent: it is already crop-scoped and filled
 * automatically by a profile sync, and a second manual copy here would give the
 * same value two competing sources.
 */

import { baseRarityFromDisplayed } from './setup-rarity.js';
import { petLevelFromExperience } from './mooshroom-cow.js';
import { clampPetLevel, petLevelBounds } from './setup-pet-catalog.js';
import { snapshotSectionCanAutoFill } from './profile-trust.js';

export const SETUPS_MODEL_VERSION = 7;

/** The slots a setup has, in the order the editor shows them. */
export const SETUP_SLOTS = Object.freeze([
  { id: 'helmet', label: 'Helmet', group: 'Armor', container: 'armor' },
  { id: 'chestplate', label: 'Chestplate', group: 'Armor', container: 'armor' },
  { id: 'leggings', label: 'Leggings', group: 'Armor', container: 'armor' },
  { id: 'boots', label: 'Boots', group: 'Armor', container: 'armor' },
  { id: 'equipment1', label: 'Necklace', group: 'Equipment', container: 'equipment' },
  { id: 'equipment2', label: 'Cloak', group: 'Equipment', container: 'equipment' },
  { id: 'equipment3', label: 'Belt', group: 'Equipment', container: 'equipment' },
  { id: 'equipment4', label: 'Gloves', group: 'Equipment', container: 'equipment' },
  { id: 'pet', label: 'Pet', group: 'Pet', container: 'pet' },
  { id: 'petItem', label: 'Pet item', group: 'Pet', container: 'pet' },
]);

export const SLOT_IDS = Object.freeze(SETUP_SLOTS.map(slot => slot.id));

export const FF_SETUP_ID = 'normal';
export const BPC_SETUP_ID = 'pest';
export const KILLING_SETUP_ID = 'pest-kill';
export const THIRD_SETUP_ID = 'third-set';
export const VISIBLE_SETUP_IDS = Object.freeze([FF_SETUP_ID, BPC_SETUP_ID]);
export const DEFAULT_THIRD_SETUP_NAME = 'Set 3';
export const FARMING_KILLING_SHARED_GEAR_SLOTS = Object.freeze([
  'helmet', 'chestplate', 'leggings', 'boots',
  'equipment1', 'equipment2', 'equipment3', 'equipment4',
]);
export const PET_SETUP_SLOTS = Object.freeze(['pet', 'petItem']);

const SHARED_GEAR_SLOT_SET = new Set(FARMING_KILLING_SHARED_GEAR_SLOTS);
const PET_SLOT_SET = new Set(PET_SETUP_SLOTS);

/**
 * The three activity loadouts used by current Farming/Pest play. Farming and
 * spawning both happen while breaking crops, but spawning optimizes BPC/cooldown
 * while killing switches to Vacuum/loot/Overbloom mechanics.
 */
export const DEFAULT_SETUP_TEMPLATES = Object.freeze([
  { id: FF_SETUP_ID, name: 'FF (Farming Fortune) Set' },
  { id: BPC_SETUP_ID, name: 'BPC (Bonus Pest Chance) Set' },
  { id: KILLING_SETUP_ID, name: 'Pest Killing' },
]);

/** Where a value in a slot came from, so the UI never hides a guess as a fact. */
export const ITEM_SOURCE = Object.freeze({
  SYNC: 'sync',
  MANUAL: 'manual',
});

export function createEmptyItem() {
  return {
    skyblockId: null,
    displayName: '',
    rarity: null,
    rarityBasis: 'base',
    petLevel: null,
    reforge: null,
    enchantments: {},
    gems: [],
    recombobulated: false,
    skullTexture: null,
    source: ITEM_SOURCE.MANUAL,
    itemUuid: null,
    physicalItemId: null,
  };
}

export function createSetup(id, name) {
  const slots = {};
  for (const slot of SLOT_IDS) slots[slot] = null;
  return { id, name, slots };
}

export function createDefaultSetups() {
  return {
    modelVersion: SETUPS_MODEL_VERSION,
    activeId: FF_SETUP_ID,
    physicalSetCount: 2,
    // Compatibility field for older backups. The actual rule is now derived
    // from physicalSetCount: Killing gets its own Pet/Pet Item only with Set 3.
    shareFarmingKillingPet: true,
    list: DEFAULT_SETUP_TEMPLATES.map(template => createSetup(template.id, template.name)),
  };
}

function normalizeSetupItem(item) {
  const normalized = { ...createEmptyItem(), ...item };
  const legacyEffectiveSyncRarity = normalized.source === ITEM_SOURCE.SYNC
    && normalized.recombobulated
    && item.rarityBasis !== 'base';
  if (legacyEffectiveSyncRarity || item.rarityBasis === 'effective') {
    normalized.rarity = baseRarityFromDisplayed(normalized.rarity, true);
  }
  normalized.rarityBasis = 'base';
  if (!normalized.physicalItemId && normalized.itemUuid) normalized.physicalItemId = `uuid:${normalized.itemUuid}`;
  return normalized;
}

/** Repairs anything missing so a hand-edited or older backup cannot crash the UI. */
export function normalizeSetups(raw) {
  const source = (raw && typeof raw === 'object') ? raw : {};
  const list = Array.isArray(source.list) ? source.list : [];
  const normalized = list
    .filter(setup => setup && typeof setup === 'object' && setup.id)
    .map(setup => {
      const slots = {};
      for (const slotId of SLOT_IDS) {
        const item = setup.slots?.[slotId];
        slots[slotId] = item && typeof item === 'object' ? normalizeSetupItem(item) : null;
      }
      return { id: String(setup.id), name: String(setup.name || setup.id), slots };
    });

  const physicalSetCount = Number(source.physicalSetCount) === 3 ? 3 : 2;
  const result = {
    modelVersion: SETUPS_MODEL_VERSION,
    activeId: source.activeId,
    physicalSetCount,
    // Legacy field remains serialized for backward compatibility, but Set 3
    // is the only switch that enables a separate Killing Pet configuration.
    shareFarmingKillingPet: physicalSetCount < 3,
    list: normalized.length ? normalized : createDefaultSetups().list,
  };
  if (!result.list.some(setup => setup.id === result.activeId)) result.activeId = result.list[0].id;
  return result;
}

function effectiveSetupFromNormalized(normalized, setupId) {
  const target = setupById(normalized, setupId) || normalized.list[0] || null;
  if (!target || target.id !== KILLING_SETUP_ID) return target;

  const ff = setupById(normalized, FF_SETUP_ID);
  if (!ff) return target;

  const slots = { ...target.slots };
  for (const slotId of FARMING_KILLING_SHARED_GEAR_SLOTS) {
    slots[slotId] = ff.slots?.[slotId] || null;
  }
  if (physicalSetupCount(normalized) < 3) {
    for (const slotId of PET_SETUP_SLOTS) slots[slotId] = ff.slots?.[slotId] || null;
  }
  return { ...target, slots };
}

/**
 * Resolves a phase setup without duplicating shared physical gear in storage.
 * Killing always inherits FF Armor/Equipment. With two physical sets it also
 * inherits the FF Pet/Pet Item; a separate Killing Pet exists only after Set 3
 * has been added.
 */
export function effectiveSetup(setups, setupId = null) {
  const normalized = prepareFfBpcSetups(setups);
  return effectiveSetupFromNormalized(normalized, setupId || normalized.activeId);
}

export function activeSetup(setups) {
  return effectiveSetup(setups);
}

/** A setup id that does not collide with an existing one. */
export function nextSetupId(setups, base = 'setup') {
  const taken = new Set(normalizeSetups(setups).list.map(setup => setup.id));
  let index = taken.size + 1;
  while (taken.has(`${base}-${index}`)) index += 1;
  return `${base}-${index}`;
}

const ARMOR_SLOT_ORDER = Object.freeze(['helmet', 'chestplate', 'leggings', 'boots']);
const EQUIPMENT_SLOT_ORDER = Object.freeze(['equipment1', 'equipment2', 'equipment3', 'equipment4']);

/** Minecraft display names carry section-sign colour codes; strip them. */
function cleanName(value) {
  return String(value ?? '').replace(/§[0-9a-fk-or]/gi, '').trim();
}

function readableWords(value) {
  return String(value || '').trim().toLowerCase().split('_').filter(Boolean)
    .map(word => word[0].toUpperCase() + word.slice(1)).join(' ');
}

function readablePetName(value) {
  const words = readableWords(value);
  return words ? `${words} Pet` : '';
}

function readableItemName(value) {
  return readableWords(value);
}

function snapshotPetLevel(pet) {
  const explicit = clampPetLevel(pet?.type, pet?.level);
  if (explicit !== null) return explicit;

  const bounds = petLevelBounds(pet?.type);
  const rarity = pet?.rarity ?? pet?.tier ?? 'COMMON';
  if (String(pet?.type || '').trim().toUpperCase() === 'ROSE_DRAGON') {
    // Current NEU pet constants use the normal rarity-offset curve through
    // level 100, then 1,886,700 XP for each Rose Dragon level through 200.
    return petLevelFromExperience(pet?.experience, rarity, {
      maxLevel: 200,
      extraLevelXp: 1_886_700,
    });
  }
  return bounds ? petLevelFromExperience(pet?.experience, rarity) : null;
}

export function itemRecordsFromSnapshotPet(pet) {
  if (!pet || typeof pet !== 'object') return { pet: null, petItem: null };
  const rarity = pet.rarity ?? pet.tier ?? null;
  const petPhysicalId = pet.uuid ? `pet:${pet.uuid}` : null;
  const petRecord = {
    ...createEmptyItem(),
    skyblockId: pet.type ?? null,
    displayName: readablePetName(pet.type) || String(pet.type || ''),
    rarity,
    petLevel: snapshotPetLevel(pet),
    source: ITEM_SOURCE.SYNC,
    physicalItemId: petPhysicalId,
  };
  const petItem = pet.heldItem ? {
    ...createEmptyItem(),
    skyblockId: pet.heldItem,
    displayName: readableItemName(pet.heldItem) || pet.heldItem,
    source: ITEM_SOURCE.SYNC,
    // A held item belongs to this concrete pet in the profile payload.
    // This links repeated phase references without pretending the API gave
    // the held item its own UUID.
    physicalItemId: pet.uuid ? `pet-held:${pet.uuid}` : null,
  } : null;
  return { pet: petRecord, petItem };
}

function gemListFrom(gems) {
  if (!gems || typeof gems !== 'object') return [];
  const result = [];
  for (const [slot, value] of Object.entries(gems)) {
    const quality = typeof value === 'string' ? value : value?.quality;
    if (!quality) continue;
    const slotName = String(slot || '').toUpperCase();
    const indexMatch = slotName.match(/_(\d+)$/);
    const index = indexMatch ? Number(indexMatch[1]) : result.length;
    result[index] = `${String(quality).toUpperCase()} ${slotName.replace(/_\d+$/, '')}`;
  }
  return result;
}

/** Turns one decoded profile item into a setup item record. */
export function itemRecordFromDecoded(decoded) {
  if (!decoded) return null;
  const recombobulated = Number(decoded.recombobulated || 0) >= 1;
  return {
    ...createEmptyItem(),
    skyblockId: decoded.skyblockId ?? null,
    displayName: cleanName(decoded.displayName) || decoded.skyblockId || '',
    // The lore footer contains displayed rarity, i.e. already upgraded when a
    // Recombobulator is present. Store the base rung so every caller applies
    // that upgrade exactly once.
    rarity: baseRarityFromDisplayed(decoded.rarity, recombobulated),
    rarityBasis: 'base',
    reforge: decoded.reforge ?? null,
    enchantments: { ...(decoded.enchantments || {}) },
    gems: gemListFrom(decoded.gems),
    recombobulated,
    skullTexture: decoded.skullTexture ?? null,
    source: ITEM_SOURCE.SYNC,
    itemUuid: decoded.itemUuid ?? null,
    physicalItemId: decoded.itemUuid ? `uuid:${decoded.itemUuid}` : null,
  };
}


/** Stable identity for one physical object reused by multiple phase loadouts. */
export function physicalItemId(item) {
  const explicit = String(item?.physicalItemId || '').trim();
  if (explicit) return explicit;
  const uuid = String(item?.itemUuid || '').trim();
  return uuid ? `uuid:${uuid}` : null;
}

/**
 * Gives a manually entered item a stable identity before another setup starts
 * referring to the same physical object. Synced items already use their NBT
 * UUID and never need a fabricated replacement identity.
 */
export function ensurePhysicalItemId(item, fallbackId) {
  if (!item) return null;
  const existing = physicalItemId(item);
  return { ...item, physicalItemId: existing || String(fallbackId || '').trim() || null };
}

function setupById(setups, id) {
  return (setups?.list || []).find(setup => setup?.id === id) || null;
}

export function synchronizeFarmingKillingLoadouts(setups) {
  const ff = setupById(setups, FF_SETUP_ID);
  const killing = setupById(setups, KILLING_SETUP_ID);
  if (!ff || !killing) return setups;
  ff.slots ||= {};
  killing.slots ||= {};

  // Migrate a legacy Killing-only reference once, then keep FF as the sole
  // persisted owner. Effective Killing setup reads these slots from FF.
  for (const slotId of FARMING_KILLING_SHARED_GEAR_SLOTS) {
    if (!ff.slots[slotId] && killing.slots[slotId]) {
      ff.slots[slotId] = ensurePhysicalItemId(
        structuredClone(killing.slots[slotId]),
        `shared:${FF_SETUP_ID}:${slotId}`,
      );
    }
    killing.slots[slotId] = null;
  }

  // Do not erase the hidden Killing Pet when Set 3 is removed. Two-set mode
  // simply ignores it and reads FF instead, so adding Set 3 again restores the
  // previous Killing Pet configuration.
  setups.shareFarmingKillingPet = physicalSetupCount(setups) < 3;
  return setups;
}

/**
 * Prepares the persisted player loadouts for the FF/BPC UI without changing
 * the semantics of normalizeSetups(), which is also used for isolated
 * comparison and test setups.
 */
export function prepareFfBpcSetups(raw) {
  const source = (raw && typeof raw === 'object') ? raw : {};
  const prepared = normalizeSetups(source);

  for (const template of DEFAULT_SETUP_TEMPLATES) {
    const existing = prepared.list.find(setup => setup.id === template.id);
    if (existing) existing.name = template.name;
    else prepared.list.push(createSetup(template.id, template.name));
  }

  if (prepared.physicalSetCount === 3 && !prepared.list.some(setup => setup.id === THIRD_SETUP_ID)) {
    prepared.list.push(createSetup(THIRD_SETUP_ID, DEFAULT_THIRD_SETUP_NAME));
  }
  if (prepared.physicalSetCount !== 3 && prepared.activeId === THIRD_SETUP_ID) {
    prepared.activeId = FF_SETUP_ID;
  }

  synchronizeFarmingKillingLoadouts(prepared);
  return prepared;
}

export function physicalSetupCount(setups) {
  return Number(setups?.physicalSetCount) === 3 ? 3 : 2;
}

export function visiblePhysicalSetupIds(setups) {
  return physicalSetupCount(setups) === 3
    ? [FF_SETUP_ID, BPC_SETUP_ID, THIRD_SETUP_ID]
    : [...VISIBLE_SETUP_IDS];
}

function ensureThirdPhysicalSetup(setups) {
  if (!setups || !Array.isArray(setups.list)) return null;
  let third = setupById(setups, THIRD_SETUP_ID);
  if (!third) {
    third = createSetup(THIRD_SETUP_ID, DEFAULT_THIRD_SETUP_NAME);
    setups.list.push(third);
  }
  return third;
}

export function setPhysicalSetupCount(setups, count) {
  if (!setups || typeof setups !== 'object') return 2;
  setups.physicalSetCount = Number(count) === 3 ? 3 : 2;
  setups.shareFarmingKillingPet = setups.physicalSetCount < 3;
  if (setups.physicalSetCount === 3) ensureThirdPhysicalSetup(setups);
  if (setups.physicalSetCount === 2 && setups.activeId === THIRD_SETUP_ID) {
    setups.activeId = FF_SETUP_ID;
  }
  return setups.physicalSetCount;
}

export function thirdSetupName(setups) {
  const name = String(setupById(setups, THIRD_SETUP_ID)?.name || '').trim();
  return name || DEFAULT_THIRD_SETUP_NAME;
}

export function setThirdSetupName(setups, name) {
  const third = ensureThirdPhysicalSetup(setups);
  if (!third) return DEFAULT_THIRD_SETUP_NAME;
  third.name = String(name || '').trim() || DEFAULT_THIRD_SETUP_NAME;
  return third.name;
}

export function farmingKillingPetShared(setups) {
  return physicalSetupCount(setups) < 3;
}

/**
 * Compatibility shim for old callers/backups. The old manual pet-link switch
 * no longer controls behavior; the number of physical sets is authoritative.
 */
export function setFarmingKillingPetShared(setups) {
  if (!setups || typeof setups !== 'object') return true;
  setups.shareFarmingKillingPet = physicalSetupCount(setups) < 3;
  return setups.shareFarmingKillingPet;
}

/**
 * Writes one slot and propagates edits to every setup that references the same
 * physical item. Clearing a slot only removes that loadout reference; it does
 * not delete the object from other loadouts.
 */
export function writeLinkedSetupSlot(setups, setupId, slotId, item) {
  const list = Array.isArray(setups?.list) ? setups.list : [];
  const redirectToFf = setupId === KILLING_SETUP_ID
    && (SHARED_GEAR_SLOT_SET.has(slotId)
      || (PET_SLOT_SET.has(slotId) && physicalSetupCount(setups) < 3));
  const targetId = redirectToFf ? FF_SETUP_ID : setupId;
  const target = list.find(setup => setup?.id === targetId) || null;
  if (!target) return false;
  target.slots ||= {};
  const previousId = physicalItemId(target.slots[slotId]);
  const nextId = physicalItemId(item);

  if (setupId === KILLING_SETUP_ID && SHARED_GEAR_SLOT_SET.has(slotId)) {
    const killing = list.find(setup => setup?.id === KILLING_SETUP_ID) || null;
    if (killing?.slots) killing.slots[slotId] = null;
  }

  if (!item) {
    target.slots[slotId] = null;
    synchronizeFarmingKillingLoadouts(setups);
    return true;
  }
  if (!previousId || !nextId || previousId !== nextId) {
    target.slots[slotId] = item;
    synchronizeFarmingKillingLoadouts(setups);
    return true;
  }
  for (const setup of list) {
    if (!setup?.slots) continue;
    for (const id of SLOT_IDS) {
      if (physicalItemId(setup.slots[id]) === previousId) setup.slots[id] = { ...item, physicalItemId: previousId };
    }
  }
  synchronizeFarmingKillingLoadouts(setups);
  return true;
}

function wornCopy(item, container) {
  if (String(item?.container || '') === container) return item;
  const locations = Array.isArray(item?.locations) ? item.locations : [];
  const worn = locations.find(location => String(location?.container || '') === container);
  return worn ? { ...item, container, slot: worn.slot ?? item?.slot ?? null } : null;
}

function wornItems(items, container) {
  return items.map(item => wornCopy(item, container)).filter(Boolean);
}

/**
 * Fills a setup's slots from the items a sync detected.
 *
 * Only the worn containers are used. A backpack or ender chest holds items the
 * player owns but is not wearing, and guessing which of those belongs in a slot
 * would invent a loadout they never chose.
 *
 * Slots the player has already filled by hand are left alone unless `overwrite`
 * is set, so a sync never silently discards manual work.
 */
export function prefillSetupFromSnapshot(setup, snapshot, { overwrite = false } = {}) {
  const itemsReliable = snapshotSectionCanAutoFill(snapshot, 'items');
  const petsReliable = snapshotSectionCanAutoFill(snapshot, 'pets');
  const items = itemsReliable && Array.isArray(snapshot?.items) ? snapshot.items : [];
  const armor = wornItems(items, 'armor');
  const equipment = wornItems(items, 'equipment');
  const pets = petsReliable && Array.isArray(snapshot?.pets) ? snapshot.pets : [];

  const filled = [];
  const next = { ...setup, slots: { ...setup.slots } };

  const assign = (slotId, record) => {
    if (!record) return;
    if (!overwrite && next.slots[slotId] && next.slots[slotId].source === ITEM_SOURCE.MANUAL) return;
    next.slots[slotId] = record;
    filled.push(slotId);
  };

  // Hypixel slot numbers are authoritative even when only part of a loadout is
  // visible. Sorting then assigning by array position would turn a lone pair of
  // boots into a helmet, or a lone belt into a necklace.
  const armorFallback = [];
  for (const item of armor) {
    const slot = Number(item?.slot);
    const slotId = Number.isInteger(slot) && slot >= 0 && slot < ARMOR_SLOT_ORDER.length
      ? ARMOR_SLOT_ORDER[ARMOR_SLOT_ORDER.length - 1 - slot]
      : null;
    if (slotId) assign(slotId, itemRecordFromDecoded(item));
    else armorFallback.push(item);
  }
  for (const item of armorFallback) {
    const slotId = ARMOR_SLOT_ORDER.find(id => !next.slots[id]);
    if (slotId) assign(slotId, itemRecordFromDecoded(item));
  }

  const equipmentFallback = [];
  for (const item of equipment) {
    const slot = Number(item?.slot);
    const slotId = Number.isInteger(slot) && slot >= 0 && slot < EQUIPMENT_SLOT_ORDER.length
      ? EQUIPMENT_SLOT_ORDER[slot]
      : null;
    if (slotId) assign(slotId, itemRecordFromDecoded(item));
    else equipmentFallback.push(item);
  }
  for (const item of equipmentFallback) {
    const slotId = EQUIPMENT_SLOT_ORDER.find(id => !next.slots[id]);
    if (slotId) assign(slotId, itemRecordFromDecoded(item));
  }

  const activePet = pets.find(pet => pet.active === true);
  if (activePet) {
    const records = itemRecordsFromSnapshotPet(activePet);
    assign('pet', records.pet);
    assign('petItem', records.petItem);
  }

  return {
    setup: next,
    filled,
    armorSeen: armor.length,
    equipmentSeen: equipment.length,
    itemsReliable,
    petsReliable,
  };
}

function setupSlotsEqual(a, b, slotIds = SLOT_IDS) {
  return slotIds.every(slotId =>
    JSON.stringify(a?.slots?.[slotId] ?? null) === JSON.stringify(b?.slots?.[slotId] ?? null));
}

function setupHasAnyItem(setup) {
  return SLOT_IDS.some(slotId => Boolean(setup?.slots?.[slotId]));
}

/**
 * Applies one already-evaluated candidate to a phase setup without destroying
 * the previous loadout choice. A non-empty, different target is copied first.
 *
 * The target id/name stay stable because activity routing depends on the three
 * phase ids. The preserved copy gets a new ordinary setup id instead.
 */
export function applyCandidateSetupSafely(setups, targetSetupId, candidateSetup) {
  if (!setups || !Array.isArray(setups.list) || !candidateSetup?.slots) {
    return Object.freeze({ applied: false, targetSetupId: null, backupId: null, reason: 'invalid setup data' });
  }

  const requestedTarget = setups.list.find(setup => setup?.id === targetSetupId);
  if (!requestedTarget) {
    return Object.freeze({ applied: false, targetSetupId: null, backupId: null, reason: 'target setup is missing' });
  }

  const killingPetSharesFf = requestedTarget.id === KILLING_SETUP_ID && physicalSetupCount(setups) < 3;
  const target = killingPetSharesFf
    ? setupById(setups, FF_SETUP_ID)
    : requestedTarget;
  if (!target) {
    return Object.freeze({ applied: false, targetSetupId: null, backupId: null, reason: 'target setup is missing' });
  }

  const appliedSlotIds = requestedTarget.id === KILLING_SETUP_ID ? PET_SETUP_SLOTS : SLOT_IDS;
  if (setupSlotsEqual(target, candidateSetup, appliedSlotIds)) {
    setups.activeId = requestedTarget.id;
    return Object.freeze({ applied: false, targetSetupId: requestedTarget.id, backupId: null, reason: 'candidate already matches target' });
  }

  let backupId = null;
  if (setupHasAnyItem(target)) {
    backupId = nextSetupId(setups, `${target.id}-before-recommendation`);
    setups.list.push({
      id: backupId,
      name: `${target.name} · before recommendation`,
      slots: structuredClone(target.slots),
    });
  }

  for (const slotId of appliedSlotIds) {
    target.slots[slotId] = candidateSetup.slots?.[slotId]
      ? structuredClone(candidateSetup.slots[slotId])
      : null;
  }
  synchronizeFarmingKillingLoadouts(setups);
  setups.activeId = requestedTarget.id;

  return Object.freeze({
    applied: true,
    targetSetupId: requestedTarget.id,
    backupId,
    reason: null,
  });
}

/** Counts for the setup header. */
export function setupSummary(setup) {
  const slots = SLOT_IDS.map(id => setup?.slots?.[id]).filter(Boolean);
  return {
    filled: slots.length,
    total: SLOT_IDS.length,
    fromSync: slots.filter(item => item.source === ITEM_SOURCE.SYNC).length,
  };
}
