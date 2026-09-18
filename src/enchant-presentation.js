import { UPGRADES } from './data.js';

const ENCHANTMENTS_SOURCE = 'https://hypixelskyblock.minecraft.wiki/w/Enchantments';
const VERIFIED_AT = '2026-09-18';

function meta(maxLevel, appliesTo, options = {}) {
  return Object.freeze({
    maxLevel,
    minLevel: options.minLevel || 1,
    appliesTo: Object.freeze([...appliesTo]),
    kind: options.kind || 'normal',
    strategy: options.strategy || 'standard',
    note: options.note || null,
    source: options.source || ENCHANTMENTS_SOURCE,
    lastVerified: VERIFIED_AT,
  });
}

/**
 * Verified current enchant mechanics that Farming420 can encounter in farming
 * loadouts. Maxima are enchant maxima, never progression-card maxima.
 */
export const VERIFIED_FARMING_ENCHANT_META = Object.freeze({
  bug_blender: meta(5, ['vacuum'], { source: 'https://hypixelskyblock.minecraft.wiki/w/Bug_Blender' }),
  cultivating: meta(10, ['farming-tool'], { source: 'https://hypixelskyblock.minecraft.wiki/w/Cultivating' }),
  dedication: meta(4, ['farming-tool'], { source: 'https://hypixelskyblock.minecraft.wiki/w/Dedication' }),
  efficiency: meta(5, ['farming-tool'], {
    strategy: 'utility',
    note: 'Universal Tool enchant. Farming Tools cap at Efficiency V; this is break-speed utility, not Farming Fortune.',
    source: 'https://hypixelskyblock.minecraft.wiki/w/Efficiency',
  }),
  delicate: meta(5, ['farming-tool'], {
    minLevel: 5,
    strategy: 'contextual',
    note: 'Only Delicate V exists. It protects stems and baby crops; it is not a universal profit upgrade.',
    source: 'https://hypixelskyblock.minecraft.wiki/w/Delicate',
  }),
  feast: meta(5, ['farming-tool'], {
    strategy: 'feast',
    note: 'Overbloom enchant for Harvest Feast / rare-crop setups rather than normal crop Fortune.',
    source: 'https://hypixelskyblock.minecraft.wiki/w/Feast',
  }),
  harvesting: meta(6, ['farming-tool']),
  replenish: meta(1, ['farming-tool'], {
    strategy: 'conditional',
    note: 'Useful when the harvested crop must be replanted; regrowing stem/cane/cactus layouts do not gain the same value.',
    source: 'https://hypixelskyblock.minecraft.wiki/w/Replenish',
  }),
  turbo_crop: meta(7, ['farming-tool'], {
    strategy: 'crop-specific',
    note: 'Only the Turbo variant matching the crop contributes Crop Fortune.',
  }),
  pesterminator: meta(6, ['armor']),
  thorns: meta(4, ['armor'], {
    strategy: 'secret',
    note: 'Secret farming interaction: Thorns tiers add Overbloom only when the worn equipment uses the Thorny reforge.',
    source: 'https://hypixel.net/threads/hypixel-skyblock-0-26-1-new-player-improvements-harvest-feast-changes-healing-revamp-and-more.6127383/',
  }),
  green_thumb: meta(5, ['equipment']),
  crop_fever: meta(5, ['farming-tool'], {
    kind: 'ultimate',
    strategy: 'proc',
    note: 'Temporary Farming Fortune/Overbloom proc; value depends on real break rate and proc uptime.',
  }),
  sunset: meta(5, ['armor'], {
    kind: 'ultimate',
    strategy: 'overbloom',
    note: 'Daytime Overbloom / nighttime Visitor-cooldown enchant; evaluate by the active strategy.',
    source: 'https://hypixelskyblock.minecraft.wiki/w/Sunset',
  }),
});

export const VERIFIED_FARMING_ENCHANT_MAX = Object.freeze(Object.fromEntries(
  Object.entries(VERIFIED_FARMING_ENCHANT_META).map(([id, enchantMeta]) => [id, enchantMeta.maxLevel]),
));

/** Current removed farming enchantments that may still exist in old data. */
export const LEGACY_FARMING_ENCHANT_META = Object.freeze({
  sunder: Object.freeze({
    status: 'removed',
    removedAt: '2026-04-28',
    source: ENCHANTMENTS_SOURCE,
    lastVerified: VERIFIED_AT,
  }),
});

/** Guard that corresponding scored mechanics still exist in runtime data. */
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

export function canonicalEnchantId(value) {
  let id = normalizedEnchantId(value);
  if (id.startsWith('ultimate_')) id = id.slice('ultimate_'.length);
  // NBT stores Turbo enchants crop-specifically (turbo_wheat, turbo_melon,
  // etc.). They share the sourced Turbo-Crop maximum and presentation rule.
  if (id.startsWith('turbo_')) return 'turbo_crop';
  return id;
}

export function enchantMetadata(enchantId) {
  const id = canonicalEnchantId(enchantId);
  return VERIFIED_FARMING_ENCHANT_META[id] || LEGACY_FARMING_ENCHANT_META[id] || null;
}

export function enchantPresentation(enchantId, rawLevel) {
  const id = canonicalEnchantId(enchantId);
  const level = Math.max(0, Number(rawLevel) || 0);
  // Removed/legacy values are deliberately neutral: they must never receive
  // current-max chroma or be treated as a recommended current enchant.
  if (LEGACY_FARMING_ENCHANT_META[id]) return { id, level, maxLevel: null, state: 'unverified' };
  const enchantMeta = VERIFIED_FARMING_ENCHANT_META[id] ?? null;
  const maxLevel = enchantMeta?.maxLevel ?? null;
  if (maxLevel === null) return { id, level, maxLevel: null, state: 'unverified' };
  if (level >= maxLevel) return { id, level, maxLevel, state: 'maxed' };
  return { id, level, maxLevel, state: level > 0 ? 'active' : 'missing' };
}

/**
 * Only one Ultimate Enchantment can be applied to an item. This checker works
 * on the item's real NBT enchant map and does not infer ownership from cards.
 */
export function ultimateEnchantConflict(enchantments) {
  if (!enchantments || typeof enchantments !== 'object') return null;
  const active = Object.entries(enchantments)
    .filter(([, level]) => Number(level) > 0)
    .map(([id]) => canonicalEnchantId(id))
    .filter(id => VERIFIED_FARMING_ENCHANT_META[id]?.kind === 'ultimate');
  const unique = [...new Set(active)];
  return unique.length > 1 ? Object.freeze({ group: 'ultimate-enchantment', enchantments: Object.freeze(unique) }) : null;
}

/** CSS-facing class name. `maxed` is rendered with a chroma/rainbow treatment. */
export function enchantPresentationClass(enchantId, level) {
  return `enchant-${enchantPresentation(enchantId, level).state}`;
}
