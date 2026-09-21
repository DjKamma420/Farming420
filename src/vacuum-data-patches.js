import { UPGRADES } from './data.js';

function upsert(entry) {
  const existing = UPGRADES.find(item => item.id === entry.id);
  if (existing) Object.assign(existing, entry);
  else UPGRADES.push(entry);
}

export const VACUUM_BUG_BLENDER = Object.freeze({
  id: 'vacuum-enchant-bug-blender',
  category: 'Vacuum Enchantment',
  section: 'tools',
  name: 'Bug Blender',
  metric: 'Crop Yield',
  modeScope: 'Pest Vacuum Drops',
  cropScope: 'Any',
  status: 'ACTIVE',
  max: 5,
  stepGain: 20,
  manualDefault: null,
  rawMarginal: 20,
  hypercharge: false,
  notes: 'Vacuum-only enchantment. +20 Farming Fortune while vacuuming Pests per level, up to +100 at Bug Blender V.',
  source: 'https://hypixelskyblock.minecraft.wiki/w/Bug_Blender',
  lastVerified: '2026-09-21',
  workbookRank: null,
});

export const VACUUM_FARMING_FOR_DUMMIES = Object.freeze({
  id: 'vacuum-farming-for-dummies',
  category: 'Vacuum Upgrade',
  section: 'tools',
  name: 'Farming for Dummies',
  metric: 'Crop Yield',
  modeScope: 'Pest Vacuum Drops',
  cropScope: 'Any',
  status: 'ACTIVE',
  max: 5,
  stepGain: 1,
  manualDefault: null,
  rawMarginal: 1,
  hypercharge: false,
  notes: 'Item-local Vacuum modifier. Up to 5 books; each grants +1 Farming Fortune to that Vacuum.',
  source: 'https://hypixel-skyblock.fandom.com/wiki/Farming_for_Dummies',
  lastVerified: '2026-09-17',
  workbookRank: null,
});

export const VACUUM_BOOKWORM_BOOK = Object.freeze({
  id: 'vacuum-bookworms-favorite-book',
  category: 'Vacuum Upgrade',
  section: 'tools',
  name: "Bookworm's Favorite Book",
  metric: 'Vacuum Damage',
  modeScope: 'Pest Vacuum Drops',
  cropScope: 'Any',
  status: 'ACTIVE',
  max: 5,
  stepGain: 20,
  manualDefault: null,
  rawMarginal: 20,
  hypercharge: false,
  notes: 'Item-local Vacuum modifier. Up to 5 books; each grants +20 Vacuum Damage, +100 at five. It does not grant Farming Fortune.',
  // 0.27 doubled this from +10 to +20 per application. The old value shipped
  // here with a `lastVerified` of the same day research/VACUUM_RESEARCH.md
  // recorded the correction, sourced to a `wiki.hypixel.net` page that has
  // been closed since July 2026 -- and to the Earthworm page, which is not
  // where this book is documented in the first place.
  source: 'https://hypixelskyblock.minecraft.wiki/w/Bookworm%27s_Favorite_Book',
  lastVerified: '2026-09-17',
  workbookRank: null,
});

upsert(VACUUM_BUG_BLENDER);
upsert(VACUUM_FARMING_FOR_DUMMIES);
upsert(VACUUM_BOOKWORM_BOOK);
