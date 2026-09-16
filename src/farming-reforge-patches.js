import { UPGRADES } from './data.js';

const SOURCE_FEAST = 'https://hypixel.net/threads/march-31-harvest-feast-event.6080784/';
const SOURCE_TOOLKIT = 'https://hypixel.net/threads/april-21-fossil-essence-shop-farming-toolkit-harvest-feast-changes.6083245/';

const additions = [
  {
    id: 'tool-reforge-earthy-reforge',
    category: 'Tool Reforge',
    section: 'tools',
    name: 'Earthy reforge',
    metric: 'Sowdust Bonus',
    modeScope: 'Any',
    cropScope: 'Any',
    status: 'ACTIVE',
    max: 1,
    stepGain: 5,
    manualDefault: null,
    rawMarginal: 5,
    hypercharge: false,
    notes: 'Large Walnut / Earthy. Current special reforge bonus is +5% Sowdust. Farming Fortune also scales with item rarity and is intentionally not folded into this 5% value.',
    source: SOURCE_TOOLKIT,
    lastVerified: '2026-09-16',
    workbookRank: null,
  },
  {
    id: 'tool-reforge-deep-fried-reforge',
    category: 'Tool Reforge',
    section: 'tools',
    name: 'Deep Fried reforge',
    metric: 'Seasoning Chance',
    modeScope: 'Harvest Feast',
    cropScope: 'Any',
    status: 'ACTIVE',
    max: 1,
    stepGain: 25,
    manualDefault: null,
    rawMarginal: 25,
    hypercharge: false,
    notes: 'Hashbrown / Deep Fried. Feast-specialized reforge; +25% Seasoning chance is modeled here separately from Farming Fortune.',
    source: SOURCE_FEAST,
    lastVerified: '2026-09-16',
    workbookRank: null,
  },
  {
    id: 'tool-reforge-overpriced-reforge',
    category: 'Tool Reforge',
    section: 'tools',
    name: 'Overpriced reforge',
    metric: 'Overbloom',
    modeScope: 'Rare Crops / Greenhouse',
    cropScope: 'Any',
    status: 'ACTIVE',
    max: 1,
    stepGain: 7,
    manualDefault: null,
    rawMarginal: 7,
    hypercharge: false,
    notes: 'Overpriced Drink / Overpriced. Models +7 Overbloom separately from its Farming Fortune so Rare Crop value is not incorrectly treated as ordinary Fortune.',
    source: SOURCE_FEAST,
    lastVerified: '2026-09-16',
    workbookRank: null,
  },
];

const known = new Set(UPGRADES.map(entry => entry.id));
for (const entry of additions) {
  if (!known.has(entry.id)) UPGRADES.push(entry);
}
