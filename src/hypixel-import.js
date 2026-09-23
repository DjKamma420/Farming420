import { DATA_SCHEMA_VERSION, STORAGE_KEY } from './config.js';
import { ensureProgressBucket, migrateState } from './migrations.js';

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
  let stored = {};
  try {
    stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  } catch {
    stored = {};
  }
  // Import always writes into the current schema shape, never into an old one.
  const state = migrateState(stored).state;
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

function normalizeCropKey(value) {
  return String(value || '').trim().toUpperCase().replaceAll(' ', '_');
}

export function cropIdFromApiKey(value) {
  const key = normalizeCropKey(value);
  if (CROP_KEYS.has(key)) return CROP_KEYS.get(key);
  if (key.startsWith('INK_SACK') && key.endsWith('3')) return 'cocoa-beans';
  return null;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, Number(value) || 0));
}

function finiteFieldOrNull(value) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function findGardenObject(payload) {
  if (!payload || typeof payload !== 'object') return null;
  if (payload.garden && typeof payload.garden === 'object') return payload.garden;
  if (payload.garden_data && typeof payload.garden_data === 'object') return payload.garden_data;
  if ('crop_upgrade_levels' in payload || 'garden_experience' in payload || 'unlocked_plots_ids' in payload) return payload;
  return null;
}

/**
 * Pure adapter: reads a raw Hypixel Garden payload and returns the values
 * Farming420 understands. It performs no storage access, so it can be unit
 * tested against recorded API payloads.
 */
export function extractGardenData(payload) {
  const garden = findGardenObject(payload);
  if (!garden) throw new Error('No Garden data was found in this JSON file.');

  const cropUpgrades = {};
  const unknownCropKeys = [];
  if (garden.crop_upgrade_levels && typeof garden.crop_upgrade_levels === 'object') {
    for (const [apiKey, rawLevel] of Object.entries(garden.crop_upgrade_levels)) {
      const cropId = cropIdFromApiKey(apiKey);
      if (!cropId) {
        unknownCropKeys.push(apiKey);
        continue;
      }
      cropUpgrades[cropId] = clamp(rawLevel, 0, 9);
    }
  }

  // The app's sourced plot-Fortune progression caps this field at 24.
  const unlockedPlots = Array.isArray(garden.unlocked_plots_ids)
    ? clamp(new Set(garden.unlocked_plots_ids.map(String)).size, 0, 24)
    : null;

  return {
    cropUpgrades,
    unknownCropKeys,
    unlockedPlots,
    gardenExperience: finiteFieldOrNull(garden.garden_experience),
    uniqueVisitors: finiteFieldOrNull(garden.commission_data?.unique_npcs_served),
    totalVisitorsCompleted: finiteFieldOrNull(garden.commission_data?.total_completed),
    resourcesCollected: garden.resources_collected || null,
    composterData: garden.composter_data || null,
  };
}

export function importGardenPayload(payload) {
  const parsed = extractGardenData(payload);
  const state = readState();
  const profile = state.profile;

  for (const [cropId, level] of Object.entries(parsed.cropUpgrades)) {
    const bucket = ensureProgressBucket(profile.cropProgress, cropId);
    bucket.levels[CROP_UPGRADE_ID] = level;
    bucket.owned[CROP_UPGRADE_ID] = level > 0;
  }

  if (parsed.unlockedPlots !== null) {
    profile.levels[GARDEN_PLOTS_ID] = parsed.unlockedPlots;
    profile.owned[GARDEN_PLOTS_ID] = parsed.unlockedPlots > 0;
  }

  profile.importMeta.garden = {
    importedAt: new Date().toISOString(),
    gardenExperience: parsed.gardenExperience,
    uniqueVisitors: parsed.uniqueVisitors,
    totalVisitorsCompleted: parsed.totalVisitorsCompleted,
    resourcesCollected: parsed.resourcesCollected,
    composterData: parsed.composterData,
    unknownCropKeys: parsed.unknownCropKeys,
  };

  writeState(state);
  return {
    type: 'garden',
    cropUpgradesImported: Object.keys(parsed.cropUpgrades).length,
    unknownCropKeys: parsed.unknownCropKeys,
    unlockedPlots: parsed.unlockedPlots,
    gardenExperience: parsed.gardenExperience,
    uniqueVisitors: parsed.uniqueVisitors,
  };
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

export function farmingLevelFromResources(xp, resources) {
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

/**
 * Pure adapter: resolves the profile and member a raw Hypixel profile payload
 * refers to and returns the fields Farming420 reads. Level derivation needs the
 * official skill resource table, so it stays in `importProfilePayload`.
 */
export function extractProfileData(payload, options = {}) {
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
  const warnings = [];
  if (farmingXp === null) {
    warnings.push('No Farming Skill XP field was found for the selected member. The Skills API setting may be disabled or the payload format may be unsupported.');
  }

  return {
    profileId: selectedProfile.profile_id || null,
    profileName: selectedProfile.cute_name || null,
    playerUuid: normalizeUuid(selectedMember.key || options.playerUuid) || null,
    farmingXp: farmingXp === null ? null : Number(farmingXp),
    communityUpgrades: selectedProfile.community_upgrades || null,
    warnings,
  };
}

export async function importProfilePayload(payload, options = {}) {
  const parsed = extractProfileData(payload, options);
  const state = readState();
  const profile = state.profile;
  const report = {
    type: 'profile',
    profileId: parsed.profileId,
    profileName: parsed.profileName,
    playerUuid: parsed.playerUuid,
    farmingXp: parsed.farmingXp,
    farmingLevel: null,
    warnings: [...parsed.warnings],
  };

  if (report.profileName) profile.skyblockProfileName = report.profileName;
  if (report.profileId) profile.skyblockProfileId = report.profileId;
  if (report.playerUuid) profile.playerUuid = report.playerUuid;

  if (report.farmingXp !== null) {
    // A caller that supplies `skillResources` owns the transport: live sync
    // fetches the table once and passes it in, and passes null when that fetch
    // failed. Falling back to a request here would silently re-fetch a table
    // the caller already established is unavailable. Only a caller that omits
    // the option entirely -- raw file import, which has no other source --
    // gets the built-in fetch.
    const callerSuppliedResources = Object.hasOwn(options, 'skillResources');
    try {
      const resources = callerSuppliedResources ? options.skillResources : await fetchSkillResources();
      if (!resources) {
        report.warnings.push('Farming XP was found, but no skill-level table was available, so the level stays underived.');
      } else {
        report.farmingLevel = farmingLevelFromResources(report.farmingXp, resources);
        if (report.farmingLevel !== null) {
          profile.levels[FARMING_LEVEL_ID] = report.farmingLevel;
          profile.owned[FARMING_LEVEL_ID] = report.farmingLevel > 0;
        } else {
          report.warnings.push('Farming XP was found, but the current skill resource format could not be mapped to a level.');
        }
      }
    } catch (error) {
      report.warnings.push(`Farming XP was found, but the official skill-level table could not be loaded: ${error.message}`);
    }
  }

  profile.importMeta.profile = {
    importedAt: new Date().toISOString(),
    profileId: report.profileId,
    profileName: report.profileName,
    playerUuid: profile.playerUuid || null,
    farmingXp: report.farmingXp,
    farmingLevel: report.farmingLevel,
    communityUpgrades: parsed.communityUpgrades,
  };

  writeState(state);
  return report;
}
