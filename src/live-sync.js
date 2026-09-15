import { createHypixelClient } from './hypixel-client.js';
import { syncGardenPayload, syncProfilePayload } from './profile-sync.js';

const UNDASHED_UUID = /^[0-9a-f]{32}$/;

/** Accepts dashed or undashed input and returns the undashed lowercase form. */
export function normalizeUuid(value) {
  const undashed = String(value ?? '').replaceAll('-', '').trim().toLowerCase();
  return UNDASHED_UUID.test(undashed) ? undashed : null;
}

/**
 * One-call live sync: an API key and a UUID in, a filled profile out.
 *
 * Identity is the player's UUID, entered once. Resolving a username in the
 * browser is not possible without a third party -- Hypixel's `name` parameter
 * is deprecated and unreliable, `api.mojang.com` sends no CORS headers, and the
 * `/key` endpoint that used to return the key owner's UUID was disabled in
 * August 2023 -- so the UUID is asked for directly instead.
 *
 *   /v2/skyblock/profiles?uuid=...         profiles, members, skills, pets,
 *                                          community upgrades, item NBT
 *   /v2/skyblock/garden?profile=...        crop upgrades, plots, visitors,
 *                                          composter, resources collected
 *   /v2/resources/skyblock/skills          keyless level table for Farming level
 *
 * Both payloads are handed to the existing normalizers, so live sync and raw
 * JSON import produce exactly the same provenance-bearing snapshot. Garden
 * failure never fails the whole sync: profile data is still worth keeping.
 */

/** Picks the profile to sync: the player's selected one, else an explicit id. */
export function selectProfile(profilesPayload, preferredProfileId = null) {
  const profiles = Array.isArray(profilesPayload?.profiles) ? profilesPayload.profiles : [];
  if (!profiles.length) {
    throw new Error('Hypixel returned no SkyBlock profiles for that player. The SkyBlock API setting may be disabled.');
  }
  const wanted = String(preferredProfileId || '').trim();
  if (wanted) {
    const match = profiles.find(profile => String(profile?.profile_id || '') === wanted);
    if (match) return match;
  }
  const selected = profiles.find(profile => profile?.selected === true);
  if (selected) return selected;
  if (profiles.length === 1) return profiles[0];
  throw new Error('No profile is marked as selected. Choose one in Settings before syncing.');
}

/** The profile list, reduced to what the profile picker in Settings needs. */
export function listProfiles(profilesPayload) {
  const profiles = Array.isArray(profilesPayload?.profiles) ? profilesPayload.profiles : [];
  return profiles.map(profile => ({
    profileId: profile?.profile_id ?? null,
    profileName: profile?.cute_name ?? null,
    gameMode: profile?.game_mode ?? null,
    selected: profile?.selected === true,
  }));
}

/**
 * @param {{playerUuid: string, playerName?: string, apiKey?: string, proxyUrl?: string,
 *          profileId?: string, fetchImpl?: typeof fetch, baseUrl?: string,
 *          signal?: AbortSignal}} options
 */
export async function syncProfile(options = {}) {
  const startedAt = new Date().toISOString();
  const warnings = [];
  const client = createHypixelClient(options);
  // Checked before anything else, so an unconfigured sync says what is missing
  // instead of failing later inside a request.
  if (client.mode === 'none') {
    throw new Error('No Hypixel access is configured. Add your own API key, or a proxy URL, in Settings.');
  }

  // 1. Identity.
  const uuid = normalizeUuid(options.playerUuid);
  if (!uuid) {
    throw new Error('Enter your Minecraft UUID in Settings. It is the 32-character id of your account, with or without dashes.');
  }
  const playerName = options.playerName ? String(options.playerName).trim() : null;

  // 2. The keyless level table, fetched once and reused by the normalizer.
  let skillResources = null;
  try {
    skillResources = await client.fetchSkillResources();
  } catch (error) {
    warnings.push(`The official skill level table could not be loaded, so the Farming level stays underived: ${error.message}`);
  }

  // 3. Profiles. A failure here is fatal: there is nothing to normalize.
  const profilesPayload = await client.fetchProfiles(uuid);
  const profiles = listProfiles(profilesPayload);
  const chosen = selectProfile(profilesPayload, options.profileId);

  const profileReport = await syncProfilePayload(profilesPayload, {
    playerUuid: uuid,
    profileId: chosen?.profile_id ?? null,
    skillResources,
    playerName,
  });

  // 4. Garden. Optional: profile data is still worth keeping without it.
  let gardenReport = null;
  const profileId = chosen?.profile_id ?? profileReport.profileId ?? null;
  if (!profileId) {
    warnings.push('No profile id was resolved, so Garden data could not be requested.');
  } else {
    try {
      gardenReport = syncGardenPayload(await client.fetchGarden(profileId), { fetchedAt: startedAt });
    } catch (error) {
      warnings.push(`Garden data could not be synced: ${error.message}`);
    }
  }

  // Garden sync re-applies the merged snapshot, so its result is the cumulative
  // one when it ran; otherwise the profile apply is the latest state.
  const apply = gardenReport?.apply ?? profileReport.apply ?? { applied: [], skipped: [], unmapped: [] };

  return {
    startedAt,
    finishedAt: new Date().toISOString(),
    mode: client.mode,
    playerUuid: uuid,
    playerName,
    profileId,
    profileName: profileReport.profileName,
    availableProfiles: profiles,
    farmingLevel: profileReport.farmingLevel,
    farmingXp: profileReport.farmingXp,
    itemsNormalized: profileReport.normalizedItems,
    cropUpgradesImported: gardenReport?.cropUpgradesImported ?? null,
    unlockedPlots: gardenReport?.unlockedPlots ?? null,
    gardenSynced: gardenReport !== null,
    appliedCount: apply.applied.length,
    appliedEntries: apply.applied,
    applySkipped: apply.skipped,
    unmappedCount: apply.unmapped.length,
    warnings: [...warnings, ...apply.skipped, ...profileReport.warnings, ...(gardenReport?.unknownCropKeys?.length
      ? [`Garden returned crop keys this version does not know: ${gardenReport.unknownCropKeys.join(', ')}.`]
      : [])],
  };
}
