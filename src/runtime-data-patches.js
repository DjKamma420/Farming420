import { UPGRADES } from './data.js';

/**
 * Small verified runtime additions and corrections that are kept separate from
 * the generated bulk data file. This avoids silently editing generated data
 * while still making newly verified mechanics available to the live planner.
 */
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

const rooted = UPGRADES.find(entry => entry.id === 'equipment-reforge-rooted-on-full-equipment');
if (rooted) Object.assign(rooted, {
  status: 'ACTIVE',
  source: 'https://hypixelskyblock.minecraft.wiki/w/Burrowing_Spores',
  lastVerified: '2026-09-16',
  notes: 'Rooted Farming Fortune scales with each equipment piece rarity: +6/+9/+12/+15/+18/+21 from Common through Mythic. Farming420 derives the current full-set value from the detected rarities instead of assuming +72.',
});
