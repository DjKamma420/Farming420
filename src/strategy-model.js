import { exclusiveSelectionViolations, setupConstraintViolations } from './exclusivity.js';
import { petStrategyViolations } from './pet-strategy.js';
import { calculateFarmingProfit } from './profit-engine.js';

export const STRATEGY_CONTEXT = Object.freeze({
  NORMAL_CROP: 'normal-crop',
  HARVEST_FEAST: 'harvest-feast',
  PEST_SPAWN: 'pest-spawn',
  PEST_LOOT: 'pest-loot',
  JACOB_CONTEST: 'jacob-contest',
  GREENHOUSE: 'greenhouse',
  TOOL_LEVELING: 'tool-leveling',
  VISITOR_PROGRESSION: 'visitor-progression',
  IRONMAN: 'ironman',
});

export const STRATEGY_OBJECTIVE = Object.freeze({
  NET_COINS_PER_HOUR: 'net-coins-per-hour',
  CONTEST_SCORE: 'contest-score',
  FARMING_XP_PER_HOUR: 'farming-xp-per-hour',
  TOOL_XP_PER_HOUR: 'tool-xp-per-hour',
  PROGRESSION_PER_HOUR: 'progression-per-hour',
});

export const DEFAULT_OBJECTIVE_BY_CONTEXT = Object.freeze({
  [STRATEGY_CONTEXT.NORMAL_CROP]: STRATEGY_OBJECTIVE.NET_COINS_PER_HOUR,
  [STRATEGY_CONTEXT.HARVEST_FEAST]: STRATEGY_OBJECTIVE.NET_COINS_PER_HOUR,
  [STRATEGY_CONTEXT.PEST_SPAWN]: STRATEGY_OBJECTIVE.NET_COINS_PER_HOUR,
  [STRATEGY_CONTEXT.PEST_LOOT]: STRATEGY_OBJECTIVE.NET_COINS_PER_HOUR,
  [STRATEGY_CONTEXT.JACOB_CONTEST]: STRATEGY_OBJECTIVE.CONTEST_SCORE,
  [STRATEGY_CONTEXT.GREENHOUSE]: STRATEGY_OBJECTIVE.PROGRESSION_PER_HOUR,
  [STRATEGY_CONTEXT.TOOL_LEVELING]: STRATEGY_OBJECTIVE.TOOL_XP_PER_HOUR,
  [STRATEGY_CONTEXT.VISITOR_PROGRESSION]: STRATEGY_OBJECTIVE.PROGRESSION_PER_HOUR,
  [STRATEGY_CONTEXT.IRONMAN]: STRATEGY_OBJECTIVE.PROGRESSION_PER_HOUR,
});

function asSet(value) {
  return new Set(Array.isArray(value) ? value.filter(Boolean) : []);
}

function normalizedCrop(value) {
  return String(value || '').trim().toLowerCase() || null;
}

/**
 * A candidate may declare `contexts`, `excludeContexts`, `crops`, and
 * `excludeCrops`. No declaration means no restriction on that dimension.
 */
export function strategyCandidateApplies(candidate, { context, crop } = {}) {
  if (!candidate || typeof candidate !== 'object') return false;
  const includeContexts = asSet(candidate.contexts);
  const excludeContexts = asSet(candidate.excludeContexts);
  if (includeContexts.size && !includeContexts.has(context)) return false;
  if (excludeContexts.has(context)) return false;

  const cropId = normalizedCrop(crop);
  const includeCrops = new Set([...asSet(candidate.crops)].map(normalizedCrop));
  const excludeCrops = new Set([...asSet(candidate.excludeCrops)].map(normalizedCrop));
  if (includeCrops.size && (!cropId || !includeCrops.has(cropId))) return false;
  if (cropId && excludeCrops.has(cropId)) return false;
  return true;
}

export function strategyViolations(strategy = {}) {
  const violations = [];
  for (const violation of exclusiveSelectionViolations(strategy.activeEntryIds || [])) {
    violations.push({ type: 'exclusive-entry-group', ...violation });
  }
  for (const violation of setupConstraintViolations(strategy.setup)) {
    violations.push({ type: 'setup-constraint', ...violation });
  }
  for (const violation of petStrategyViolations(strategy.petStrategy || { phases: [] })) {
    violations.push({ type: 'pet-strategy', ...violation });
  }
  return violations;
}

function finite(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function explicitMetricValue(scenario, objective) {
  const metrics = scenario?.metrics && typeof scenario.metrics === 'object' ? scenario.metrics : {};
  switch (objective) {
    case STRATEGY_OBJECTIVE.CONTEST_SCORE:
      return finite(metrics.contestScore);
    case STRATEGY_OBJECTIVE.FARMING_XP_PER_HOUR:
      return finite(metrics.farmingXpPerHour);
    case STRATEGY_OBJECTIVE.TOOL_XP_PER_HOUR:
      return finite(metrics.toolXpPerHour);
    case STRATEGY_OBJECTIVE.PROGRESSION_PER_HOUR:
      return finite(metrics.progressionPerHour);
    default:
      return null;
  }
}

/**
 * Evaluate a complete strategy phase. Profit is delegated to profit-engine;
 * contest/XP/progression objectives require an explicit measured or verified
 * metric and are never inferred from coins or Fortune.
 */
export function evaluateStrategyScenario(scenario = {}) {
  const context = scenario.context || STRATEGY_CONTEXT.NORMAL_CROP;
  const objective = scenario.objective || DEFAULT_OBJECTIVE_BY_CONTEXT[context] || STRATEGY_OBJECTIVE.NET_COINS_PER_HOUR;
  const violations = strategyViolations(scenario);
  const profit = scenario.profitInput ? calculateFarmingProfit(scenario.profitInput) : null;
  let objectiveValue = null;
  let objectiveComplete = false;

  if (objective === STRATEGY_OBJECTIVE.NET_COINS_PER_HOUR) {
    objectiveValue = profit?.netCoinsPerHour ?? null;
    objectiveComplete = Boolean(profit?.complete && objectiveValue != null);
  } else {
    objectiveValue = explicitMetricValue(scenario, objective);
    objectiveComplete = objectiveValue != null;
  }

  return {
    id: scenario.id || null,
    label: scenario.label || scenario.id || 'strategy',
    context,
    crop: normalizedCrop(scenario.crop),
    objective,
    objectiveValue,
    complete: violations.length === 0 && objectiveComplete,
    violations,
    profit,
    notes: Array.isArray(scenario.notes) ? scenario.notes : [],
  };
}

/**
 * Sort only scenarios that are complete for the same objective. Incomplete or
 * incomparable states stay visible after comparable states instead of receiving
 * a fabricated score.
 */
export function rankStrategyScenarios(scenarios = []) {
  const evaluated = scenarios.map(evaluateStrategyScenario);
  return evaluated.sort((left, right) => {
    if (left.complete !== right.complete) return left.complete ? -1 : 1;
    if (left.objective !== right.objective) return String(left.objective).localeCompare(String(right.objective));
    if (left.complete && left.objectiveValue !== right.objectiveValue) return right.objectiveValue - left.objectiveValue;
    return String(left.label).localeCompare(String(right.label));
  });
}
