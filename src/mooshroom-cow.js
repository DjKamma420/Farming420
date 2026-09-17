// Mooshroom Cow mechanics used by the computed-stat coverage check.
// Current post-0.26.1 base Farming Fortune is 1 -> 100 by pet level.
// LEGENDARY Farming Strength grants +0.7 Farming Fortune per X Strength,
// where X scales from 39.8 at level 1 to 20 at level 100.

const PET_LEVEL_XP = Object.freeze([
  100, 110, 120, 130, 145, 160, 175, 190, 210, 230, 250, 275, 300, 330, 360, 400, 440, 490, 540, 600, 660, 730, 800,
  880, 960, 1050, 1150, 1260, 1380, 1510, 1650, 1800, 1960, 2130, 2310, 2500, 2700, 2920, 3160, 3420, 3700, 4000, 4350,
  4750, 5200, 5700, 6300, 7000, 7800, 8700, 9700, 10800, 12000, 13300, 14700, 16200, 17800, 19500, 21300, 23200, 25200,
  27400, 29800, 32400, 35200, 38200, 41400, 44800, 48400, 52200, 56200, 60400, 64800, 69400, 74200, 79200, 84700, 90700,
  97200, 104200, 111700, 119700, 128200, 137200, 146700, 156700, 167700, 179700, 192700, 206700, 221700, 237700, 254700,
  272700, 291700, 311700, 333700, 357700, 383700, 411700, 441700, 476700, 516700, 561700, 611700, 666700, 726700,
  791700, 861700, 936700, 1016700, 1101700, 1191700, 1286700, 1386700, 1496700, 1616700, 1746700, 1886700,
]);

const PET_RARITY_OFFSET = Object.freeze({
  COMMON: 0,
  UNCOMMON: 6,
  RARE: 11,
  EPIC: 16,
  LEGENDARY: 20,
  MYTHIC: 20,
});

function finiteNonNegative(value) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : null;
}

export function petLevelFromExperience(experience, rarity = 'COMMON') {
  let remaining = finiteNonNegative(experience);
  if (remaining === null) return null;
  const offset = PET_RARITY_OFFSET[String(rarity || 'COMMON').toUpperCase()] ?? 0;
  let level = 1;
  while (level < 100) {
    const required = PET_LEVEL_XP[Math.min(offset + level - 1, PET_LEVEL_XP.length - 1)];
    if (!Number.isFinite(required) || remaining < required) break;
    remaining -= required;
    level += 1;
  }
  return level;
}

export function mooshroomStrengthRequirement(level) {
  const safeLevel = Math.max(1, Math.min(100, Math.floor(Number(level) || 1)));
  return 40 - (0.2 * safeLevel);
}

export function mooshroomStrengthFortune(strength, level = 100, rarity = 'LEGENDARY') {
  const safeStrength = finiteNonNegative(strength);
  if (safeStrength === null) return null;
  if (String(rarity || '').toUpperCase() !== 'LEGENDARY') return 0;
  const requirement = mooshroomStrengthRequirement(level);
  return Math.floor((safeStrength / requirement) * 0.7);
}

function cowType(value) {
  return String(value || '').toUpperCase().replace(/[^A-Z0-9]+/g, '_') === 'MOOSHROOM_COW';
}

function setupCow(state) {
  const setups = state?.profile?.setups;
  const list = Array.isArray(setups?.list) ? setups.list : [];
  const setup = list.find(entry => entry?.id === setups?.activeId) || list[0];
  const pet = setup?.slots?.pet;
  const name = String(pet?.displayName || pet?.name || '').toLowerCase();
  return name.includes('mooshroom cow') ? pet : null;
}

export function activeMooshroomCow(state) {
  const pets = Array.isArray(state?.profile?.normalizedSnapshot?.pets)
    ? state.profile.normalizedSnapshot.pets
    : [];
  const active = pets.find(pet => cowType(pet?.type) && pet?.active === true);
  if (active) return { ...active, source: 'profile' };

  const selected = setupCow(state);
  if (!selected) return null;
  const syncedCow = pets.find(pet => cowType(pet?.type));
  return syncedCow
    ? { ...syncedCow, source: 'setup+profile' }
    : { type: 'MOOSHROOM_COW', source: 'setup', rarity: selected?.rarity || null, experience: null };
}

export function mooshroomCowContribution(state) {
  const cow = activeMooshroomCow(state);
  if (!cow) return { active: false, value: 0, incomplete: false, reasons: [] };

  const rarity = String(cow.rarity || '').toUpperCase() || null;
  const level = petLevelFromExperience(cow.experience, rarity || 'COMMON');
  const strength = finiteNonNegative(state?.profile?.inputs?.strength);
  const reasons = [];

  let baseFortune = 0;
  if (level === null) reasons.push('Mooshroom Cow level is unavailable');
  else baseFortune = level;

  let strengthFortune = 0;
  if (rarity === 'LEGENDARY') {
    if (level === null) reasons.push('Farming Strength needs the Mooshroom Cow level');
    if (strength === null) reasons.push('Strength input is missing');
    if (level !== null && strength !== null) {
      strengthFortune = mooshroomStrengthFortune(strength, level, rarity);
    }
  } else if (!rarity) {
    reasons.push('Mooshroom Cow rarity is unavailable');
  }

  return {
    active: true,
    source: cow.source,
    rarity,
    level,
    strength,
    baseFortune,
    strengthFortune,
    value: baseFortune + strengthFortune,
    incomplete: reasons.length > 0,
    reasons,
  };
}
