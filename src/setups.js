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

export const SETUPS_MODEL_VERSION = 4;

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
export const VISIBLE_SETUP_IDS = Object.freeze([FF_SETUP_ID, BPC_SETUP_ID]);
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
  { id: FF_SETUP_ID, name: 'FF Set' },
  { id: BPC_SETUP_ID, name: 'BPC Set' },
  { id: KILLING_SETUP_ID, name: 'FF Set · Killing Pet' },
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
    shareFarmingKillingPet: false,
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

  for (const template of DEFAULT_SETUP_TEMPLATES) {
    const existing = normalized.find(setup => setup.id === template.id);
    if (existing) existing.name = template.name;
    else normalized.push(createSetup(template.id, template.name));
  }

  const result = {
    ...source,
    modelVersion: SETUPS_MODEL_VERSION,
    activeId: String(source.activeId || FF_SETUP_ID),
    shareFarmingKillingPet: source.shareFarmingKillingPet === true,
    list: normalized,
  };
  const activityIds = new Set([FF_SETUP_ID, BPC_SETUP_ID, KILLING_SETUP_ID]);
  if (!activityIds.has(result.activeId)) result.activeId = FF_SETUP_ID;
  synchronizeFarmingKillingLoadouts(result);
  return result;
}

export function activeSetup(setups) {
  const normalized = normalizeSetups(setups);
  return normalized.list.find(setup => setup.id === normalized.activeId) || normalized.list[0];
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
  return Object.entries(gems)
    .map(([slot, value]) => {
      const quality = typeof value === 'string' ? value : value?.quality;
      return quality ? `${String(quality).toUpperCase()} ${slot.replace(/_\d+$/, '').toUpperCase()}` : null;
    })
    .filter(Boolean);
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

function mirrorSlot(sourceSetup, targetSetup, slotId, fallbackId) {
  const sourceItem = sourceSetup?.slots?.[slotId] || targetSetup?.slots?.[slotId] || null;
  sourceSetup.slots ||= {};
  targetSetup.slots ||= {};
  if (!sourceItem) {
    sourceSetup.slots[slotId] = null;
    targetSetup.slots[slotId] = null;
    return;
  }
  const linked = ensurePhysicalItemId(sourceItem, fallbackId);
  sourceSetup.slots[slotId] = linked;
  targetSetup.slots[slotId] = structuredClone(linked);
}

export function synchronizeFarmingKillingLoadouts(setups) {
  const ff = setupById(setups, FF_SETUP_ID);
  const killing = setupById(setups, KILLING_SETUP_ID);
  if (!ff || !killing) return setups;
  for (const slotId of FARMING_KILLING_SHARED_GEAR_SLOTS) {
    mirrorSlot(ff, killing, slotId, `shared:${FF_SETUP_ID}:${slotId}`);
  }
  if (setups.shareFarmingKillingPet === true) {
    for (const slotId of PET_SETUP_SLOTS) {
      mirrorSlot(ff, killing, slotId, `shared:${FF_SETUP_ID}:${slotId}`);
    }
  }
  return setups;
}

export function farmingKillingPetShared(setups) {
  return setups?.shareFarmingKillingPet === true;
}

export function setFarmingKillingPetShared(setups, shared) {
  if (!setups || typeof setups !== 'object') return false;
  setups.shareFarmingKillingPet = Boolean(shared);
  synchronizeFarmingKillingLoadouts(setups);
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
      || (PET_SLOT_SET.has(slotId) && setups?.shareFarmingKillingPet === true));
  const targetId = redirectToFf ? FF_SETUP_ID : setupId;
  const target = list.find(setup => setup?.id === targetId) || null;
  if (!target) return false;
  target.slots ||= {};
  const previousId = physicalItemId(target.slots[slotId]);
  const nextId = physicalItemId(item);

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

const isWornArmor = container => container === 'armor';
const isWornEquipment = container => container === 'equipment';

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
  const items = Array.isArray(snapshot?.items) ? snapshot.items : [];
  const armor = items.filter(item => isWornArmor(String(item?.container || '')));
  const equipment = items.filter(item => isWornEquipment(String(item?.container || '')));
  const pets = Array.isArray(snapshot?.pets) ? snapshot.pets : [];

  const filled = [];
  const next = { ...setup, slots: { ...setup.slots } };

  const assign = (slotId, record) => {
    if (!record) return;
    if (!overwrite && next.slots[slotId] && next.slots[slotId].source === ITEM_SOURCE.MANUAL) return;
    next.slots[slotId] = record;
    filled.push(slotId);
  };

  // Hypixel returns worn armor boots-first; the editor lists it helmet-first.
  const armorBySlot = [...armor].sort((a, b) => Number(b.slot ?? 0) - Number(a.slot ?? 0));
  ARMOR_SLOT_ORDER.forEach((slotId, index) => assign(slotId, itemRecordFromDecoded(armorBySlot[index])));

  const equipmentBySlot = [...equipment].sort((a, b) => Number(a.slot ?? 0) - Number(b.slot ?? 0));
  EQUIPMENT_SLOT_ORDER.forEach((slotId, index) => assign(slotId, itemRecordFromDecoded(equipmentBySlot[index])));

  const activePet = pets.find(pet => pet.active === true);
  if (activePet) {
    const records = itemRecordsFromSnapshotPet(activePet);
    assign('pet', records.pet);
    assign('petItem', records.petItem);
  }

  return { setup: next, filled, armorSeen: armor.length, equipmentSeen: equipment.length };
}

function setupSlotsEqual(a, b) {
  return SLOT_IDS.every(slotId =>
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

  const target = setups.list.find(setup => setup?.id === targetSetupId);
  if (!target) {
    return Object.freeze({ applied: false, targetSetupId: null, backupId: null, reason: 'target setup is missing' });
  }

  if (setupSlotsEqual(target, candidateSetup)) {
    setups.activeId = target.id;
    return Object.freeze({ applied: false, targetSetupId: target.id, backupId: null, reason: 'candidate already matches target' });
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

  target.slots = Object.fromEntries(SLOT_IDS.map(slotId => [
    slotId,
    candidateSetup.slots?.[slotId] ? structuredClone(candidateSetup.slots[slotId]) : null,
  ]));
  if (target.id === KILLING_SETUP_ID && setups.shareFarmingKillingPet === true) {
    const ff = setupById(setups, FF_SETUP_ID);
    if (ff) {
      for (const slotId of PET_SETUP_SLOTS) {
        ff.slots[slotId] = target.slots[slotId] ? structuredClone(target.slots[slotId]) : null;
      }
    }
  }
  synchronizeFarmingKillingLoadouts(setups);
  setups.activeId = target.id;

  return Object.freeze({
    applied: true,
    targetSetupId: target.id,
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
