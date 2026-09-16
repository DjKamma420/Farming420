import { EXCLUSIVE_ENTRY_GROUPS } from './exclusivity.js';

const TOOL_ENTRY = Object.freeze({
  dummies: 'tool-farming-for-dummies',
  cultivating: 'tool-enchant-cultivating-x',
  dedication: 'tool-enchant-dedication',
  harvesting: 'tool-enchant-harvesting-vi',
  turbo: 'tool-enchant-turbo-crop',
  blessed: 'tool-reforge-blessed-reforge',
  bountiful: 'tool-reforge-bountiful-reforge',
  perfectPeridot: 'tool-gem-perfect-peridot-on-farming-tool',
});

const CROP_TURBO_IDS = Object.freeze({
  wheat: 'turbo_wheat',
  carrot: 'turbo_carrot',
  potato: 'turbo_potato',
  pumpkin: 'turbo_pumpkin',
  melon: 'turbo_melon',
  mushroom: 'turbo_mushrooms',
  cactus: 'turbo_cactus',
  'sugar-cane': 'turbo_cane',
  'cocoa-beans': 'turbo_cocoa',
  'nether-wart': 'turbo_warts',
});

function cloneBucket(bucket = {}) {
  return {
    ...bucket,
    levels: { ...(bucket.levels || {}) },
    owned: { ...(bucket.owned || {}) },
    costs: { ...(bucket.costs || {}) },
    manualGain: { ...(bucket.manualGain || {}) },
  };
}

function clampLevel(value, max) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return null;
  return Math.min(max, Math.floor(numeric));
}

function setLevel(bucket, id, value, max, applied) {
  const level = clampLevel(value, max);
  if (level === null) return;
  bucket.levels[id] = level;
  if (level > 0) bucket.owned[id] = true;
  applied.push({ id, level });
}

function setOwned(bucket, id, applied) {
  bucket.owned[id] = true;
  bucket.levels[id] = Math.max(1, Number(bucket.levels[id] || 0));
  applied.push({ id, level: 1 });
}

function applyReforge(bucket, reforge, applied) {
  const normalized = String(reforge || '').trim().toLowerCase();
  const id = normalized === 'blessed'
    ? TOOL_ENTRY.blessed
    : normalized === 'bountiful'
      ? TOOL_ENTRY.bountiful
      : null;
  if (!id) return;

  const group = EXCLUSIVE_ENTRY_GROUPS.find(entry => entry.id === 'farming-tool-reforge');
  for (const member of group?.members || []) {
    if (member === id) continue;
    delete bucket.owned[member];
    delete bucket.levels[member];
  }
  setOwned(bucket, id, applied);
}

/**
 * Applies only tooltip facts that have an unambiguous destination in the
 * existing crop-tool progress model. Anything uncertain stays untouched.
 */
export function applyToolScanToProgress(bucket, scan, cropId) {
  const next = cloneBucket(bucket);
  const applied = [];
  const warnings = [];
  const enchants = scan?.enchantments || {};

  setLevel(next, TOOL_ENTRY.dummies, scan?.farmingForDummies, 5, applied);
  setLevel(next, TOOL_ENTRY.cultivating, enchants.cultivating, 10, applied);
  setLevel(next, TOOL_ENTRY.dedication, enchants.dedication, 4, applied);
  setLevel(next, TOOL_ENTRY.harvesting, enchants.harvesting, 6, applied);

  const expectedTurbo = CROP_TURBO_IDS[cropId] || null;
  const turboEntries = Object.entries(enchants).filter(([id]) => id.startsWith('turbo_'));
  if (expectedTurbo && enchants[expectedTurbo]) {
    setLevel(next, TOOL_ENTRY.turbo, enchants[expectedTurbo], 7, applied);
  } else if (turboEntries.length) {
    warnings.push(`Turbo enchant did not match the selected crop and was not applied.`);
  }

  applyReforge(next, scan?.reforge, applied);

  if ((scan?.gems || []).some(gem => String(gem).toUpperCase() === 'PERFECT PERIDOT')) {
    setOwned(next, TOOL_ENTRY.perfectPeridot, applied);
  }

  return { bucket: next, applied, warnings };
}

export { TOOL_ENTRY, CROP_TURBO_IDS };
