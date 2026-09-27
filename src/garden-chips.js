export const GARDEN_CHIP_SOURCE = 'https://hypixelskyblock.minecraft.wiki/w/Garden_Chips';
export const GARDEN_CHIP_RELEASE_SOURCE = 'https://hypixel.net/threads/hypixel-skyblock-0-24-greenhouse.6073818/';
export const GARDEN_CHIP_LAST_VERIFIED = '2026-09-27';

export const GARDEN_CHIP_RARITIES = Object.freeze({
  RARE: Object.freeze({ id: 'RARE', label: 'Rare', maxLevel: 10, totalCopies: 1 }),
  EPIC: Object.freeze({ id: 'EPIC', label: 'Epic', maxLevel: 15, totalCopies: 5 }),
  LEGENDARY: Object.freeze({ id: 'LEGENDARY', label: 'Legendary', maxLevel: 20, totalCopies: 21 }),
});

export const GARDEN_CHIP_SOWDUST_COST_BY_TARGET_LEVEL = Object.freeze({
  1: 0,
  2: 100_000,
  3: 200_000,
  4: 300_000,
  5: 400_000,
  6: 550_000,
  7: 700_000,
  8: 850_000,
  9: 1_000_000,
  10: 1_150_000,
  11: 1_300_000,
  12: 1_450_000,
  13: 1_600_000,
  14: 1_750_000,
  15: 1_900_000,
  16: 2_050_000,
  17: 2_200_000,
  18: 2_350_000,
  19: 2_500_000,
  20: 2_650_000,
});

const CHIP_ROWS = [
  {
    id: 'vermin-vaporizer',
    upgradeId: 'garden-chip-vermin-vaporizer-chip',
    packAsset: 'vermin_vaporizer_chip',
    name: 'Vermin Vaporizer Chip',
    metric: 'Bonus Pest Chance',
    statAxis: 'bonusPestChance',
    modeScope: 'Pest Spawning',
    perLevel: { RARE: 3, EPIC: 4, LEGENDARY: 5 },
    unit: 'Bonus Pest Chance',
    acquisition: 'Rare drop from Dragonfly Pests (2%).',
    notes: 'Increases Bonus Pest Chance. The effect is spawn-phase only.',
  },
  {
    id: 'synthesis',
    upgradeId: 'garden-chip-synthesis-chip',
    packAsset: 'synthesis_chip',
    name: 'Synthesis Chip',
    metric: 'Mutation Analysis Copper',
    perLevel: { RARE: 1, EPIC: 1.5, LEGENDARY: 2 },
    unit: '% Copper',
    acquisition: 'Greenhouse Harvest Bounty (3%).',
    notes: 'Increases Copper gained from analyzing a mutation.',
  },
  {
    id: 'sowledge',
    upgradeId: 'garden-chip-sowledge-chip',
    packAsset: 'sowledge_chip',
    name: 'Sowledge Chip',
    metric: 'Farming Wisdom',
    perLevel: { RARE: 1, EPIC: 1.25, LEGENDARY: 1.5 },
    unit: 'Farming Wisdom',
    acquisition: 'SkyMart for 200 Copper.',
    notes: 'Increases Farming Wisdom. It does not directly add Farming Fortune.',
  },
  {
    id: 'mechamind',
    upgradeId: 'garden-chip-mechamind-chip',
    packAsset: 'mechamind_chip',
    name: 'Mechamind Chip',
    metric: 'Farming Tool XP',
    perLevel: { RARE: 1.5, EPIC: 2, LEGENDARY: 2.5 },
    unit: '% Farming Tool XP',
    acquisition: 'Anita for 1 Gold Medal.',
    notes: 'Increases Farming Tool XP gain.',
  },
  {
    id: 'hypercharge',
    upgradeId: 'garden-chip-hypercharge-chip-next-level',
    packAsset: 'hypercharge_chip',
    name: 'Hypercharge Chip',
    metric: 'Temporary Farming Fortune strength',
    perLevel: { RARE: 3, EPIC: 4, LEGENDARY: 5 },
    unit: '% stronger',
    acquisition: 'Visitor offers (2%).',
    notes: 'Strengthens only eligible temporary Farming Fortune buffs. It must never multiply total Farming Fortune.',
  },
  {
    id: 'evergreen',
    upgradeId: 'garden-chip-evergreen-chip',
    packAsset: 'evergreen_chip',
    name: 'Evergreen Chip',
    metric: 'Greenhouse Base Crops',
    modeScope: 'Greenhouse',
    perLevel: { RARE: 2, EPIC: 2.5, LEGENDARY: 3 },
    unit: '% base crops',
    acquisition: 'Greenhouse Harvest Bounty (3%).',
    notes: 'Increases base crops harvested from the Greenhouse.',
  },
  {
    id: 'overdrive',
    upgradeId: 'garden-chip-overdrive-chip',
    packAsset: 'overdrive_chip',
    name: 'Overdrive Chip',
    metric: 'Crop Yield',
    statAxis: 'cropFortune',
    modeScope: 'Jacob Contest',
    perLevel: { RARE: 5, EPIC: 6, LEGENDARY: 7 },
    unit: 'Crop Fortune',
    acquisition: 'Anita for 2 Gold Medals.',
    notes: 'Adds Crop Fortune for the active Jacob\'s Contest crop only. Hypercharge does not amplify Overdrive.',
  },
  {
    id: 'cropshot',
    upgradeId: 'garden-chip-cropshot-chip',
    packAsset: 'cropshot_chip',
    name: 'Cropshot Chip',
    metric: 'Crop Yield',
    statAxis: 'globalFortune',
    perLevel: { RARE: 3, EPIC: 4, LEGENDARY: 5 },
    unit: 'Farming Fortune',
    acquisition: 'SkyMart for 500 Copper; Jeff grants one free chip.',
    notes: 'Adds Farming Fortune. The per-level value depends on the chip rarity.',
  },
  {
    id: 'quickdraw',
    upgradeId: 'garden-chip-quickdraw-chip',
    packAsset: 'quickdraw_chip',
    name: 'Quickdraw Chip',
    metric: 'Visitor Speed',
    perLevel: { RARE: 1.5, EPIC: 2, LEGENDARY: 2.5 },
    unit: '% visitor appearance time reduction',
    acquisition: 'Visitor offers (2%).',
    notes: 'Reduces Visitor appearance time while harvesting crops.',
  },
  {
    id: 'rarefinder',
    upgradeId: 'garden-chip-rarefinder-chip',
    packAsset: 'rarefinder_chip',
    name: 'Rarefinder Chip',
    metric: 'Overbloom',
    statAxis: 'overbloom',
    perLevel: { RARE: 1.5, EPIC: 2, LEGENDARY: 2.5 },
    unit: 'Overbloom',
    acquisition: 'Rare farming drop (0.0005%).',
    notes: 'Adds Overbloom. The Legendary level-20 maximum is +50 after the July 22, 2026 reduction.',
  },
];

export const GARDEN_CHIPS = Object.freeze(CHIP_ROWS.map(row => Object.freeze({
  ...row,
  modeScope: row.modeScope || 'Any',
  cropScope: 'Any',
  source: GARDEN_CHIP_SOURCE,
  releaseSource: GARDEN_CHIP_RELEASE_SOURCE,
  lastVerified: GARDEN_CHIP_LAST_VERIFIED,
  perLevel: Object.freeze({ ...row.perLevel }),
})));

const CHIP_BY_ID = new Map(GARDEN_CHIPS.map(chip => [chip.id, chip]));
const CHIP_BY_UPGRADE_ID = new Map(GARDEN_CHIPS.map(chip => [chip.upgradeId, chip]));

export function gardenChipById(id) {
  return CHIP_BY_ID.get(String(id || '')) || CHIP_BY_UPGRADE_ID.get(String(id || '')) || null;
}

export function normalizeGardenChipRarity(value) {
  const rarity = String(value || '').trim().toUpperCase();
  return GARDEN_CHIP_RARITIES[rarity]?.id || null;
}

export function gardenChipMaxLevel(rarity) {
  const normalized = normalizeGardenChipRarity(rarity);
  return normalized ? GARDEN_CHIP_RARITIES[normalized].maxLevel : null;
}

export function gardenChipCopiesForRarity(rarity) {
  const normalized = normalizeGardenChipRarity(rarity);
  return normalized ? GARDEN_CHIP_RARITIES[normalized].totalCopies : null;
}

export function gardenChipEffectPerLevel(chipOrId, rarity) {
  const chip = typeof chipOrId === 'object' ? chipOrId : gardenChipById(chipOrId);
  const normalized = normalizeGardenChipRarity(rarity);
  if (!chip || !normalized) return null;
  const value = Number(chip.perLevel?.[normalized]);
  return Number.isFinite(value) ? value : null;
}

export function gardenChipEffectAtLevel(chipOrId, rarity, level) {
  const perLevel = gardenChipEffectPerLevel(chipOrId, rarity);
  const maxLevel = gardenChipMaxLevel(rarity);
  if (perLevel === null || maxLevel === null) return null;
  const safeLevel = Math.max(0, Math.min(maxLevel, Math.floor(Number(level) || 0)));
  return perLevel * safeLevel;
}

export function gardenChipSowdustSpent(level) {
  const target = Math.max(0, Math.min(20, Math.floor(Number(level) || 0)));
  let total = 0;
  for (let next = 2; next <= target; next += 1) {
    total += Number(GARDEN_CHIP_SOWDUST_COST_BY_TARGET_LEVEL[next] || 0);
  }
  return total;
}

export function gardenChipSowdustToLevel(currentLevel, targetLevel) {
  const from = Math.max(0, Math.min(20, Math.floor(Number(currentLevel) || 0)));
  const to = Math.max(from, Math.min(20, Math.floor(Number(targetLevel) || 0)));
  return Math.max(0, gardenChipSowdustSpent(to) - gardenChipSowdustSpent(from));
}

export function normalizeGardenChipProgress(progress, legacyLevel = 0) {
  const rarity = normalizeGardenChipRarity(progress?.rarity);
  const rarityMax = gardenChipMaxLevel(rarity);
  const rawLevel = progress?.level ?? legacyLevel;
  const hardMax = rarityMax ?? 20;
  const level = Math.max(0, Math.min(hardMax, Math.floor(Number(rawLevel) || 0)));
  return Object.freeze({
    rarity,
    level,
    source: String(progress?.source || (legacyLevel > 0 ? 'legacy' : 'manual')),
  });
}

export const GARDEN_CHIP_UPGRADES = Object.freeze(GARDEN_CHIPS.map(chip => Object.freeze({
  id: chip.upgradeId,
  gardenChipId: chip.id,
  packAsset: chip.packAsset,
  category: 'Garden Chip',
  section: 'chips',
  name: chip.name,
  metric: chip.metric,
  statAxis: chip.statAxis || null,
  modeScope: chip.modeScope,
  cropScope: chip.cropScope,
  status: 'ACTIVE',
  max: 20,
  stepGain: 0,
  manualDefault: null,
  rawMarginal: 0,
  hypercharge: false,
  notes: chip.notes,
  source: chip.source,
  lastVerified: chip.lastVerified,
  acquisition: chip.acquisition,
})));
