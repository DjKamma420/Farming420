export const PLANNER_MODES = Object.freeze([
  {
    id: 'profit',
    label: 'Profit',
    description: 'Normal crop + RARE-CROP profit using the revenue-aware FF/Overbloom model.',
    kind: 'revenue',
  },
  {
    id: 'collection',
    label: 'Collection / Contest',
    description: 'Prioritizes crop-yield gains and contest-specific effects for the selected crop.',
    kind: 'relevance',
    match: item => item.metric === 'Crop Yield' || /contest|collection/i.test(`${item.modeScope} ${item.category} ${item.name} ${item.notes}`),
  },
  {
    id: 'xp',
    label: 'Farming XP',
    description: 'Prioritizes Farming XP, Wisdom and tool-XP progression instead of coin value.',
    kind: 'relevance',
    match: item => /xp|wisdom/i.test(`${item.metric} ${item.modeScope} ${item.category} ${item.name} ${item.notes}`),
  },
  {
    id: 'rare-crops',
    label: 'Feast RARE CROPS',
    description: 'Prioritizes Overbloom, RARE-CROP chance and Feast effects. No normal-profit FF conversion is invented.',
    kind: 'relevance',
    match: item => /overbloom|rare crop|rare crops|harvest feast/i.test(`${item.metric} ${item.modeScope} ${item.category} ${item.name} ${item.notes}`),
  },
  {
    id: 'seasoning',
    label: 'Seasoning',
    description: 'Harvest Feast Seasoning and milestone progression only.',
    kind: 'relevance',
    match: item => /seasoning|feast milestone/i.test(`${item.metric} ${item.modeScope} ${item.category} ${item.name} ${item.notes}`),
  },
  {
    id: 'sowdust',
    label: 'Sowdust',
    description: 'Greenhouse/Sowdust progression and effects only.',
    kind: 'relevance',
    match: item => /sowdust|greenhouse/i.test(`${item.metric} ${item.modeScope} ${item.category} ${item.name} ${item.notes}`),
  },
  {
    id: 'pests',
    label: 'Pest Farming',
    description: 'Pest spawn, Pest Fortune, vacuum drops and pest-specific Farming Fortune.',
    kind: 'relevance',
    match: item => /pest|vacuum/i.test(`${item.metric} ${item.modeScope} ${item.category} ${item.name} ${item.notes}`),
  },
]);

export function plannerModeById(id) {
  return PLANNER_MODES.find(mode => mode.id === id) || PLANNER_MODES[0];
}

export function relevanceScore(item, gain = 0) {
  const text = `${item.metric} ${item.modeScope} ${item.category} ${item.name} ${item.notes}`.toLowerCase();
  let score = 0;
  if (gain > 0) score += Math.min(1000, Number(gain));
  if (item.status === 'ACTIVE') score += 100;
  if (item.cropScope !== 'Any') score += 20;
  if (item.modeScope !== 'Any') score += 20;
  if (/selected crop|crop-specific|crop fortune/.test(text)) score += 10;
  return score;
}
