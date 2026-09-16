import { exclusiveSelectionViolations } from './exclusivity.js';

/**
 * Pet switching is a strategy over time, not a pile of simultaneous pet stats.
 * Exactly one pet is active at a time; a held pet item only contributes while
 * its parent pet is active.
 */
export const PET_STRATEGY_LIMITS = Object.freeze({
  activePets: 1,
  heldItemsPerActivePet: 1,
});

export const PET_RULE_SUPPORT = Object.freeze({
  DIRECT: 'direct',
  WORKAROUND: 'workaround',
  MANUAL: 'manual',
  VERIFY: 'verify',
});

export function petStrategyViolations(strategy) {
  const violations = [];
  const phases = Array.isArray(strategy?.phases) ? strategy.phases : [];

  for (const [index, phase] of phases.entries()) {
    const activePets = Array.isArray(phase?.activePets)
      ? phase.activePets.filter(Boolean)
      : (phase?.pet ? [phase.pet] : []);
    if (activePets.length > PET_STRATEGY_LIMITS.activePets) {
      violations.push({ type: 'active-pet-cardinality', phase: index, maxActive: 1, activePets });
    }

    const heldItems = Array.isArray(phase?.heldItems)
      ? phase.heldItems.filter(Boolean)
      : (phase?.petItem ? [phase.petItem] : []);
    if (heldItems.length > PET_STRATEGY_LIMITS.heldItemsPerActivePet) {
      violations.push({ type: 'pet-item-cardinality', phase: index, maxActive: 1, heldItems });
    }
    if (heldItems.length && activePets.length !== 1) {
      violations.push({ type: 'orphan-pet-item', phase: index });
    }

    const entryViolations = exclusiveSelectionViolations(phase?.activeEntryIds || []);
    for (const violation of entryViolations) {
      violations.push({ type: 'exclusive-entry-group', phase: index, ...violation });
    }
  }

  return violations;
}

/**
 * Generic payback calculation for an Autopet/automation purchase.
 *
 * The app must pass a measured or otherwise verified marginal coins/hour value.
 * A missing or non-positive uplift deliberately returns null rather than
 * pretending the purchase is worthwhile.
 */
export function petRulePaybackHours({ acquisitionCostCoins, marginalCoinsPerHour }) {
  const cost = Number(acquisitionCostCoins);
  const uplift = Number(marginalCoinsPerHour);
  if (!Number.isFinite(cost) || cost < 0) return null;
  if (!Number.isFinite(uplift) || uplift <= 0) return null;
  return cost / uplift;
}

/**
 * Recommendation helper. It does not decide a universal "buy at X coins".
 * The caller supplies its own acceptable payback horizon and current market
 * cost, keeping the decision profile-aware and price-aware.
 */
export function petRuleDecision({ acquisitionCostCoins, marginalCoinsPerHour, maxPaybackHours }) {
  const paybackHours = petRulePaybackHours({ acquisitionCostCoins, marginalCoinsPerHour });
  const horizon = Number(maxPaybackHours);
  if (paybackHours === null || !Number.isFinite(horizon) || horizon < 0) {
    return { recommend: false, paybackHours, reason: 'insufficient-data' };
  }
  return {
    recommend: paybackHours <= horizon,
    paybackHours,
    reason: paybackHours <= horizon ? 'within-payback-horizon' : 'outside-payback-horizon',
  };
}
