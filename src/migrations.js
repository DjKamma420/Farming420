import { CROPS, UPGRADES } from './data.js';
import { createDefaultSetups, createSetup, normalizeSetups } from './setups.js';
import { DATA_SCHEMA_VERSION } from './config.js';

const PROGRESS_FIELDS = ['levels', 'owned', 'costs', 'manualGain'];
const DEFAULT_CROP_ID = 'melon';

/** Where a stored value too broken to migrate is parked instead of deleted. */
export const MIGRATION_QUARANTINE_KEY = 'unmigratableValues';

function isContainer(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Make `container[key]` a usable object, without throwing and without deleting.
 *
 * `container[key] ||= {}` was the previous idiom, and it is wrong in a way that
 * only shows up on damaged data: `||=` keeps **any** truthy value, so a stored
 * `profile` that is the string `"x"` survives the guard and the next property
 * assignment throws `Cannot create property 'levels' on string` -- in strict
 * mode, which every ES module is. The app then fails to boot at all, so the
 * player cannot even reach Export backup to rescue the rest of their profile.
 *
 * A non-object cannot be migrated into one: a string holds no crop levels. But
 * `AGENTS.md` rule 9 says user data is not destroyed, so the unusable value is
 * moved to `state[MIGRATION_QUARANTINE_KEY]` -- where a backup still carries it
 * and a human can look at it -- rather than overwritten.
 */
function ensureContainer(state, container, key, path, warnings) {
  const current = container[key];
  if (isContainer(current)) return current;
  if (current !== undefined && current !== null) {
    const quarantine = isContainer(state[MIGRATION_QUARANTINE_KEY])
      ? state[MIGRATION_QUARANTINE_KEY]
      : (state[MIGRATION_QUARANTINE_KEY] = {});
    // Keep the first value seen for a path. Re-running a migration over already
    // repaired state must not replace the original with the `{}` that replaced
    // it, which would quietly complete the deletion this exists to prevent.
    if (!(path in quarantine)) {
      quarantine[path] = current;
      warnings?.push(`${path} was ${Array.isArray(current) ? 'an array' : typeof current}, not an object; it was set aside in ${MIGRATION_QUARANTINE_KEY} and replaced with an empty one.`);
    }
  }
  container[key] = {};
  return container[key];
}

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

export function ensureProgressBucket(container, key, state = null, warnings = null) {
  const bucket = ensureContainer(state, container, key, `progress.${key}`, warnings);
  for (const field of PROGRESS_FIELDS) ensureContainer(state, bucket, field, `progress.${key}.${field}`, warnings);
  return bucket;
}

function moveField(source, destination, itemId) {
  let changed = false;
  for (const field of PROGRESS_FIELDS) {
    ensureContainer(null, source, field, `progress.${field}`, null);
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
  const profile = ensureContainer(state, state, 'profile', 'profile', warnings);
  ensureContainer(state, profile, 'levels', 'profile.levels', warnings);
  ensureContainer(state, profile, 'owned', 'profile.owned', warnings);
  ensureContainer(state, profile, 'costs', 'profile.costs', warnings);
  ensureContainer(state, profile, 'manualGain', 'profile.manualGain', warnings);
  ensureContainer(state, profile, 'cropProgress', 'profile.cropProgress', warnings);
  ensureContainer(state, profile, 'toolProgress', 'profile.toolProgress', warnings);

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
  const profile = ensureContainer(state, state, 'profile', 'profile', null);
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
  const profile = ensureContainer(state, state, 'profile', 'profile', null);
  profile.setups = profile.setups ? normalizeSetups(profile.setups) : createDefaultSetups();
}

/**
 * Schema 4 -> 5
 *
 * Hypixel renamed the specialised farming tools (Hoe -> Sickle/Shovel/Cutter),
 * and `toolKeyForCropId` derives its storage key from the tool name, so the key
 * for seven crops changed. Without this, every tool's stored progress would be
 * orphaned under its old key and the cards would read as empty.
 *
 * Merges rather than overwrites: a value already under the new key wins, so
 * re-running cannot undo newer progress.
 */
const RENAMED_TOOL_KEYS = Object.freeze({
  'euclid-s-wheat-hoe': 'euclid-s-wheat-sickle',
  'gauss-carrot-hoe': 'gauss-carrot-shovel',
  'pythagorean-potato-hoe': 'pythagorean-potato-shovel',
  'turing-sugar-cane-hoe': 'turing-sugar-cane-cutter',
  'newton-nether-wart-hoe': 'newton-nether-wart-cutter',
  'eclipse-hoe': 'eclipse-sickle',
  'wild-rose-hoe': 'wild-rose-cutter',
});

function migrateRenamedToolKeys(state, warnings) {
  const progress = state.profile?.toolProgress;
  if (!progress || typeof progress !== 'object') return;

  for (const [oldKey, newKey] of Object.entries(RENAMED_TOOL_KEYS)) {
    const old = progress[oldKey];
    if (!old) continue;
    const destination = ensureProgressBucket(progress, newKey);
    for (const field of PROGRESS_FIELDS) {
      for (const [itemId, value] of Object.entries(old[field] || {})) {
        if (destination[field][itemId] === undefined) destination[field][itemId] = value;
      }
    }
    delete progress[oldKey];
    warnings.push(`Moved tool progress from "${oldKey}" to "${newKey}" after the in-game tool rename.`);
  }
}

/**
 * Schema 5 -> 6
 *
 * Accessories now keep physical item-local state for Recombobulators and
 * Enrichments. The map starts empty so existing profiles do not gain invented
 * item upgrades during migration.
 */
function migrateAccessoryItemState(state) {
  const profile = ensureContainer(state, state, 'profile', 'profile', null);
  if (!profile.accessoryItems || typeof profile.accessoryItems !== 'object' || Array.isArray(profile.accessoryItems)) {
    profile.accessoryItems = {};
  }
}

/**
 * Schema 6 -> 7
 *
 * Enrichments are not part of Farming420's farming model. Remove the obsolete
 * per-accessory enrichment values and account-wide override while preserving
 * Recombobulator state and its sync/manual provenance.
 */
function removeAccessoryEnrichmentState(state) {
  const profile = ensureContainer(state, state, 'profile', 'profile', null);
  delete profile.enrichmentSpeedOverride;
  if (!profile.accessoryItems || typeof profile.accessoryItems !== 'object' || Array.isArray(profile.accessoryItems)) {
    profile.accessoryItems = {};
    return;
  }
  for (const itemState of Object.values(profile.accessoryItems)) {
    if (!itemState || typeof itemState !== 'object' || Array.isArray(itemState)) continue;
    delete itemState.enrichment;
  }
}

/**
 * Schema 7 -> 8
 *
 * Pest play now has two mechanically different gear phases: spawning and
 * killing. The legacy `pest` setup is kept as the spawning setup so existing
 * entered gear is preserved. A new killing setup is added empty. Custom/old
 * setups (including Jacob Contest) are retained as data, but the activity UI
 * exposes only the three calculation loadouts.
 */
function migrateThreeActivitySetups(state) {
  const profile = ensureContainer(state, state, 'profile', 'profile', null);
  const setups = normalizeSetups(profile.setups);

  const farm = setups.list.find(setup => setup.id === 'normal');
  if (farm?.name === 'Normal Farming') farm.name = 'Farming';

  const spawn = setups.list.find(setup => setup.id === 'pest');
  if (spawn?.name === 'Pest Farming') spawn.name = 'Pest Spawning';

  if (!setups.list.some(setup => setup.id === 'normal')) {
    setups.list.unshift(createSetup('normal', 'Farming'));
  }
  if (!setups.list.some(setup => setup.id === 'pest')) {
    setups.list.push(createSetup('pest', 'Pest Spawning'));
  }
  if (!setups.list.some(setup => setup.id === 'pest-kill')) {
    setups.list.push(createSetup('pest-kill', 'Pest Killing'));
  }

  if (!['normal', 'pest', 'pest-kill'].includes(setups.activeId)) setups.activeId = 'normal';
  profile.setups = setups;
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
  {
    to: 5,
    description: 'Move tool progress to the renamed specialised farming tools.',
    run: migrateRenamedToolKeys,
  },
  {
    to: 6,
    description: 'Add physical accessory Recombobulator and Enrichment state.',
    run: migrateAccessoryItemState,
  },
  {
    to: 7,
    description: 'Remove obsolete accessory Enrichment state while keeping Recombobulators.',
    run: removeAccessoryEnrichmentState,
  },
  {
    to: 8,
    description: 'Split Pest Farming into separate spawning and killing loadouts.',
    run: migrateThreeActivitySetups,
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
