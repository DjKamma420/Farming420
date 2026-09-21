import { ACTIVITY_MODE, normalizeActivityMode } from './activity-mode.js';

export const PLANNER_UPGRADE_TARGET = Object.freeze({
  FARMING_FORTUNE: 'farming-fortune',
  OVERBLOOM: 'overbloom',
  BONUS_PEST_CHANCE: 'bonus-pest-chance',
  PEST_COOLDOWN: 'pest-cooldown',
  OTHER: 'other',
});

function normalizedSearchText(item) {
  return [
    item?.metric,
    item?.attribute,
    item?.name,
    item?.notes,
    item?.modeScope,
  ].filter(Boolean).join(' ').toLowerCase();
}

export function plannerUpgradeTarget(item) {
  const metric = String(item?.metric || '').toLowerCase();
  const attribute = String(item?.attribute || '').toLowerCase();
  const searchable = normalizedSearchText(item);

  if (attribute.includes('pest cooldown')
    || (metric.includes('pest spawn') && searchable.includes('cooldown'))) {
    return PLANNER_UPGRADE_TARGET.PEST_COOLDOWN;
  }

  if (attribute.includes('bonus pest chance')
    || metric.includes('pest spawn')
    || searchable.includes('bonus pest chance')
    || /\bbpc\b/.test(searchable)) {
    return PLANNER_UPGRADE_TARGET.BONUS_PEST_CHANCE;
  }

  if (metric.includes('overbloom')
    || (metric.includes('rare crop') && searchable.includes('overbloom'))) {
    return PLANNER_UPGRADE_TARGET.OVERBLOOM;
  }

  if (metric.includes('crop yield')) return PLANNER_UPGRADE_TARGET.FARMING_FORTUNE;
  return PLANNER_UPGRADE_TARGET.OTHER;
}

export function plannerUpgradeTargetLabel(target) {
  switch (target) {
    case PLANNER_UPGRADE_TARGET.BONUS_PEST_CHANCE:
      return 'Bonus Pest Chance';
    case PLANNER_UPGRADE_TARGET.PEST_COOLDOWN:
      return 'Pest Cooldown';
    case PLANNER_UPGRADE_TARGET.OVERBLOOM:
      return 'Overbloom';
    case PLANNER_UPGRADE_TARGET.FARMING_FORTUNE:
      return 'Farming Fortune';
    default:
      return 'Other';
  }
}

export function plannerUpgradeTargetRole(item, mode) {
  const target = plannerUpgradeTarget(item);
  const normalizedMode = normalizeActivityMode(mode);

  if (normalizedMode === ACTIVITY_MODE.PEST_SPAWN) {
    if (target === PLANNER_UPGRADE_TARGET.BONUS_PEST_CHANCE
      || target === PLANNER_UPGRADE_TARGET.PEST_COOLDOWN) {
      return {
        target,
        priority: 0,
        tier: 'primary',
        label: 'Primary spawning target',
      };
    }

    if (target === PLANNER_UPGRADE_TARGET.FARMING_FORTUNE) {
      return {
        target,
        priority: 10,
        tier: 'secondary',
        label: 'Secondary crop-output stat',
      };
    }

    return {
      target,
      priority: 20,
      tier: 'other',
      label: 'Not a spawning priority',
    };
  }

  return {
    target,
    priority: 0,
    tier: 'primary',
    label: plannerUpgradeTargetLabel(target),
  };
}

export function plannerUpgradeTargetEligible(item, mode) {
  const role = plannerUpgradeTargetRole(item, mode);
  if (normalizeActivityMode(mode) !== ACTIVITY_MODE.PEST_SPAWN) {
    return role.target === PLANNER_UPGRADE_TARGET.FARMING_FORTUNE
      || role.target === PLANNER_UPGRADE_TARGET.OVERBLOOM;
  }

  return role.target === PLANNER_UPGRADE_TARGET.BONUS_PEST_CHANCE
    || role.target === PLANNER_UPGRADE_TARGET.PEST_COOLDOWN
    || role.target === PLANNER_UPGRADE_TARGET.FARMING_FORTUNE;
}

export function plannerUpgradeValueText(item, gain) {
  const target = plannerUpgradeTarget(item);
  const value = Number(gain);
  const hasPositiveValue = Number.isFinite(value) && value > 0;
  const formatted = hasPositiveValue ? value.toLocaleString('en-US') : '';

  switch (target) {
    case PLANNER_UPGRADE_TARGET.BONUS_PEST_CHANCE:
      return hasPositiveValue ? `+${formatted} BPC` : 'Bonus Pest Chance';
    case PLANNER_UPGRADE_TARGET.PEST_COOLDOWN:
      return hasPositiveValue ? `-${formatted}s Pest cooldown` : 'Pest cooldown reduction';
    case PLANNER_UPGRADE_TARGET.OVERBLOOM:
      return hasPositiveValue ? `+${formatted} Overbloom` : 'Overbloom';
    case PLANNER_UPGRADE_TARGET.FARMING_FORTUNE:
      return hasPositiveValue ? `+${formatted} FF` : 'Farming Fortune';
    default:
      return hasPositiveValue ? `+${formatted}` : '—';
  }
}
