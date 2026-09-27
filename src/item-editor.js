/**
 * The item editor's data layer.
 *
 * Editing gear used to mean typing enchantment names into a free-text field: an
 * empty box gives no hint that Pesterminator exists, no hint that it stops at
 * VI, and no protection against a typo silently creating a second enchantment.
 * This module turns each slot into a fixed, known list of farming-relevant
 * enchantments. The player toggles what matters to Farming420 and picks a level
 * inside the sourced maximum instead of wading through unrelated combat,
 * defense, mana, or utility enchants.
 *
 * It holds no DOM. Everything here is a pure function over one item record.
 */

import {
  VERIFIED_FARMING_ENCHANT_META,
  canonicalEnchantId,
  enchantPresentation,
} from './enchant-presentation.js';
import { FARMING_TOOL_REFORGES } from './farming-reforges.js';

/**
 * Rarity colours are not a design choice: they are the colour codes the game
 * itself writes into the item's lore footer, which `rarityFromLore` already
 * reads back. The hex values are Minecraft's fixed chat palette for those
 * codes. The wiki corroborates the two that changed historically, noting
 * MYTHIC as pink and SPECIAL as red.
 * @see https://hypixelskyblock.minecraft.wiki/w/Rarity
 */
export const RARITY_COLORS = Object.freeze({
  COMMON: Object.freeze({ code: 'f', hex: '#ffffff' }),
  UNCOMMON: Object.freeze({ code: 'a', hex: '#55ff55' }),
  RARE: Object.freeze({ code: '9', hex: '#5555ff' }),
  EPIC: Object.freeze({ code: '5', hex: '#aa00aa' }),
  LEGENDARY: Object.freeze({ code: '6', hex: '#ffaa00' }),
  MYTHIC: Object.freeze({ code: 'd', hex: '#ff55ff' }),
  DIVINE: Object.freeze({ code: 'b', hex: '#55ffff' }),
  SPECIAL: Object.freeze({ code: 'c', hex: '#ff5555' }),
  'VERY SPECIAL': Object.freeze({ code: 'c', hex: '#ff5555' }),
});

export function rarityColor(rarity) {
  const key = String(rarity || '').trim().toUpperCase();
  return RARITY_COLORS[key] || null;
}

/** CSS-facing token. An unknown or absent rarity gets the neutral class. */
export function rarityClass(rarity) {
  const key = String(rarity || '').trim().toUpperCase();
  return RARITY_COLORS[key] ? `rarity-${key.toLowerCase().replace(/\s+/g, '-')}` : 'rarity-unknown';
}

/**
 * Which enchantment family a slot belongs to. These are the buckets
 * `VERIFIED_FARMING_ENCHANT_META.appliesTo` already uses, so the two cannot
 * drift into naming the same thing differently.
 */
export const SLOT_KINDS = Object.freeze({
  helmet: 'armor',
  chestplate: 'armor',
  leggings: 'armor',
  boots: 'armor',
  equipment1: 'equipment',
  equipment2: 'equipment',
  equipment3: 'equipment',
  equipment4: 'equipment',
  pet: 'pet',
  petItem: 'pet',
  tool: 'farming-tool',
  vacuum: 'vacuum',
});

export function slotKind(slotId) {
  return SLOT_KINDS[slotId] || null;
}

/** Display names. Identifiers are storage; nobody should have to read them. */
export const ENCHANT_LABELS = Object.freeze({
  bug_blender: 'Bug Blender',
  crop_fever: 'Crop Fever',
  cultivating: 'Cultivating',
  dedication: 'Dedication',
  delicate: 'Delicate',
  feast: 'Feast',
  green_thumb: 'Green Thumb',
  harvesting: 'Harvesting',
  pesterminator: 'Pesterminator',
  replenish: 'Replenish',
  sunset: 'Sunset',
  thorns: 'Thorns',
  turbo_crop: 'Turbo-Crop',
});

export function enchantLabel(enchantId) {
  const id = canonicalEnchantId(enchantId);
  if (ENCHANT_LABELS[id]) return ENCHANT_LABELS[id];
  return String(enchantId || '')
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, character => character.toUpperCase())
    .trim();
}

/**
 * The stored level for one canonical enchantment, plus the key it is stored
 * under. The two differ for the crop-specific Turbo enchants, which all fold
 * into one `turbo_crop` row: writing an edit back to the canonical id instead
 * of `turbo_melon` would swap a real crop enchantment for a generic one.
 */
function storedEnchant(enchantments, id) {
  if (!enchantments || typeof enchantments !== 'object') return { level: 0, storageKey: id };
  let level = 0;
  let storageKey = id;
  for (const [key, value] of Object.entries(enchantments)) {
    if (canonicalEnchantId(key) !== id) continue;
    const candidate = Math.max(0, Number(value) || 0);
    if (candidate <= level) continue;
    level = candidate;
    storageKey = key;
  }
  return { level, storageKey };
}

/**
 * The rows one slot shows: only verified farming-relevant enchantments that can
 * sit on it.
 *
 * Synced items may also carry combat/defense/other enchantments. Those remain
 * untouched in item.enchantments; the mutation helpers below clone the complete
 * map. Hiding them here therefore removes UI clutter without deleting profile
 * data on a later farming-specific edit.
 */
export function enchantRowsFor(slotId, item) {
  const kind = slotKind(slotId);
  const enchantments = item?.enchantments && typeof item.enchantments === 'object' ? item.enchantments : {};
  const rows = [];

  for (const [id, meta] of Object.entries(VERIFIED_FARMING_ENCHANT_META)) {
    if (!kind || (!meta.appliesTo.includes(kind) && !meta.appliesTo.includes(slotId))) continue;
    const { level, storageKey } = storedEnchant(enchantments, id);
    rows.push({
      id,
      storageKey,
      label: enchantLabel(id),
      minLevel: meta.minLevel,
      maxLevel: meta.maxLevel,
      trueMaxLevel: meta.trueMaxLevel,
      kind: meta.kind,
      conflicts: meta.conflicts,
      level,
      active: level > 0,
      known: true,
      state: enchantPresentation(id, level).state,
      source: meta.source,
    });
  }

  rows.sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === 'ultimate' ? 1 : -1;
    return a.label.localeCompare(b.label);
  });

  return rows;
}

function clampLevel(level, maxLevel) {
  const value = Math.floor(Math.max(0, Number(level) || 0));
  if (!Number.isFinite(value)) return 0;
  return maxLevel ? Math.min(value, maxLevel) : value;
}

/**
 * Turning an enchantment on starts at its lowest obtainable tier, never at its
 * maximum.
 */
export function withEnchantToggled(item, enchantId, on) {
  const next = { ...(item?.enchantments || {}) };
  const id = String(enchantId);
  const canonical = canonicalEnchantId(id);
  const meta = VERIFIED_FARMING_ENCHANT_META[canonical] || null;
  if (!on) {
    delete next[id];
    // A canonical toggle also clears the crop-specific/ultimate-prefixed key it
    // stands for.
    for (const key of Object.keys(next)) {
      if (canonicalEnchantId(key) === canonical) delete next[key];
    }
    return next;
  }

  // Applying an incompatible enchantment replaces its peer instead of allowing
  // the editor to save a combination the game rejects.
  const incompatible = new Set(meta?.conflicts || []);
  for (const key of Object.keys(next)) {
    const existing = canonicalEnchantId(key);
    const existingMeta = VERIFIED_FARMING_ENCHANT_META[existing] || null;
    const existingIsUltimate = existingMeta?.kind === 'ultimate'
      || String(key).toLowerCase().startsWith('ultimate_');
    if (incompatible.has(existing) || (meta?.kind === 'ultimate' && existingIsUltimate && existing !== canonical)) {
      delete next[key];
    }
  }

  if (!(Number(next[id]) > 0)) next[id] = meta?.minLevel || 1;
  return next;
}

export function withEnchantLevel(item, enchantId, level, maxLevel = null) {
  const next = { ...(item?.enchantments || {}) };
  const id = String(enchantId);
  const meta = VERIFIED_FARMING_ENCHANT_META[canonicalEnchantId(id)] || null;
  const value = clampLevel(level, maxLevel);
  if (value <= 0) return withEnchantToggled(item, id, false);
  next[id] = Math.max(meta?.minLevel || 1, value);
  return next;
}

/** Gemstone slots take a quality and a type; both sets are closed. */
export const GEM_QUALITIES = Object.freeze(['ROUGH', 'FLAWED', 'FINE', 'FLAWLESS', 'PERFECT']);
export const GEM_TYPES = Object.freeze([
  'AMBER', 'AMETHYST', 'AQUAMARINE', 'CITRINE', 'JADE', 'JASPER',
  'ONYX', 'OPAL', 'PERIDOT', 'RUBY', 'SAPPHIRE', 'TOPAZ',
]);

export function gemOptionValues() {
  const values = [];
  for (const type of GEM_TYPES) for (const quality of GEM_QUALITIES) values.push(`${quality} ${type}`);
  return values;
}

export function parseGem(value) {
  const text = String(value || '').trim().toUpperCase();
  const match = text.match(/^(ROUGH|FLAWED|FINE|FLAWLESS|PERFECT)\s+([A-Z]+)$/);
  if (!match || !GEM_TYPES.includes(match[2])) return null;
  return { quality: match[1], type: match[2], value: `${match[1]} ${match[2]}` };
}

/** One line of plain summary for a collapsed slot card. */
export function itemSummary(slotId, item) {
  if (!item?.displayName) return 'Empty';
  const rows = enchantRowsFor(slotId, item).filter(row => row.active);
  const maxed = rows.filter(row => row.state === 'maxed' || row.state === 'special-maxed').length;
  return [
    item.reforge ? `${item.reforge} reforge` : null,
    rows.length ? `${rows.length} enchant${rows.length === 1 ? '' : 's'}${maxed ? ` (${maxed} maxed)` : ''}` : null,
    item.recombobulated ? 'recombobulated' : null,
    item.gems?.filter(Boolean).length
      ? `${item.gems.filter(Boolean).length} gem${item.gems.filter(Boolean).length === 1 ? '' : 's'}`
      : null,
  ].filter(Boolean).join(' · ') || 'No upgrades yet';
}

/**
 * The physical farming tool, described as an item rather than as a scatter of
 * progression cards.
 *
 * Each part points at a scored entry that already exists in `src/data.js`, so
 * this panel is a second *view* of the same stored value and never a second
 * copy of it. `assertToolPanelEntries` fails loudly at import time if an entry
 * is renamed out from under it, the way `enchant-presentation.js` guards its
 * own runtime ids.
 */
const FARMING_TOOL_REFORGE_ENTRY_IDS = Object.freeze(
  FARMING_TOOL_REFORGES.map(reforge => `tool-reforge-${reforge.id}-reforge`),
);

export const TOOL_PANEL = Object.freeze([
  // Tool tier is the highest-level branch after choosing the physical tool.
  // Reforge and every other modifier belong to the selected Mk. item, so the
  // tier/progression section must come first in the editor.
  Object.freeze({
    id: 'upgrades',
    title: 'Tool upgrades',
    note: 'Counters and tiers that live on the tool itself.',
    control: 'level',
    entries: Object.freeze([
      'tool-tool-base-counter-fortune',
      'tool-overclocker-3000',
      'tool-farming-for-dummies',
      'tool-mk-ii',
      'tool-mk-iii',
    ]),
  }),
  Object.freeze({
    id: 'reforge',
    title: 'Reforge',
    note: 'A tool carries exactly one reforge; choosing one replaces every other farming-tool reforge.',
    control: 'exclusive',
    entries: FARMING_TOOL_REFORGE_ENTRY_IDS,
  }),
  Object.freeze({
    id: 'enchantments',
    title: 'Enchantments',
    note: 'Flip the ones this tool has, then pick the level.',
    control: 'level',
    entries: Object.freeze([
      'tool-enchant-cultivating-x',
      'tool-enchant-dedication',
      'tool-enchant-harvesting-vi',
      'tool-enchant-turbo-crop',
    ]),
  }),
  Object.freeze({
    id: 'finish',
    title: 'Gemstone and rarity',
    note: 'A recombobulated tool gets more out of its reforge and its gemstone.',
    control: 'level',
    entries: Object.freeze([
      'tool-gem-perfect-peridot-on-farming-tool',
      'tool-recombobulator-effect-on-tool-stats',
    ]),
  }),
]);

export function toolPanelEntryIds() {
  return TOOL_PANEL.flatMap(group => [...group.entries]);
}

/** A level small enough to read as roman numerals gets a select; 0-50 does not. */
export function levelControlFor(max) {
  const value = Math.max(1, Math.floor(Number(max) || 1));
  if (value === 1) return 'lever';
  return value <= 10 ? 'select' : 'number';
}

export function assertToolPanelEntries(entryIds) {
  const known = new Set(entryIds);
  const missing = toolPanelEntryIds().filter(id => !known.has(id));
  if (missing.length) throw new Error(`Tool panel references unknown entries: ${missing.join(', ')}`);
  return true;
}
