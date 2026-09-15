import assert from 'node:assert/strict';
import test from 'node:test';

import { listProfiles, selectProfile, syncByUsername } from '../src/live-sync.js';
import { STORAGE_KEY } from '../src/config.js';
import { installLocalStorage, uninstallLocalStorage } from './local-storage-stub.js';

const KEY = '11111111-2222-3333-4444-555555555555';
const UUID = '069a79f444e94726a5befca90e38aaf5';

const SKILL_RESOURCES = {
  success: true,
  skills: {
    FARMING: { name: 'Farming', maxLevel: 60, levels: [{ level: 1, totalExpRequired: 50 }, { level: 2, totalExpRequired: 175 }] },
  },
};

function profilesPayload(overrides = {}) {
  return {
    success: true,
    profiles: [
      {
        profile_id: 'profile-a',
        cute_name: 'Apple',
        selected: false,
        members: { [UUID]: { player_data: { experience: { SKILL_FARMING: 60 } } } },
      },
      {
        profile_id: 'profile-b',
        cute_name: 'Banana',
        selected: true,
        game_mode: 'ironman',
        members: { [UUID]: { player_data: { experience: { SKILL_FARMING: 200 } } } },
      },
    ],
    ...overrides,
  };
}

const GARDEN_PAYLOAD = {
  success: true,
  garden: {
    crop_upgrade_levels: { WHEAT: 5, MELON: 3 },
    unlocked_plots_ids: ['beginner_1', 'beginner_2', 'beginner_3'],
    garden_experience: 12345,
  },
};

/** Routes requests by URL fragment so each test states only what it cares about. */
function apiFetch(routes) {
  const calls = [];
  const impl = async url => {
    calls.push(url);
    const hit = Object.entries(routes).find(([fragment]) => url.includes(fragment));
    if (!hit) throw new TypeError(`unrouted request: ${url}`);
    const value = typeof hit[1] === 'function' ? hit[1](url) : hit[1];
    if (value instanceof Error) throw value;
    return { ok: true, status: 200, json: async () => value };
  };
  impl.calls = calls;
  return impl;
}

const RESOLVERS = [{ id: 'test', label: 'test', origin: 'https://resolver.test', official: true, url: name => `https://resolver.test/${name}` }];

function baseOptions(routes, extra = {}) {
  return {
    username: 'Notch',
    apiKey: KEY,
    resolvers: RESOLVERS,
    fetchImpl: apiFetch(routes),
    ...extra,
  };
}

test.beforeEach(() => installLocalStorage());
test.afterEach(() => uninstallLocalStorage());

test('the in-game selected profile is chosen by default', () => {
  assert.equal(selectProfile(profilesPayload()).profile_id, 'profile-b');
});

test('an explicit profile id overrides the selected one', () => {
  assert.equal(selectProfile(profilesPayload(), 'profile-a').profile_id, 'profile-a');
});

test('an unknown explicit profile id falls back to the selected profile', () => {
  assert.equal(selectProfile(profilesPayload(), 'no-such-profile').profile_id, 'profile-b');
});

test('a single profile is used even when nothing is marked selected', () => {
  const single = { profiles: [{ profile_id: 'only', members: {} }] };
  assert.equal(selectProfile(single).profile_id, 'only');
});

test('ambiguous profiles are refused rather than guessed', () => {
  const payload = profilesPayload();
  payload.profiles.forEach(profile => { profile.selected = false; });
  assert.throws(() => selectProfile(payload), /No profile is marked as selected/);
});

test('an empty profile list blames the SkyBlock API setting', () => {
  assert.throws(() => selectProfile({ profiles: [] }), /SkyBlock API setting may be disabled/);
});

test('the profile list is reduced to what the picker needs', () => {
  assert.deepEqual(listProfiles(profilesPayload()), [
    { profileId: 'profile-a', profileName: 'Apple', gameMode: null, selected: false },
    { profileId: 'profile-b', profileName: 'Banana', gameMode: 'ironman', selected: true },
  ]);
});

test('a username sync fills profile and garden data in one call', async () => {
  const report = await syncByUsername(baseOptions({
    'resolver.test': { id: UUID, name: 'Notch' },
    '/v2/resources/skyblock/skills': SKILL_RESOURCES,
    '/v2/skyblock/profiles': profilesPayload(),
    '/v2/skyblock/garden': GARDEN_PAYLOAD,
  }));

  assert.equal(report.playerUuid, UUID);
  assert.equal(report.playerName, 'Notch');
  assert.equal(report.profileId, 'profile-b');
  assert.equal(report.profileName, 'Banana');
  assert.equal(report.farmingXp, 200);
  assert.equal(report.farmingLevel, 2, 'the level is derived from the keyless skill table');
  assert.equal(report.gardenSynced, true);
  assert.equal(report.cropUpgradesImported, 2);
  assert.equal(report.unlockedPlots, 3);
  assert.equal(report.mode, 'direct');
  assert.deepEqual(report.availableProfiles.map(entry => entry.profileId), ['profile-a', 'profile-b']);

  const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
  assert.equal(stored.profile.normalizedSnapshot.identity.playerUuid, UUID);
  assert.equal(stored.profile.normalizedSnapshot.identity.playerName, 'Notch');
  assert.equal(stored.profile.normalizedSnapshot.garden.cropUpgrades.wheat, 5);
  assert.equal(stored.profile.normalizedSnapshot.skills.farming.level, 2);
});

test('the garden endpoint is called with the profile id, not the player uuid', async () => {
  const fetchImpl = apiFetch({
    'resolver.test': { id: UUID, name: 'Notch' },
    '/v2/resources/skyblock/skills': SKILL_RESOURCES,
    '/v2/skyblock/profiles': profilesPayload(),
    '/v2/skyblock/garden': GARDEN_PAYLOAD,
  });
  await syncByUsername({ username: 'Notch', apiKey: KEY, resolvers: RESOLVERS, fetchImpl });
  const gardenCall = fetchImpl.calls.find(url => url.includes('/v2/skyblock/garden'));
  assert.ok(gardenCall.includes('profile=profile-b'));
  assert.ok(!gardenCall.includes(UUID));
});

test('a supplied UUID skips username resolution entirely', async () => {
  const fetchImpl = apiFetch({
    '/v2/resources/skyblock/skills': SKILL_RESOURCES,
    '/v2/skyblock/profiles': profilesPayload(),
    '/v2/skyblock/garden': GARDEN_PAYLOAD,
  });
  const report = await syncByUsername({
    playerUuid: '069a79f4-44e9-4726-a5be-fca90e38aaf5',
    apiKey: KEY,
    resolvers: RESOLVERS,
    fetchImpl,
  });
  assert.equal(report.playerUuid, UUID);
  assert.equal(report.resolver, null);
  assert.ok(!fetchImpl.calls.some(url => url.includes('resolver.test')));
});

test('a failing Garden request keeps the profile data and reports the reason', async () => {
  const report = await syncByUsername(baseOptions({
    'resolver.test': { id: UUID, name: 'Notch' },
    '/v2/resources/skyblock/skills': SKILL_RESOURCES,
    '/v2/skyblock/profiles': profilesPayload(),
    '/v2/skyblock/garden': new TypeError('Failed to fetch'),
  }));
  assert.equal(report.gardenSynced, false);
  assert.equal(report.farmingLevel, 2, 'profile data still landed');
  assert.ok(report.warnings.some(warning => /Garden data could not be synced/.test(warning)));
});

test('a missing skill table leaves the level underived instead of guessed', async () => {
  const report = await syncByUsername(baseOptions({
    'resolver.test': { id: UUID, name: 'Notch' },
    '/v2/resources/skyblock/skills': new TypeError('offline'),
    '/v2/skyblock/profiles': profilesPayload(),
    '/v2/skyblock/garden': GARDEN_PAYLOAD,
  }));
  assert.equal(report.farmingXp, 200, 'raw XP is still recorded');
  assert.equal(report.farmingLevel, null);
  assert.ok(report.warnings.some(warning => /skill level table/.test(warning)));
});

test('a failing profiles request aborts the sync', async () => {
  await assert.rejects(
    () => syncByUsername(baseOptions({
      'resolver.test': { id: UUID, name: 'Notch' },
      '/v2/resources/skyblock/skills': SKILL_RESOURCES,
      '/v2/skyblock/profiles': new TypeError('Failed to fetch'),
    })),
    /Could not reach the Hypixel API/,
  );
});

test('a community-mirror resolution is flagged in the warnings', async () => {
  const report = await syncByUsername(baseOptions({
    'mirror.test': { id: UUID, name: 'Notch' },
    '/v2/resources/skyblock/skills': SKILL_RESOURCES,
    '/v2/skyblock/profiles': profilesPayload(),
    '/v2/skyblock/garden': GARDEN_PAYLOAD,
  }, {
    resolvers: [{ id: 'mirror', origin: 'https://mirror.test', official: false, url: name => `https://mirror.test/${name}` }],
  }));
  assert.equal(report.resolverIsOfficial, false);
  assert.ok(report.warnings.some(warning => /community mirror/.test(warning)));
});

test('syncing without any configured access explains what to do', async () => {
  await assert.rejects(
    () => syncByUsername({
      username: 'Notch',
      resolvers: RESOLVERS,
      fetchImpl: apiFetch({
        'resolver.test': { id: UUID, name: 'Notch' },
        '/v2/resources/skyblock/skills': SKILL_RESOURCES,
      }),
    }),
    /No Hypixel access is configured/,
  );
});

test('an unconfigured sync fails before any resolver request is spent', async () => {
  const fetchImpl = apiFetch({ 'resolver.test': { id: UUID, name: 'Notch' } });
  await assert.rejects(
    () => syncByUsername({ username: 'Notch', resolvers: RESOLVERS, fetchImpl }),
    /No Hypixel access is configured/,
  );
  assert.equal(fetchImpl.calls.length, 0, 'no request may be made without configured access');
});
