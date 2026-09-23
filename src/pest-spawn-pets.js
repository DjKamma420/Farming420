import { petLevelFromExperience } from './mooshroom-cow.js';
import { activeSetup } from './setups.js';

export const MOSQUITO_SOURCE = 'https://hypixelskyblock.minecraft.wiki/w/Mosquito_Pet';
export const SLUG_SOURCE = 'https://hypixelskyblock.minecraft.wiki/w/Slug_Pet';
export const PEST_SPAWN_PETS_VERIFIED = '2026-09-23';

const SUPPORTED_IDS = Object.freeze(new Set(['MOSQUITO', 'SLUG']));

function normalizedPetId(value) {
  return String(value || '').trim().toUpperCase().replace(/[^A-Z0-9]+/g, '_');
}

function finiteNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function explicitLevel(value) {
  const number = finiteNumber(value);
  if (number === null) return null;
  return Math.max(1, Math.min(100, Math.floor(number)));
}

function selectedSetupPet(state) {
  const setups = state?.profile?.setups;
  if (!setups) return null;
  return activeSetup(setups)?.slots?.pet || null;
}

function profilePets(state) {
  return Array.isArray(state?.profile?.normalizedSnapshot?.pets)
    ? state.profile.normalizedSnapshot.pets
    : [];
}

function syncedPetForSetup(state, setupPet, petId) {
  const pets = profilePets(state);
  const physicalId = String(setupPet?.physicalItemId || '');
  const uuid = physicalId.startsWith('pet:') ? physicalId.slice(4) : null;
  if (uuid) {
    const exact = pets.find(pet => String(pet?.uuid || '') === uuid);
    if (exact) return exact;
  }
  return pets.find(pet => normalizedPetId(pet?.type) === petId) || null;
}

function resolvedLevel(setupPet, synced) {
  return explicitLevel(setupPet?.petLevel)
    ?? explicitLevel(synced?.level)
    ?? petLevelFromExperience(
      synced?.experience ?? synced?.exp,
      synced?.rarity ?? synced?.tier ?? setupPet?.rarity ?? 'COMMON',
    );
}

export function activePestSpawnPet(state) {
  const selected = selectedSetupPet(state);
  if (selected) {
    const petId = normalizedPetId(selected.skyblockId ?? selected.type);
    if (!SUPPORTED_IDS.has(petId)) return null;
    const synced = syncedPetForSetup(state, selected, petId);
    return Object.freeze({
      ...(synced || {}),
      type: petId,
      rarity: String(selected.rarity ?? synced?.rarity ?? synced?.tier ?? '').trim().toUpperCase() || null,
      level: resolvedLevel(selected, synced),
      source: synced ? 'setup+profile' : 'setup',
      uuid: synced?.uuid ?? null,
    });
  }

  const active = profilePets(state).find(pet =>
    SUPPORTED_IDS.has(normalizedPetId(pet?.type)) && pet?.active === true);
  if (!active) return null;
  return Object.freeze({
    ...active,
    type: normalizedPetId(active.type),
    rarity: String(active.rarity ?? active.tier ?? '').trim().toUpperCase() || null,
    level: explicitLevel(active.level)
      ?? petLevelFromExperience(active.experience ?? active.exp, active.rarity ?? active.tier ?? 'COMMON'),
    source: 'profile',
  });
}

function mosquitoVisitorCoefficient(rarity, level) {
  if (rarity === 'RARE') return level * 0.01;
  if (rarity === 'EPIC' || rarity === 'LEGENDARY') return level * 0.02;
  return 0;
}

function mosquitoSmoothJazzPct(rarity, level) {
  if (rarity === 'COMMON' || rarity === 'UNCOMMON') return level * 0.25;
  if (rarity === 'RARE') return level * 0.35;
  if (rarity === 'EPIC' || rarity === 'LEGENDARY') return level * 0.5;
  return 0;
}

function mosquitoContribution(state, pet, cropId) {
  const level = explicitLevel(pet?.level);
  const rarity = String(pet?.rarity || '').trim().toUpperCase();
  const bpcReasons = [];
  const cropFortuneReasons = [];
  if (level === null) bpcReasons.push('Mosquito Pet level is unavailable');
  if (!rarity) cropFortuneReasons.push('Mosquito Pet rarity is unavailable');

  const bonusPestChance = level === null ? 0 : level * 0.5;
  const smoothJazzPct = level === null ? 0 : mosquitoSmoothJazzPct(rarity, level);
  const coefficient = level === null ? 0 : mosquitoVisitorCoefficient(rarity, level);

  let sugarCaneFortune = 0;
  const eligibleForBarterer = ['RARE', 'EPIC', 'LEGENDARY'].includes(rarity);
  const visitors = finiteNumber(state?.profile?.normalizedSnapshot?.garden?.visitors?.uniqueNpcsServed);
  if (cropId === 'sugar-cane' && eligibleForBarterer) {
    if (level === null) cropFortuneReasons.push('Mosquito Pet level is unavailable for Buzzin\' Barterer');
    if (visitors === null) cropFortuneReasons.push('Unique Garden visitor count is unavailable for Buzzin\' Barterer');
    if (level !== null && visitors !== null) {
      sugarCaneFortune = Math.min(175, visitors * coefficient);
    }
  }

  return Object.freeze({
    active: true,
    id: 'MOSQUITO',
    level,
    rarity,
    bonusPestChance,
    cropFortune: sugarCaneFortune,
    sugarCaneFortune,
    uniqueVisitors: visitors,
    visitorFortunePerVisitor: coefficient,
    smoothJazzPct,
    bpcReasons: Object.freeze([...new Set(bpcReasons)]),
    cropFortuneReasons: Object.freeze([...new Set(cropFortuneReasons)]),
    globalFortuneReasons: Object.freeze([]),
    reasons: Object.freeze([...new Set([...bpcReasons, ...cropFortuneReasons])]),
  });
}

function slugContribution(pet, derivedContext = {}) {
  const level = explicitLevel(pet?.level);
  const rarity = String(pet?.rarity || '').trim().toUpperCase();
  const bpcReasons = [];
  const globalFortuneReasons = [];
  if (level === null) bpcReasons.push('Slug Pet level is unavailable');

  const bonusPestChance = level === null ? 0 : level * 0.4;
  const legendary = rarity === 'LEGENDARY';
  const sprayState = derivedContext?.sprayonatorActive;
  let repugnantAromaFortune = 0;
  if (legendary && level !== null) {
    if (sprayState === true) repugnantAromaFortune = level;
    else if (sprayState !== false) {
      globalFortuneReasons.push('Current plot Sprayonator state is unavailable for Slug Repugnant Aroma');
    }
  }
  if (!rarity) {
    globalFortuneReasons.push('Slug Pet rarity is unavailable for Repugnant Aroma');
  }

  return Object.freeze({
    active: true,
    id: 'SLUG',
    level,
    rarity,
    bonusPestChance,
    globalFortune: repugnantAromaFortune,
    repugnantAromaFortune,
    sprayonatorActive: sprayState === true ? true : sprayState === false ? false : null,
    bpcReasons: Object.freeze([...new Set(bpcReasons)]),
    cropFortuneReasons: Object.freeze([]),
    globalFortuneReasons: Object.freeze([...new Set(globalFortuneReasons)]),
    reasons: Object.freeze([...new Set([...bpcReasons, ...globalFortuneReasons])]),
  });
}

export function pestSpawnPetContribution(state, cropId = state?.selectedCrop || 'melon', derivedContext = {}) {
  const pet = activePestSpawnPet(state);
  if (!pet) {
    return Object.freeze({
      active: false,
      id: null,
      level: null,
      rarity: null,
      bonusPestChance: 0,
      globalFortune: 0,
      cropFortune: 0,
      bpcReasons: Object.freeze([]),
      globalFortuneReasons: Object.freeze([]),
      cropFortuneReasons: Object.freeze([]),
      reasons: Object.freeze([]),
    });
  }
  if (pet.type === 'MOSQUITO') {
    return Object.freeze({
      globalFortune: 0,
      ...mosquitoContribution(state, pet, cropId),
    });
  }
  return Object.freeze({
    cropFortune: 0,
    ...slugContribution(pet, derivedContext),
  });
}
