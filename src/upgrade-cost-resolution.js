import { UPGRADE_COSTS, missingCostReason } from './upgrade-costs.js';
import { marketAverageTimestampLabel } from './market-average-prices.js';
import { stepCostForUpgrade, stepCostModelForUpgrade } from './upgrade-step-costs.js';
import {
  marketRoutesForUpgrade,
  resolveUpgradeMarketAverage,
  stepMarketRoutesForUpgrade,
} from './upgrade-market-routes.js';

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
  const currentLevel = configuredLevel(store, id);
  const targetLevel = currentLevel + 1;
  if (model) {
    const record = stepCostForUpgrade(id, targetLevel);
    return {
      record,
      currentLevel,
      targetLevel,
      stepAware: true,
      missingReason: record
        ? null
        : `no researched next-step route for target level/count ${targetLevel}`,
    };
  }

  // Some systems (notably Attribute Shards) have exact market-quantity steps
  // even though their costs do not live in the generated research snapshot.
  // Treat those explicit routes as step-aware so "next cost" buys the number
  // of shards needed for the next level, not one shard.
  if (stepMarketRoutesForUpgrade(id, targetLevel)) {
    return {
      record: { unit: 'coins' },
      currentLevel,
      targetLevel,
      stepAware: true,
      missingReason: null,
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
 * Resolve the next upgrade step without accepting a player-entered coin price.
 *
 * BUYABLE rows use only a rolling 90-day market route. Old `store.costs`
 * values are intentionally ignored so imported backups cannot override the
 * automatic price model. Those legacy values stay in storage for backup/data
 * preservation, but they are no longer an input to recommendations.
 *
 * EARNED rows remain time/progression routes. Zero is reserved for a genuine
 * zero-coin route such as a second stat row covered by the same purchase;
 * missing market history is UNKNOWN, never free.
 */
export function resolveUpgradeCost(store, itemId) {
  const id = String(itemId || '');
  const selected = researchedRecordFor(store, id);
  const record = selected.record;
  const acquisitionMode = acquisitionModeFor(record);
  const stepMeta = selected.stepAware
    ? { currentLevel: selected.currentLevel, targetLevel: selected.targetLevel, stepAware: true }
    : { currentLevel: null, targetLevel: null, stepAware: false };

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

  if (record?.includedIn && Number(record.coins) === 0) {
    return {
      coins: 0,
      directCoinCost: 0,
      origin: 'included',
      unit: 'coins',
      acquisitionMode: 'BUYABLE',
      includedIn: record.includedIn,
      reason: record.reason || 'cost is included in another purchase',
      ...stepMeta,
    };
  }

  const routes = marketRoutesForUpgrade(id, selected.targetLevel);
  if (routes) {
    const market = resolveUpgradeMarketAverage(id, selected.targetLevel);
    if (market?.complete) {
      return {
        coins: market.coins,
        directCoinCost: 0,
        origin: 'market-average',
        unit: 'coins',
        acquisitionMode: 'BUYABLE',
        marketLabel: market.marketLabel,
        source: market.source,
        windowDays: market.windowDays,
        computedAtMs: market.computedAtMs ?? null,
        quotes: market.quotes,
        reason: null,
        ...stepMeta,
      };
    }
    return {
      coins: 0,
      directCoinCost: 0,
      origin: 'unknown',
      unit: 'coins',
      acquisitionMode: 'UNKNOWN',
      reason: market?.reason || '90-day market average is unavailable for this acquisition route',
      ...stepMeta,
    };
  }

  if (selected.stepAware && !record) {
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

  if (record && typeof record.coins === 'number' && record.coins > 0) {
    return {
      coins: 0,
      directCoinCost: 0,
      origin: 'unknown',
      unit: 'coins',
      acquisitionMode: 'UNKNOWN',
      reason: 'this upgrade has no verified rolling 90-day market route yet',
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
  if (cost?.acquisitionMode === 'EARNED') return 'EARNED — enter active grind time';
  if (cost?.origin === 'market-average') {
    const label = cost.marketLabel || '90-day market average';
    return cost.computedAtMs != null
      ? `${label} · ${marketAverageTimestampLabel({ computedAtMs: cost.computedAtMs })}`
      : label;
  }
  if (cost?.origin === 'included') return cost.reason || 'included in another purchase';
  return cost?.reason || '90-day market average unavailable';
}
