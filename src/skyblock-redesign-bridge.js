import { STORAGE_KEY } from './config.js';
import { toolKeyForCropId } from './migrations.js';

const REFORGE_ENTRY = Object.freeze({
  bountiful: 'tool-reforge-bountiful-reforge',
  blessed: 'tool-reforge-blessed-reforge',
  earthy: 'tool-reforge-earthy-reforge',
  'deep-fried': 'tool-reforge-deep-fried-reforge',
  overpriced: 'tool-reforge-overpriced-reforge',
});

function state() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch { return {}; }
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

  for (const entryId of Object.values(REFORGE_ENTRY)) {
    delete bucket.levels[entryId];
    delete bucket.owned[entryId];
  }
  const selectedEntry = REFORGE_ENTRY[reforgeId];
  if (selectedEntry) {
    bucket.levels[selectedEntry] = 1;
    bucket.owned[selectedEntry] = true;
    raw.profile.toolReforges[key] = reforgeId;
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(raw));
}

// Capture before the redesign's target listener. This makes all five visible
// choices write to the same progression bucket the planner reads.
document.addEventListener('click', event => {
  const reforge = event.target.closest?.('[data-sb-reforge]');
  if (reforge) selectReforge(reforge.dataset.sbReforge);

}, true);
