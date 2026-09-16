import { UPGRADES } from './data.js';

/**
 * Small verified runtime additions and corrections that are kept separate from
 * the generated bulk data file. This avoids silently editing generated data
 * while still making newly verified mechanics available to the live planner.
 */
function patchEntry(id, patch) {
  const entry = UPGRADES.find(item => item.id === id);
  if (entry) Object.assign(entry, patch);
  return entry;
}

export const BLOSSOM_BASE_ENTRY = Object.freeze({
  id: 'equipment-blossom-set-base-stats',
  category: 'Equipment',
  section: 'gear',
  name: 'Blossom equipment base Farming Fortune',
  metric: 'Crop Yield',
  modeScope: 'Any',
  cropScope: 'Any',
  status: 'ACTIVE',
  max: 4,
  stepGain: 7,
  manualDefault: null,
  rawMarginal: 7,
  hypercharge: false,
  notes: 'Each equipped Blossom piece has +7 base Farming Fortune. Four pieces total +28. This is separate from the Florist visitor bonus.',
  source: 'https://hypixelskyblock.minecraft.wiki/w/Blossom_Set',
  lastVerified: '2026-09-16',
  workbookRank: null,
});

const existingBlossom = UPGRADES.find(entry => entry.id === BLOSSOM_BASE_ENTRY.id);
if (existingBlossom) Object.assign(existingBlossom, BLOSSOM_BASE_ENTRY);
else UPGRADES.push(BLOSSOM_BASE_ENTRY);

patchEntry('equipment-reforge-rooted-on-full-equipment', {
  name: 'Rooted on equipped equipment',
  status: 'ACTIVE',
  source: 'https://hypixelskyblock.minecraft.wiki/w/Burrowing_Spores',
  lastVerified: '2026-09-16',
  notes: 'Rooted is item-local. Farming Fortune scales with each equipped equipment piece rarity: +6/+9/+12/+15/+18/+21 from Common through Mythic. Farming420 sums the actual equipped pieces.',
});

patchEntry('equipment-enchant-green-thumb-v-on-equipment', {
  name: 'Green Thumb on equipped equipment',
  status: 'ACTIVE',
  max: 20,
  stepGain: 0,
  rawMarginal: 0,
  source: 'https://hypixel-skyblock.fandom.com/wiki/Enchantments/Equipment',
  lastVerified: '2026-09-16',
  notes: 'Each +1 Green Thumb level on one equipped piece grants +0.05 Farming Fortune per unique Garden visitor served. Farming420 tracks the sum of equipped levels (max 20).',
});

patchEntry('armor-helianthus-armor-base-stats', {
  name: 'Helianthus equipped-piece base Farming Fortune',
  status: 'ACTIVE',
  max: 4,
  stepGain: 0,
  rawMarginal: 0,
  source: 'https://hypixelskyblock.minecraft.wiki/w/Helianthus_Armor',
  lastVerified: '2026-09-16',
  notes: 'Item-local base stats: Helmet +35, Chestplate +40, Leggings +40, Boots +35 Farming Fortune. Farming420 sums only the Helianthus pieces actually equipped.',
});

patchEntry('armor-helianthus-feast-set-bonus', {
  name: 'Helianthus Feast tiered piece bonus',
  status: 'ACTIVE',
  max: 4,
  stepGain: 0,
  rawMarginal: 0,
  source: 'https://hypixelskyblock.minecraft.wiki/w/Helianthus_Armor',
  lastVerified: '2026-09-16',
  notes: 'Separate from item stats: 1 Helianthus piece +0, 2 pieces +25, 3 pieces +50, all 4 pieces +75 Farming Fortune.',
});

patchEntry('armor-reforge-mossy-on-full-armor', {
  name: 'Mossy on equipped armor pieces',
  status: 'ACTIVE',
  max: 4,
  stepGain: 0,
  rawMarginal: 0,
  source: 'https://hypixelskyblock.minecraft.wiki/w/Overgrown_Grass',
  lastVerified: '2026-09-16',
  notes: 'Mossy is per armor item, not a set effect. Each equipped Mossy piece grants +5/+10/+15/+20/+25/+30 Farming Fortune from Common through Mythic rarity.',
});

patchEntry('armor-enchant-pesterminator-vi-on-full-armor', {
  name: 'Pesterminator on equipped armor pieces',
  status: 'ACTIVE',
  max: 24,
  stepGain: 2,
  rawMarginal: 2,
  source: 'https://hypixel-skyblock.fandom.com/wiki/Enchantments/Armor',
  lastVerified: '2026-09-16',
  notes: 'Pesterminator is per armor item. Each enchant level on an equipped piece grants +2 Farming Fortune; VI therefore grants +12 on that piece. Farming420 sums all equipped levels.',
});

patchEntry('armor-gem-perfect-peridot-on-full-armor', {
  name: 'Perfect Peridot on equipped armor pieces',
  status: 'ACTIVE',
  max: 8,
  stepGain: 0,
  rawMarginal: 0,
  source: 'https://hypixel.net/threads/list-of-item-in-skyblock-major-update.6123513/',
  lastVerified: '2026-09-16',
  notes: 'Perfect Peridot is per gemstone slot. Each inserted gem grants +3/+4/+5/+6/+8/+10 Farming Fortune by the host armor rarity from Common through Mythic; equipped gems add independently.',
});

patchEntry('armor-enchant-sunset-v-day-overbloom', {
  name: 'Sunset on equipped armor pieces',
  metric: 'Overbloom / Visitor Cooldown',
  status: 'ACTIVE',
  max: 20,
  stepGain: 0,
  rawMarginal: 0,
  source: 'https://hypixel.net/threads/april-21-fossil-essence-shop-farming-toolkit-harvest-feast-changes.6083245/',
  lastVerified: '2026-09-16',
  notes: 'Sunset is per armor item and does not grant Farming Fortune. Each level gives +1 Overbloom during the day and -1% Visitor Cooldown during the night, up to V per piece.',
});
