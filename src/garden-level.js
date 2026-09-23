// Garden level thresholds are cumulative Garden XP values.
export const GARDEN_LEVEL_SOURCE = 'https://hypixelskyblock.minecraft.wiki/w/Garden_Level';
export const GARDEN_LEVEL_VERIFIED = '2026-09-23';

export const GARDEN_LEVEL_THRESHOLDS = Object.freeze([
  Object.freeze({ level: 1, totalXp: 0 }),
  Object.freeze({ level: 2, totalXp: 70 }),
  Object.freeze({ level: 3, totalXp: 140 }),
  Object.freeze({ level: 4, totalXp: 280 }),
  Object.freeze({ level: 5, totalXp: 520 }),
  Object.freeze({ level: 6, totalXp: 1120 }),
  Object.freeze({ level: 7, totalXp: 2620 }),
  Object.freeze({ level: 8, totalXp: 4620 }),
  Object.freeze({ level: 9, totalXp: 7120 }),
  Object.freeze({ level: 10, totalXp: 10120 }),
  Object.freeze({ level: 11, totalXp: 20120 }),
  Object.freeze({ level: 12, totalXp: 30120 }),
  Object.freeze({ level: 13, totalXp: 40120 }),
  Object.freeze({ level: 14, totalXp: 50120 }),
  Object.freeze({ level: 15, totalXp: 60120 }),
]);

export function gardenLevelFromExperience(value) {
  if (value === null || value === undefined || value === '') return null;
  const xp = Number(value);
  if (!Number.isFinite(xp) || xp < 0) return null;

  let level = 1;
  for (const threshold of GARDEN_LEVEL_THRESHOLDS) {
    if (xp < threshold.totalXp) break;
    level = threshold.level;
  }
  return level;
}
