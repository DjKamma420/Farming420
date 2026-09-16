import { CROPS, UPGRADES } from './data.js';
import { createDefaultSetups, normalizeSetups } from './setups.js';
import { DATA_SCHEMA_VERSION } from './config.js';

const PROGRESS_FIELDS = ['levels', 'owned', 'costs', 'manualGain'];
const DEFAULT_CROP_ID = 'melon';

/**
 * Physical farming tools are shared by more than one crop. Sunflower and
 * Moonflower both use the Eclipse Hoe, so tool progress is keyed by the tool
 * itself instead of by the crop that happens to be selected.
 */
export function toolKeyForCropId(cropId) {
  const info = CROPS.find(entry => entry.id === cropId)
    || CROPS.find(entry => entry.id === DEFAULT_CROP_ID)
    || CROPS[0];
  return info.tool.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export function ensureProgressBucket(container, key) {
  const bucket = container[key] ||= {};
  for (const field of PROGRESS_FIELDS) bucket[field] ||= {};
  return bucket;
}

function moveField(source, destination, itemId) {
  let changed = false;
  for (const field of PROGRESS_FIELDS) {
    source[field] ||= {};
    if (source[field][itemId] === undefined) continue;
    if (destination[field][itemId] === undefined) destination[field][itemId] = source[field][itemId];
    delete source[field][itemId];
    changed = true;
  }
  return changed;
}

/**
 * Schema 1 -> 2
 *
 * Early builds stored crop-scoped and tool-scoped entries at account scope, and
 * the build after that stored tool entries inside each crop bucket. Both shapes
 * are moved onto their owning crop/tool bucket without discarding user values:
 * an existing value in the destination always wins.
 */
function migrateScopedProgress(state, warnings) {
  const profile = state.profile ||= {};
  profile.levels ||= {};
  profile.owned ||= {};
  profile.costs ||= {};
  profile.manualGain ||= {};
  profile.cropProgress ||= {};
  profile.toolProgress ||= {};

  const selectedCrop = CROPS.some(entry => entry.id === state.selectedCrop)
    ? state.selectedCrop
    : DEFAULT_CROP_ID;
  const cropItems = UPGRADES.filter(item => item.section === 'crops');
  const toolItems = UPGRADES.filter(item => item.section === 'tools');

  for (const item of cropItems) {
    moveField(profile, ensureProgressBucket(profile.cropProgress, selectedCrop), item.id);
  }
  for (const item of toolItems) {
    moveField(profile, ensureProgressBucket(profile.toolProgress, toolKeyForCropId(selectedCrop)), item.id);
  }

  for (const [cropId, bucket] of Object.entries(profile.cropProgress)) {
    if (!CROPS.some(entry => entry.id === cropId)) {
      warnings.push(`Kept unknown crop bucket "${cropId}" untouched.`);
      continue;
    }
    const destination = ensureProgressBucket(profile.toolProgress, toolKeyForCropId(cropId));
    for (const item of toolItems) moveField(bucket, destination, item.id);
  }
}

/**
 * Schema 2 -> 3
 *
 * The normalized profile snapshot becomes the stable boundary between raw API
 * payloads and future calculation/recommendation engines. Existing users have
 * no snapshot until they import or sync again, so the migration must preserve
 * that distinction instead of manufacturing empty automatic data.
 */
function migrateNormalizedSnapshot(state) {
  const profile = state.profile ||= {};
  if (!Object.hasOwn(profile, 'normalizedSnapshot')) profile.normalizedSnapshot = null;
}

/**
 * Ordered migration registry. Each entry raises the stored schema to `to` and
 * must be idempotent, because a state can be re-migrated after a backup
 * restore. Never delete an entry: old backups still arrive at old versions.
 */
/**
 * Schema 3 -> 4
 *
 * Adds the item-centric setup model. Existing progression entries are left
 * exactly as they are: setups are a new, parallel view of gear, not a
 * replacement, so nothing the player already entered is moved or dropped.
 */
function migrateSetups(state) {
  const profile = state.profile ||= {};
  profile.setups = profile.setups ? normalizeSetups(profile.setups) : createDefaultSetups();
}

const MIGRATIONS = [
  {
    to: 2,
    description: 'Move crop and tool progress into their own scoped buckets.',
    run: migrateScopedProgress,
  },
  {
    to: 3,
    description: 'Add the normalized profile snapshot boundary.',
    run: migrateNormalizedSnapshot,
  },
  {
    to: 4,
    description: 'Add item-centric farming setups.',
    run: migrateSetups,
  },
];

export const KNOWN_SCHEMA_VERSIONS = MIGRATIONS.map(migration => migration.to);

/**
 * Brings a stored state up to `DATA_SCHEMA_VERSION`.
 *
 * State written by a newer app version is never rewritten or downgraded; it is
 * returned untouched with `isNewer` set so the caller can refuse to save over
 * it instead of destroying data the running version does not understand.
 *
 * @param {object} rawState state as read from storage or a backup
 * @returns {{state: object, schemaVersion: number, applied: number[], warnings: string[], isNewer: boolean}}
 */
export function migrateState(rawState) {
  const state = (rawState && typeof rawState === 'object') ? structuredClone(rawState) : {};
  const stored = Number(state.schemaVersion);
  const from = Number.isFinite(stored) && stored > 0 ? stored : 1;
  const applied = [];
  const warnings = [];

  if (from > DATA_SCHEMA_VERSION) {
    return { state, schemaVersion: from, applied, warnings, isNewer: true };
  }

  for (const migration of MIGRATIONS) {
    if (migration.to <= from || migration.to > DATA_SCHEMA_VERSION) continue;
    migration.run(state, warnings);
    applied.push(migration.to);
  }

  state.schemaVersion = DATA_SCHEMA_VERSION;
  return { state, schemaVersion: DATA_SCHEMA_VERSION, applied, warnings, isNewer: false };
}
