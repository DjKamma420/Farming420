import { UPGRADE_COSTS, costForUpgrade, missingCostReason } from './upgrade-costs.js';

function acquisitionModeFor(record) {
  if (record?.unit === 'coins') return 'BUYABLE';
  if (record?.unit === 'time') return 'EARNED';
  return 'UNKNOWN';
}

/**
 * What an upgrade costs, where that number came from, and which acquisition
 * route applies.
 *
 * A price the player recorded themselves wins over a researched market average.
 * For an EARNED row the same field is a direct coin/input cost only; the route
 * still needs active grind time before it has a total economic cost. Missing
 * time is therefore never converted to zero/free.
 *
 * `store` is the progress bucket the upgrade belongs to (global profile, a
 * crop, or a tool), so recorded values stay next to the rest of that upgrade's
 * state.
 */
export function resolveUpgradeCost(store, itemId) {
  const id = String(itemId || '');
  const record = UPGRADE_COSTS[id] || null;
  const acquisitionMode = acquisitionModeFor(record);
  const recorded = Number(store?.costs?.[id] || 0);

  if (recorded > 0) {
    return {
      coins: recorded,
      directCoinCost: acquisitionMode === 'EARNED' ? recorded : 0,
      origin: 'recorded',
      unit: record?.unit || 'coins',
      acquisitionMode,
      reason: null,
    };
  }

  const researched = costForUpgrade(id);
  if (researched) {
    return {
      coins: researched.coins,
      directCoinCost: 0,
      origin: 'research',
      unit: researched.unit || 'coins',
      acquisitionMode: acquisitionModeFor(researched),
      confidence: researched.confidence || null,
      priceStatus: researched.priceStatus || null,
      reason: null,
    };
  }

  if (acquisitionMode === 'EARNED') {
    return {
      coins: 0,
      directCoinCost: 0,
      origin: 'earned',
      unit: 'time',
      acquisitionMode: 'EARNED',
      reason: record?.reason || 'earned upgrade; active grind time is not entered yet',
    };
  }

  return {
    coins: 0,
    directCoinCost: 0,
    origin: 'unknown',
    unit: record?.unit || null,
    acquisitionMode: 'UNKNOWN',
    reason: missingCostReason(id),
  };
}

/** One line saying where a cost came from, or why there is none. */
export function costOriginNote(cost) {
  if (cost?.acquisitionMode === 'EARNED') {
    if (cost.origin === 'recorded') return 'EARNED — recorded direct coin cost; enter active grind time';
    return 'EARNED — enter active grind time';
  }
  if (cost?.origin === 'recorded') return 'your recorded price';
  if (cost?.origin === 'research') {
    if (cost.priceStatus === 'STALE_FALLBACK_SNAPSHOT') return 'research snapshot, stale';
    return cost.confidence ? `research, ${cost.confidence.toLowerCase()} confidence` : 'research snapshot';
  }
  return cost?.reason || 'no price recorded';
}
