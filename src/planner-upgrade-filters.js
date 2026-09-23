import { ACTIVITY_MODE, activityLabel, setupIdForActivity } from './activity-mode.js';
import { physicalItemId } from './setups.js';

export const UPGRADE_FILTER = Object.freeze({
  ALL: 'all',
  OVERBLOOM: 'overbloom',
  BPC: 'bpc',
  FARMING_FORTUNE: 'ff',
  CROP_FORTUNE: 'cf-crop',
  GREENHOUSE: 'greenhouse',
  VISITOR: 'visitor',
});

export const UPGRADE_FILTERS = Object.freeze([
  { id: UPGRADE_FILTER.ALL, label: 'All' },
  { id: UPGRADE_FILTER.OVERBLOOM, label: 'Overbloom' },
  { id: UPGRADE_FILTER.BPC, label: 'BPC' },
  { id: UPGRADE_FILTER.FARMING_FORTUNE, label: 'FF' },
  { id: UPGRADE_FILTER.CROP_FORTUNE, label: 'CF-Crop' },
  { id: UPGRADE_FILTER.GREENHOUSE, label: 'Greenhouse' },
  { id: UPGRADE_FILTER.VISITOR, label: 'Visitor' },
]);

const ARMOR_SLOTS = Object.freeze(['helmet', 'chestplate', 'leggings', 'boots']);
const EQUIPMENT_SLOTS = Object.freeze(['equipment1', 'equipment2', 'equipment3', 'equipment4']);
const PET_SLOTS = Object.freeze(['pet', 'petItem']);

function searchable(item) {
  return [
    item?.id,
    item?.category,
    item?.section,
    item?.name,
    item?.metric,
    item?.modeScope,
    item?.cropScope,
    item?.notes,
  ].filter(Boolean).join(' ').toLowerCase();
}

export function cropFortuneUpgrade(item) {
  if (String(item?.metric || '').toLowerCase() !== 'crop yield') return false;
  if (item?.section === 'crops' || item?.section === 'tools') return true;
  if (item?.cropScope && item.cropScope !== 'Any') return true;
  const text = searchable(item);
  return /crop fortune|crop-specific|selected crop/.test(text);
}

export function upgradeFilterTags(item) {
  const tags = new Set();
  const text = searchable(item);
  const metric = String(item?.metric || '').toLowerCase();

  if (/overbloom|rare crops?/.test(text)) tags.add(UPGRADE_FILTER.OVERBLOOM);
  if (/bonus pest chance|\bbpc\b/.test(text)) tags.add(UPGRADE_FILTER.BPC);

  if (metric === 'crop yield') {
    if (cropFortuneUpgrade(item)) tags.add(UPGRADE_FILTER.CROP_FORTUNE);
    else tags.add(UPGRADE_FILTER.FARMING_FORTUNE);
  }

  if (/greenhouse|sowdust|mutation analysis/.test(text)) tags.add(UPGRADE_FILTER.GREENHOUSE);
  if (/visitor|fancy visit/.test(text)) tags.add(UPGRADE_FILTER.VISITOR);

  return tags;
}

export function matchesUpgradeFilter(item, filterId) {
  if (!filterId || filterId === UPGRADE_FILTER.ALL) return true;
  return upgradeFilterTags(item).has(filterId);
}

function componentFor(item) {
  const id = String(item?.id || '');
  if (id.startsWith('armor-')) return { id: 'armor', slots: ARMOR_SLOTS };
  if (id.startsWith('equipment-')) return { id: 'equipment', slots: EQUIPMENT_SLOTS };
  if (item?.section === 'pets' || id.startsWith('pet-')) return { id: 'pet', slots: PET_SLOTS };
  return null;
}

function setupForMode(state, mode) {
  const setupId = setupIdForActivity(mode);
  return state?.profile?.setups?.list?.find(setup => setup?.id === setupId) || null;
}

function componentIdentity(setup, component) {
  if (!component) return null;
  const setupId = setup?.id || 'missing';
  return component.slots.map(slotId => {
    const id = physicalItemId(setup?.slots?.[slotId]);
    return `${slotId}=${id || `setup:${setupId}:${slotId}`}`;
  }).join('|');
}

/**
 * Key used to decide whether one purchase/upgrade is physically the same thing
 * across phase loadouts. Global progression is shared by definition. Farming
 * and Pest Spawning share the selected crop tool. Armor/equipment/pets merge
 * only when the loadouts point at the same physical item identities.
 */
export function upgradeUsageScope(state, item, mode, cropId = state?.selectedCrop || 'melon') {
  const component = componentFor(item);
  if (component) {
    const setup = setupForMode(state, mode);
    return {
      key: `${component.id}:${componentIdentity(setup, component)}`,
      component: component.id,
      physical: true,
    };
  }

  if (item?.section === 'tools') {
    return {
      key: `crop-tool:${cropId}`,
      component: 'tool',
      physical: true,
    };
  }

  return { key: 'global', component: 'global', physical: false };
}

function shortActivityLabel(mode) {
  return activityLabel(mode).replace(/ Set$/, '');
}

export function combinedSetupLabel(modes, sharedPhysical = false) {
  const unique = [...new Set(modes)];
  if (unique.length === 3
    && unique.includes(ACTIVITY_MODE.FARM)
    && unique.includes(ACTIVITY_MODE.PEST_SPAWN)
    && unique.includes(ACTIVITY_MODE.PEST_KILL)) {
    return 'All sets';
  }
  const labels = unique.map(shortActivityLabel);
  const suffix = sharedPhysical && unique.length > 1 ? ' · shared item' : '';
  return `${labels.join(' + ')}${suffix}`;
}

export function aggregateUpgradeRows(rows, state, cropId = state?.selectedCrop || 'melon') {
  const groups = new Map();

  rows.forEach((row, sourceIndex) => {
    const scope = upgradeUsageScope(state, row.item, row.activityMode, cropId);
    const key = `${row.item.id}|${scope.key}`;
    let group = groups.get(key);
    if (!group) {
      group = {
        ...row,
        activityRows: [],
        activityModes: [],
        scope,
        sourceIndex,
      };
      groups.set(key, group);
    }

    group.activityRows.push(row);
    if (!group.activityModes.includes(row.activityMode)) group.activityModes.push(row.activityMode);

    const currentValue = Number.isFinite(group.marginalCoinsHour) ? group.marginalCoinsHour : -1;
    const candidateValue = Number.isFinite(row.marginalCoinsHour) ? row.marginalCoinsHour : -1;
    if (candidateValue > currentValue) {
      const keep = {
        activityRows: group.activityRows,
        activityModes: group.activityModes,
        scope: group.scope,
        sourceIndex: group.sourceIndex,
      };
      Object.assign(group, row, keep);
    }
  });

  return [...groups.values()].map(group => ({
    ...group,
    setupLabel: group.scope.component === 'global'
      ? 'Global / set-independent'
      : combinedSetupLabel(group.activityModes, group.scope.physical),
    filterTags: upgradeFilterTags(group.item),
  })).sort((a, b) => a.sourceIndex - b.sourceIndex || String(a.item?.name || '').localeCompare(String(b.item?.name || '')));
}
