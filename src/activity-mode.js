import { createSetup, normalizeSetups } from './setups.js';

export const ACTIVITY_MODE = Object.freeze({
  FARM: 'farm',
  PEST: 'pest',
});

export const ACTIVITY_SETUP_ID = Object.freeze({
  [ACTIVITY_MODE.FARM]: 'normal',
  [ACTIVITY_MODE.PEST]: 'pest',
});

export function normalizeActivityMode(value) {
  return String(value || '').toLowerCase() === ACTIVITY_MODE.PEST
    ? ACTIVITY_MODE.PEST
    : ACTIVITY_MODE.FARM;
}

export function setupIdForActivity(mode) {
  return ACTIVITY_SETUP_ID[normalizeActivityMode(mode)];
}

export function activityModeForState(state) {
  return state?.profile?.setups?.activeId === ACTIVITY_SETUP_ID[ACTIVITY_MODE.PEST]
    ? ACTIVITY_MODE.PEST
    : ACTIVITY_MODE.FARM;
}

export function activityLabel(mode) {
  return normalizeActivityMode(mode) === ACTIVITY_MODE.PEST ? 'Pest Set' : 'Farm Set';
}

export function setActivityModeOnState(state, mode) {
  const normalized = normalizeActivityMode(mode);
  state.profile ||= {};
  state.profile.setups = normalizeSetups(state.profile.setups);

  const targetId = setupIdForActivity(normalized);
  if (!state.profile.setups.list.some(setup => setup.id === targetId)) {
    state.profile.setups.list.push(createSetup(targetId, activityLabel(normalized)));
  }
  state.profile.setups.activeId = targetId;
  return normalized;
}

export function isVacuumItemEntry(item) {
  const id = String(item?.id || '').toLowerCase();
  const category = String(item?.category || '').toLowerCase();
  return id.startsWith('vacuum-') || category.includes('vacuum');
}

export function isPestVacuumEntry(item) {
  const scope = String(item?.modeScope || 'Any');
  return scope === 'Pest Vacuum Drops' || isVacuumItemEntry(item);
}

export function itemAppliesToActivity(item, mode) {
  const normalized = normalizeActivityMode(mode);
  const scope = String(item?.modeScope || 'Any');

  if (normalized === ACTIVITY_MODE.FARM) {
    if (item?.section === 'pests' || isPestVacuumEntry(item)) return false;
    return scope === 'Any';
  }

  // The Pest Set uses the vacuum instead of a crop farming tool. General
  // account/gear effects can still apply, while event/contest-only states stay
  // out until those contexts receive their own explicit activity mode.
  if (item?.section === 'tools' && !isVacuumItemEntry(item)) return false;
  return scope === 'Any' || scope === 'Pest Spawning' || scope === 'Pest Vacuum Drops';
}
