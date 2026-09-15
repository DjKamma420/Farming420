import { createHypixelClient } from './hypixel-client.js';
import { resolveUsername, normalizeUuid } from './mojang.js';
import { syncGardenPayload, syncProfilePayload } from './profile-sync.js';

/**
 * One-call live sync: a Minecraft username in, a filled profile out.
 *
 * The flow is deliberately the smallest number of requests that fills the most
 * fields:
 *
 *   username -> uuid                       (resolver chain, see src/mojang.js)
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
 * @param {{username?: string, playerUuid?: string, apiKey?: string, proxyUrl?: string,
 *          profileId?: string, fetchImpl?: typeof fetch, resolvers?: object[],
 *          baseUrl?: string, signal?: AbortSignal}} options
 */
export async function syncByUsername(options = {}) {
  const startedAt = new Date().toISOString();
  const warnings = [];
  const client = createHypixelClient(options);
  // Checked before anything else: resolving a username first would spend
  // requests on a sync that cannot possibly reach Hypixel.
  if (client.mode === 'none') {
    throw new Error('No Hypixel access is configured. Add your own API key, or a proxy URL, in Settings.');
  }

  // 1. Identity. A UUID given directly wins: it needs no third-party resolver.
  let uuid = normalizeUuid(options.playerUuid);
  let playerName = null;
  let resolver = null;
  let resolverIsOfficial = null;

  if (!uuid) {
    const resolved = await resolveUsername(options.username, {
      fetchImpl: options.fetchImpl,
      resolvers: options.resolvers,
      signal: options.signal,
    });
    uuid = resolved.uuid;
    playerName = resolved.name;
    resolver = resolved.resolver;
    resolverIsOfficial = resolved.official;
    if (!resolved.official) {
      warnings.push(`The username was resolved by ${resolved.resolver}, a community mirror rather than Mojang. Verify the UUID if the profile looks wrong.`);
    }
  } else if (options.username) {
    playerName = String(options.username).trim();
  }

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

  return {
    startedAt,
    finishedAt: new Date().toISOString(),
    mode: client.mode,
    playerUuid: uuid,
    playerName,
    resolver,
    resolverIsOfficial,
    profileId,
    profileName: profileReport.profileName,
    availableProfiles: profiles,
    farmingLevel: profileReport.farmingLevel,
    farmingXp: profileReport.farmingXp,
    itemsNormalized: profileReport.normalizedItems,
    cropUpgradesImported: gardenReport?.cropUpgradesImported ?? null,
    unlockedPlots: gardenReport?.unlockedPlots ?? null,
    gardenSynced: gardenReport !== null,
    warnings: [...warnings, ...profileReport.warnings, ...(gardenReport?.unknownCropKeys?.length
      ? [`Garden returned crop keys this version does not know: ${gardenReport.unknownCropKeys.join(', ')}.`]
      : [])],
  };
}
