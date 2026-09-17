import { GEM_QUALITIES, GEM_TYPES } from './item-editor.js';

export const ITEM_CAPABILITIES_VERIFIED = '2026-09-17';

/**
 * Farming-facing reforge families. They are deliberately separated: a Vacuum
 * must never offer Mossy, armor must never offer Beady, and equipment must not
 * inherit tool reforges just because all of them exist in app data.
 */
export const FARMING_REFORGES_BY_FAMILY = Object.freeze({
  armor: Object.freeze([
    Object.freeze({ id: 'bustling', name: 'Bustling' }),
    Object.freeze({ id: 'mossy', name: 'Mossy' }),
    Object.freeze({ id: 'mantid', name: 'Mantid' }),
    Object.freeze({ id: 'sunny', name: 'Sunny' }),
  ]),
  equipment: Object.freeze([
    Object.freeze({ id: 'blooming', name: 'Blooming' }),
    Object.freeze({ id: 'rooted', name: 'Rooted' }),
    Object.freeze({ id: 'squeaky', name: 'Squeaky' }),
    Object.freeze({ id: 'thorny', name: 'Thorny' }),
    Object.freeze({ id: 'lunar', name: 'Lunar' }),
  ]),
  'farming-tool': Object.freeze([
    Object.freeze({ id: 'bountiful', name: 'Bountiful' }),
    Object.freeze({ id: 'blessed', name: 'Blessed' }),
    Object.freeze({ id: 'earthy', name: 'Earthy' }),
    Object.freeze({ id: 'deep-fried', name: 'Deep Fried' }),
    Object.freeze({ id: 'overpriced', name: 'Overpriced' }),
  ]),
  vacuum: Object.freeze([
    Object.freeze({ id: 'beady', name: 'Beady' }),
    Object.freeze({ id: 'buzzing', name: 'Buzzing' }),
  ]),
  none: Object.freeze([]),
});

const ARMOR_SLOTS = new Set(['helmet', 'chestplate', 'leggings', 'boots']);
const EQUIPMENT_SLOTS = new Set(['equipment1', 'equipment2', 'equipment3', 'equipment4']);

export function capabilityFamilyForSlot(slotId) {
  if (ARMOR_SLOTS.has(slotId)) return 'armor';
  if (EQUIPMENT_SLOTS.has(slotId)) return 'equipment';
  if (slotId === 'tool') return 'farming-tool';
  if (slotId === 'vacuum') return 'vacuum';
  return 'none';
}

function normalize(value) {
  return String(value || '')
    .replace(/§[0-9a-fk-or]/gi, '')
    .replace(/[’']/g, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/** Exact id first, then exact normalized name. Never fuzzy/substring match. */
export function catalogItemForSetupItem(catalog, item) {
  if (!Array.isArray(catalog) || !item) return null;
  const id = String(item.skyblockId || '').trim().toUpperCase();
  if (id) {
    const byId = catalog.find(entry => String(entry?.id || '').toUpperCase() === id);
    if (byId) return byId;
  }
  const name = normalize(item.displayName);
  if (!name) return null;
  return catalog.find(entry => normalize(entry?.name) === name) || null;
}

export function reforgeOptionsForItem(slotId, catalogItem, currentReforge = null) {
  if (!catalogItem || catalogItem.cannotReforge === true) return [];
  const family = capabilityFamilyForSlot(slotId);
  const base = [...(FARMING_REFORGES_BY_FAMILY[family] || [])];
  const current = normalize(currentReforge).replace(/\s+/g, '-');
  // A synced item may contain a valid older/non-farming reforge. Preserve it as
  // the current state without advertising it as a recommended farming option.
  if (current && !base.some(option => option.id === current)) {
    base.unshift({ id: current, name: String(currentReforge).trim(), currentOnly: true });
  }
  return base;
}

/**
 * `can_recombobulate=false` is authoritative. Most ordinary armor/equipment
 * items omit the true field because recombobulation is the default, so known
 * armor/equipment categories use that default unless the API explicitly says no.
 */
export function canRecombobulateItem(slotId, catalogItem) {
  if (!catalogItem) return false;
  if (catalogItem.canRecombobulate === false) return false;
  if (catalogItem.canRecombobulate === true) return true;
  const family = capabilityFamilyForSlot(slotId);
  return family === 'armor' || family === 'equipment';
}

export function gemstoneSlotsForItem(catalogItem) {
  return Array.isArray(catalogItem?.gemstoneSlots)
    ? catalogItem.gemstoneSlots.filter(slot => slot?.slotType)
    : [];
}

const DIRECT_GEM_TYPES = new Set(GEM_TYPES);
const SLOT_TYPE_GROUPS = Object.freeze({
  UNIVERSAL: Object.freeze([...GEM_TYPES]),
  OFFENSIVE: Object.freeze(['JASPER', 'SAPPHIRE']),
  DEFENSIVE: Object.freeze(['AMETHYST', 'RUBY']),
  MINING: Object.freeze(['JADE', 'AMBER', 'TOPAZ']),
});

/** Values legal for one official gemstone slot type. */
export function gemValuesForSlotType(slotType) {
  const type = String(slotType || '').trim().toUpperCase();
  const types = DIRECT_GEM_TYPES.has(type) ? [type] : (SLOT_TYPE_GROUPS[type] || []);
  const values = [];
  for (const gemType of types) {
    for (const quality of GEM_QUALITIES) values.push(`${quality} ${gemType}`);
  }
  return values;
}

export function itemCapabilities(slotId, item, catalog) {
  const catalogItem = catalogItemForSetupItem(catalog, item);
  if (!catalogItem) {
    return {
      known: false,
      catalogItem: null,
      family: capabilityFamilyForSlot(slotId),
      reforges: [],
      canReforge: false,
      canRecombobulate: false,
      gemstoneSlots: [],
    };
  }
  const reforges = reforgeOptionsForItem(slotId, catalogItem, item?.reforge);
  return {
    known: true,
    catalogItem,
    family: capabilityFamilyForSlot(slotId),
    reforges,
    canReforge: reforges.length > 0 && catalogItem.cannotReforge !== true,
    canRecombobulate: canRecombobulateItem(slotId, catalogItem),
    gemstoneSlots: gemstoneSlotsForItem(catalogItem),
  };
}
