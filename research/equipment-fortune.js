export const EQUIPMENT_FORTUNE_VERIFIED = '2026-09-16';

export const ROOTED_FORTUNE_BY_RARITY = Object.freeze({
  COMMON: 6,
  UNCOMMON: 9,
  RARE: 12,
  EPIC: 15,
  LEGENDARY: 18,
  MYTHIC: 21,
});

export const EQUIPMENT_FORTUNE_FACTS = Object.freeze([
  Object.freeze({
    id: 'rooted-reforge-rarity-scaling',
    source: 'https://hypixelskyblock.minecraft.wiki/w/Burrowing_Spores',
    lastVerified: EQUIPMENT_FORTUNE_VERIFIED,
    note: 'Rooted grants Farming Fortune by item rarity: 6/9/12/15/18/21 from Common through Mythic.',
  }),
  Object.freeze({
    id: 'blossom-base-per-piece',
    value: 7,
    source: 'https://hypixelskyblock.minecraft.wiki/w/Blossom_Set',
    lastVerified: EQUIPMENT_FORTUNE_VERIFIED,
    note: 'Each Blossom equipment piece has +7 base Farming Fortune; four pieces total +28.',
  }),
]);
