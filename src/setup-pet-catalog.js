const STANDARD_TO_LEGENDARY = Object.freeze(['COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY']);
const STANDARD_TO_MYTHIC = Object.freeze([...STANDARD_TO_LEGENDARY, 'MYTHIC']);

/**
 * Farming-relevant pets exposed by the Setups picker.
 *
 * This is deliberately a small, sourced gameplay catalogue rather than a free
 * text field. Pet species are not represented as distinct items in Hypixel's
 * item resource (inventory pets use the generic PET item id), so the normal
 * item catalogue cannot provide this selector.
 */
export const FARMING_PETS = Object.freeze([
  {
    id: 'BEE',
    name: 'Bee Pet',
    iconUrl: 'https://skyah.net/icons/pets/bee.webp',
    rarities: STANDARD_TO_MYTHIC,
    levelMin: 1,
    levelMax: 100,
    source: 'https://hypixelskyblock.minecraft.wiki/w/Bee_Pet',
    lastVerified: '2026-09-17',
  },
  {
    id: 'CHICKEN',
    name: 'Chicken Pet',
    iconUrl: 'https://skyah.net/icons/pets/chicken.webp',
    rarities: STANDARD_TO_LEGENDARY,
    levelMin: 1,
    levelMax: 100,
    source: 'https://hypixelskyblock.minecraft.wiki/w/Chicken_Pet',
    lastVerified: '2026-09-17',
  },
  {
    id: 'ELEPHANT',
    name: 'Elephant Pet',
    iconUrl: 'https://skyah.net/icons/pets/elephant.webp',
    rarities: STANDARD_TO_MYTHIC,
    levelMin: 1,
    levelMax: 100,
    source: 'https://hypixelskyblock.minecraft.wiki/w/Elephant_Pet',
    lastVerified: '2026-09-17',
  },
  {
    id: 'HEDGEHOG',
    name: 'Hedgehog Pet',
    iconUrl: 'https://skyah.net/icons/pets/hedgehog.webp',
    rarities: Object.freeze(['LEGENDARY']),
    levelMin: 1,
    levelMax: 100,
    source: 'https://hypixelskyblock.minecraft.wiki/w/Hedgehog_Pet',
    lastVerified: '2026-09-17',
  },
  {
    id: 'MOOSHROOM_COW',
    name: 'Mooshroom Cow Pet',
    iconUrl: 'https://skyah.net/icons/pets/mooshroom_cow.webp',
    rarities: STANDARD_TO_LEGENDARY,
    levelMin: 1,
    levelMax: 100,
    source: 'https://hypixelskyblock.minecraft.wiki/w/Mooshroom_Cow_Pet',
    lastVerified: '2026-09-17',
  },
  {
    id: 'MOSQUITO',
    name: 'Mosquito Pet',
    iconUrl: 'https://skyah.net/icons/pets/mosquito.webp',
    rarities: STANDARD_TO_LEGENDARY,
    levelMin: 1,
    levelMax: 100,
    source: 'https://hypixelskyblock.minecraft.wiki/w/Mosquito_Pet',
    lastVerified: '2026-09-23',
  },
  {
    id: 'ORCHID_MANTIS',
    name: 'Orchid Mantis Pet',
    iconUrl: 'https://skyah.net/icons/pets/orchid_mantis.webp',
    rarities: STANDARD_TO_LEGENDARY,
    levelMin: 1,
    levelMax: 100,
    source: 'https://hypixelskyblock.minecraft.wiki/w/Orchid_Mantis_Pet',
    lastVerified: '2026-09-17',
  },
  {
    id: 'PIG',
    name: 'Pig Pet',
    iconUrl: 'https://skyah.net/icons/pets/pig.webp',
    rarities: STANDARD_TO_LEGENDARY,
    levelMin: 1,
    levelMax: 100,
    source: 'https://hypixelskyblock.minecraft.wiki/w/Pig_Pet',
    lastVerified: '2026-09-17',
  },
  {
    id: 'RABBIT',
    name: 'Rabbit Pet',
    iconUrl: 'https://skyah.net/icons/pets/rabbit.webp',
    rarities: STANDARD_TO_MYTHIC,
    levelMin: 1,
    levelMax: 100,
    source: 'https://hypixelskyblock.minecraft.wiki/w/Rabbit_Pet',
    lastVerified: '2026-09-17',
  },
  {
    id: 'ROSE_DRAGON',
    name: 'Rose Dragon Pet',
    iconUrl: 'https://skyah.net/icons/pets/rose_dragon.webp',
    rarities: Object.freeze(['LEGENDARY']),
    levelMin: 1,
    levelMax: 200,
    source: 'https://hypixelskyblock.minecraft.wiki/w/Rose_Dragon_Pet',
    lastVerified: '2026-09-23',
  },
  {
    id: 'SLUG',
    name: 'Slug Pet',
    iconUrl: 'https://skyah.net/icons/pets/slug.webp',
    rarities: Object.freeze(['EPIC', 'LEGENDARY']),
    levelMin: 1,
    levelMax: 100,
    source: 'https://hypixelskyblock.minecraft.wiki/w/Slug_Pet',
    lastVerified: '2026-09-23',
  },
].map(row => Object.freeze(row)));

export function farmingPetById(id) {
  const normalized = String(id || '').trim().toUpperCase();
  return FARMING_PETS.find(pet => pet.id === normalized) || null;
}

export function petIconUrl(id) {
  return farmingPetById(id)?.iconUrl || null;
}

export function petLevelBounds(id) {
  const pet = farmingPetById(id);
  return pet ? Object.freeze({ min: pet.levelMin, max: pet.levelMax }) : null;
}

export function petRarities(id) {
  return farmingPetById(id)?.rarities || Object.freeze([]);
}

export function clampPetLevel(id, value) {
  const bounds = petLevelBounds(id);
  if (!bounds || value === null || value === undefined || value === '') return null;
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;
  return Math.max(bounds.min, Math.min(bounds.max, Math.floor(numeric)));
}
