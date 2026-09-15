import { DATA_SCHEMA_VERSION, STORAGE_KEY } from './config.js';

const FARMING_LEVEL_ID = 'account-skill-farming-skill-level';
const GARDEN_PLOTS_ID = 'garden-garden-plots-unlocked';
const CROP_UPGRADE_ID = 'crop-progression-crop-upgrade-selected-crop';

const CROP_KEYS = new Map([
  ['WHEAT', 'wheat'],
  ['CARROT', 'carrot'],
  ['CARROT_ITEM', 'carrot'],
  ['POTATO', 'potato'],
  ['POTATO_ITEM', 'potato'],
  ['PUMPKIN', 'pumpkin'],
  ['MELON', 'melon'],
  ['MUSHROOM', 'mushroom'],
  ['MUSHROOM_COLLECTION', 'mushroom'],
  ['RED_MUSHROOM', 'mushroom'],
  ['BROWN_MUSHROOM', 'mushroom'],
  ['CACTUS', 'cactus'],
  ['SUGAR_CANE', 'sugar-cane'],
  ['COCOA', 'cocoa-beans'],
  ['COCOA_BEANS', 'cocoa-beans'],
  ['INK_SACK:3', 'cocoa-beans'],
  ['INK_SACK-3', 'cocoa-beans'],
  ['NETHER_WART', 'nether-wart'],
  ['NETHER_STALK', 'nether-wart'],
  ['SUNFLOWER', 'sunflower'],
  ['DOUBLE_PLANT', 'sunflower'],
  ['MOONFLOWER', 'moonflower'],
  ['WILD_ROSE', 'wild-rose'],
]);

function readState() {
  let state = {};
  try {
    state = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  } catch {
    state = {};
  }
  state.schemaVersion ||= DATA_SCHEMA_VERSION;
  state.profile ||= {};
  state.profile.levels ||= {};
  state.profile.owned ||= {};
  state.profile.cropProgress ||= {};
  state.profile.toolProgress ||= {};
  state.profile.importMeta ||= {};
  return state;
}

function writeState(state) {
  state.schemaVersion = DATA_SCHEMA_VERSION;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function cropBucket(profile, cropId) {
  const bucket = profile.cropProgress[cropId] ||= {};
  bucket.levels ||= {};
  bucket.owned ||= {};
  bucket.costs ||= {};
  bucket.manualGain ||= {};
  return bucket;
}

function normalizeCropKey(value) {
  return String(value || '').trim().toUpperCase().replaceAll(' ', '_');
}

function cropIdFromApiKey(value) {
  const key = normalizeCropKey(value);
  if (CROP_KEYS.has(key)) return CROP_KEYS.get(key);
  if (key.startsWith('INK_SACK') && key.endsWith('3')) return 'cocoa-beans';
  return null;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, Number(value) || 0));
}

function findGardenObject(payload) {
  if (!payload || typeof payload !== 'object') return null;
  if (payload.garden && typeof payload.garden === 'object') return payload.garden;
  if (payload.garden_data && typeof payload.garden_data === 'object') return payload.garden_data;
  if ('crop_upgrade_levels' in payload || 'garden_experience' in payload || 'unlocked_plots_ids' in payload) return payload;
  return null;
}

export function importGardenPayload(payload) {
  const garden = findGardenObject(payload);
  if (!garden) throw new Error('No Garden data was found in this JSON file.');

  const state = readState();
  const profile = state.profile;
  const report = {
    type: 'garden',
    cropUpgradesImported: 0,
    unknownCropKeys: [],
    unlockedPlots: null,
    gardenExperience: Number(garden.garden_experience || 0),
    uniqueVisitors: Number(garden.commission_data?.unique_npcs_served || 0),
  };

  if (garden.crop_upgrade_levels && typeof garden.crop_upgrade_levels === 'object') {
    for (const [apiKey, rawLevel] of Object.entries(garden.crop_upgrade_levels)) {
      const cropId = cropIdFromApiKey(apiKey);
      if (!cropId) {
        report.unknownCropKeys.push(apiKey);
        continue;
      }
      const level = clamp(rawLevel, 0, 9);
      const bucket = cropBucket(profile, cropId);
      bucket.levels[CROP_UPGRADE_ID] = level;
      bucket.owned[CROP_UPGRADE_ID] = level > 0;
      report.cropUpgradesImported += 1;
    }
  }

  if (Array.isArray(garden.unlocked_plots_ids)) {
    // The app's sourced plot-Fortune progression caps this field at 24.
    const count = clamp(new Set(garden.unlocked_plots_ids.map(String)).size, 0, 24);
    profile.levels[GARDEN_PLOTS_ID] = count;
    profile.owned[GARDEN_PLOTS_ID] = count > 0;
    report.unlockedPlots = count;
  }

  profile.importMeta.garden = {
    importedAt: new Date().toISOString(),
    gardenExperience: report.gardenExperience,
    uniqueVisitors: report.uniqueVisitors,
    totalVisitorsCompleted: Number(garden.commission_data?.total_completed || 0),
    resourcesCollected: garden.resources_collected || null,
    composterData: garden.composter_data || null,
    unknownCropKeys: report.unknownCropKeys,
  };

  writeState(state);
  return report;
}

function profileListFromPayload(payload) {
  if (Array.isArray(payload?.profiles)) return payload.profiles;
  if (payload?.profile && typeof payload.profile === 'object') return [payload.profile];
  if (payload?.members && typeof payload.members === 'object') return [payload];
  return [];
}

function pickProfile(profiles) {
  if (profiles.length === 1) return profiles[0];
  return profiles.find(profile => profile?.selected === true) || null;
}

function memberEntries(profile) {
  const members = profile?.members;
  if (!members || typeof members !== 'object') return [];
  return Object.entries(members).filter(([, value]) => value && typeof value === 'object');
}

function normalizeUuid(value) {
  return String(value || '').replaceAll('-', '').toLowerCase();
}

function pickMember(profile, requestedUuid) {
  const entries = memberEntries(profile);
  if (!entries.length) return null;
  const target = normalizeUuid(requestedUuid);
  if (target) {
    const match = entries.find(([key, member]) => {
      const candidates = [key, member?.uuid, member?.player_id, member?.profile?.player_id].map(normalizeUuid);
      return candidates.includes(target);
    });
    if (match) return { key: match[0], member: match[1] };
  }
  if (entries.length === 1) return { key: entries[0][0], member: entries[0][1] };
  return null;
}

function getFarmingXp(member) {
  const candidates = [
    member?.player_data?.experience?.SKILL_FARMING,
    member?.player_data?.experience?.skill_farming,
    member?.experience_skill_farming,
  ];
  return candidates.find(value => Number.isFinite(Number(value))) ?? null;
}

function findFarmingSkillDefinition(payload) {
  const skills = payload?.skills || payload?.collections || {};
  return skills.FARMING || skills.farming || Object.values(skills).find(skill => String(skill?.name || '').toLowerCase() === 'farming') || null;
}

function farmingLevelFromResources(xp, resources) {
  const farming = findFarmingSkillDefinition(resources);
  if (!farming || !Array.isArray(farming.levels)) return null;
  let level = 0;
  for (const row of farming.levels) {
    const required = Number(row.totalExpRequired ?? row.total_exp_required ?? row.experienceRequired);
    const rowLevel = Number(row.level);
    if (!Number.isFinite(required) || !Number.isFinite(rowLevel)) continue;
    if (xp >= required) level = Math.max(level, rowLevel);
  }
  return clamp(level, 0, Number(farming.maxLevel || farming.max_level || 60));
}

async function fetchSkillResources() {
  const response = await fetch('https://api.hypixel.net/v2/resources/skyblock/skills', { cache: 'no-store' });
  if (!response.ok) throw new Error(`Hypixel skill resources returned HTTP ${response.status}.`);
  return response.json();
}

export async function importProfilePayload(payload, options = {}) {
  const profiles = profileListFromPayload(payload);
  const selectedProfile = pickProfile(profiles);
  if (!selectedProfile) {
    throw new Error('No unambiguous SkyBlock profile was found. Export a single profile or use a payload with a selected profile.');
  }

  const selectedMember = pickMember(selectedProfile, options.playerUuid);
  if (!selectedMember) {
    throw new Error('This profile has multiple members. Enter your Minecraft UUID in Settings before importing the profile JSON.');
  }

  const farmingXp = getFarmingXp(selectedMember.member);
  const state = readState();
  const profile = state.profile;
  const report = {
    type: 'profile',
    profileId: selectedProfile.profile_id || null,
    profileName: selectedProfile.cute_name || null,
    playerUuid: selectedMember.key || options.playerUuid || null,
    farmingXp: farmingXp === null ? null : Number(farmingXp),
    farmingLevel: null,
    warnings: [],
  };

  if (report.profileName) profile.skyblockProfileName = report.profileName;
  if (report.profileId) profile.skyblockProfileId = report.profileId;
  if (report.playerUuid) profile.playerUuid = normalizeUuid(report.playerUuid);

  if (report.farmingXp !== null) {
    try {
      const resources = await fetchSkillResources();
      report.farmingLevel = farmingLevelFromResources(report.farmingXp, resources);
      if (report.farmingLevel !== null) {
        profile.levels[FARMING_LEVEL_ID] = report.farmingLevel;
        profile.owned[FARMING_LEVEL_ID] = report.farmingLevel > 0;
      } else {
        report.warnings.push('Farming XP was found, but the current skill resource format could not be mapped to a level.');
      }
    } catch (error) {
      report.warnings.push(`Farming XP was found, but the official skill-level table could not be loaded: ${error.message}`);
    }
  } else {
    report.warnings.push('No Farming Skill XP field was found for the selected member. The Skills API setting may be disabled or the payload format may be unsupported.');
  }

  profile.importMeta.profile = {
    importedAt: new Date().toISOString(),
    profileId: report.profileId,
    profileName: report.profileName,
    playerUuid: profile.playerUuid || null,
    farmingXp: report.farmingXp,
    farmingLevel: report.farmingLevel,
    communityUpgrades: selectedProfile.community_upgrades || null,
  };

  writeState(state);
  return report;
}
