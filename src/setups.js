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

export const SETUPS_MODEL_VERSION = 1;

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

/**
 * The starting setups. They are the three the product spec names as separate
 * states; a player can rename, add or remove them.
 */
export const DEFAULT_SETUP_TEMPLATES = Object.freeze([
  { id: 'normal', name: 'Normal Farming' },
  { id: 'pest', name: 'Pest Farming' },
  { id: 'contest', name: 'Jacob Contest' },
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
    reforge: null,
    enchantments: {},
    gems: [],
    recombobulated: false,
    source: ITEM_SOURCE.MANUAL,
    itemUuid: null,
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
    activeId: DEFAULT_SETUP_TEMPLATES[0].id,
    list: DEFAULT_SETUP_TEMPLATES.map(template => createSetup(template.id, template.name)),
  };
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
        slots[slotId] = item && typeof item === 'object' ? { ...createEmptyItem(), ...item } : null;
      }
      return { id: String(setup.id), name: String(setup.name || setup.id), slots };
    });

  const result = {
    modelVersion: SETUPS_MODEL_VERSION,
    activeId: source.activeId,
    list: normalized.length ? normalized : createDefaultSetups().list,
  };
  if (!result.list.some(setup => setup.id === result.activeId)) result.activeId = result.list[0].id;
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
  return {
    ...createEmptyItem(),
    skyblockId: decoded.skyblockId ?? null,
    displayName: cleanName(decoded.displayName) || decoded.skyblockId || '',
    rarity: decoded.rarity ?? null,
    reforge: decoded.reforge ?? null,
    enchantments: { ...(decoded.enchantments || {}) },
    gems: gemListFrom(decoded.gems),
    recombobulated: Number(decoded.recombobulated || 0) >= 1,
    source: ITEM_SOURCE.SYNC,
    itemUuid: decoded.itemUuid ?? null,
  };
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
    assign('pet', {
      ...createEmptyItem(),
      skyblockId: activePet.type ?? null,
      displayName: [activePet.rarity, activePet.type].filter(Boolean).join(' ') || String(activePet.type || ''),
      rarity: activePet.rarity ?? null,
      source: ITEM_SOURCE.SYNC,
    });
    if (activePet.heldItem) {
      assign('petItem', {
        ...createEmptyItem(),
        skyblockId: activePet.heldItem,
        displayName: activePet.heldItem,
        source: ITEM_SOURCE.SYNC,
      });
    }
  }

  return { setup: next, filled, armorSeen: armor.length, equipmentSeen: equipment.length };
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
