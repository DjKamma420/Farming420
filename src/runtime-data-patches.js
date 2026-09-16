import { UPGRADES } from './data.js';

/**
 * Small verified runtime additions that are kept separate from the generated
 * bulk data file. This avoids silently editing generated data while still
 * making newly verified mechanics available to the live planner immediately.
 */
export const BLOSSOM_BASE_ENTRY = Object.freeze({
  id: 'equipment-blossom-set-base-stats',
  category: 'Equipment',
  section: 'gear',
  name: 'Blossom set base Farming Fortune',
  metric: 'Crop Yield',
  modeScope: 'Any',
  cropScope: 'Any',
  status: 'ACTIVE',
  max: 1,
  stepGain: 28,
  manualDefault: null,
  rawMarginal: 28,
  hypercharge: false,
  notes: 'Each of the four Blossom equipment pieces has +7 base Farming Fortune, for +28 total. This is separate from the Florist visitor bonus.',
  source: 'https://hypixelskyblock.minecraft.wiki/w/Blossom_Set',
  lastVerified: '2026-09-16',
  workbookRank: null,
});

if (!UPGRADES.some(entry => entry.id === BLOSSOM_BASE_ENTRY.id)) {
  UPGRADES.push(BLOSSOM_BASE_ENTRY);
}
