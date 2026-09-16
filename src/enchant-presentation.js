import { UPGRADES } from './data.js';

const CORE_SOURCE = 'https://hypixelskyblock.minecraft.wiki/w/Farming_Fortune';
const PESTERMINATOR_SOURCE = 'https://hypixelskyblock.minecraft.wiki/w/Pesterminator';

/**
 * Enchant-level maxima are their own mechanic. A progression entry can have
 * max: 1 because it represents "this full-set effect is active", even when the
 * enchant itself reaches VI. Never infer an enchant max from such a boolean
 * progression card.
 */
export const VERIFIED_FARMING_ENCHANT_META = Object.freeze({
  dedication: Object.freeze({ maxLevel: 4, source: CORE_SOURCE, lastVerified: '2026-09-16' }),
  cultivating: Object.freeze({ maxLevel: 10, source: CORE_SOURCE, lastVerified: '2026-09-16' }),
  harvesting: Object.freeze({ maxLevel: 6, source: CORE_SOURCE, lastVerified: '2026-09-16' }),
  turbo_crop: Object.freeze({ maxLevel: 7, source: CORE_SOURCE, lastVerified: '2026-09-16' }),
  pesterminator: Object.freeze({ maxLevel: 6, source: PESTERMINATOR_SOURCE, lastVerified: '2026-09-16' }),
});

export const VERIFIED_FARMING_ENCHANT_MAX = Object.freeze(Object.fromEntries(
  Object.entries(VERIFIED_FARMING_ENCHANT_META).map(([id, meta]) => [id, meta.maxLevel]),
));

/** Guard that the corresponding scored mechanics still exist in runtime data. */
const REQUIRED_RUNTIME_ENTRIES = Object.freeze({
  dedication: 'tool-enchant-dedication',
  cultivating: 'tool-enchant-cultivating-x',
  harvesting: 'tool-enchant-harvesting-vi',
  turbo_crop: 'tool-enchant-turbo-crop',
  pesterminator: 'armor-enchant-pesterminator-vi-on-full-armor',
});

const runtimeIds = new Set(UPGRADES.map(entry => entry.id));
for (const entryId of Object.values(REQUIRED_RUNTIME_ENTRIES)) {
  if (!runtimeIds.has(entryId)) throw new Error(`Missing runtime enchant mechanic: ${entryId}`);
}

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
  const meta = VERIFIED_FARMING_ENCHANT_META[id] ?? null;
  const maxLevel = meta?.maxLevel ?? null;
  if (maxLevel === null) return { id, level, maxLevel: null, state: 'unverified' };
  if (level >= maxLevel) return { id, level, maxLevel, state: 'maxed' };
  return { id, level, maxLevel, state: level > 0 ? 'active' : 'missing' };
}

/** CSS-facing class name. `maxed` is rendered with a chroma/rainbow treatment. */
export function enchantPresentationClass(enchantId, level) {
  return `enchant-${enchantPresentation(enchantId, level).state}`;
}
