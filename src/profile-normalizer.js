import {
  extractGardenData,
  extractProfileData,
  farmingLevelFromResources,
} from './hypixel-import.js';
import {
  GARDEN_LEVEL_SOURCE,
  GARDEN_LEVEL_VERIFIED,
  gardenLevelFromExperience,
} from './garden-level.js';
import {
  PEST_BESTIARY_SOURCE,
  PEST_BESTIARY_VERIFIED,
  eligiblePestBestiaryFromKills,
} from './pest-bestiary.js';

export const PROFILE_MODEL_VERSION = 2;
export const PROFILE_DATA_STATUS = Object.freeze({
  AUTO: 'AUTO',
  DERIVED: 'DERIVED',
  AUTO_CANDIDATE: 'AUTO_CANDIDATE',
  MANUAL: 'MANUAL',
  EXTERNAL: 'EXTERNAL',
  HIDDEN: 'HIDDEN',
  UNKNOWN: 'UNKNOWN',
});

const VERIFIED_ON = '2026-09-15';

export const PROFILE_SOURCE_META = Object.freeze({
  profile: Object.freeze({
    id: 'hypixel-profile',
    url: 'https://api.hypixel.net/v2/skyblock/profile',
    lastVerified: VERIFIED_ON,
  }),
  profiles: Object.freeze({
    id: 'hypixel-profiles',
    url: 'https://api.hypixel.net/v2/skyblock/profiles',
    lastVerified: VERIFIED_ON,
  }),
  garden: Object.freeze({
    id: 'hypixel-garden',
    url: 'https://api.hypixel.net/v2/skyblock/garden',
    lastVerified: VERIFIED_ON,
  }),
  gardenLevel: Object.freeze({
    id: 'garden-level',
    url: GARDEN_LEVEL_SOURCE,
    lastVerified: GARDEN_LEVEL_VERIFIED,
  }),
  skills: Object.freeze({
    id: 'hypixel-skill-resources',
    url: 'https://api.hypixel.net/v2/resources/skyblock/skills',
    lastVerified: VERIFIED_ON,
  }),
  pestBestiary: Object.freeze({
    id: 'pest-bestiary',
    url: PEST_BESTIARY_SOURCE,
    lastVerified: PEST_BESTIARY_VERIFIED,
  }),
});

function normalizeUuid(value) {
  const normalized = String(value || '').replaceAll('-', '').trim().toLowerCase();
  return normalized || null;
}

function finiteNumberOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function stringOrNull(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed || null;
}

function provenance(status, sourceIds, note = null) {
  return {
    status,
    sources: sourceIds.map(id => PROFILE_SOURCE_META[id]).filter(Boolean),
    note,
  };
}

function profileList(payload) {
  if (Array.isArray(payload?.profiles)) return payload.profiles;
  if (payload?.profile && typeof payload.profile === 'object') return [payload.profile];
  if (payload?.members && typeof payload.members === 'object') return [payload];
  return [];
}

function locateResolvedProfile(payload, profileId) {
  const profiles = profileList(payload);
  if (!profiles.length) return null;
  return profiles.find(profile => profile?.profile_id === profileId)
    || (profiles.length === 1 ? profiles[0] : null);
}

function locateResolvedMember(profile, playerUuid) {
  if (!profile?.members || typeof profile.members !== 'object') return null;
  const target = normalizeUuid(playerUuid);
  if (!target) return null;
  for (const [key, member] of Object.entries(profile.members)) {
    const candidates = [key, member?.uuid, member?.player_id, member?.profile?.player_id]
      .map(normalizeUuid)
      .filter(Boolean);
    if (candidates.includes(target)) return member;
  }
  return null;
}

function normalizeCommunityUpgrades(raw) {
  const states = Array.isArray(raw?.upgrade_states) ? raw.upgrade_states : [];
  return states
    .filter(state => state && typeof state === 'object' && stringOrNull(state.upgrade))
    .map(state => ({
      id: stringOrNull(state.upgrade),
      tier: finiteNumberOrNull(state.tier),
      startedAtMs: finiteNumberOrNull(state.started_ms),
      claimedAtMs: finiteNumberOrNull(state.claimed_ms),
    }));
}

function rawPetsFromMember(member) {
  if (Array.isArray(member?.pets)) return member.pets;
  if (Array.isArray(member?.pets_data?.pets)) return member.pets_data.pets;
  return null;
}

function normalizePets(rawPets) {
  if (!Array.isArray(rawPets)) return [];
  return rawPets
    .filter(pet => pet && typeof pet === 'object')
    .map((pet, index) => ({
      index,
      uuid: stringOrNull(pet.uuid),
      type: stringOrNull(pet.type),
      rarity: stringOrNull(pet.tier ?? pet.rarity),
      experience: finiteNumberOrNull(pet.exp ?? pet.experience),
      level: finiteNumberOrNull(pet.level),
      active: typeof pet.active === 'boolean' ? pet.active : null,
      heldItem: stringOrNull(pet.heldItem ?? pet.held_item),
      candyUsed: finiteNumberOrNull(pet.candyUsed ?? pet.candy_used),
      skin: stringOrNull(pet.skin),
    }));
}

function rawBestiaryFromMember(member) {
  if (member?.bestiary && typeof member.bestiary === 'object') return member.bestiary;
  if (member?.player_data?.bestiary && typeof member.player_data.bestiary === 'object') return member.player_data.bestiary;
  return null;
}

function normalizedBestiaryKills(rawBestiary) {
  if (!rawBestiary || rawBestiary.migration === false) return null;
  const rawKills = rawBestiary.kills && typeof rawBestiary.kills === 'object' && !Array.isArray(rawBestiary.kills)
    ? rawBestiary.kills
    : {};
  return Object.fromEntries(Object.entries(rawKills)
    .map(([key, value]) => [String(key).trim().toLowerCase(), finiteNumberOrNull(value)])
    .filter(([, value]) => value !== null && value >= 0));
}

function gardenObject(payload) {
  if (!payload || typeof payload !== 'object') return null;
  if (payload.garden && typeof payload.garden === 'object') return payload.garden;
  if (payload.garden_data && typeof payload.garden_data === 'object') return payload.garden_data;
  if ('crop_upgrade_levels' in payload || 'garden_experience' in payload || 'unlocked_plots_ids' in payload) return payload;
  return null;
}

export function createEmptyProfileSnapshot() {
  return {
    modelVersion: PROFILE_MODEL_VERSION,
    identity: {
      playerUuid: null,
      playerName: null,
      profileId: null,
      profileName: null,
      gameMode: null,
      selected: null,
    },
    sync: {
      sources: {},
      warnings: [],
    },
    skills: {
      farming: {
        xp: null,
        level: null,
        cap: null,
        status: PROFILE_DATA_STATUS.UNKNOWN,
      },
    },
    bestiary: {
      kills: null,
      eligiblePestTierTotal: null,
      eligiblePestMaxTierTotal: 225,
      eligiblePestFamilyTiers: {},
      migration: null,
    },
    garden: {
      experience: null,
      level: null,
      unlockedPlotIds: [],
      unlockedPlotCount: null,
      cropUpgrades: {},
      resourcesCollected: null,
      visitors: {
        visits: null,
        completed: null,
        totalCompleted: null,
        uniqueNpcsServed: null,
      },
      composter: null,
      activeCommissions: null,
    },
    accountUpgrades: [],
    pets: [],
    items: [],
    buffs: {},
    unknown: [],
    provenance: {},
  };
}

export function normalizeProfilePayload(payload, options = {}) {
  const parsed = extractProfileData(payload, { playerUuid: options.playerUuid });
  const profile = locateResolvedProfile(payload, parsed.profileId);
  const member = locateResolvedMember(profile, parsed.playerUuid);
  const snapshot = createEmptyProfileSnapshot();

  snapshot.identity = {
    ...snapshot.identity,
    playerUuid: parsed.playerUuid,
    profileId: parsed.profileId,
    profileName: parsed.profileName,
    gameMode: stringOrNull(profile?.game_mode),
    selected: typeof profile?.selected === 'boolean' ? profile.selected : null,
  };

  let farmingLevel = null;
  let farmingStatus = parsed.farmingXp === null
    ? PROFILE_DATA_STATUS.HIDDEN
    : PROFILE_DATA_STATUS.AUTO;

  if (parsed.farmingXp !== null && options.skillResources) {
    farmingLevel = farmingLevelFromResources(parsed.farmingXp, options.skillResources);
    if (farmingLevel !== null) farmingStatus = PROFILE_DATA_STATUS.DERIVED;
    else snapshot.sync.warnings.push('Farming XP is present, but the supplied skill resource table could not derive a level.');
  }

  snapshot.skills.farming = {
    xp: parsed.farmingXp,
    level: farmingLevel,
    cap: null,
    status: farmingStatus,
  };

  const rawPets = rawPetsFromMember(member);
  const rawBestiary = rawBestiaryFromMember(member);
  const rawBestiaryKills = rawBestiary && rawBestiary.migration !== false
    ? (rawBestiary.kills && typeof rawBestiary.kills === 'object' && !Array.isArray(rawBestiary.kills) ? rawBestiary.kills : {})
    : null;
  const pestBestiary = eligiblePestBestiaryFromKills(rawBestiaryKills);
  snapshot.accountUpgrades = normalizeCommunityUpgrades(parsed.communityUpgrades);
  snapshot.pets = normalizePets(rawPets);
  snapshot.bestiary = {
    kills: normalizedBestiaryKills(rawBestiary),
    eligiblePestTierTotal: pestBestiary.tierTotal,
    eligiblePestMaxTierTotal: pestBestiary.maxTierTotal,
    eligiblePestFamilyTiers: { ...pestBestiary.familyTiers },
    migration: typeof rawBestiary?.migration === 'boolean' ? rawBestiary.migration : null,
  };
  snapshot.sync.sources.profile = {
    fetchedAt: options.fetchedAt || null,
    importType: 'raw-json',
    profileId: parsed.profileId,
  };
  snapshot.sync.warnings.push(...parsed.warnings);

  snapshot.provenance.identity = provenance(PROFILE_DATA_STATUS.AUTO, ['profile', 'profiles']);
  snapshot.provenance['skills.farming.xp'] = provenance(
    parsed.farmingXp === null ? PROFILE_DATA_STATUS.HIDDEN : PROFILE_DATA_STATUS.AUTO,
    ['profile'],
    parsed.farmingXp === null ? 'The Skills API setting may be disabled or the payload shape may be unsupported.' : null,
  );
  snapshot.provenance['skills.farming.level'] = provenance(
    farmingLevel === null ? PROFILE_DATA_STATUS.UNKNOWN : PROFILE_DATA_STATUS.DERIVED,
    ['profile', 'skills'],
  );
  snapshot.provenance.accountUpgrades = provenance(PROFILE_DATA_STATUS.AUTO, ['profile']);
  snapshot.provenance.bestiary = provenance(
    rawBestiaryKills === null ? (rawBestiary?.migration === false ? PROFILE_DATA_STATUS.UNKNOWN : PROFILE_DATA_STATUS.HIDDEN) : PROFILE_DATA_STATUS.AUTO,
    ['profile'],
    rawBestiary?.migration === false
      ? 'The selected member Bestiary is not migrated, so current Pest tiers cannot be derived.'
      : rawBestiary === null ? 'The selected member payload contains no Bestiary data.' : null,
  );
  snapshot.provenance['bestiary.eligiblePestTierTotal'] = provenance(
    pestBestiary.complete ? PROFILE_DATA_STATUS.DERIVED : PROFILE_DATA_STATUS.UNKNOWN,
    ['profile', 'pestBestiary'],
    pestBestiary.complete ? null : pestBestiary.reasons.join('; '),
  );
  snapshot.provenance.pets = provenance(
    rawPets === null ? PROFILE_DATA_STATUS.HIDDEN : PROFILE_DATA_STATUS.AUTO,
    ['profile'],
    rawPets === null ? 'The selected member payload contains no pet list; an empty array must not be interpreted as owning no pets.' : null,
  );

  if (!member) {
    snapshot.sync.warnings.push('The selected member could not be re-located after profile resolution; pet and Bestiary data remain unknown.');
  } else {
    if (rawPets === null) snapshot.sync.warnings.push('No pet list was present for the selected member; pet ownership remains unknown.');
    if (rawBestiary === null) snapshot.sync.warnings.push('No Bestiary data was present for the selected member; Pest Bestiary tiers remain unknown.');
    else if (rawBestiary.migration === false) snapshot.sync.warnings.push('The selected member Bestiary is not migrated; Pest Bestiary tiers remain unknown.');
  }

  return snapshot;
}

export function normalizeGardenPayload(payload, options = {}) {
  const parsed = extractGardenData(payload);
  const rawGarden = gardenObject(payload) || {};
  const snapshot = createEmptyProfileSnapshot();
  const plotIds = Array.isArray(rawGarden.unlocked_plots_ids)
    ? [...new Set(rawGarden.unlocked_plots_ids.map(String))]
    : [];

  const gardenLevel = gardenLevelFromExperience(parsed.gardenExperience);

  snapshot.garden = {
    ...snapshot.garden,
    experience: parsed.gardenExperience,
    level: gardenLevel,
    unlockedPlotIds: plotIds,
    unlockedPlotCount: parsed.unlockedPlots,
    cropUpgrades: structuredClone(parsed.cropUpgrades),
    resourcesCollected: parsed.resourcesCollected ? structuredClone(parsed.resourcesCollected) : null,
    visitors: {
      visits: finiteNumberOrNull(rawGarden.commission_data?.visits),
      completed: rawGarden.commission_data?.completed ?? null,
      totalCompleted: parsed.totalVisitorsCompleted,
      uniqueNpcsServed: parsed.uniqueVisitors,
    },
    composter: parsed.composterData ? structuredClone(parsed.composterData) : null,
    activeCommissions: rawGarden.active_commissions ? structuredClone(rawGarden.active_commissions) : null,
  };

  snapshot.sync.sources.garden = {
    fetchedAt: options.fetchedAt || null,
    importType: 'raw-json',
  };
  snapshot.provenance.garden = provenance(PROFILE_DATA_STATUS.AUTO, ['garden']);
  snapshot.provenance['garden.level'] = provenance(
    gardenLevel === null ? PROFILE_DATA_STATUS.UNKNOWN : PROFILE_DATA_STATUS.DERIVED,
    ['garden', 'gardenLevel'],
    gardenLevel === null ? 'Garden XP is unavailable, so Garden level cannot be derived.' : null,
  );

  for (const apiKey of parsed.unknownCropKeys) {
    snapshot.unknown.push({
      area: 'garden.cropUpgrades',
      key: apiKey,
      reason: 'Unknown crop key from the current payload; the adapter did not guess a mapping.',
    });
  }

  return snapshot;
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function mergeValue(base, patch) {
  if (patch === undefined) return structuredClone(base);
  if (!isPlainObject(patch)) return structuredClone(patch);
  const result = isPlainObject(base) ? structuredClone(base) : {};
  for (const [key, value] of Object.entries(patch)) {
    result[key] = mergeValue(result[key], value);
  }
  return result;
}

function hasProvenanceFor(provenanceMap, section) {
  return Object.keys(provenanceMap || {}).some(key => key === section || key.startsWith(`${section}.`));
}

function mayReplaceCollection(provenanceEntry) {
  return provenanceEntry?.status !== PROFILE_DATA_STATUS.HIDDEN
    && provenanceEntry?.status !== PROFILE_DATA_STATUS.UNKNOWN;
}

export function mergeProfileSnapshots(base, patch) {
  const merged = structuredClone(base || createEmptyProfileSnapshot());
  const source = patch || {};
  const patchProvenance = source.provenance || {};

  if (hasProvenanceFor(patchProvenance, 'identity')) {
    merged.identity = mergeValue(merged.identity, source.identity);
  }
  if (hasProvenanceFor(patchProvenance, 'skills')) {
    merged.skills = mergeValue(merged.skills, source.skills);
  }
  if (hasProvenanceFor(patchProvenance, 'garden')) {
    merged.garden = mergeValue(merged.garden, source.garden);
  }
  if (hasProvenanceFor(patchProvenance, 'bestiary')) {
    merged.bestiary = mergeValue(merged.bestiary, source.bestiary);
  }
  if (hasProvenanceFor(patchProvenance, 'accountUpgrades')) {
    merged.accountUpgrades = structuredClone(source.accountUpgrades || []);
  }
  if (hasProvenanceFor(patchProvenance, 'pets') && mayReplaceCollection(patchProvenance.pets)) {
    merged.pets = structuredClone(source.pets || []);
  }
  if (hasProvenanceFor(patchProvenance, 'items') && mayReplaceCollection(patchProvenance.items)) {
    merged.items = structuredClone(source.items || []);
  }
  if (hasProvenanceFor(patchProvenance, 'buffs')) {
    merged.buffs = mergeValue(merged.buffs, source.buffs || {});
  }

  merged.modelVersion = PROFILE_MODEL_VERSION;
  merged.sync ||= { sources: {}, warnings: [] };
  merged.sync.sources = mergeValue(merged.sync.sources || {}, source.sync?.sources || {});
  merged.sync.warnings = [...new Set([
    ...(Array.isArray(base?.sync?.warnings) ? base.sync.warnings : []),
    ...(Array.isArray(source.sync?.warnings) ? source.sync.warnings : []),
  ])];
  merged.provenance = mergeValue(merged.provenance || {}, patchProvenance);

  const unknown = [
    ...(Array.isArray(base?.unknown) ? base.unknown : []),
    ...(Array.isArray(source.unknown) ? source.unknown : []),
  ];
  const seenUnknown = new Set();
  merged.unknown = unknown.filter(entry => {
    const key = JSON.stringify(entry);
    if (seenUnknown.has(key)) return false;
    seenUnknown.add(key);
    return true;
  });

  return merged;
}
