import { DATA_SCHEMA_VERSION, STORAGE_KEY } from './config.js';
import { importGardenPayload, importProfilePayload } from './hypixel-import.js';
import { migrateState } from './migrations.js';
import { extractProfileItems } from './profile-items.js';
import {
  PROFILE_DATA_STATUS,
  PROFILE_SOURCE_META,
  createEmptyProfileSnapshot,
  mergeProfileSnapshots,
  normalizeGardenPayload,
  normalizeProfilePayload,
} from './profile-normalizer.js';

function readStoredState() {
  let raw = {};
  try {
    raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  } catch {
    raw = {};
  }
  const migration = migrateState(raw);
  if (migration.isNewer) {
    throw new Error(`Stored data uses schema ${migration.schemaVersion}, but this app only understands schema ${DATA_SCHEMA_VERSION}.`);
  }
  return migration.state;
}

function writeStoredState(state) {
  state.schemaVersion = DATA_SCHEMA_VERSION;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function currentSnapshot(profile) {
  const snapshot = profile?.normalizedSnapshot;
  if (snapshot && typeof snapshot === 'object') return snapshot;
  return createEmptyProfileSnapshot();
}

/**
 * Pure state transition used by browser sync and tests. Raw API payloads are
 * never stored here; only the normalized, provenance-bearing snapshot is kept.
 */
export function attachNormalizedSnapshot(rawState, snapshotPatch) {
  const migration = migrateState(rawState);
  if (migration.isNewer) {
    throw new Error(`Cannot update schema ${migration.schemaVersion} data with schema ${DATA_SCHEMA_VERSION} code.`);
  }
  const next = migration.state;
  next.profile ||= {};
  next.profile.normalizedSnapshot = mergeProfileSnapshots(
    currentSnapshot(next.profile),
    snapshotPatch,
  );
  return next;
}

function applyDerivedFarmingLevel(snapshot, report) {
  if (report.farmingLevel === null || report.farmingLevel === undefined) return snapshot;
  snapshot.skills.farming.level = report.farmingLevel;
  snapshot.skills.farming.status = PROFILE_DATA_STATUS.DERIVED;
  snapshot.provenance['skills.farming.level'] = {
    status: PROFILE_DATA_STATUS.DERIVED,
    sources: [PROFILE_SOURCE_META.profile, PROFILE_SOURCE_META.skills],
    note: null,
  };
  return snapshot;
}

async function applyProfileItems(snapshot, payload, options = {}) {
  try {
    const itemReport = await extractProfileItems(payload, options);
    snapshot.items = itemReport.items;
    snapshot.provenance.items = {
      status: itemReport.inventoryApiAvailable ? PROFILE_DATA_STATUS.AUTO : PROFILE_DATA_STATUS.HIDDEN,
      sources: [PROFILE_SOURCE_META.profile],
      note: itemReport.inventoryApiAvailable
        ? null
        : 'The selected member payload exposes no inventory/loadout object. Last known item data, if any, must not be interpreted as freshly verified.',
    };
    snapshot.sync.sources.items = {
      fetchedAt: options.fetchedAt || null,
      importType: 'raw-json-nbt',
      encodedContainersFound: itemReport.encodedContainersFound,
      containersDecoded: itemReport.containersDecoded,
    };
    snapshot.sync.warnings.push(...itemReport.warnings);
    if (!itemReport.inventoryApiAvailable) {
      snapshot.sync.warnings.push('Inventory API data is unavailable; item ownership remains hidden rather than empty.');
    }
    return itemReport;
  } catch (error) {
    snapshot.provenance.items = {
      status: PROFILE_DATA_STATUS.UNKNOWN,
      sources: [PROFILE_SOURCE_META.profile],
      note: error.message,
    };
    snapshot.sync.warnings.push(`Item decoding was skipped: ${error.message}`);
    return null;
  }
}

export async function syncProfilePayload(payload, options = {}) {
  const report = await importProfilePayload(payload, options);
  const fetchedAt = new Date().toISOString();
  const patch = applyDerivedFarmingLevel(
    normalizeProfilePayload(payload, {
      playerUuid: options.playerUuid,
      skillResources: options.skillResources,
      fetchedAt,
    }),
    report,
  );
  // Only live sync knows the player's name; raw JSON payloads do not carry it.
  if (options.playerName) patch.identity.playerName = String(options.playerName);
  const itemReport = await applyProfileItems(patch, payload, {
    playerUuid: options.playerUuid,
    fetchedAt,
  });

  const state = attachNormalizedSnapshot(readStoredState(), patch);
  writeStoredState(state);
  return {
    ...report,
    normalizedModelVersion: state.profile.normalizedSnapshot.modelVersion,
    normalizedItems: itemReport?.items.length ?? null,
    itemContainersDecoded: itemReport?.containersDecoded ?? null,
  };
}

export function syncGardenPayload(payload, options = {}) {
  const report = importGardenPayload(payload);
  const patch = normalizeGardenPayload(payload, {
    fetchedAt: options.fetchedAt || new Date().toISOString(),
  });
  const state = attachNormalizedSnapshot(readStoredState(), patch);
  writeStoredState(state);
  return {
    ...report,
    normalizedModelVersion: state.profile.normalizedSnapshot.modelVersion,
  };
}
