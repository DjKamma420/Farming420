export const GEAR_FORTUNE_VERIFIED = '2026-09-16';

export const GEAR_FORTUNE_FACTS = Object.freeze([
  Object.freeze({
    id: 'armor-helianthus-armor-base-stats',
    source: 'https://hypixelskyblock.minecraft.wiki/w/Helianthus_Armor',
    lastVerified: GEAR_FORTUNE_VERIFIED,
    note: 'Helianthus base Farming Fortune is item-local: Helmet +35, Chestplate +40, Leggings +40, Boots +35. Wearing fewer than four pieces still grants the base stats of the pieces actually worn.',
  }),
  Object.freeze({
    id: 'armor-helianthus-feast-set-bonus',
    source: 'https://hypixelskyblock.minecraft.wiki/w/Helianthus_Armor',
    lastVerified: GEAR_FORTUNE_VERIFIED,
    note: 'Feast is a separate tiered piece-count bonus: 1 piece +0, 2 pieces +25, 3 pieces +50, 4 pieces +75 Farming Fortune. The app must not fold item base stats into this bonus.',
  }),
  Object.freeze({
    id: 'armor-reforge-mossy-on-full-armor',
    source: 'https://hypixelskyblock.minecraft.wiki/w/Overgrown_Grass',
    lastVerified: GEAR_FORTUNE_VERIFIED,
    note: 'Mossy is applied to one armor item at a time and grants +5/+10/+15/+20/+25/+30 Farming Fortune from Common through Mythic rarity. Values from equipped pieces add independently.',
  }),
  Object.freeze({
    id: 'armor-enchant-pesterminator-vi-on-full-armor',
    source: 'https://hypixel-skyblock.fandom.com/wiki/Enchantments/Armor',
    lastVerified: GEAR_FORTUNE_VERIFIED,
    note: 'Pesterminator is item-local and grants +2 Farming Fortune per enchant level on each enchanted armor piece, up to VI (+12) per piece. Four VI pieces total +48, but partial/mixed levels still contribute individually.',
  }),
  Object.freeze({
    id: 'armor-enchant-sunset-v-day-overbloom',
    source: 'https://hypixel.net/threads/april-21-fossil-essence-shop-farming-toolkit-harvest-feast-changes.6083245/',
    lastVerified: GEAR_FORTUNE_VERIFIED,
    note: 'Sunset is item-local and is not Farming Fortune: each level grants +1 Overbloom during the day and -1% Visitor Cooldown during the night, up to V per armor piece.',
  }),
  Object.freeze({
    id: 'armor-gem-perfect-peridot-on-full-armor',
    source: 'https://hypixel.net/threads/list-of-item-in-skyblock-major-update.6123513/',
    lastVerified: GEAR_FORTUNE_VERIFIED,
    note: 'Perfect Peridot is a gemstone-slot stat, not a set effect. Each inserted Perfect Peridot grants +3/+4/+5/+6/+8/+10 Farming Fortune by the host item rarity from Common through Mythic. Multiple equipped gems add independently.',
  }),
  Object.freeze({
    id: 'equipment-blossom-set-base-stats',
    stepGain: 7,
    max: 4,
    source: 'https://hypixelskyblock.minecraft.wiki/w/Blossom_Set',
    lastVerified: GEAR_FORTUNE_VERIFIED,
    note: 'Each Blossom equipment piece has +7 base Farming Fortune. Four pieces total +28 before Florist, reforges or enchants.',
  }),
  Object.freeze({
    id: 'equipment-blossom-set-visitor-bonus',
    stepGain: 90,
    source: 'https://hypixelskyblock.minecraft.wiki/w/Blossom_Set',
    lastVerified: GEAR_FORTUNE_VERIFIED,
    note: 'At 2,500 visitors, Florist grants +22.5 Farming Fortune independently on each of four pieces, totaling +90.',
  }),
]);

export const VERIFIED_GEAR_MODEL_GAPS = Object.freeze([]);
