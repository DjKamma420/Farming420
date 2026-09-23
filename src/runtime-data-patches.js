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

function upsertEntry(entry) {
  const existing = UPGRADES.find(item => item.id === entry.id);
  if (existing) Object.assign(existing, entry);
  else UPGRADES.push(entry);
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

upsertEntry(BLOSSOM_BASE_ENTRY);

patchEntry('equipment-reforge-rooted-on-full-equipment', {
  name: 'Rooted on equipped equipment',
  status: 'ACTIVE',
  max: 4,
  stepGain: 0,
  rawMarginal: 0,
  source: 'https://hypixelskyblock.minecraft.wiki/w/Burrowing_Spores',
  lastVerified: '2026-09-16',
  notes: 'Rooted is item-local. Farming Fortune scales with each equipped equipment piece rarity: +6/+9/+12/+15/+18/+21 from Common through Mythic. Farming420 sums the actual equipped pieces.',
});

patchEntry('equipment-reforge-thorny-on-full-mythic-equipment-ff', {
  name: 'Thorny on equipped equipment - Farming Fortune',
  status: 'ACTIVE',
  max: 4,
  stepGain: 0,
  rawMarginal: 0,
  source: 'https://hypixel.net/threads/list-of-item-in-skyblock-update-1-81.6151548/',
  lastVerified: '2026-09-18',
  notes: 'Thorny is item-local. Farming Fortune scales per equipped piece: +2/+4/+6/+8/+10/+12 from Common through Mythic. Farming420 sums the actual equipped Thorny pieces.',
});

patchEntry('equipment-reforge-thorny-on-full-mythic-equipment-overbloom', {
  name: 'Thorny on equipped equipment - base Overbloom',
  status: 'ACTIVE',
  max: 4,
  stepGain: 0,
  rawMarginal: 0,
  source: 'https://hypixel.net/threads/list-of-item-in-skyblock-update-1-81.6151548/',
  lastVerified: '2026-09-18',
  notes: 'Thorny base Overbloom scales per equipped piece: +0.25/+0.5/+0.75/+1/+1.25/+1.5 from Common through Mythic. The separate armor-Thorns bonus is modeled independently.',
});

export const THORNY_ARMOR_BONUS_ENTRY = Object.freeze({
  id: 'equipment-reforge-thorny-thorns-overbloom',
  category: 'Equipment Reforge',
  section: 'gear',
  name: 'Thorny armor-Thorns Overbloom bonus',
  metric: 'Rare Crops',
  modeScope: 'Any',
  cropScope: 'Any',
  status: 'ACTIVE',
  max: 1,
  stepGain: 0,
  manualDefault: null,
  rawMarginal: 0,
  hypercharge: false,
  notes: 'Each equipped Thorny equipment piece adds +0.1 Overbloom for every Thorns tier across worn armor. Farming420 derives the total from the active equipment and armor setup.',
  source: 'https://hypixel.net/threads/list-of-item-in-skyblock-update-1-81.6151548/',
  lastVerified: '2026-09-18',
  workbookRank: null,
});

upsertEntry(THORNY_ARMOR_BONUS_ENTRY);

patchEntry('equipment-enchant-green-thumb-v-on-equipment', {
  name: 'Green Thumb on equipment',
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

// Verified permanent account sources that were still marked VERIFY in the bulk
// data. These are safe to model directly because both the per-step value and
// cap are explicit.
patchEntry('consumable-rosewater-flask-permanent-stacks', {
  name: 'Filled Rosewater Flask permanent Farming Fortune',
  status: 'ACTIVE',
  max: 5,
  stepGain: 1,
  rawMarginal: 1,
  source: 'https://hypixel-skyblock.fandom.com/wiki/Rosewater_Flask',
  lastVerified: '2026-09-16',
  notes: 'Each Filled Rosewater Flask consumed grants +1 permanent Farming Fortune, up to 5 times (+5 total). The Greenhouse growth-stage effect is separate and is not counted as Fortune.',
});

patchEntry('greenhouse-mutation-analysis-rewards', {
  name: 'Mutation Analysis permanent Farming Fortune',
  status: 'ACTIVE',
  max: 1,
  stepGain: 30,
  rawMarginal: 30,
  source: 'https://hypixel-skyblock.fandom.com/wiki/Farming_Fortune',
  lastVerified: '2026-09-16',
  notes: 'Completing the Farming Fortune rewards from Jake\'s Crop Analyzer contributes +30 permanent Farming Fortune in total. Modeled as one completed source because the planner does not yet track individual analysis reward breakpoints.',
});

// The old generated aggregate said every selected crop could have an exportable
// +12 bonus. That is incorrect: Carrolyn only accepts a defined set. Move the
// aggregate out of visible progression and expose the supported crops directly.
patchEntry('permanent-crop-item-exportable-item-selected-crop', {
  section: 'legacy',
  status: 'VERIFY',
  stepGain: 0,
  rawMarginal: 0,
  notes: 'Legacy aggregate retained only for stored-state compatibility. Superseded by crop-specific Carrolyn entries; do not use for planner scoring.',
  lastVerified: '2026-09-16',
});

export const CARROLYN_CROP_FORTUNE_ENTRIES = Object.freeze([
  ['wheat', 'Wheat', 'Fine Flour'],
  ['carrot', 'Carrot', 'Exportable Carrots'],
  ['pumpkin', 'Pumpkin', 'Expired Pumpkin'],
  ['mushroom', 'Mushroom', 'Half-Eaten Mushroom'],
  ['cocoa-beans', 'Cocoa Beans', 'Supreme Chocolate Bar'],
  ['nether-wart', 'Nether Wart', 'Warty'],
  ['wild-rose', 'Wild Rose', 'Prickly Kiss'],
].map(([cropId, cropName, itemName]) => Object.freeze({
  id: `carrolyn-${cropId}-fortune`,
  category: 'Permanent Crop Item',
  section: 'crops',
  name: `Carrolyn: ${itemName}`,
  metric: 'Crop Yield',
  modeScope: 'Any',
  cropScope: cropName,
  status: 'ACTIVE',
  max: 1,
  stepGain: 12,
  manualDefault: null,
  rawMarginal: 12,
  hypercharge: false,
  notes: `Give Carrolyn 3,000 ${itemName} to permanently gain +12 ${cropName} Fortune.`,
  source: 'https://hypixel-skyblock.fandom.com/wiki/Carrolyn',
  lastVerified: '2026-09-16',
  workbookRank: null,
})));

for (const entry of CARROLYN_CROP_FORTUNE_ENTRIES) upsertEntry(entry);

export const LADYBUG_PRETTY_CLOTHES_ENTRY = Object.freeze({
  id: 'attribute-shard-ladybug-pretty-clothes',
  attribute: 'Pretty Clothes',
  category: 'Attribute Shard',
  section: 'shards',
  name: 'Ladybug Shard - Pretty Clothes',
  metric: 'Visitor Copper',
  modeScope: 'Any',
  cropScope: 'Any',
  status: 'ACTIVE',
  max: 10,
  stepGain: 1,
  manualDefault: null,
  rawMarginal: 1,
  hypercharge: false,
  notes: '+1% Copper from Garden Visitors per level, max +10%. This changes Visitor rewards directly and therefore belongs in the Visitor upgrade filter.',
  source: 'https://hypixel-skyblock.fandom.com/wiki/Attributes/List/Rare',
  lastVerified: '2026-09-23',
  workbookRank: null,
});

upsertEntry(LADYBUG_PRETTY_CLOTHES_ENTRY);

// Intentionally unresolved: current references disagree on the total Garden /
// Pest Bestiary Farming Fortune after later pest additions. Keep VERIFY until a
// current authoritative value is available instead of hard-coding 66 or 96.
patchEntry('garden-pest-garden-bestiary-ff', {
  status: 'VERIFY',
  stepGain: 0,
  rawMarginal: 0,
  lastVerified: '2026-09-16',
  notes: 'Current references still disagree on the post-update maximum (notably 66 vs 96 Farming Fortune). Keep this manual/VERIFY until a current authoritative total is confirmed.',
});
