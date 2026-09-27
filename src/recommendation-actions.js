export const RECOMMENDATION_ACTION_TYPE = Object.freeze({
  PURCHASE: 'purchase',
  GRIND: 'grind',
  UNLOCK: 'unlock',
  UPGRADE: 'upgrade',
  WAIT: 'wait',
  CONTEST: 'contest',
  CRAFT: 'craft',
});

const PURCHASE_CATEGORIES = new Set([
  'Accessory',
  'Armor',
  'Armor Enchant',
  'Armor Gem',
  'Armor Reforge',
  'Attribute Shard',
  'Buff',
  'Consumable',
  'Equipment',
  'Equipment Enchant',
  'Equipment Reforge',
  'Harvest Feast',
  'Mixin',
  'Permanent Crop Item',
  'Pet',
  'Pet Item',
  'Temporary',
  'Temporary Buff',
  'Tool',
  'Tool Enchant',
  'Tool Gem',
  'Tool Reforge',
  'Vacuum Reforge',
]);

const UNLOCK_CATEGORIES = new Set([
  'Tool Level Gate',
]);

const CRAFT_CATEGORIES = new Set([
  'Tool Tier',
]);

function finiteOrNull(value) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function actionTypeFor(row) {
  const item = row?.item || {};
  const category = String(item.category || '');

  if (row?.acquisitionMode === 'EARNED') return RECOMMENDATION_ACTION_TYPE.GRIND;
  if (CRAFT_CATEGORIES.has(category)) return RECOMMENDATION_ACTION_TYPE.CRAFT;
  if (UNLOCK_CATEGORIES.has(category) || /\bunlock(?:ed)?\b/i.test(String(item.name || ''))) {
    return RECOMMENDATION_ACTION_TYPE.UNLOCK;
  }
  if (category === 'Jacob') return RECOMMENDATION_ACTION_TYPE.CONTEST;
  if (row?.acquisitionMode === 'BUYABLE' && PURCHASE_CATEGORIES.has(category)) {
    return RECOMMENDATION_ACTION_TYPE.PURCHASE;
  }
  return RECOMMENDATION_ACTION_TYPE.UPGRADE;
}

function actionIdFor(row, index = 0) {
  const itemId = String(row?.item?.id || 'unknown');
  const mode = String(row?.activityMode || 'any');
  const setup = String(row?.setupId || row?.setupLabel || 'default')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'default';
  return `action:${itemId}:${mode}:${setup}:${index}`;
}

function sourceList(item) {
  const values = [item?.source, ...(Array.isArray(item?.sources) ? item.sources : [])]
    .filter(Boolean)
    .map(String);
  return Object.freeze([...new Set(values)]);
}

function actionCost(row) {
  if (row?.acquisitionMode === 'BUYABLE') {
    return row?.costKnown === true ? finiteOrNull(row.cost) : null;
  }
  if (row?.acquisitionMode === 'EARNED') {
    return finiteOrNull(row?.directCoinCost);
  }
  return null;
}

function actionState(row, key) {
  const costSource = row?.costSource || {};
  const level = finiteOrNull(costSource[key]);
  return Object.freeze({
    level,
    known: level !== null,
  });
}

/**
 * Convert an already-evaluated planner row into the product-spec action shape.
 *
 * This layer intentionally does not invent prerequisites, resale value,
 * recurring cost, passive wait time or unlock chains. Those fields stay null
 * or explicitly unmodelled until their dedicated models exist.
 */
export function recommendationActionFromRow(row, index = 0) {
  if (!row?.item?.id) throw new TypeError('recommendation action requires an evaluated row with item.id');

  const activeHours = finiteOrNull(row.activeGrindHours);
  const profitDelta = finiteOrNull(row.marginalCoinsHour);
  const status = String(row.item.status || 'VERIFY');

  return Object.freeze({
    id: actionIdFor(row, index),
    type: actionTypeFor(row),
    label: String(row.item.name || row.item.id),
    appliesTo: Object.freeze({
      activityMode: row.activityMode || null,
      cropScope: row.item.cropScope || null,
      section: row.item.section || null,
      setupId: row.setupId || null,
      setupLabel: row.setupLabel || null,
    }),
    prerequisites: null,
    prerequisitesModeled: false,
    currentState: actionState(row, 'currentLevel'),
    targetState: actionState(row, 'targetLevel'),
    directCost: actionCost(row),
    resaleDelta: null,
    recurringCost: null,
    activeTimeSeconds: activeHours === null ? null : activeHours * 3600,
    passiveTimeSeconds: null,
    statDelta: Object.freeze({
      gain: finiteOrNull(row.gain),
      modeled: row.modeled || null,
      farmingFortune: finiteOrNull(row.deltaFortune),
      overbloom: finiteOrNull(row.deltaOverbloom),
    }),
    profitDeltaPerHour: profitDelta,
    unlocks: null,
    unlocksModeled: false,
    confidence: status === 'ACTIVE' ? 'verified-mechanic' : 'needs-verification',
    sources: sourceList(row.item),
    lastVerified: row.item.lastVerified || null,
    sourceUpgrade: row.item,
    evaluation: row,
  });
}

export function generateRecommendationActions(rows) {
  return Object.freeze((Array.isArray(rows) ? rows : [])
    .map((row, index) => recommendationActionFromRow(row, index)));
}
