export function normalizedPetType(value) {
  return String(value || '').trim().toUpperCase().replace(/[^A-Z0-9]+/g, '_');
}

/** An explicit UUID never falls back to a different physical copy. */
export function syncedPetForSetup(state, selected, type = selected?.skyblockId ?? selected?.type) {
  const pets = Array.isArray(state?.profile?.normalizedSnapshot?.pets) ? state.profile.normalizedSnapshot.pets : [];
  const physical = String(selected?.physicalItemId || '');
  const uuid = physical.startsWith('pet:') ? physical.slice(4) : String(selected?.petUuid || selected?.uuid || selected?.itemUuid || '');
  const matching = pets.filter(pet => normalizedPetType(pet?.type) === normalizedPetType(type));
  if (uuid) return matching.find(pet => String(pet?.uuid || '') === uuid) || null;
  return matching.length === 1 ? matching[0] : null;
}
