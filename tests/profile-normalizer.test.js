import assert from 'node:assert/strict';
import test from 'node:test';

import {
  PROFILE_DATA_STATUS,
  PROFILE_MODEL_VERSION,
  createEmptyProfileSnapshot,
  mergeProfileSnapshots,
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
        { level: 3, totalExpRequired: 375 },
      ],
    },
  },
};

test('empty profile snapshots have stable top-level sections', () => {
  const snapshot = createEmptyProfileSnapshot();
  assert.equal(snapshot.modelVersion, PROFILE_MODEL_VERSION);
  assert.deepEqual(Object.keys(snapshot).sort(), [
    'accountUpgrades',
    'buffs',
    'garden',
    'identity',
    'items',
    'modelVersion',
    'pets',
    'provenance',
    'skills',
    'sync',
    'unknown',
  ]);
});

test('profile normalization resolves identity, farming skill, upgrades and current pets_data', () => {
  const snapshot = normalizeProfilePayload({
    profiles: [{
      profile_id: 'profile-1',
      cute_name: 'Mango',
      game_mode: 'ironman',
      selected: true,
      community_upgrades: {
        upgrade_states: [
          { upgrade: 'example_upgrade', tier: 4, started_ms: 10, claimed_ms: 20, fasttracked: true },
        ],
      },
      members: {
        '1111aaaa': {
          player_data: { experience: { SKILL_FARMING: 200 } },
          pets_data: {
            pets: [{
              uuid: 'pet-1',
              type: 'ELEPHANT',
              tier: 'LEGENDARY',
              exp: 1234,
              active: true,
              heldItem: 'GREEN_BANDANA',
              candyUsed: 2,
            }],
          },
        },
      },
    }],
  }, {
    playerUuid: '1111-aaaa',
    skillResources: SKILL_RESOURCES,
    fetchedAt: '2026-09-15T20:00:00.000Z',
  });

  assert.equal(snapshot.identity.playerUuid, '1111aaaa');
  assert.equal(snapshot.identity.profileId, 'profile-1');
  assert.equal(snapshot.identity.profileName, 'Mango');
  assert.equal(snapshot.identity.gameMode, 'ironman');
  assert.equal(snapshot.identity.selected, true);
  assert.equal(snapshot.skills.farming.xp, 200);
  assert.equal(snapshot.skills.farming.level, 2);
  assert.equal(snapshot.skills.farming.status, PROFILE_DATA_STATUS.DERIVED);
  assert.deepEqual(snapshot.accountUpgrades, [{
    id: 'example_upgrade',
    tier: 4,
    startedAtMs: 10,
    claimedAtMs: 20,
  }]);
  assert.equal(snapshot.accountUpgrades[0].fasttracked, undefined);
  assert.deepEqual(snapshot.pets[0], {
    index: 0,
    uuid: 'pet-1',
    type: 'ELEPHANT',
    rarity: 'LEGENDARY',
    experience: 1234,
    active: true,
    heldItem: 'GREEN_BANDANA',
    candyUsed: 2,
    skin: null,
  });
  assert.equal(snapshot.sync.sources.profile.importType, 'raw-json');
  assert.equal(snapshot.provenance.pets.status, PROFILE_DATA_STATUS.AUTO);
});

test('missing skill data is represented as hidden instead of zero', () => {
  const snapshot = normalizeProfilePayload({
    profiles: [{ profile_id: 'profile-1', members: { '1111aaaa': {} } }],
  });
  assert.equal(snapshot.skills.farming.xp, null);
  assert.equal(snapshot.skills.farming.level, null);
  assert.equal(snapshot.skills.farming.status, PROFILE_DATA_STATUS.HIDDEN);
  assert.ok(snapshot.sync.warnings.some(message => message.includes('No Farming Skill XP')));
});

test('profile normalization does not invent pet fields that are absent', () => {
  const snapshot = normalizeProfilePayload({
    profiles: [{
      profile_id: 'profile-1',
      members: { '1111aaaa': { pets_data: { pets: [{ type: 'MOOSHROOM_COW' }] } } },
    }],
  });
  assert.equal(snapshot.pets[0].type, 'MOOSHROOM_COW');
  assert.equal(snapshot.pets[0].active, null);
  assert.equal(snapshot.pets[0].experience, null);
  assert.equal(snapshot.pets[0].heldItem, null);
});

test('missing pet API data is hidden instead of meaning the player owns no pets', () => {
  const snapshot = normalizeProfilePayload({
    profiles: [{ profile_id: 'profile-1', members: { '1111aaaa': {} } }],
  });
  assert.deepEqual(snapshot.pets, []);
  assert.equal(snapshot.provenance.pets.status, PROFILE_DATA_STATUS.HIDDEN);
  assert.ok(snapshot.sync.warnings.some(message => message.includes('pet list')));
});

test('garden normalization preserves plot ids, upgrades, visitors and unknown keys', () => {
  const snapshot = normalizeGardenPayload({
    garden: {
      garden_experience: 999,
      unlocked_plots_ids: ['plot_a', 'plot_b', 'plot_a'],
      crop_upgrade_levels: { WHEAT: 4, FUTURE_CROP: 2 },
      resources_collected: { WHEAT: 12345 },
      commission_data: {
        visits: 100,
        completed: { SAM: 5 },
        total_completed: 80,
        unique_npcs_served: 12,
      },
      composter_data: { organic_matter: 7 },
      active_commissions: { first: 'visitor' },
    },
  }, { fetchedAt: '2026-09-15T20:00:00.000Z' });

  assert.equal(snapshot.garden.experience, 999);
  assert.deepEqual(snapshot.garden.unlockedPlotIds, ['plot_a', 'plot_b']);
  assert.equal(snapshot.garden.unlockedPlotCount, 2);
  assert.equal(snapshot.garden.cropUpgrades.wheat, 4);
  assert.equal(snapshot.garden.visitors.visits, 100);
  assert.deepEqual(snapshot.garden.visitors.completed, { SAM: 5 });
  assert.equal(snapshot.garden.visitors.totalCompleted, 80);
  assert.equal(snapshot.garden.visitors.uniqueNpcsServed, 12);
  assert.equal(snapshot.unknown.length, 1);
  assert.equal(snapshot.unknown[0].key, 'FUTURE_CROP');
});

test('snapshot merge combines profile and Garden sections without losing either', () => {
  const profilePatch = normalizeProfilePayload({
    profiles: [{
      profile_id: 'profile-1',
      cute_name: 'Mango',
      members: {
        '1111aaaa': {
          player_data: { experience: { SKILL_FARMING: 200 } },
          pets_data: { pets: [] },
        },
      },
    }],
  }, { skillResources: SKILL_RESOURCES });
  const gardenPatch = normalizeGardenPayload({
    garden: { crop_upgrade_levels: { MELON: 6 }, unlocked_plots_ids: ['a', 'b'] },
  });

  const merged = mergeProfileSnapshots(profilePatch, gardenPatch);
  assert.equal(merged.identity.profileName, 'Mango');
  assert.equal(merged.skills.farming.level, 2);
  assert.equal(merged.garden.cropUpgrades.melon, 6);
  assert.equal(merged.garden.unlockedPlotCount, 2);
  assert.ok(merged.provenance.identity);
  assert.ok(merged.provenance.garden);
});

test('hidden item or pet collections keep last known values while marking provenance hidden', () => {
  const base = createEmptyProfileSnapshot();
  base.pets = [{ uuid: 'pet-1', type: 'ELEPHANT' }];
  base.items = [{ itemUuid: 'item-1', skyblockId: 'FARMING_TOOL' }];
  base.provenance.pets = { status: PROFILE_DATA_STATUS.AUTO, sources: [] };
  base.provenance.items = { status: PROFILE_DATA_STATUS.AUTO, sources: [] };

  const patch = createEmptyProfileSnapshot();
  patch.provenance.pets = { status: PROFILE_DATA_STATUS.HIDDEN, sources: [] };
  patch.provenance.items = { status: PROFILE_DATA_STATUS.HIDDEN, sources: [] };

  const merged = mergeProfileSnapshots(base, patch);
  assert.equal(merged.pets[0].type, 'ELEPHANT');
  assert.equal(merged.items[0].skyblockId, 'FARMING_TOOL');
  assert.equal(merged.provenance.pets.status, PROFILE_DATA_STATUS.HIDDEN);
  assert.equal(merged.provenance.items.status, PROFILE_DATA_STATUS.HIDDEN);
});

test('snapshot merge de-duplicates warnings', () => {
  const base = createEmptyProfileSnapshot();
  base.sync.warnings = ['same warning'];
  const patch = createEmptyProfileSnapshot();
  patch.sync.warnings = ['same warning', 'new warning'];
  const merged = mergeProfileSnapshots(base, patch);
  assert.deepEqual(merged.sync.warnings, ['same warning', 'new warning']);
});
