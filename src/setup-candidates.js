import { ACTIVITY_MODE, normalizeActivityMode, usesFarmingTool } from './activity-mode.js';
import { isFarmingArmorCatalogItem, isFarmingEquipmentCatalogItem } from './item-catalog.js';
import {
  createSetup,
  itemRecordFromDecoded,
  itemRecordsFromSnapshotPet,
  physicalItemId,
} from './setups.js';

export const SETUP_CANDIDATE_VERSION = 1;

const ARMOR_SLOT_FROM_INDEX = Object.freeze({
  0: 'boots',
  1: 'leggings',
  2: 'chestplate',
  3: 'helmet',
});
const EQUIPMENT_SLOT_FROM_INDEX = Object.freeze({
  0: 'equipment1',
  1: 'equipment2',
  2: 'equipment3',
  3: 'equipment4',
});
const ARMOR_SLOTS = Object.freeze(['helmet', 'chestplate', 'leggings', 'boots']);
const EQUIPMENT_SLOTS = Object.freeze(['equipment1', 'equipment2', 'equipment3', 'equipment4']);

function provenanceStatus(snapshot, key) {
  return snapshot?.provenance?.[key]?.status || 'UNKNOWN';
}

function locationsOf(item) {
  if (Array.isArray(item?.locations) && item.locations.length) return item.locations;
  if (item?.container) return [{ container: item.container, slot: item.slot ?? null }];
  return [];
}

function farmingCatalogLike(item) {
  return {
    id: String(item?.skyblockId || '').trim().toUpperCase(),
    name: String(item?.displayName || '').replace(/§[0-9a-fk-or]/gi, '').trim(),
  };
}

function isRelevantItem(item, kind) {
  const catalogLike = farmingCatalogLike(item);
  return kind === 'armor'
    ? isFarmingArmorCatalogItem(catalogLike)
    : isFarmingEquipmentCatalogItem(catalogLike);
}

function locationAssignment(kind, location) {
  const container = String(location?.container || '');
  const slot = Number(location?.slot);

  if (kind === 'armor') {
    if (container === 'armor' && Object.hasOwn(ARMOR_SLOT_FROM_INDEX, slot)) {
      return { setId: 'equipped', slotId: ARMOR_SLOT_FROM_INDEX[slot], current: true };
    }
    const saved = /^loadout\.armor\.([^.]+)\.(helmet|chestplate|leggings|boots)$/i.exec(container);
    if (saved) return { setId: `saved:${saved[1]}`, slotId: saved[2].toLowerCase(), current: false };
    return null;
  }

  if (container === 'equipment' && Object.hasOwn(EQUIPMENT_SLOT_FROM_INDEX, slot)) {
    return { setId: 'equipped', slotId: EQUIPMENT_SLOT_FROM_INDEX[slot], current: true };
  }
  const saved = /^loadout\.equipment\.([^.]+)\.equipment_slot_([1-4])$/i.exec(container);
  if (saved) {
    return {
      setId: `saved:${saved[1]}`,
      slotId: `equipment${saved[2]}`,
      current: false,
    };
  }
  return null;
}

function itemSignature(item) {
  return physicalItemId(item)
    || [item?.skyblockId || '', item?.displayName || '', item?.reforge || '', item?.rarity || ''].join(':');
}

function setSignature(set, slotIds) {
  return slotIds.map(slotId => itemSignature(set.slots[slotId])).join('|');
}

function readableSetLabel(kind, id, current) {
  if (current) return `Currently equipped ${kind}`;
  const setId = String(id || '').replace(/^saved:/, '');
  return `Saved ${kind} set ${setId}`;
}

function observedSets(snapshot, kind) {
  const items = Array.isArray(snapshot?.items) ? snapshot.items : [];
  const slotIds = kind === 'armor' ? ARMOR_SLOTS : EQUIPMENT_SLOTS;
  const groups = new Map();

  for (const decoded of items) {
    if (!isRelevantItem(decoded, kind)) continue;
    for (const location of locationsOf(decoded)) {
      const assignment = locationAssignment(kind, location);
      if (!assignment) continue;
      let group = groups.get(assignment.setId);
      if (!group) {
        group = {
          id: assignment.setId,
          kind,
          label: readableSetLabel(kind, assignment.setId, assignment.current),
          currentObserved: assignment.current,
          origins: [assignment.setId],
          slots: Object.fromEntries(slotIds.map(slotId => [slotId, null])),
        };
        groups.set(assignment.setId, group);
      }
      group.currentObserved ||= assignment.current;
      group.slots[assignment.slotId] = itemRecordFromDecoded(decoded);
    }
  }

  const deduped = new Map();
  for (const group of groups.values()) {
    const signature = setSignature(group, slotIds);
    const existing = deduped.get(signature);
    if (!existing) {
      deduped.set(signature, group);
      continue;
    }
    existing.currentObserved ||= group.currentObserved;
    existing.origins.push(...group.origins);
    if (group.currentObserved && !existing.currentObserved) {
      existing.id = group.id;
      existing.label = group.label;
    }
  }

  return [...deduped.values()].map(group => Object.freeze({
    ...group,
    origins: Object.freeze([...new Set(group.origins)]),
    slots: Object.freeze({ ...group.slots }),
    complete: slotIds.every(slotId => Boolean(group.slots[slotId])),
    filledSlots: slotIds.filter(slotId => Boolean(group.slots[slotId])).length,
  }));
}

function petCandidates(snapshot) {
  const pets = Array.isArray(snapshot?.pets) ? snapshot.pets : [];
  return pets
    .filter(pet => pet && typeof pet === 'object' && pet.type)
    .map((pet, index) => {
      const records = itemRecordsFromSnapshotPet(pet);
      const stableId = pet.uuid || `index:${pet.index ?? index}`;
      return Object.freeze({
        id: `pet:${stableId}`,
        label: records.pet?.displayName || String(pet.type),
        currentObserved: pet.active === true,
        pet: records.pet,
        petItem: records.petItem,
        type: pet.type,
        rarity: pet.rarity ?? pet.tier ?? null,
      });
    });
}

function candidateViolations(setup) {
  const violations = [];
  const occupied = new Map();
  for (const [slotId, item] of Object.entries(setup?.slots || {})) {
    if (!item) continue;
    const id = physicalItemId(item);
    if (!id) continue;
    if (occupied.has(id)) {
      violations.push({
        type: 'duplicate-physical-item',
        physicalItemId: id,
        slots: [occupied.get(id), slotId],
      });
    } else {
      occupied.set(id, slotId);
    }
  }

  const pet = setup?.slots?.pet;
  const petItem = setup?.slots?.petItem;
  if (petItem && !pet) violations.push({ type: 'orphan-pet-item' });
  return violations;
}

function fillComponent(setup, component) {
  if (!component) return;
  for (const [slotId, item] of Object.entries(component.slots || {})) {
    if (item) setup.slots[slotId] = { ...item };
  }
}

function missingWearableSlots(setup) {
  return [...ARMOR_SLOTS, ...EQUIPMENT_SLOTS].filter(slotId => !setup?.slots?.[slotId]);
}

function candidateId(phase, armor, equipment, pet) {
  return [
    phase,
    `armor=${armor?.id || 'none'}`,
    `equipment=${equipment?.id || 'none'}`,
    `pet=${pet?.id || 'none'}`,
  ].join('|');
}

export function buildSetupCandidateInventory(snapshot) {
  return Object.freeze({
    version: SETUP_CANDIDATE_VERSION,
    sourceStatus: Object.freeze({
      items: provenanceStatus(snapshot, 'items'),
      pets: provenanceStatus(snapshot, 'pets'),
    }),
    armorSets: Object.freeze(observedSets(snapshot, 'armor')),
    equipmentSets: Object.freeze(observedSets(snapshot, 'equipment')),
    pets: Object.freeze(petCandidates(snapshot)),
  });
}

/**
 * Enumerates legal owned combinations without assigning a value or claiming a
 * winner. Armor/equipment sets come only from currently equipped or saved
 * Hypixel loadouts. Pets come only from the normalized owned-pet list, and a
 * pet's held item stays attached to that exact physical pet.
 *
 * The crop tool/Vacuum is deliberately not copied into setup slots. Farming and
 * Spawning use the crop tool; Killing uses the Vacuum. Those item classes are
 * already modeled separately and must not be double-counted in a wearable setup.
 */
export function buildSetupCandidates(snapshot, options = {}) {
  const phase = normalizeActivityMode(options.phase || ACTIVITY_MODE.FARM);
  const inventory = buildSetupCandidateInventory(snapshot);
  const armorChoices = inventory.armorSets.length ? inventory.armorSets : [null];
  const equipmentChoices = inventory.equipmentSets.length ? inventory.equipmentSets : [null];
  const petChoices = inventory.pets.length ? inventory.pets : [null];
  const candidates = [];

  for (const armor of armorChoices) {
    for (const equipment of equipmentChoices) {
      for (const pet of petChoices) {
        const id = candidateId(phase, armor, equipment, pet);
        const setup = createSetup(id, `Candidate ${candidates.length + 1}`);
        fillComponent(setup, armor);
        fillComponent(setup, equipment);
        if (pet?.pet) setup.slots.pet = { ...pet.pet };
        if (pet?.petItem) setup.slots.petItem = { ...pet.petItem };

        const violations = candidateViolations(setup);
        const missingSlots = missingWearableSlots(setup);
        const currentObserved = Boolean(
          armor?.currentObserved
          && equipment?.currentObserved
          && (pet ? pet.currentObserved : inventory.pets.length === 0),
        );

        candidates.push(Object.freeze({
          id,
          phase,
          requiredHandItemKind: usesFarmingTool(phase) ? 'farming-tool' : 'vacuum',
          setup: Object.freeze({ ...setup, slots: Object.freeze({ ...setup.slots }) }),
          components: Object.freeze({
            armorSetId: armor?.id || null,
            equipmentSetId: equipment?.id || null,
            petId: pet?.id || null,
          }),
          currentObserved,
          wearableComplete: missingSlots.length === 0,
          petObserved: Boolean(pet),
          missingSlots: Object.freeze(missingSlots),
          valid: violations.length === 0,
          violations: Object.freeze(violations),
          sourceStatus: inventory.sourceStatus,
        }));
      }
    }
  }

  return Object.freeze(candidates);
}
