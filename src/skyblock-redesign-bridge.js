import { applyFarmingToolReforge } from './item-capabilities.js';
import { readStoredAppState, writeStoredAppState } from './app-storage.js';
import { STORAGE_KEY } from './config.js';
import { toolKeyForCropId } from './migrations.js';

const GOAL_KEY = 'farming420-reforge-goal-v1';
const REFORGE_ENTRY = Object.freeze({
  bountiful: 'tool-reforge-bountiful-reforge',
  blessed: 'tool-reforge-blessed-reforge',
  earthy: 'tool-reforge-earthy-reforge',
  'deep-fried': 'tool-reforge-deep-fried-reforge',
  overpriced: 'tool-reforge-overpriced-reforge',
});

function state() {
  try { return readStoredAppState({}); } catch { return {}; }
}

function cropId(raw) {
  return document.querySelector('#cropSelect')?.value || raw.selectedCrop || 'melon';
}

function selectReforge(reforgeId) {
  const raw = state();
  raw.profile ||= {};
  raw.profile.toolProgress ||= {};
  raw.profile.toolReforges ||= {};
  const key = toolKeyForCropId(cropId(raw));
  raw.profile.toolProgress[key] ||= { levels: {}, owned: {}, costs: {}, manualGain: {} };
  const bucket = raw.profile.toolProgress[key];
  bucket.levels ||= {};
  bucket.owned ||= {};

  applyFarmingToolReforge(bucket, reforgeId);
  delete raw.profile.toolReforges[key];
  return writeStoredAppState(raw);
}

// Capture before the redesign's target listener. This makes all five visible
// choices write to the same progression bucket the planner reads.
document.addEventListener('click', event => {
  const reforge = event.target.closest?.('[data-sb-reforge]');
  if (reforge) selectReforge(reforge.dataset.sbReforge);

  const goal = event.target.closest?.('[data-sb-goal]');
  if (!goal) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  localStorage.setItem(GOAL_KEY, goal.dataset.sbGoal);
  // Re-render the current page without pretending the user navigated away.
  // A fake Tools-tab click deliberately disables scroll preservation.
  window.dispatchEvent(new Event('farming420:state-changed'));
}, true);
