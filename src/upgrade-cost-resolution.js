import { costForUpgrade, missingCostReason } from './upgrade-costs.js';

/**
 * What an upgrade costs, and where that number came from.
 *
 * A price the player recorded themselves wins: they paid it, while the research
 * table holds a market average. The generated table is the fallback, and when
 * neither has a figure the cost stays unknown -- never zero. Zero would make an
 * unpriced upgrade look free and hand it first place in any ranking sorted by
 * value for money, which is the whole point of the ranking.
 *
 * `store` is the progress bucket the upgrade belongs to (global profile, a
 * crop, or a tool), so a recorded price is read from the same place the rest of
 * that upgrade's progress lives.
 */
export function resolveUpgradeCost(store, itemId) {
  const recorded = Number(store?.costs?.[itemId] || 0);
  if (recorded > 0) return { coins: recorded, origin: 'recorded', reason: null };

  const researched = costForUpgrade(itemId);
  if (researched) {
    return {
      coins: researched.coins,
      origin: 'research',
      confidence: researched.confidence || null,
      priceStatus: researched.priceStatus || null,
      reason: null,
    };
  }
  return { coins: 0, origin: 'unknown', reason: missingCostReason(itemId) };
}

/** One line saying where a cost came from, or why there is none. */
export function costOriginNote(cost) {
  if (cost?.origin === 'recorded') return 'your recorded price';
  if (cost?.origin === 'research') {
    if (cost.priceStatus === 'STALE_FALLBACK_SNAPSHOT') return 'research snapshot, stale';
    return cost.confidence ? `research, ${cost.confidence.toLowerCase()} confidence` : 'research snapshot';
  }
  return cost?.reason || 'no price recorded';
}
