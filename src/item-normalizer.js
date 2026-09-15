import { decodeHypixelInventory } from './nbt.js';

function stringOrNull(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed || null;
}

function numberOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function numberMap(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const result = {};
  for (const [key, raw] of Object.entries(value)) {
    const number = Number(raw);
    if (Number.isFinite(number)) result[key] = number;
  }
  return result;
}

function plainObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? structuredClone(value)
    : {};
}

/**
 * Converts a decoded Minecraft item into Farming420's source-neutral item
 * shape. This function only copies raw item facts; it does not calculate game
 * mechanics or value.
 */
export function normalizeDecodedItem(item, context = {}) {
  if (!item || typeof item !== 'object') return null;
  const tag = item.tag && typeof item.tag === 'object' ? item.tag : {};
  const extra = tag.ExtraAttributes && typeof tag.ExtraAttributes === 'object'
    ? tag.ExtraAttributes
    : {};
  const display = tag.display && typeof tag.display === 'object' ? tag.display : {};
  const skyblockId = stringOrNull(extra.id);

  // Empty Minecraft inventory slots commonly decode as empty compounds. They
  // are not items and must not become phantom setup entries.
  if (!skyblockId && Object.keys(item).length === 0) return null;

  return {
    container: stringOrNull(context.container),
    slot: Number.isInteger(context.slot) ? context.slot : null,
    skyblockId,
    itemUuid: stringOrNull(extra.uuid),
    count: numberOrNull(item.Count),
    vanillaId: numberOrNull(item.id),
    damage: numberOrNull(item.Damage),
    displayName: stringOrNull(display.Name),
    reforge: stringOrNull(extra.modifier),
    enchantments: numberMap(extra.enchantments),
    gems: plainObject(extra.gems),
    attributes: numberMap(extra.attributes),
    farmingForDummies: numberOrNull(extra.farming_for_dummies_count),
    recombobulated: numberOrNull(extra.rarity_upgrades),
    cultivatingCounter: numberOrNull(extra.farmed_cultivating),
    overclockerLevel: numberOrNull(extra.levelable_overclocks),
    itemTier: numberOrNull(extra.item_tier),
    petInfo: stringOrNull(extra.petInfo),
  };
}

export async function normalizeEncodedInventory(encodedData, context = {}) {
  const decoded = await decodeHypixelInventory(encodedData);
  return decoded
    .map((item, slot) => normalizeDecodedItem(item, { ...context, slot }))
    .filter(Boolean);
}
