export const EQUIPMENT_FORTUNE_VERIFIED = '2026-09-18';

export const ROOTED_FORTUNE_BY_RARITY = Object.freeze({
  COMMON: 6,
  UNCOMMON: 9,
  RARE: 12,
  EPIC: 15,
  LEGENDARY: 18,
  MYTHIC: 21,
});

export const THORNY_FORTUNE_BY_RARITY = Object.freeze({
  COMMON: 2,
  UNCOMMON: 4,
  RARE: 6,
  EPIC: 8,
  LEGENDARY: 10,
  MYTHIC: 12,
});

export const THORNY_OVERBLOOM_BY_RARITY = Object.freeze({
  COMMON: 0.25,
  UNCOMMON: 0.5,
  RARE: 0.75,
  EPIC: 1,
  LEGENDARY: 1.25,
  MYTHIC: 1.5,
});

export const THORNY_OVERBLOOM_PER_ARMOR_THORNS_TIER = 0.1;
export const GREEN_THUMB_FORTUNE_PER_LEVEL_PER_UNIQUE_VISITOR = 0.05;

export const EQUIPMENT_FORTUNE_FACTS = Object.freeze([
  Object.freeze({
    id: 'rooted-reforge-rarity-scaling',
    source: 'https://hypixelskyblock.minecraft.wiki/w/Burrowing_Spores',
    lastVerified: EQUIPMENT_FORTUNE_VERIFIED,
    note: 'Rooted grants Farming Fortune by item rarity: 6/9/12/15/18/21 from Common through Mythic.',
  }),
  Object.freeze({
    id: 'thorny-reforge-rarity-scaling',
    source: 'https://hypixel.net/threads/list-of-item-in-skyblock-update-1-81.6151548/',
    lastVerified: EQUIPMENT_FORTUNE_VERIFIED,
    note: 'Thorny grants 2/4/6/8/10/12 Farming Fortune and 0.25/0.5/0.75/1/1.25/1.5 base Overbloom from Common through Mythic.',
  }),
  Object.freeze({
    id: 'thorny-armor-thorns-scaling',
    value: THORNY_OVERBLOOM_PER_ARMOR_THORNS_TIER,
    source: 'https://hypixel.net/threads/list-of-item-in-skyblock-update-1-81.6151548/',
    lastVerified: EQUIPMENT_FORTUNE_VERIFIED,
    note: 'Each equipped Thorny equipment piece adds +0.1 Overbloom per Thorns tier across the worn armor. The bonus is evaluated once per Thorny equipment piece.',
  }),
  Object.freeze({
    id: 'blossom-base-per-piece',
    value: 7,
    source: 'https://hypixelskyblock.minecraft.wiki/w/Blossom_Set',
    lastVerified: EQUIPMENT_FORTUNE_VERIFIED,
    note: 'Each Blossom equipment piece has +7 base Farming Fortune; four pieces total +28.',
  }),
  Object.freeze({
    id: 'green-thumb-unique-visitor-scaling',
    value: GREEN_THUMB_FORTUNE_PER_LEVEL_PER_UNIQUE_VISITOR,
    source: 'https://hypixel-skyblock.fandom.com/wiki/Enchantments/Equipment',
    lastVerified: EQUIPMENT_FORTUNE_VERIFIED,
    note: 'Green Thumb grants +0.05 Farming Fortune per enchantment level per unique Garden visitor served on each equipped piece. Farming420 multiplies the current unique-visitor count by the sum of Green Thumb levels across equipped equipment.',
  }),
]);
