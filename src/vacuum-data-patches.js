import { UPGRADES } from './data.js';

function upsert(entry) {
  const existing = UPGRADES.find(item => item.id === entry.id);
  if (existing) Object.assign(existing, entry);
  else UPGRADES.push(entry);
}

export const VACUUM_FARMING_FOR_DUMMIES = Object.freeze({
  id: 'vacuum-farming-for-dummies',
  category: 'Vacuum Upgrade',
  section: 'tools',
  name: 'Farming for Dummies',
  metric: 'Crop Yield',
  modeScope: 'Pest Vacuum Drops',
  cropScope: 'Any',
  status: 'ACTIVE',
  max: 5,
  stepGain: 1,
  manualDefault: null,
  rawMarginal: 1,
  hypercharge: false,
  notes: 'Item-local Vacuum modifier. Up to 5 books; each grants +1 Farming Fortune to that Vacuum.',
  source: 'https://hypixel-skyblock.fandom.com/wiki/Farming_for_Dummies',
  lastVerified: '2026-09-17',
  workbookRank: null,
});

export const VACUUM_BOOKWORM_BOOK = Object.freeze({
  id: 'vacuum-bookworms-favorite-book',
  category: 'Vacuum Upgrade',
  section: 'tools',
  name: "Bookworm's Favorite Book",
  metric: 'Vacuum Damage',
  modeScope: 'Pest Vacuum Drops',
  cropScope: 'Any',
  status: 'ACTIVE',
  max: 5,
  stepGain: 10,
  manualDefault: null,
  rawMarginal: 10,
  hypercharge: false,
  notes: 'Item-local Vacuum modifier. Up to 5 books; each grants +10 Vacuum Damage. It does not grant Farming Fortune.',
  source: 'https://wiki.hypixel.net/Earthworm',
  lastVerified: '2026-09-17',
  workbookRank: null,
});

export const VACUUM_PERIDOT_FORTUNE = Object.freeze({
  id: 'vacuum-peridot-gemstone-fortune',
  category: 'Vacuum Gemstone',
  section: 'tools',
  name: 'Vacuum Peridot gemstone Fortune',
  metric: 'Crop Yield',
  modeScope: 'Pest Vacuum Drops',
  cropScope: 'Any',
  status: 'ACTIVE',
  max: 20,
  stepGain: 1,
  manualDefault: null,
  rawMarginal: 1,
  hypercharge: false,
  notes: 'Derived from the actual filled Peridot sockets and current host rarity of the selected Vacuum. The UI writes the exact derived total; this is not a user-entered level.',
  source: 'https://hypixel-skyblock.fandom.com/wiki/Gemstone_Slot',
  lastVerified: '2026-09-17',
  workbookRank: null,
});

upsert(VACUUM_FARMING_FOR_DUMMIES);
upsert(VACUUM_BOOKWORM_BOOK);
upsert(VACUUM_PERIDOT_FORTUNE);
