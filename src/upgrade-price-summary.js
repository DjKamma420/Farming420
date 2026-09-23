import { resolveUpgradeCost } from './upgrade-cost-resolution.js';
import {
  resolveUpgradeMarketAverage,
  stepMarketRoutesForUpgrade,
} from './upgrade-market-routes.js';
import { stepCostForUpgrade, stepCostModelForUpgrade } from './upgrade-step-costs.js';
import {
  farmingShardMarket,
  shardsForAttributeLevel,
  shardsRemainingToMax,
} from './shard-price-model.js';

function configuredLevel(store, item) {
  const max = Math.max(1, Number(item?.max || 1));
  const raw = store?.levels?.[item?.id];
  if (raw !== null && raw !== undefined && raw !== '') {
    const numeric = Number(raw);
    if (Number.isFinite(numeric)) return Math.max(0, Math.min(max, Math.floor(numeric)));
  }
  return store?.owned?.[item?.id] ? 1 : 0;
}

function positiveCoins(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}

export function upgradePriceSummary(store, item, {
  resolveMarket = resolveUpgradeMarketAverage,
  resolveCost = resolveUpgradeCost,
} = {}) {
  const id = String(item?.id || '');
  const maxLevel = Math.max(1, Number(item?.max || 1));
  const currentLevel = configuredLevel(store, item);
  const shard = farmingShardMarket(id);

  const entryMarket = resolveMarket(id, null);
  const entryMarketCoins = entryMarket?.complete ? positiveCoins(entryMarket.coins) : null;
  const unitMarket = shard ? entryMarket : null;
  const unitShardCoins = unitMarket?.complete ? positiveCoins(unitMarket.coins) : null;
  const shardCountOwned = shard ? shardsForAttributeLevel(id, currentLevel) : null;
  const shardCountToMax = shard ? shardsRemainingToMax(id, currentLevel) : null;
  const currentShardValueCoins = unitShardCoins != null && shardCountOwned != null
    ? unitShardCoins * shardCountOwned
    : null;

  if (currentLevel >= maxLevel) {
    return Object.freeze({
      currentLevel,
      maxLevel,
      entryMarketCoins,
      nextCostCoins: 0,
      costToMaxCoins: 0,
      costToMaxComplete: true,
      remainingEarnedSteps: 0,
      remainingUnknownSteps: 0,
      unitShardCoins,
      shardCountOwned,
      shardCountToMax,
      currentShardValueCoins,
    });
  }

  let costToMaxCoins = 0;
  let remainingEarnedSteps = 0;
  let remainingUnknownSteps = 0;
  let firstStepCoins = null;
  let explicitStepSeen = false;

  for (let target = currentLevel + 1; target <= maxLevel; target += 1) {
    if (stepMarketRoutesForUpgrade(id, target)) {
      explicitStepSeen = true;
      const market = resolveMarket(id, target);
      if (market?.complete && positiveCoins(market.coins) != null) {
        const coins = Number(market.coins);
        costToMaxCoins += coins;
        if (target === currentLevel + 1) firstStepCoins = coins;
      } else {
        remainingUnknownSteps += 1;
      }
      continue;
    }

    const step = stepCostForUpgrade(id, target);
    if (step?.unit === 'time') {
      remainingEarnedSteps += 1;
      continue;
    }
    if (step?.includedIn && Number(step.coins) === 0) continue;
    if (stepCostModelForUpgrade(id)) {
      remainingUnknownSteps += 1;
      continue;
    }

    // Non-step-aware entries describe one complete acquisition route rather
    // than a per-level ingredient. It is safe as a remaining-to-max cost only
    // from zero; at a partial level subtracting a fraction would be invented.
    if (!explicitStepSeen && currentLevel === 0) {
      const full = resolveMarket(id, null);
      if (full?.complete && positiveCoins(full.coins) != null) {
        costToMaxCoins = Number(full.coins);
        firstStepCoins = maxLevel === 1 ? Number(full.coins) : null;
      } else {
        const next = resolveCost(store, id);
        if (next?.acquisitionMode === 'EARNED') remainingEarnedSteps += 1;
        else remainingUnknownSteps += 1;
      }
      break;
    }

    remainingUnknownSteps += 1;
  }

  if (firstStepCoins == null) {
    const next = resolveCost(store, id);
    if (next?.acquisitionMode === 'BUYABLE' && positiveCoins(next.coins) != null) {
      firstStepCoins = Number(next.coins);
    }
  }

  return Object.freeze({
    currentLevel,
    maxLevel,
    entryMarketCoins,
    nextCostCoins: firstStepCoins,
    costToMaxCoins: costToMaxCoins > 0 || remainingUnknownSteps === 0 ? costToMaxCoins : null,
    costToMaxComplete: remainingUnknownSteps === 0,
    remainingEarnedSteps,
    remainingUnknownSteps,
    unitShardCoins,
    shardCountOwned,
    shardCountToMax,
    currentShardValueCoins,
  });
}
