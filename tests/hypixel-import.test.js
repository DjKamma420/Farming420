import assert from 'node:assert/strict';
import test from 'node:test';

import {
  cropIdFromApiKey,
  extractGardenData,
  extractProfileData,
  farmingLevelFromResources,
} from '../src/hypixel-import.js';
import { CROPS } from '../src/data.js';

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

test('every known Garden crop key maps to a crop this app models', () => {
  const ids = new Set(CROPS.map(entry => entry.id));
  for (const key of ['WHEAT', 'CARROT_ITEM', 'INK_SACK:3', 'NETHER_STALK', 'SUNFLOWER', 'MOONFLOWER', 'WILD_ROSE']) {
    const cropId = cropIdFromApiKey(key);
    assert.ok(cropId, `${key} should map to a crop`);
    assert.ok(ids.has(cropId), `${key} mapped to unknown crop "${cropId}"`);
  }
});

test('crop keys are matched case- and whitespace-insensitively', () => {
  assert.equal(cropIdFromApiKey(' sugar cane '), 'sugar-cane');
  assert.equal(cropIdFromApiKey('Melon'), 'melon');
});

test('an unknown crop key returns null instead of guessing', () => {
  assert.equal(cropIdFromApiKey('SOME_FUTURE_CROP'), null);
  assert.equal(cropIdFromApiKey(''), null);
  assert.equal(cropIdFromApiKey(undefined), null);
});

test('Garden data is read from a wrapped, a nested and a bare payload', () => {
  const garden = { crop_upgrade_levels: { WHEAT: 5 } };
  for (const payload of [{ garden }, { garden_data: garden }, garden]) {
    assert.equal(extractGardenData(payload).cropUpgrades.wheat, 5);
  }
});

test('a payload without Garden data is rejected', () => {
  assert.throws(() => extractGardenData({ unrelated: true }), /No Garden data/);
  assert.throws(() => extractGardenData(null), /No Garden data/);
});

test('crop upgrade levels are clamped to the sourced 0-9 range', () => {
  const parsed = extractGardenData({
    garden: { crop_upgrade_levels: { WHEAT: 99, CARROT: -4, MELON: 'nonsense' } },
  });
  assert.equal(parsed.cropUpgrades.wheat, 9);
  assert.equal(parsed.cropUpgrades.carrot, 0);
  assert.equal(parsed.cropUpgrades.melon, 0);
});

test('unknown crop keys are reported rather than silently dropped', () => {
  const parsed = extractGardenData({ garden: { crop_upgrade_levels: { WHEAT: 1, FUTURE_CROP: 3 } } });
  assert.deepEqual(parsed.unknownCropKeys, ['FUTURE_CROP']);
  assert.equal(parsed.cropUpgrades.wheat, 1);
  assert.equal(Object.keys(parsed.cropUpgrades).length, 1);
});

test('unlocked plots are de-duplicated and capped at 24', () => {
  assert.equal(extractGardenData({ garden: { unlocked_plots_ids: ['beginner_1', 'beginner_1', 'beginner_2'] } }).unlockedPlots, 2);
  assert.equal(extractGardenData({ garden: { unlocked_plots_ids: Array.from({ length: 40 }, (_, i) => `plot_${i}`) } }).unlockedPlots, 24);
});

test('a missing plot list stays unknown instead of becoming zero', () => {
  assert.equal(extractGardenData({ garden: { crop_upgrade_levels: {} } }).unlockedPlots, null);
});

test('a single-member profile payload resolves without a UUID', () => {
  const parsed = extractProfileData({
    profiles: [{
      profile_id: 'abc',
      cute_name: 'Mango',
      members: { '1111aaaa': { player_data: { experience: { SKILL_FARMING: 200 } } } },
    }],
  });
  assert.equal(parsed.profileId, 'abc');
  assert.equal(parsed.profileName, 'Mango');
  assert.equal(parsed.playerUuid, '1111aaaa');
  assert.equal(parsed.farmingXp, 200);
  assert.deepEqual(parsed.warnings, []);
});

test('a co-op profile needs a UUID and accepts a dashed one', () => {
  const payload = {
    profiles: [{
      profile_id: 'abc',
      cute_name: 'Mango',
      members: {
        '1111aaaa': { player_data: { experience: { SKILL_FARMING: 10 } } },
        '2222bbbb': { player_data: { experience: { SKILL_FARMING: 999 } } },
      },
    }],
  };
  assert.throws(() => extractProfileData(payload), /Enter your Minecraft UUID/);
  assert.equal(extractProfileData(payload, { playerUuid: '2222-bbbb' }).farmingXp, 999);
});

test('an ambiguous multi-profile payload is refused unless one is selected', () => {
  const profiles = [
    { profile_id: 'a', members: { '1111aaaa': {} } },
    { profile_id: 'b', selected: true, cute_name: 'Kiwi', members: { '1111aaaa': { experience_skill_farming: 55 } } },
  ];
  assert.throws(() => extractProfileData({ profiles: profiles.map(p => ({ ...p, selected: false })) }), /No unambiguous SkyBlock profile/);
  assert.equal(extractProfileData({ profiles }).profileName, 'Kiwi');
});

test('missing Farming XP is reported as a warning instead of a fabricated value', () => {
  const parsed = extractProfileData({ profiles: [{ profile_id: 'a', members: { '1111aaaa': {} } }] });
  assert.equal(parsed.farmingXp, null);
  assert.equal(parsed.warnings.length, 1);
  assert.match(parsed.warnings[0], /No Farming Skill XP/);
});

test('the Farming level is derived from the official resource table', () => {
  assert.equal(farmingLevelFromResources(0, SKILL_RESOURCES), 0);
  assert.equal(farmingLevelFromResources(49, SKILL_RESOURCES), 0);
  assert.equal(farmingLevelFromResources(50, SKILL_RESOURCES), 1);
  assert.equal(farmingLevelFromResources(374, SKILL_RESOURCES), 2);
  assert.equal(farmingLevelFromResources(10_000_000, SKILL_RESOURCES), 3);
});

test('an unusable resource table yields null rather than a guessed level', () => {
  assert.equal(farmingLevelFromResources(1000, {}), null);
  assert.equal(farmingLevelFromResources(1000, { skills: { FARMING: {} } }), null);
});
