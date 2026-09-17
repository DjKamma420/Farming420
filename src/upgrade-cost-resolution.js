import { UPGRADE_COSTS, costForUpgrade, missingCostReason } from './upgrade-costs.js';
import { stepCostForUpgrade, stepCostModelForUpgrade } from './upgrade-step-costs.js';

function acquisitionModeFor(record) {
  if (record?.unit === 'coins') return 'BUYABLE';
  if (record?.unit === 'time') return 'EARNED';
  return 'UNKNOWN';
}

function configuredLevel(store, itemId) {
  const raw = Number(store?.levels?.[itemId]);
  if (Number.isFinite(raw) && raw > 0) return Math.floor(raw);
  return store?.owned?.[itemId] ? 1 : 0;
}

function researchedRecordFor(store, itemId) {
  const id = String(itemId || '');
  const model = stepCostModelForUpgrade(id);
  if (model) {
    const currentLevel = configuredLevel(store, id);
    const targetLevel = currentLevel + 1;
    const record = stepCostForUpgrade(id, targetLevel);
    return {
      record,
      currentLevel,
      targetLevel,
      stepAware: true,
      missingReason: record
        ? null
        : `no researched next-step cost for target level/count ${targetLevel}`,
    };
  }
  return {
    record: UPGRADE_COSTS[id] || null,
    currentLevel: null,
    targetLevel: null,
    stepAware: false,
    missingReason: null,
  };
}

/**
 * What the *next* upgrade step costs, where that number came from, and which
 * acquisition route applies.
 *
 * A price the player recorded themselves wins over a researched market average.
 * For an EARNED row the same field is a direct coin/input cost only; the route
 * still needs active grind time before it has a total economic cost. Missing
 * time is therefore never converted to zero/free.
 *
 * Multi-level rows are resolved through `upgrade-step-costs.js`. This matters
 * for rows such as Dedication and Cultivating: their next level does not cost
 * the same as their final level, and Cultivating changes from BUYABLE at I to
 * EARNED progression at II-X.
 *
 * `store` is the progress bucket the upgrade belongs to (global profile, a
 * crop, a tool, or the Vacuum), so recorded values and current levels stay next
 * to the rest of that upgrade's state.
 */
export function resolveUpgradeCost(store, itemId) {
  const id = String(itemId || '');
  const selected = researchedRecordFor(store, id);
  const record = selected.record;
  const acquisitionMode = acquisitionModeFor(record);
  const recorded = Number(store?.costs?.[id] || 0);
  const stepMeta = selected.stepAware
    ? { currentLevel: selected.currentLevel, targetLevel: selected.targetLevel, stepAware: true }
    : { currentLevel: null, targetLevel: null, stepAware: false };

  if (recorded > 0 && record) {
    const recordedMode = acquisitionMode === 'EARNED' ? 'EARNED' : 'BUYABLE';
    return {
      coins: recorded,
      directCoinCost: recordedMode === 'EARNED' ? recorded : 0,
      origin: 'recorded',
      unit: recordedMode === 'EARNED' ? 'time' : 'coins',
      acquisitionMode: recordedMode,
      reason: null,
      ...stepMeta,
    };
  }

  if (record && typeof record.coins === 'number') {
    return {
      coins: record.coins,
      directCoinCost: 0,
      origin: 'research',
      unit: record.unit || 'coins',
      acquisitionMode,
      confidence: record.confidence || null,
      priceStatus: record.priceStatus || null,
      sources: record.sources || [],
      verifiedAt: record.verifiedAt || null,
      reason: null,
      ...stepMeta,
    };
  }

  if (record?.unit === 'time') {
    return {
      coins: 0,
      directCoinCost: 0,
      origin: 'earned',
      unit: 'time',
      acquisitionMode: 'EARNED',
      progressTarget: record.progressTarget ?? null,
      progressUnit: record.progressUnit ?? null,
      reason: record.reason || 'earned upgrade; active grind time is not entered yet',
      ...stepMeta,
    };
  }

  if (selected.stepAware) {
    return {
      coins: 0,
      directCoinCost: 0,
      origin: 'unknown',
      unit: null,
      acquisitionMode: 'UNKNOWN',
      reason: selected.missingReason,
      ...stepMeta,
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
      sources: researched.sources || [],
      verifiedAt: researched.verifiedAt || null,
      reason: null,
      ...stepMeta,
    };
  }

  const baseRecord = UPGRADE_COSTS[id] || null;
  if (acquisitionModeFor(baseRecord) === 'EARNED') {
    return {
      coins: 0,
      directCoinCost: 0,
      origin: 'earned',
      unit: 'time',
      acquisitionMode: 'EARNED',
      reason: baseRecord?.reason || 'earned upgrade; active grind time is not entered yet',
      ...stepMeta,
    };
  }

  return {
    coins: 0,
    directCoinCost: 0,
    origin: 'unknown',
    unit: baseRecord?.unit || null,
    acquisitionMode: 'UNKNOWN',
    reason: missingCostReason(id),
    ...stepMeta,
  };
}

/** One stable line saying where a cost came from, or why there is none. */
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
