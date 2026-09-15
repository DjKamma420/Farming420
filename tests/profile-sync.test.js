import assert from 'node:assert/strict';
import test from 'node:test';

import { DATA_SCHEMA_VERSION } from '../src/config.js';
import { attachNormalizedSnapshot } from '../src/profile-sync.js';
import {
  createEmptyProfileSnapshot,
  normalizeGardenPayload,
  normalizeProfilePayload,
} from '../src/profile-normalizer.js';

const SKILL_RESOURCES = {
  skills: {
    FARMING: {
      name: 'Farming',
      maxLevel: 60,
      levels: [
        { level: 1, totalExpRequired: 50 },
        { level: 2, totalExpRequired: 175 },
      ],
    },
  },
};

test('attaching the first normalized snapshot migrates schema 2 state and preserves user progress', () => {
  const state = {
    schemaVersion: 2,
    selectedCrop: 'melon',
    profile: {
      name: 'My profile',
      levels: { existing: 12 },
      cropProgress: {},
      toolProgress: {},
    },
  };
  const patch = normalizeGardenPayload({ garden: { crop_upgrade_levels: { MELON: 4 } } });
  const next = attachNormalizedSnapshot(state, patch);

  assert.equal(next.schemaVersion, DATA_SCHEMA_VERSION);
  assert.equal(next.profile.name, 'My profile');
  assert.equal(next.profile.levels.existing, 12);
  assert.equal(next.profile.normalizedSnapshot.garden.cropUpgrades.melon, 4);
  assert.equal(state.profile.normalizedSnapshot, undefined);
});

test('profile and Garden imports accumulate into one snapshot', () => {
  const profilePatch = normalizeProfilePayload({
    profiles: [{
      profile_id: 'profile-1',
      cute_name: 'Mango',
      members: { '1111aaaa': { player_data: { experience: { SKILL_FARMING: 200 } } } },
    }],
  }, { skillResources: SKILL_RESOURCES });
  const gardenPatch = normalizeGardenPayload({
    garden: { crop_upgrade_levels: { WHEAT: 5 }, unlocked_plots_ids: ['a', 'b'] },
  });

  const first = attachNormalizedSnapshot({ schemaVersion: DATA_SCHEMA_VERSION, profile: {} }, profilePatch);
  const second = attachNormalizedSnapshot(first, gardenPatch);

  assert.equal(second.profile.normalizedSnapshot.identity.profileName, 'Mango');
  assert.equal(second.profile.normalizedSnapshot.skills.farming.level, 2);
  assert.equal(second.profile.normalizedSnapshot.garden.cropUpgrades.wheat, 5);
  assert.equal(second.profile.normalizedSnapshot.garden.unlockedPlotCount, 2);
});

test('an existing normalized snapshot is merged instead of replaced', () => {
  const initial = createEmptyProfileSnapshot();
  initial.identity.profileName = 'Existing';
  initial.provenance.identity = { status: 'AUTO', sources: [] };

  const state = {
    schemaVersion: DATA_SCHEMA_VERSION,
    profile: { normalizedSnapshot: initial },
  };
  const gardenPatch = normalizeGardenPayload({ garden: { crop_upgrade_levels: { CACTUS: 3 } } });
  const next = attachNormalizedSnapshot(state, gardenPatch);

  assert.equal(next.profile.normalizedSnapshot.identity.profileName, 'Existing');
  assert.equal(next.profile.normalizedSnapshot.garden.cropUpgrades.cactus, 3);
});

test('newer-schema state is refused instead of overwritten', () => {
  assert.throws(() => attachNormalizedSnapshot({
    schemaVersion: DATA_SCHEMA_VERSION + 1,
    profile: {},
  }, createEmptyProfileSnapshot()), /Cannot update schema/);
});
