import { GEM_QUALITIES, GEM_TYPES } from './item-editor.js';

export const ITEM_CAPABILITIES_VERIFIED = '2026-09-17';

/**
 * Farming-facing reforge families. They are deliberately separated: a Vacuum
 * must never offer Mossy, armor must never offer Beady, and equipment must not
 * inherit tool reforges just because all of them exist in app data.
 */
export const FARMING_REFORGES_BY_FAMILY = Object.freeze({
  armor: Object.freeze([
    Object.freeze({ id: 'bustling', name: 'Bustling', stone: 'SkyMart Brochure', itemId: 'SKYMART_BROCHURE' }),
    Object.freeze({ id: 'mossy', name: 'Mossy', stone: 'Overgrown Grass', itemId: 'OVERGROWN_GRASS' }),
    Object.freeze({ id: 'mantid', name: 'Mantid', stone: 'Mantid Claw', itemId: 'MANTID_CLAW' }),
    Object.freeze({ id: 'sunny', name: 'Sunny', stone: 'Sunstone', itemId: 'SUNSTONE' }),
  ]),
  equipment: Object.freeze([
    Object.freeze({ id: 'blooming', name: 'Blooming', stone: 'Flowering Bouquet', itemId: 'FLOWERING_BOUQUET' }),
    Object.freeze({ id: 'rooted', name: 'Rooted', stone: 'Burrowing Spores', itemId: 'BURROWING_SPORES' }),
    Object.freeze({ id: 'squeaky', name: 'Squeaky', stone: 'Squeaky Toy', itemId: 'SQUEAKY_TOY' }),
    Object.freeze({ id: 'thorny', name: 'Thorny', stone: 'Blooming Thorns', itemId: 'BLOOMING_THORNS' }),
    Object.freeze({ id: 'lunar', name: 'Lunar', stone: 'Moonstone', itemId: 'MOONSTONE' }),
  ]),
  'farming-tool': Object.freeze([
    Object.freeze({ id: 'bountiful', name: 'Bountiful', stone: 'Golden Ball', itemId: 'GOLDEN_BALL' }),
    Object.freeze({ id: 'blessed', name: 'Blessed', stone: 'Blessed Fruit', itemId: 'BLESSED_FRUIT' }),
    Object.freeze({ id: 'earthy', name: 'Earthy', stone: 'Large Walnut', itemId: 'LARGE_WALNUT' }),
    Object.freeze({ id: 'deep-fried', name: 'Deep Fried', stone: 'Hashbrown', itemId: 'HASHBROWN' }),
    Object.freeze({ id: 'overpriced', name: 'Overpriced', stone: 'Overpriced Drink', itemId: 'OVERPRICED_DRINK' }),
  ]),
  vacuum: Object.freeze([
    Object.freeze({ id: 'beady', name: 'Beady', stone: 'Beady Eyes', itemId: 'BEADY_EYES' }),
    Object.freeze({ id: 'buzzing', name: 'Buzzing', stone: 'Clipped Wings', itemId: 'CLIPPED_WINGS' }),
  ]),
  none: Object.freeze([]),
});

/** Only Beady has a scored calculator entry; Buzzing is a real exclusive state with no FF contribution. */
export const VACUUM_REFORGE_EFFECT_ENTRY_IDS = Object.freeze({
  beady: 'vacuum-reforge-beady-pest-only-farming-fortune',
  buzzing: null,
});

export function selectedVacuumReforge(bucket) {
  const explicit = String(bucket?.reforge || '').trim().toLowerCase();
  if (FARMING_REFORGES_BY_FAMILY.vacuum.some(option => option.id === explicit)) return explicit;
  const beadyId = VACUUM_REFORGE_EFFECT_ENTRY_IDS.beady;
  if (Number(bucket?.levels?.[beadyId] || 0) > 0 || bucket?.owned?.[beadyId] === true) return 'beady';
  return null;
}

/** Writes one and only one Vacuum reforge and keeps the legacy scored Beady entry in sync. */
export function applyVacuumReforge(bucket, requested) {
  if (!bucket || typeof bucket !== 'object') return bucket;
  bucket.levels ||= {};
  bucket.owned ||= {};
  const next = FARMING_REFORGES_BY_FAMILY.vacuum.some(option => option.id === requested) ? requested : null;
  bucket.reforge = next;
  for (const entryId of Object.values(VACUUM_REFORGE_EFFECT_ENTRY_IDS).filter(Boolean)) {
    delete bucket.levels[entryId];
    delete bucket.owned[entryId];
  }
  const scored = VACUUM_REFORGE_EFFECT_ENTRY_IDS[next];
  if (scored) {
    bucket.levels[scored] = 1;
    bucket.owned[scored] = true;
  }
  return bucket;
}

const ARMOR_SLOTS = new Set(['helmet', 'chestplate', 'leggings', 'boots']);
const EQUIPMENT_SLOTS = new Set(['equipment1', 'equipment2', 'equipment3', 'equipment4']);
const CATEGORY_BY_FAMILY = Object.freeze({
  armor: new Set(['HELMET', 'CHESTPLATE', 'LEGGINGS', 'BOOTS']),
  equipment: new Set(['NECKLACE', 'CLOAK', 'BELT', 'GLOVES', 'BRACELET']),
  // The official resource historically used HOE/AXE for some of these before
  // the FARMING_TOOL category was rolled out. Keep those exact categories as a
  // compatibility bridge for cached/current-resource transitions.
  'farming-tool': new Set(['FARMING_TOOL', 'HOE', 'AXE']),
  vacuum: new Set(['VACUUM']),
  none: new Set(),
});

export function capabilityFamilyForSlot(slotId) {
  if (ARMOR_SLOTS.has(slotId)) return 'armor';
  if (EQUIPMENT_SLOTS.has(slotId)) return 'equipment';
  if (slotId === 'tool') return 'farming-tool';
  if (slotId === 'vacuum') return 'vacuum';
  return 'none';
}

export function catalogItemMatchesFamily(slotId, catalogItem) {
  if (!catalogItem) return false;
  const family = capabilityFamilyForSlot(slotId);
  const allowed = CATEGORY_BY_FAMILY[family];
  return Boolean(allowed?.has(String(catalogItem.category || '').trim().toUpperCase()));
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
  if (!catalogItem || catalogItem.cannotReforge === true || !catalogItemMatchesFamily(slotId, catalogItem)) return [];
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
 * `can_recombobulate=false` is authoritative. Ordinary compatible gear omits
 * the true field because recombobulation is the default, so all four physical
 * farming families use that default only when the official category matches.
 */
export function canRecombobulateItem(slotId, catalogItem) {
  if (!catalogItem || !catalogItemMatchesFamily(slotId, catalogItem)) return false;
  if (catalogItem.canRecombobulate === false) return false;
  if (catalogItem.canRecombobulate === true) return true;
  return ['armor', 'equipment', 'farming-tool', 'vacuum'].includes(capabilityFamilyForSlot(slotId));
}

export function gemstoneSlotsForItem(catalogItem) {
  return Array.isArray(catalogItem?.gemstoneSlots)
    ? catalogItem.gemstoneSlots.filter(slot => slot?.slotType)
    : [];
}

const DIRECT_GEM_TYPES = new Set(GEM_TYPES);
const SLOT_TYPE_GROUPS = Object.freeze({
  UNIVERSAL: Object.freeze([...GEM_TYPES]),
  // Current grouped socket definitions include the newer Onyx and Opal gems.
  // Peridot remains a direct Farming socket and is therefore not added to
  // Combat/Defensive groups.
  COMBAT: Object.freeze(['AMETHYST', 'JASPER', 'ONYX', 'OPAL', 'RUBY', 'SAPPHIRE']),
  OFFENSIVE: Object.freeze(['JASPER', 'SAPPHIRE']),
  DEFENSIVE: Object.freeze(['AMETHYST', 'OPAL', 'RUBY']),
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
  const family = capabilityFamilyForSlot(slotId);
  if (!catalogItem) {
    return {
      known: false,
      catalogItem: null,
      family,
      reforges: [],
      canReforge: false,
      canRecombobulate: false,
      gemstoneSlots: [],
    };
  }
  const applicable = catalogItemMatchesFamily(slotId, catalogItem);
  const reforges = applicable ? reforgeOptionsForItem(slotId, catalogItem, item?.reforge) : [];
  return {
    known: true,
    applicable,
    catalogItem,
    family,
    reforges,
    canReforge: applicable && reforges.length > 0 && catalogItem.cannotReforge !== true,
    canRecombobulate: applicable && canRecombobulateItem(slotId, catalogItem),
    gemstoneSlots: applicable ? gemstoneSlotsForItem(catalogItem) : [],
  };
}
