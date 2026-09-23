import { FARMING_TOOL_ITEM_IDS, GARDEN_VACUUM_ITEMS } from './exact-farming-items.js';
import { isFarmingArmorCatalogItem, isFarmingEquipmentCatalogItem } from './item-catalog.js';
import { GARDEN_CHIPS, TEMPORARY_FARMING_MODIFIERS } from './farming-modifiers-data.js';
import { PROFILE_DATA_STATUS } from './profile-normalizer.js';
import { buildSetupCandidateInventory } from './setup-candidates.js';

export const FARMING_AUTODETECT_VERSION = 2;

const TOOL_BY_ID = new Map(
  Object.entries(FARMING_TOOL_ITEM_IDS)
    .flatMap(([name, ids]) => ids.map((id, index) => [String(id).toUpperCase(), Object.freeze({ name, tier: index + 1 })])),
);
const VACUUM_BY_ID = new Map(GARDEN_VACUUM_ITEMS.map(row => [row.id, row]));
const CHIP_BY_ID = new Map(Object.values(GARDEN_CHIPS).flatMap(row => {
  const ids = [row.itemId, row.tutorialItemId].filter(Boolean);
  return ids.map(id => [String(id).toUpperCase(), row]);
}));

function cleanName(value) {
  return String(value || '').replace(/§[0-9a-fk-or]/gi, '').trim();
}

function normalizedItemId(item) {
  return String(item?.skyblockId || '').trim().toUpperCase();
}

function locationsOf(item) {
  const explicit = Array.isArray(item?.locations) ? item.locations : [];
  if (explicit.length) return explicit;
  if (item?.container) return [{ container: item.container, slot: item.slot ?? null }];
  return [];
}

function isInContainer(item, container) {
  return locationsOf(item).some(location => location?.container === container);
}

function viewOfItem(item, kind, extra = {}) {
  return Object.freeze({
    kind,
    skyblockId: item?.skyblockId || null,
    itemUuid: item?.itemUuid || null,
    displayName: cleanName(item?.displayName) || null,
    rarity: item?.rarity || null,
    reforge: item?.reforge || null,
    activeEquipped: kind === 'armor'
      ? isInContainer(item, 'armor')
      : kind === 'equipment' ? isInContainer(item, 'equipment') : false,
    locations: locationsOf(item).map(location => ({ ...location })),
    model: Object.freeze({ skullTexture: item?.skullTexture || null }),
    ...extra,
  });
}

function statusOf(snapshot, section) {
  return snapshot?.provenance?.[section]?.status || PROFILE_DATA_STATUS.UNKNOWN;
}

function classifyPhysicalItem(item) {
  const id = normalizedItemId(item);
  if (!id) return null;

  const tool = TOOL_BY_ID.get(id);
  if (tool) return viewOfItem(item, 'tool', { toolName: tool.name, tier: tool.tier, setupAffinity: 'farming' });

  const vacuum = VACUUM_BY_ID.get(id);
  if (vacuum) return viewOfItem(item, 'vacuum', { vacuumName: vacuum.name, setupAffinity: 'pest' });

  const chip = CHIP_BY_ID.get(id);
  if (chip) {
    return viewOfItem(item, 'garden-chip-item', {
      chipId: chip.id,
      chipName: chip.name,
      setupAffinity: null,
      accountStateWarning: 'Physical chip ownership does not prove that the chip was redeemed on this Garden profile.',
    });
  }

  const catalogLike = { id, name: cleanName(item?.displayName) };
  if (isFarmingArmorCatalogItem(catalogLike)) {
    return viewOfItem(item, 'armor', { setupAffinity: 'manual-context' });
  }
  if (isFarmingEquipmentCatalogItem(catalogLike)) {
    return viewOfItem(item, 'equipment', { setupAffinity: 'manual-context' });
  }
  return null;
}

function groupItems(items) {
  const grouped = {
    armor: [],
    equipment: [],
    tools: [],
    vacuums: [],
    gardenChipItems: [],
  };
  for (const item of Array.isArray(items) ? items : []) {
    const detected = classifyPhysicalItem(item);
    if (!detected) continue;
    if (detected.kind === 'armor') grouped.armor.push(detected);
    else if (detected.kind === 'equipment') grouped.equipment.push(detected);
    else if (detected.kind === 'tool') grouped.tools.push(detected);
    else if (detected.kind === 'vacuum') grouped.vacuums.push(detected);
    else if (detected.kind === 'garden-chip-item') grouped.gardenChipItems.push(detected);
  }
  return grouped;
}

function detectActivePet(snapshot) {
  const petStatus = statusOf(snapshot, 'pets');
  const pets = Array.isArray(snapshot?.pets) ? snapshot.pets : [];
  if (petStatus === PROFILE_DATA_STATUS.HIDDEN || petStatus === PROFILE_DATA_STATUS.UNKNOWN) {
    return Object.freeze({ status: petStatus, pet: null, conflict: false });
  }

  const active = pets.filter(pet => pet?.active === true);
  if (active.length === 1) {
    return Object.freeze({ status: PROFILE_DATA_STATUS.AUTO, pet: Object.freeze({ ...active[0] }), conflict: false });
  }
  if (active.length > 1) {
    return Object.freeze({ status: PROFILE_DATA_STATUS.UNKNOWN, pet: null, conflict: true });
  }
  if (pets.every(pet => pet?.active === false)) {
    return Object.freeze({ status: PROFILE_DATA_STATUS.AUTO, pet: null, conflict: false });
  }
  return Object.freeze({ status: PROFILE_DATA_STATUS.UNKNOWN, pet: null, conflict: false });
}

function petViews(snapshot) {
  const ownershipStatus = statusOf(snapshot, 'pets');
  return (Array.isArray(snapshot?.pets) ? snapshot.pets : []).map(pet => Object.freeze({
    type: pet?.type || null,
    uuid: pet?.uuid || null,
    rarity: pet?.rarity || null,
    experience: pet?.experience ?? null,
    level: pet?.level ?? null,
    active: pet?.active ?? null,
    heldItem: pet?.heldItem || null,
    skin: pet?.skin || null,
    ownershipStatus,
    setupAffinity: 'manual-context',
  }));
}

function accountDetection(snapshot, physical) {
  const gardenStatus = statusOf(snapshot, 'garden');
  return Object.freeze({
    farmingSkill: Object.freeze({
      level: snapshot?.skills?.farming?.level ?? null,
      xp: snapshot?.skills?.farming?.xp ?? null,
      status: snapshot?.skills?.farming?.status || PROFILE_DATA_STATUS.UNKNOWN,
    }),
    gardenProgress: Object.freeze({
      status: gardenStatus,
      experience: snapshot?.garden?.experience ?? null,
      level: snapshot?.garden?.level ?? null,
      cropUpgrades: Object.freeze({ ...(snapshot?.garden?.cropUpgrades || {}) }),
      unlockedPlotCount: snapshot?.garden?.unlockedPlotCount ?? null,
      visitorsCompleted: snapshot?.garden?.visitors?.totalCompleted ?? null,
    }),
    pestBestiary: Object.freeze({
      status: statusOf(snapshot, 'bestiary.eligiblePestTierTotal'),
      eligibleTierTotal: snapshot?.bestiary?.eligiblePestTierTotal ?? null,
      maxEligibleTierTotal: snapshot?.bestiary?.eligiblePestMaxTierTotal ?? null,
      familyTiers: Object.freeze({ ...(snapshot?.bestiary?.eligiblePestFamilyTiers || {}) }),
    }),
    gardenChips: Object.freeze({
      status: PROFILE_DATA_STATUS.UNKNOWN,
      redeemedLevels: null,
      physicalChipItems: physical.gardenChipItems,
      note: 'No verified current Garden API field for redeemed chip levels is mapped yet. Physical chip items are intentionally not treated as redeemed account upgrades.',
    }),
    farmingShards: Object.freeze({
      status: PROFILE_DATA_STATUS.UNKNOWN,
      active: null,
      note: 'No verified current profile field for active Farming Shards is mapped yet.',
    }),
    temporaryModifiers: Object.freeze({
      status: PROFILE_DATA_STATUS.UNKNOWN,
      active: null,
      knownModifierIds: Object.freeze(Object.values(TEMPORARY_FARMING_MODIFIERS).map(row => row.id)),
      note: 'Short-lived in-game effects are not inferred from profile ownership. They require a live observable source or manual state.',
    }),
  });
}

/**
 * Derives farming-specific state from the normalized profile snapshot.
 *
 * This is deliberately a view, not another persistence model. It keeps four
 * concepts separate: account progression, physical ownership, currently active
 * equipment/pet, and state that the API cannot presently verify.
 */
export function detectFarmingProfile(snapshot) {
  const itemStatus = statusOf(snapshot, 'items');
  const physical = groupItems(snapshot?.items);
  const activePet = detectActivePet(snapshot);
  const pets = petViews(snapshot);
  const candidateInventory = buildSetupCandidateInventory(snapshot);

  const activeArmor = physical.armor.filter(item => item.activeEquipped);
  const activeEquipment = physical.equipment.filter(item => item.activeEquipped);

  return Object.freeze({
    version: FARMING_AUTODETECT_VERSION,
    sourceStatus: Object.freeze({
      items: itemStatus,
      pets: statusOf(snapshot, 'pets'),
      garden: statusOf(snapshot, 'garden'),
      bestiary: statusOf(snapshot, 'bestiary.eligiblePestTierTotal'),
    }),
    account: accountDetection(snapshot, physical),
    physical: Object.freeze({
      status: itemStatus,
      armor: Object.freeze(physical.armor),
      equipment: Object.freeze(physical.equipment),
      tools: Object.freeze(physical.tools),
      vacuums: Object.freeze(physical.vacuums),
      gardenChipItems: Object.freeze(physical.gardenChipItems),
      pets: Object.freeze(pets),
    }),
    active: Object.freeze({
      armor: Object.freeze({ status: itemStatus, items: Object.freeze(activeArmor) }),
      equipment: Object.freeze({ status: itemStatus, items: Object.freeze(activeEquipment) }),
      pet: activePet,
    }),
    candidateInventory,
    setupHints: Object.freeze({
      farming: Object.freeze({
        autoTools: Object.freeze(physical.tools.map(item => item.skyblockId)),
        armorSelection: 'manual-context',
        equipmentSelection: 'manual-context',
        petSelection: 'manual-context',
      }),
      pest: Object.freeze({
        autoVacuums: Object.freeze(physical.vacuums.map(item => item.skyblockId)),
        armorSelection: 'manual-context',
        equipmentSelection: 'manual-context',
        petSelection: 'manual-context',
      }),
    }),
    rules: Object.freeze({
      armorIsNotAutoAssignedBetweenFarmingAndPest: true,
      equipmentIsNotAutoAssignedBetweenFarmingAndPest: true,
      petsAreNotAutoAssignedBetweenFarmingAndPest: true,
      toolsAreFarmingContext: true,
      vacuumsArePestContext: true,
      physicalChipItemDoesNotImplyRedeemedChip: true,
      unknownApiStateDoesNotEqualZero: true,
    }),
  });
}
