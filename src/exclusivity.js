import { FARMING_TOOL_REFORGES } from './farming-reforges.js';
import { SLOT_IDS } from './setups.js';

/**
 * Hard game-state constraints that optimizers and recommendation code must obey.
 *
 * These are not stat values. They describe combinations that cannot be active
 * on the same physical item or in the same active slot at the same time, so raw
 * upgrade gains must never be summed across a group.
 */
export const EXCLUSIVE_ENTRY_GROUPS = Object.freeze([
  Object.freeze({
    id: 'farming-tool-reforge',
    label: 'Farming tool reforge',
    itemClass: 'farming-tool',
    maxActive: 1,
    members: Object.freeze(FARMING_TOOL_REFORGES.map(reforge => `tool-reforge-${reforge.id}-reforge`)),
  }),
]);

const groupByEntryId = new Map(
  EXCLUSIVE_ENTRY_GROUPS.flatMap(group => group.members.map(entryId => [entryId, group])),
);

export function exclusiveGroupForEntry(entryId) {
  return groupByEntryId.get(entryId) || null;
}

/**
 * Returns impossible exclusive combinations in a proposed active entry set for
 * one physical item/setup context. Duplicate ids are ignored because ownership
 * and activation are boolean here.
 */
export function exclusiveSelectionViolations(entryIds) {
  const selected = new Set(Array.isArray(entryIds) ? entryIds : []);
  const violations = [];
  for (const group of EXCLUSIVE_ENTRY_GROUPS) {
    const active = group.members.filter(entryId => selected.has(entryId));
    if (active.length > group.maxActive) {
      violations.push({
        groupId: group.id,
        label: group.label,
        itemClass: group.itemClass,
        maxActive: group.maxActive,
        active,
      });
    }
  }
  return violations;
}

/**
 * Structural setup checks. A normal setup stores one item per wearable slot and
 * one scalar reforge on that item. This catches malformed backups/imports before
 * any calculator can interpret impossible combinations as additive stats.
 */
export function setupConstraintViolations(setup) {
  const violations = [];
  const slots = setup?.slots && typeof setup.slots === 'object' ? setup.slots : {};

  for (const slotId of SLOT_IDS) {
    const value = slots[slotId];
    if (Array.isArray(value)) {
      violations.push({ type: 'slot-cardinality', slotId, maxActive: 1 });
      continue;
    }
    if (!value || typeof value !== 'object') continue;
    if (Array.isArray(value.reforge) || (value.reforge && typeof value.reforge === 'object')) {
      violations.push({ type: 'reforge-cardinality', slotId, maxActive: 1 });
    }
  }

  return violations;
}
