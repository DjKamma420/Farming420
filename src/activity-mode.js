import { createSetup, normalizeSetups } from './setups.js';

export const ACTIVITY_MODE = Object.freeze({
  FARM: 'farm',
  PEST_SPAWN: 'pest-spawn',
  PEST_KILL: 'pest-kill',
  // Legacy code alias: the old PEST mode was the Vacuum/loot calculation
  // path, so existing callers must keep receiving Killing semantics.
  PEST: 'pest-kill',
});

export const ACTIVITY_SETUP_ID = Object.freeze({
  [ACTIVITY_MODE.FARM]: 'normal',
  [ACTIVITY_MODE.PEST_SPAWN]: 'pest',
  [ACTIVITY_MODE.PEST_KILL]: 'pest-kill',
});

export function normalizeActivityMode(value) {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === ACTIVITY_MODE.PEST_KILL || normalized === 'pest') return ACTIVITY_MODE.PEST_KILL;
  if (normalized === ACTIVITY_MODE.PEST_SPAWN) return ACTIVITY_MODE.PEST_SPAWN;
  return ACTIVITY_MODE.FARM;
}

export function setupIdForActivity(mode) {
  return ACTIVITY_SETUP_ID[normalizeActivityMode(mode)];
}

export function activityModeForState(state) {
  const activeId = state?.profile?.setups?.activeId;
  if (activeId === ACTIVITY_SETUP_ID[ACTIVITY_MODE.PEST_KILL]) return ACTIVITY_MODE.PEST_KILL;
  if (activeId === ACTIVITY_SETUP_ID[ACTIVITY_MODE.PEST_SPAWN]) return ACTIVITY_MODE.PEST_SPAWN;
  return ACTIVITY_MODE.FARM;
}

export function activityLabel(mode) {
  switch (normalizeActivityMode(mode)) {
    case ACTIVITY_MODE.PEST_SPAWN:
      return 'Pest Spawning Set';
    case ACTIVITY_MODE.PEST_KILL:
      return 'Pest Killing Set';
    default:
      return 'Farming Set';
  }
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

export function usesFarmingTool(mode) {
  const normalized = normalizeActivityMode(mode);
  return normalized === ACTIVITY_MODE.FARM || normalized === ACTIVITY_MODE.PEST_SPAWN;
}

const CONTEXT_MODE_SCOPES = new Set(['Harvest Feast', 'Grand Feast', 'Jacob Contest', 'Greenhouse']);

export function itemAppliesToActivity(item, mode, activeContextScope = null) {
  const normalized = normalizeActivityMode(mode);
  const rawScope = String(item?.modeScope || 'Any');
  const contextual = CONTEXT_MODE_SCOPES.has(rawScope);

  // Event/context scope is a separate dimension from Farming/Spawning/Killing.
  // Existing callers that do not provide a context keep the old behavior:
  // event-only rows stay inactive. Dashboard can opt into one documented
  // context without making that row look permanently active everywhere else.
  const contextScopes = new Set(
    Array.isArray(activeContextScope)
      ? activeContextScope
      : activeContextScope ? [activeContextScope] : [],
  );
  if (contextual && !contextScopes.has(rawScope)) return false;
  const scope = contextual ? 'Any' : rawScope;

  if (normalized === ACTIVITY_MODE.FARM) {
    if (item?.section === 'pests' || isPestVacuumEntry(item)) return false;
    return scope === 'Any';
  }

  if (normalized === ACTIVITY_MODE.PEST_SPAWN) {
    // Spawning happens while crop farming. Keep the crop tool and general
    // Farming effects, add spawn/BPC effects, and exclude Vacuum/loot effects.
    if (isPestVacuumEntry(item)) return false;
    return scope === 'Any' || scope === 'Pest Spawning';
  }

  // Killing uses the Vacuum and loot/Overbloom path. Spawn-only BPC/cooldown
  // effects are intentionally excluded from this phase.
  if (item?.section === 'tools' && !isVacuumItemEntry(item)) return false;
  return scope === 'Any' || scope === 'Pest Vacuum Drops';
}
