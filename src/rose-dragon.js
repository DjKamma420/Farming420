import { petLevelFromExperience } from './mooshroom-cow.js';
import { FARMING_PETS, farmingPetById, petLevelBounds } from './setup-pet-catalog.js';
import { activeSetup } from './setups.js';

export const ROSE_DRAGON_SOURCE = 'https://hypixelskyblock.minecraft.wiki/w/Rose_Dragon_Pet';
export const ROSE_DRAGON_VERIFIED = '2026-09-23';
export const ROSE_DRAGON_EXTRA_LEVEL_XP = 1_886_700;
export const ROSE_DRAGON_XP_SOURCE = 'https://github.com/NotEnoughUpdates/NotEnoughUpdates-REPO/blob/master/constants/pets.json';

function finiteNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function normalizedPetId(value) {
  return String(value || '').trim().toUpperCase().replace(/[^A-Z0-9]+/g, '_');
}

function isRoseDragon(value) {
  return normalizedPetId(value) === 'ROSE_DRAGON';
}

function selectedSetupPet(state) {
  const setups = state?.profile?.setups;
  if (!setups) return null;
  return activeSetup(setups)?.slots?.pet || null;
}

function syncedPetForSetup(state, setupPet) {
  const pets = Array.isArray(state?.profile?.normalizedSnapshot?.pets)
    ? state.profile.normalizedSnapshot.pets
    : [];
  const physicalId = String(setupPet?.physicalItemId || '');
  const uuid = physicalId.startsWith('pet:') ? physicalId.slice(4) : null;
  if (uuid) {
    const exact = pets.find(pet => String(pet?.uuid || '') === uuid);
    if (exact) return exact;
  }
  return pets.find(pet => isRoseDragon(pet?.type)) || null;
}

function explicitRoseLevel(value) {
  const number = finiteNumber(value);
  if (number === null) return null;
  return Math.max(1, Math.min(200, Math.floor(number)));
}

export function activeRoseDragon(state) {
  const snapshot = state?.profile?.normalizedSnapshot || {};
  const pets = Array.isArray(snapshot.pets) ? snapshot.pets : [];
  const selected = selectedSetupPet(state);

  if (selected) {
    if (!isRoseDragon(selected.skyblockId ?? selected.type)) return null;
    const synced = syncedPetForSetup(state, selected);
    return {
      ...(synced || {}),
      type: 'ROSE_DRAGON',
      source: synced ? 'setup+profile' : 'setup',
      level: explicitRoseLevel(selected.petLevel)
        ?? explicitRoseLevel(synced?.level)
        ?? petLevelFromExperience(synced?.experience, synced?.rarity ?? synced?.tier ?? 'LEGENDARY', {
          maxLevel: 200,
          extraLevelXp: ROSE_DRAGON_EXTRA_LEVEL_XP,
        }),
      uuid: synced?.uuid ?? null,
    };
  }

  const active = pets.find(pet => isRoseDragon(pet?.type) && pet?.active === true);
  return active ? {
    ...active,
    source: 'profile',
    level: explicitRoseLevel(active.level)
      ?? petLevelFromExperience(active.experience, active.rarity ?? active.tier ?? 'LEGENDARY', {
        maxLevel: 200,
        extraLevelXp: ROSE_DRAGON_EXTRA_LEVEL_XP,
      }),
  } : null;
}

function resolvedPetLevel(pet) {
  const catalog = farmingPetById(pet?.type);
  if (!catalog) return null;
  const explicit = finiteNumber(pet?.level);
  if (explicit !== null) return Math.max(1, Math.min(catalog.levelMax, Math.floor(explicit)));
  if (catalog.levelMax > 100) return null;
  const rarity = String(pet?.rarity ?? pet?.tier ?? '').trim().toUpperCase();
  if (!rarity) return null;
  return petLevelFromExperience(pet?.experience ?? pet?.exp, rarity);
}

function freshStatus(value) {
  return value === 'AUTO' || value === 'DERIVED' || value === 'MANUAL' || value === 'EXTERNAL';
}

export function maxedOtherFarmingPets(snapshot) {
  const status = snapshot?.provenance?.pets?.status || 'UNKNOWN';
  if (!freshStatus(status)) {
    return Object.freeze({
      complete: false,
      count: null,
      maxCount: FARMING_PETS.filter(pet => pet.id !== 'ROSE_DRAGON').length,
      species: Object.freeze([]),
      reasons: Object.freeze(['Pet ownership is not currently verified by a complete profile pet list']),
    });
  }

  const pets = Array.isArray(snapshot?.pets) ? snapshot.pets : [];
  const grouped = new Map();
  for (const pet of pets) {
    const id = normalizedPetId(pet?.type);
    const catalog = farmingPetById(id);
    if (!catalog || id === 'ROSE_DRAGON') continue;
    if (!grouped.has(id)) grouped.set(id, []);
    grouped.get(id).push(pet);
  }

  const species = [];
  const reasons = [];
  for (const [id, rows] of grouped) {
    const bounds = petLevelBounds(id);
    const levels = rows.map(resolvedPetLevel);
    if (levels.some(level => level !== null && level >= bounds.max)) {
      species.push(id);
      continue;
    }
    if (levels.some(level => level === null)) {
      reasons.push(`${farmingPetById(id)?.name || id} max-level state is unavailable`);
    }
  }

  return Object.freeze({
    complete: reasons.length === 0,
    count: reasons.length === 0 ? species.length : null,
    maxCount: FARMING_PETS.filter(pet => pet.id !== 'ROSE_DRAGON').length,
    species: Object.freeze(species.sort()),
    reasons: Object.freeze(reasons),
  });
}

function farmingLevelForState(state) {
  const snapshotLevel = finiteNumber(state?.profile?.normalizedSnapshot?.skills?.farming?.level);
  if (snapshotLevel !== null) return snapshotLevel;
  return finiteNumber(state?.profile?.levels?.['account-skill-farming-skill-level']);
}

function cropMilestoneTotalForState(state) {
  return finiteNumber(state?.profile?.normalizedSnapshot?.garden?.cropMilestoneTotal);
}

export function roseDragonContribution(state) {
  const dragon = activeRoseDragon(state);
  if (!dragon) {
    return Object.freeze({
      active: false,
      globalFortune: 0,
      overbloom: 0,
      incomplete: false,
      fortuneIncompleteReasons: Object.freeze([]),
      overbloomIncompleteReasons: Object.freeze([]),
      reasons: Object.freeze([]),
    });
  }

  const snapshot = state?.profile?.normalizedSnapshot || {};
  const level = explicitRoseLevel(dragon.level);
  const farmingLevel = farmingLevelForState(state);
  const cropMilestoneTotal = cropMilestoneTotalForState(state);
  const fortuneReasons = [];
  const overbloomReasons = [];

  if (level === null) {
    fortuneReasons.push('Rose Dragon level is unavailable');
    overbloomReasons.push('Rose Dragon level is unavailable');
  }

  const hatched = level !== null && level >= 100;
  if (hatched && farmingLevel === null) fortuneReasons.push('Farming level is unavailable for Garden Power');
  if (hatched && cropMilestoneTotal === null) fortuneReasons.push('Total Crop Milestones are unavailable for Rosy Scales');
  const baseFortune = hatched ? level * 0.2 : 0;
  const gardenPower = hatched && farmingLevel !== null ? level * 0.015 * farmingLevel : 0;
  const rosyScales = hatched && cropMilestoneTotal !== null ? level * 0.00075 * cropMilestoneTotal : 0;
  const overbloom = hatched ? level * 0.2 : 0;

  let symbiosis = 0;
  let symbiosisPets = Object.freeze([]);
  let symbiosisPetCount = 0;
  if (level === 200) {
    const maxed = maxedOtherFarmingPets(snapshot);
    if (!maxed.complete) fortuneReasons.push(...maxed.reasons);
    else {
      symbiosisPetCount = maxed.count;
      symbiosisPets = maxed.species;
      symbiosis = maxed.count * 3;
    }
  }

  const globalFortune = baseFortune + gardenPower + rosyScales + symbiosis;
  const allReasons = [...new Set([...fortuneReasons, ...overbloomReasons])];

  return Object.freeze({
    active: true,
    source: dragon.source,
    level,
    farmingLevel,
    cropMilestoneTotal,
    baseFortune,
    gardenPower,
    rosyScales,
    symbiosis,
    symbiosisPetCount,
    symbiosisPets,
    globalFortune,
    overbloom,
    incomplete: allReasons.length > 0,
    fortuneIncompleteReasons: Object.freeze([...new Set(fortuneReasons)]),
    overbloomIncompleteReasons: Object.freeze([...new Set(overbloomReasons)]),
    reasons: Object.freeze(allReasons),
  });
}
