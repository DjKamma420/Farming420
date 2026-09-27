import './vacuum-data-patches.js';
import { UPGRADES } from './data.js';

const ENCHANTMENTS_SOURCE = 'https://hypixelskyblock.minecraft.wiki/w/Enchantments';
const ULTIMATE_ENCHANTMENTS_SOURCE = 'https://hypixelskyblock.minecraft.wiki/w/Ultimate_Enchantments';
const VERIFIED_AT = '2026-09-28';

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

function ultimate(maxLevel, appliesTo, options = {}) {
  return meta(maxLevel, appliesTo, {
    ...options,
    kind: 'ultimate',
    source: options.source || ULTIMATE_ENCHANTMENTS_SOURCE,
  });
}

/**
 * Strict Farming420 enchant whitelist.
 *
 * This is intentionally narrower than "everything the item can technically
 * carry". An enchant belongs here only when it directly affects farming,
 * Garden/Pest farming, farming throughput, or a documented farming synergy.
 * Profile-synced non-farming enchants remain stored on the physical item but
 * are not offered as editable Farming420 choices.
 */
export const VERIFIED_FARMING_ENCHANT_META = Object.freeze({
  // Farming tools and vacuums.
  bug_blender: meta(5, ['vacuum'], { source: 'https://hypixelskyblock.minecraft.wiki/w/Bug_Blender' }),
  cultivating: meta(10, ['farming-tool'], { source: 'https://hypixelskyblock.minecraft.wiki/w/Cultivating' }),
  dedication: meta(4, ['farming-tool'], { source: 'https://hypixelskyblock.minecraft.wiki/w/Dedication' }),
  delicate: meta(5, ['farming-tool'], { source: 'https://hypixelskyblock.minecraft.wiki/w/Delicate' }),
  feast: meta(5, ['farming-tool'], { source: 'https://hypixelskyblock.minecraft.wiki/w/Feast' }),
  harvesting: meta(6, ['farming-tool'], { source: 'https://hypixelskyblock.minecraft.wiki/w/Harvesting' }),
  replenish: meta(1, ['farming-tool'], { source: 'https://hypixelskyblock.minecraft.wiki/w/Replenish' }),
  turbo_crop: meta(7, ['farming-tool'], { source: 'https://hypixelskyblock.minecraft.wiki/w/Turbo-Crop' }),
  crop_fever: ultimate(5, ['farming-tool'], { source: 'https://hypixelskyblock.minecraft.wiki/w/Crop_Fever' }),

  // Armor. Thorns is farming-relevant through the documented Thorny-equipment
  // Overbloom interaction; the Century/Raffle Pufferfish Hat can carry V.
  pesterminator: meta(6, ['armor'], { source: 'https://hypixelskyblock.minecraft.wiki/w/Pesterminator' }),
  sunset: ultimate(5, ['armor'], { source: 'https://hypixelskyblock.minecraft.wiki/w/Sunset' }),
  thorns: meta(4, ['armor'], {
    trueMaxLevel: 5,
    conflicts: ['reflection'],
    source: 'https://hypixel.net/threads/hypixel-skyblock-0-26-1-new-player-improvements-harvest-feast-changes-healing-revamp-and-more.6127383/',
  }),

  // Equipment.
  green_thumb: meta(5, ['equipment'], { source: 'https://hypixelskyblock.minecraft.wiki/w/Green_Thumb_(Enchantment)' }),
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
 * Only one Ultimate Enchantment can be applied to an item. Hidden non-farming
 * ultimates still participate in this validity check when their NBT key keeps
 * the standard ultimate_ prefix.
 */
export function ultimateEnchantConflict(enchantments) {
  if (!enchantments || typeof enchantments !== 'object') return null;
  const active = Object.entries(enchantments)
    .filter(([, level]) => Number(level) > 0)
    .filter(([id]) => {
      const canonical = canonicalEnchantId(id);
      return String(id).toLowerCase().startsWith('ultimate_')
        || VERIFIED_FARMING_ENCHANT_META[canonical]?.kind === 'ultimate';
    })
    .map(([id]) => canonicalEnchantId(id));
  const unique = [...new Set(active)];
  return unique.length > 1 ? Object.freeze({ group: 'ultimate-enchantment', enchantments: Object.freeze(unique) }) : null;
}

/** CSS-facing class name. Verified maxima receive the chroma treatment. */
export function enchantPresentationClass(enchantId, level) {
  return `enchant-${enchantPresentation(enchantId, level).state}`;
}
