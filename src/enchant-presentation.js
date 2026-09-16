import { UPGRADES } from './data.js';

/** Farming enchantment ids whose maxima are already represented by sourced app data. */
const ENTRY_TO_ENCHANT = Object.freeze({
  'tool-enchant-dedication': 'dedication',
  'tool-enchant-cultivating-x': 'cultivating',
  'tool-enchant-harvesting-vi': 'harvesting',
  'tool-enchant-turbo-crop': 'turbo_crop',
  'armor-enchant-pesterminator-vi-on-full-armor': 'pesterminator',
  'armor-enchant-sunset-v-day-overbloom': 'sunset',
  'equipment-enchant-green-thumb-v-on-equipment': 'green_thumb',
});

const upgradeById = new Map(UPGRADES.map(entry => [entry.id, entry]));

/**
 * Verified max levels only. Unknown enchantments are intentionally absent and
 * therefore never painted as max/chroma just because their level looks high.
 */
export const VERIFIED_FARMING_ENCHANT_MAX = Object.freeze(Object.fromEntries(
  Object.entries(ENTRY_TO_ENCHANT)
    .map(([entryId, enchantId]) => [enchantId, Number(upgradeById.get(entryId)?.max)])
    .filter(([, max]) => Number.isFinite(max) && max > 0),
));

function normalizedEnchantId(value) {
  return String(value || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
}

function canonicalEnchantId(value) {
  const id = normalizedEnchantId(value);
  // NBT stores Turbo enchants crop-specifically (turbo_wheat, turbo_melon,
  // etc.). They share the sourced Turbo-Crop maximum and presentation rule.
  if (id.startsWith('turbo_')) return 'turbo_crop';
  return id;
}

export function enchantPresentation(enchantId, rawLevel) {
  const id = canonicalEnchantId(enchantId);
  const level = Math.max(0, Number(rawLevel) || 0);
  const maxLevel = VERIFIED_FARMING_ENCHANT_MAX[id] ?? null;
  if (maxLevel === null) return { id, level, maxLevel: null, state: 'unverified' };
  if (level >= maxLevel) return { id, level, maxLevel, state: 'maxed' };
  return { id, level, maxLevel, state: level > 0 ? 'active' : 'missing' };
}

/** CSS-facing class name. `maxed` is rendered with a chroma/rainbow treatment. */
export function enchantPresentationClass(enchantId, level) {
  return `enchant-${enchantPresentation(enchantId, level).state}`;
}
