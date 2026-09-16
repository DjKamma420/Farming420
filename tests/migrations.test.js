import assert from 'node:assert/strict';
import test from 'node:test';

import { DATA_SCHEMA_VERSION } from '../src/config.js';
import { ensureProgressBucket, migrateState, toolKeyForCropId } from '../src/migrations.js';

const CROP_UPGRADE_ID = 'crop-progression-crop-upgrade-selected-crop';
const TOOL_LEVEL_ID = 'tool-mk-ii';
const FARMING_LEVEL_ID = 'account-skill-farming-skill-level';

test('toolKeyForCropId gives Sunflower and Moonflower the same Eclipse Sickle bucket', () => {
  assert.equal(toolKeyForCropId('sunflower'), toolKeyForCropId('moonflower'));
  assert.equal(toolKeyForCropId('sunflower'), 'eclipse-sickle');
});

test('toolKeyForCropId keeps unrelated crops on separate tools', () => {
  assert.notEqual(toolKeyForCropId('melon'), toolKeyForCropId('pumpkin'));
  assert.equal(toolKeyForCropId('wheat'), 'euclid-s-wheat-sickle');
});

test('toolKeyForCropId falls back to the default crop for unknown ids', () => {
  assert.equal(toolKeyForCropId('not-a-crop'), toolKeyForCropId('melon'));
  assert.equal(toolKeyForCropId(undefined), toolKeyForCropId('melon'));
});

test('ensureProgressBucket creates every progress field exactly once', () => {
  const container = {};
  const bucket = ensureProgressBucket(container, 'melon');
  bucket.levels.example = 3;
  assert.deepEqual(Object.keys(bucket).sort(), ['costs', 'levels', 'manualGain', 'owned']);
  assert.equal(ensureProgressBucket(container, 'melon').levels.example, 3);
});

test('an empty state migrates to the current schema version', () => {
  const result = migrateState({});
  assert.equal(result.schemaVersion, DATA_SCHEMA_VERSION);
  assert.equal(result.isNewer, false);
  assert.equal(result.state.profile.normalizedSnapshot, null);
});

test('v1 account-scoped crop and tool entries move onto the selected setup', () => {
  const result = migrateState({
    schemaVersion: 1,
    selectedCrop: 'sunflower',
    profile: {
      levels: { [CROP_UPGRADE_ID]: 7, [TOOL_LEVEL_ID]: 4, [FARMING_LEVEL_ID]: 50 },
      owned: { [CROP_UPGRADE_ID]: true },
      costs: { [TOOL_LEVEL_ID]: 1000 },
    },
  });

  const profile = result.state.profile;
  assert.equal(profile.cropProgress.sunflower.levels[CROP_UPGRADE_ID], 7);
  assert.equal(profile.cropProgress.sunflower.owned[CROP_UPGRADE_ID], true);
  assert.equal(profile.toolProgress['eclipse-sickle'].levels[TOOL_LEVEL_ID], 4);
  assert.equal(profile.toolProgress['eclipse-sickle'].costs[TOOL_LEVEL_ID], 1000);
  assert.equal(profile.normalizedSnapshot, null);

  // Account-scoped progress must stay where it is.
  assert.equal(profile.levels[FARMING_LEVEL_ID], 50);
  assert.equal(profile.levels[CROP_UPGRADE_ID], undefined);
  assert.equal(profile.levels[TOOL_LEVEL_ID], undefined);
  assert.deepEqual(result.applied, [2, 3, 4, 5]);
});

test('v1 tool entries stored inside a crop bucket move to the physical tool bucket', () => {
  const result = migrateState({
    schemaVersion: 1,
    selectedCrop: 'melon',
    profile: {
      cropProgress: {
        moonflower: { levels: { [TOOL_LEVEL_ID]: 6, [CROP_UPGRADE_ID]: 2 } },
      },
    },
  });

  const profile = result.state.profile;
  assert.equal(profile.toolProgress['eclipse-sickle'].levels[TOOL_LEVEL_ID], 6);
  assert.equal(profile.cropProgress.moonflower.levels[TOOL_LEVEL_ID], undefined);
  // Crop-scoped progress in the same bucket is untouched.
  assert.equal(profile.cropProgress.moonflower.levels[CROP_UPGRADE_ID], 2);
});

test('a value already present in the destination is never overwritten', () => {
  const result = migrateState({
    schemaVersion: 1,
    selectedCrop: 'melon',
    profile: {
      levels: { [TOOL_LEVEL_ID]: 1 },
      toolProgress: { 'melon-dicer': { levels: { [TOOL_LEVEL_ID]: 9 } } },
    },
  });
  assert.equal(result.state.profile.toolProgress['melon-dicer'].levels[TOOL_LEVEL_ID], 9);
});

test('schema 2 gains a null normalized snapshot without changing existing profile data', () => {
  const state = {
    schemaVersion: 2,
    selectedCrop: 'melon',
    profile: {
      name: 'Existing profile',
      levels: { [FARMING_LEVEL_ID]: 52 },
      cropProgress: {},
      toolProgress: {},
    },
  };
  const result = migrateState(state);
  assert.deepEqual(result.applied, [3, 4, 5]);
  assert.equal(result.state.profile.normalizedSnapshot, null);
  assert.equal(result.state.profile.name, 'Existing profile');
  assert.equal(result.state.profile.levels[FARMING_LEVEL_ID], 52);
});

test('schema 3 keeps an existing normalized snapshot untouched', () => {
  const snapshot = { modelVersion: 1, identity: { profileName: 'Mango' } };
  const result = migrateState({
    schemaVersion: 3,
    profile: { normalizedSnapshot: snapshot },
  });
  assert.deepEqual(result.applied, [4, 5]);
  assert.deepEqual(result.state.profile.normalizedSnapshot, snapshot, 'the snapshot survives the setup migration');
});

test('schema 4 adds setups without touching existing progression', () => {
  const result = migrateState({
    schemaVersion: 3,
    profile: {
      name: 'Existing profile',
      levels: { [FARMING_LEVEL_ID]: 52 },
      normalizedSnapshot: null,
    },
  });
  assert.deepEqual(result.applied, [4, 5]);
  assert.equal(result.state.profile.name, 'Existing profile');
  assert.equal(result.state.profile.levels[FARMING_LEVEL_ID], 52);
  assert.equal(result.state.profile.setups.list.length, 3);
  assert.equal(result.state.profile.setups.activeId, 'normal');
  // Every slot starts empty; a migration must never invent a loadout.
  for (const setup of result.state.profile.setups.list) {
    assert.ok(Object.values(setup.slots).every(slot => slot === null));
  }
});

test('setups a player already has are normalized, not replaced', () => {
  const result = migrateState({
    schemaVersion: 3,
    profile: {
      setups: { activeId: 'mine', list: [{ id: 'mine', name: 'My setup', slots: { helmet: { displayName: 'Helianthus Helmet' } } }] },
    },
  });
  const setups = result.state.profile.setups;
  assert.equal(setups.list.length, 1);
  assert.equal(setups.list[0].name, 'My setup');
  assert.equal(setups.list[0].slots.helmet.displayName, 'Helianthus Helmet');
  assert.equal(setups.list[0].slots.boots, null, 'missing slots are filled in as empty');
});

test('migration is idempotent', () => {
  const legacy = {
    schemaVersion: 1,
    selectedCrop: 'cactus',
    profile: { levels: { [CROP_UPGRADE_ID]: 5 }, costs: { [TOOL_LEVEL_ID]: 42 } },
  };
  const once = migrateState(legacy).state;
  const twice = migrateState(structuredClone(once)).state;
  assert.deepEqual(twice, once);
});

test('migration never mutates the input state', () => {
  const legacy = { schemaVersion: 1, profile: { levels: { [CROP_UPGRADE_ID]: 3 } } };
  const snapshot = structuredClone(legacy);
  migrateState(legacy);
  assert.deepEqual(legacy, snapshot);
});

test('state from a newer app version is reported and left untouched', () => {
  const future = { schemaVersion: DATA_SCHEMA_VERSION + 1, profile: { levels: { [CROP_UPGRADE_ID]: 1 } } };
  const result = migrateState(future);
  assert.equal(result.isNewer, true);
  assert.equal(result.schemaVersion, DATA_SCHEMA_VERSION + 1);
  assert.deepEqual(result.applied, []);
  assert.deepEqual(result.state, future);
});

test('an unknown crop bucket is kept and reported instead of dropped', () => {
  const result = migrateState({
    schemaVersion: 1,
    profile: { cropProgress: { 'removed-crop': { levels: { [TOOL_LEVEL_ID]: 3 } } } },
  });
  assert.equal(result.state.profile.cropProgress['removed-crop'].levels[TOOL_LEVEL_ID], 3);
  assert.equal(result.warnings.length, 1);
  assert.match(result.warnings[0], /removed-crop/);
});

test('a state without a schema version is treated as the oldest schema', () => {
  const result = migrateState({ profile: { levels: { [CROP_UPGRADE_ID]: 4 } } });
  assert.deepEqual(result.applied, [2, 3, 4, 5]);
  assert.equal(result.state.profile.cropProgress.melon.levels[CROP_UPGRADE_ID], 4);
  assert.equal(result.state.profile.normalizedSnapshot, null);
});

test('a non-object state does not throw', () => {
  for (const input of [null, undefined, 'text', 7]) {
    assert.equal(migrateState(input).schemaVersion, DATA_SCHEMA_VERSION);
  }
});

test('schema 5 moves tool progress to the renamed tools without losing it', () => {
  const result = migrateState({
    schemaVersion: 4,
    profile: {
      toolProgress: {
        'euclid-s-wheat-hoe': { levels: { [TOOL_LEVEL_ID]: 7 }, owned: { [TOOL_LEVEL_ID]: true }, costs: {}, manualGain: {} },
        'eclipse-hoe': { levels: { 'tool-farming-for-dummies': 5 }, owned: {}, costs: {}, manualGain: {} },
        'melon-dicer': { levels: { [TOOL_LEVEL_ID]: 3 }, owned: {}, costs: {}, manualGain: {} },
      },
    },
  });

  const progress = result.state.profile.toolProgress;
  assert.equal(progress['euclid-s-wheat-sickle'].levels[TOOL_LEVEL_ID], 7);
  assert.equal(progress['euclid-s-wheat-sickle'].owned[TOOL_LEVEL_ID], true);
  assert.equal(progress['eclipse-sickle'].levels['tool-farming-for-dummies'], 5);
  assert.equal(progress['melon-dicer'].levels[TOOL_LEVEL_ID], 3, 'an unrenamed tool is left alone');
  assert.equal(progress['euclid-s-wheat-hoe'], undefined, 'the old key is removed');
  assert.equal(progress['eclipse-hoe'], undefined);
  assert.ok(result.warnings.some(note => /euclid-s-wheat-hoe/.test(note)), 'the move is reported');
});

test('a value already under the new tool key is never overwritten by the old one', () => {
  const result = migrateState({
    schemaVersion: 4,
    profile: {
      toolProgress: {
        'eclipse-hoe': { levels: { [TOOL_LEVEL_ID]: 1 }, owned: {}, costs: {}, manualGain: {} },
        'eclipse-sickle': { levels: { [TOOL_LEVEL_ID]: 9 }, owned: {}, costs: {}, manualGain: {} },
      },
    },
  });
  assert.equal(result.state.profile.toolProgress['eclipse-sickle'].levels[TOOL_LEVEL_ID], 9);
});

test('the tool rename migration is idempotent', () => {
  const legacy = {
    schemaVersion: 4,
    profile: { toolProgress: { 'gauss-carrot-hoe': { levels: { [TOOL_LEVEL_ID]: 4 }, owned: {}, costs: {}, manualGain: {} } } },
  };
  const once = migrateState(legacy).state;
  const twice = migrateState(structuredClone(once)).state;
  assert.deepEqual(twice.profile.toolProgress, once.profile.toolProgress);
  assert.equal(once.profile.toolProgress['gauss-carrot-shovel'].levels[TOOL_LEVEL_ID], 4);
});

test('a state with no tool progress survives the rename migration', () => {
  assert.doesNotThrow(() => migrateState({ schemaVersion: 4, profile: {} }));
  assert.doesNotThrow(() => migrateState({ schemaVersion: 4 }));
});
