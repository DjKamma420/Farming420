// Exact internal ids for the physical farming tools used by the app.
// Theoretical hoes keep their historical THEORETICAL_HOE_* ids even though
// their 2026 display names are Sickles/Cutters/Shovels. The other tools use a
// base id for Mk. I and _2/_3 for Mk. II/III.
export const FARMING_TOOL_ITEM_IDS = Object.freeze({
  "Euclid's Wheat Sickle": Object.freeze(['THEORETICAL_HOE_WHEAT_1', 'THEORETICAL_HOE_WHEAT_2', 'THEORETICAL_HOE_WHEAT_3']),
  'Gauss Carrot Shovel': Object.freeze(['THEORETICAL_HOE_CARROT_1', 'THEORETICAL_HOE_CARROT_2', 'THEORETICAL_HOE_CARROT_3']),
  'Pythagorean Potato Shovel': Object.freeze(['THEORETICAL_HOE_POTATO_1', 'THEORETICAL_HOE_POTATO_2', 'THEORETICAL_HOE_POTATO_3']),
  'Pumpkin Dicer': Object.freeze(['PUMPKIN_DICER', 'PUMPKIN_DICER_2', 'PUMPKIN_DICER_3']),
  'Melon Dicer': Object.freeze(['MELON_DICER', 'MELON_DICER_2', 'MELON_DICER_3']),
  'Fungi Cutter': Object.freeze(['FUNGI_CUTTER', 'FUNGI_CUTTER_2', 'FUNGI_CUTTER_3']),
  'Cactus Knife': Object.freeze(['CACTUS_KNIFE', 'CACTUS_KNIFE_2', 'CACTUS_KNIFE_3']),
  'Turing Sugar Cane Cutter': Object.freeze(['THEORETICAL_HOE_CANE_1', 'THEORETICAL_HOE_CANE_2', 'THEORETICAL_HOE_CANE_3']),
  'Cocoa Chopper': Object.freeze(['COCO_CHOPPER', 'COCO_CHOPPER_2', 'COCO_CHOPPER_3']),
  'Newton Nether Wart Cutter': Object.freeze(['THEORETICAL_HOE_WARTS_1', 'THEORETICAL_HOE_WARTS_2', 'THEORETICAL_HOE_WARTS_3']),
  'Eclipse Sickle': Object.freeze(['THEORETICAL_HOE_SUNFLOWER_1', 'THEORETICAL_HOE_SUNFLOWER_2', 'THEORETICAL_HOE_SUNFLOWER_3']),
  'Wild Rose Cutter': Object.freeze(['THEORETICAL_HOE_WILD_ROSE_1', 'THEORETICAL_HOE_WILD_ROSE_2', 'THEORETICAL_HOE_WILD_ROSE_3']),
});

export const GARDEN_VACUUM_ITEMS = Object.freeze([
  Object.freeze({ id: 'SKYMART_VACUUM', name: 'SkyMart Vacuum', rarity: 'COMMON' }),
  Object.freeze({ id: 'SKYMART_TURBO_VACUUM', name: 'SkyMart Turbo Vacuum', rarity: 'UNCOMMON' }),
  Object.freeze({ id: 'SKYMART_HYPER_VACUUM', name: 'SkyMart Hyper Vacuum', rarity: 'RARE' }),
  Object.freeze({ id: 'INFINI_VACUUM', name: 'InfiniVacuum™', rarity: 'EPIC' }),
  Object.freeze({ id: 'INFINI_VACUUM_HOOVERIUS', name: 'InfiniVacuum™ Hooverius', rarity: 'LEGENDARY' }),
]);

export function farmingToolSkyblockId(toolName, tier = 1) {
  const chain = FARMING_TOOL_ITEM_IDS[toolName];
  if (!chain) return null;
  const normalizedTier = Math.max(1, Math.min(3, Math.floor(Number(tier) || 1)));
  return chain[normalizedTier - 1] || null;
}

export function vacuumRecordById(id) {
  const normalized = String(id || '').trim().toUpperCase();
  return GARDEN_VACUUM_ITEMS.find(item => item.id === normalized) || null;
}

export function catalogItemByExactId(catalog, id) {
  const normalized = String(id || '').trim().toUpperCase();
  if (!normalized || !Array.isArray(catalog)) return null;
  return catalog.find(item => String(item?.id || '').trim().toUpperCase() === normalized) || null;
}

function compareNumber(left, operator, right) {
  if (!Number.isFinite(left) || !Number.isFinite(right)) return false;
  switch (String(operator || '').toUpperCase()) {
    case 'GREATER_THAN_OR_EQUALS': return left >= right;
    case 'GREATER_THAN': return left > right;
    case 'LESS_THAN_OR_EQUALS': return left <= right;
    case 'LESS_THAN': return left < right;
    case 'EQUALS':
    case 'EQUAL': return left === right;
    default: return false;
  }
}

/**
 * Evaluate only requirement shapes the app has an exact local value for.
 * Unknown requirement types stay unsatisfied rather than being guessed through.
 */
export function gemstoneRequirementSatisfied(requirement, context = {}) {
  if (!requirement || typeof requirement !== 'object') return false;
  if (requirement.type === 'ITEM_DATA' && requirement.dataKey === 'levelable_lvl') {
    return compareNumber(Number(context.toolLevel), requirement.operator, Number(requirement.value));
  }
  return false;
}

export function gemstoneSlotAvailable(slot, context = {}) {
  const requirements = Array.isArray(slot?.requirements) ? slot.requirements : [];
  return requirements.length === 0 || requirements.every(requirement => gemstoneRequirementSatisfied(requirement, context));
}

export function availableOfficialGemstoneSlots(item, context = {}) {
  const slots = Array.isArray(item?.gemstoneSlots) ? item.gemstoneSlots : [];
  return slots.filter(slot => gemstoneSlotAvailable(slot, context));
}

export function officialGemstoneUnlockCoins(slot) {
  const costs = Array.isArray(slot?.costs) ? slot.costs : [];
  return costs.reduce((sum, cost) => sum + (cost?.type === 'COINS' ? Number(cost.coins || 0) : 0), 0);
}

export function officialGemstoneUnlockItems(slot) {
  const costs = Array.isArray(slot?.costs) ? slot.costs : [];
  return costs
    .filter(cost => cost?.type === 'ITEM' && cost.itemId && Number(cost.amount) > 0)
    .map(cost => ({ itemId: cost.itemId, amount: Number(cost.amount) }));
}
