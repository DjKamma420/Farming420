import { UPGRADES } from './data.js';

const ENCHANTMENTS_SOURCE = 'https://hypixelskyblock.minecraft.wiki/w/Enchantments';
const ULTIMATE_ENCHANTMENTS_SOURCE = 'https://hypixelskyblock.minecraft.wiki/w/Ultimate_Enchantments';
const VERIFIED_AT = '2026-09-21';

function meta(maxLevel, appliesTo, options = {}) {
  const trueMaxLevel = Number(options.trueMaxLevel ?? maxLevel);
  return Object.freeze({
    minLevel: Number(options.minLevel ?? 1),
    maxLevel,
    trueMaxLevel,
    appliesTo: Object.freeze([...appliesTo]),
    kind: options.kind || 'normal',
    conflicts: Object.freeze([...(options.conflicts || [])]),
    source: options.source || ENCHANTMENTS_SOURCE,
    lastVerified: VERIFIED_AT,
  });
}

const PROTECTION_CONFLICTS = Object.freeze(['blast_protection', 'fire_protection', 'projectile_protection', 'protection']);
const VITALITY_CONFLICTS = Object.freeze(['hardened_vitality', 'strong_vitality', 'vampiric_vitality', 'vivacious_vitality']);

function conflictsExcept(group, id) {
  return group.filter(entry => entry !== id);
}

function ultimate(maxLevel, appliesTo, options = {}) {
  return meta(maxLevel, appliesTo, {
    ...options,
    kind: 'ultimate',
    source: options.source || ULTIMATE_ENCHANTMENTS_SOURCE,
  });
}

/**
 * Verified enchant mechanics for every enchantment currently applicable to the
 * Farming420 farming armor/equipment editor, plus the farming tool/vacuum
 * enchantments the app already models. Slot-specific appliesTo values use the
 * setup slot id; family-wide values use armor/equipment/farming-tool/vacuum.
 *
 * maxLevel is the highest normally applicable level. trueMaxLevel is only
 * different where a concrete item can legitimately carry a higher intrinsic
 * level (Century Pufferfish Hat: Thorns V). Unknown NBT enchantments remain
 * visible but neutral instead of being assigned guessed metadata.
 */
export const VERIFIED_FARMING_ENCHANT_META = Object.freeze({
  // Farming tools and vacuums.
  bug_blender: meta(5, ['vacuum'], { source: 'https://hypixelskyblock.minecraft.wiki/w/Bug_Blender' }),
  cultivating: meta(10, ['farming-tool'], { source: 'https://hypixelskyblock.minecraft.wiki/w/Cultivating' }),
  dedication: meta(4, ['farming-tool'], { source: 'https://hypixelskyblock.minecraft.wiki/w/Dedication' }),
  delicate: meta(5, ['farming-tool'], { source: 'https://hypixelskyblock.minecraft.wiki/w/Delicate' }),
  feast: meta(5, ['farming-tool'], { source: 'https://hypixelskyblock.minecraft.wiki/w/Feast' }),
  harvesting: meta(6, ['farming-tool']),
  replenish: meta(1, ['farming-tool'], { source: 'https://hypixelskyblock.minecraft.wiki/w/Replenish' }),
  turbo_crop: meta(7, ['farming-tool']),
  crop_fever: ultimate(5, ['farming-tool']),

  // Armor: universal normal enchantments.
  blast_protection: meta(7, ['armor'], { conflicts: conflictsExcept(PROTECTION_CONFLICTS, 'blast_protection') }),
  ferocious_mana: meta(10, ['armor']),
  fire_protection: meta(7, ['armor'], { conflicts: conflictsExcept(PROTECTION_CONFLICTS, 'fire_protection') }),
  forest_pledge: meta(6, ['armor'], { minLevel: 3 }),
  growth: meta(7, ['armor']),
  hardened_mana: meta(10, ['armor']),
  hardened_vitality: meta(10, ['armor'], { conflicts: conflictsExcept(VITALITY_CONFLICTS, 'hardened_vitality') }),
  ice_cold: meta(5, ['armor']),
  mana_vampire: meta(10, ['armor']),
  pesterminator: meta(6, ['armor']),
  projectile_protection: meta(7, ['armor'], { conflicts: conflictsExcept(PROTECTION_CONFLICTS, 'projectile_protection') }),
  protection: meta(7, ['armor'], { conflicts: conflictsExcept(PROTECTION_CONFLICTS, 'protection') }),
  rejuvenate: meta(5, ['armor'], { conflicts: ['respite'] }),
  respite: meta(5, ['armor'], { conflicts: ['rejuvenate'] }),
  scuba: meta(6, ['armor']),
  strong_mana: meta(10, ['armor']),
  strong_vitality: meta(10, ['armor'], { conflicts: conflictsExcept(VITALITY_CONFLICTS, 'strong_vitality') }),
  thorns: meta(4, ['armor'], {
    trueMaxLevel: 5,
    conflicts: ['reflection'],
    source: 'https://hypixel.net/threads/hypixel-skyblock-0-26-1-new-player-improvements-harvest-feast-changes-healing-revamp-and-more.6127383/',
  }),
  vampiric_vitality: meta(10, ['armor'], { conflicts: conflictsExcept(VITALITY_CONFLICTS, 'vampiric_vitality') }),
  vivacious_vitality: meta(10, ['armor'], { conflicts: conflictsExcept(VITALITY_CONFLICTS, 'vivacious_vitality') }),

  // Armor: slot-specific normal enchantments.
  aqua_affinity: meta(1, ['helmet']),
  big_brain: meta(5, ['helmet'], { minLevel: 3, conflicts: ['small_brain'] }),
  hecatomb: meta(10, ['helmet']),
  respiration: meta(4, ['helmet']),
  small_brain: meta(5, ['helmet'], { minLevel: 3, conflicts: ['big_brain'] }),
  transylvanian: meta(5, ['helmet'], { minLevel: 4 }),
  counter_strike: meta(5, ['chestplate'], { minLevel: 3 }),
  reflection: meta(5, ['chestplate'], { conflicts: ['thorns'] }),
  true_protection: meta(1, ['chestplate']),
  smarty_pants: meta(5, ['leggings']),
  tidal: meta(3, ['leggings']),
  depth_strider: meta(3, ['boots']),
  feather_falling: meta(10, ['boots']),
  stealth: meta(6, ['boots']),
  sugar_rush: meta(3, ['boots']),

  // Armor Ultimate Enchantments. One Ultimate may exist on an item at a time.
  bank: ultimate(5, ['armor']),
  bobbin_time: ultimate(5, ['armor'], { minLevel: 3 }),
  habanero_tactics: ultimate(5, ['armor'], { minLevel: 4 }),
  last_stand: ultimate(5, ['armor']),
  legion: ultimate(5, ['armor']),
  no_pain_no_gain: ultimate(5, ['armor']),
  refrigerate: ultimate(5, ['armor']),
  sunset: ultimate(5, ['armor']),
  wisdom: ultimate(5, ['armor']),

  // Equipment. Quantum and The One are necklace-only.
  cayenne: meta(5, ['equipment'], { minLevel: 4 }),
  green_thumb: meta(5, ['equipment']),
  prosperity: meta(5, ['equipment']),
  quantum: meta(5, ['equipment1'], { minLevel: 3 }),
  the_one: ultimate(5, ['equipment1'], { minLevel: 4 }),
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
  bug_blender: 'vacuum-enchant-bug-blender',
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
  if (LEGACY_FARMING_ENCHANT_META[id]) {
    return { id, level, maxLevel: null, trueMaxLevel: null, state: 'unverified' };
  }
  const enchantMeta = VERIFIED_FARMING_ENCHANT_META[id] ?? null;
  const maxLevel = enchantMeta?.maxLevel ?? null;
  const trueMaxLevel = enchantMeta?.trueMaxLevel ?? null;
  if (maxLevel === null) return { id, level, maxLevel: null, trueMaxLevel: null, state: 'unverified' };
  if (level > trueMaxLevel) return { id, level, maxLevel, trueMaxLevel, state: 'unverified' };
  if (trueMaxLevel > maxLevel && level >= trueMaxLevel) {
    return { id, level, maxLevel, trueMaxLevel, state: 'special-maxed' };
  }
  if (level >= maxLevel) return { id, level, maxLevel, trueMaxLevel, state: 'maxed' };
  return { id, level, maxLevel, trueMaxLevel, state: level > 0 ? 'active' : 'missing' };
}

/**
 * Only one Ultimate Enchantment can be applied to an item. The NBT checker
 * recognises every verified Farming420 ultimate rather than only the ones that
 * change Farming stats.
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

/** CSS-facing class name. Verified maxima receive the chroma treatment. */
export function enchantPresentationClass(enchantId, level) {
  return `enchant-${enchantPresentation(enchantId, level).state}`;
}
