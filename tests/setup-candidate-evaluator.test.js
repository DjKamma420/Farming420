import assert from 'node:assert/strict';
import test from 'node:test';

import { ACTIVITY_MODE } from '../src/activity-mode.js';
import { buildSetupCandidates } from '../src/setup-candidates.js';
import {
  evaluateSetupCandidate,
  evaluateSetupCandidates,
} from '../src/setup-candidate-evaluator.js';
import {
  createDefaultSetups,
  prefillSetupFromSnapshot,
} from '../src/setups.js';

const ARMOR_META = Object.freeze([
  ['helmet', 3, 'HELIANTHUS_HELMET', 'Helianthus Helmet'],
  ['chestplate', 2, 'HELIANTHUS_CHESTPLATE', 'Helianthus Chestplate'],
  ['leggings', 1, 'HELIANTHUS_LEGGINGS', 'Helianthus Leggings'],
  ['boots', 0, 'HELIANTHUS_BOOTS', 'Helianthus Boots'],
]);
const EQUIPMENT_META = Object.freeze([
  [0, 'BLOSSOM_NECKLACE', 'Blossom Necklace'],
  [1, 'BLOSSOM_CLOAK', 'Blossom Cloak'],
  [2, 'BLOSSOM_BELT', 'Blossom Belt'],
  [3, 'BLOSSOM_BRACELET', 'Blossom Bracelet'],
]);

function armorSet(setId, { equipped = false, reforge = null, gems = {} } = {}) {
  return ARMOR_META.map(([slotName, slot, skyblockId, displayName]) => ({
    skyblockId,
    itemUuid: `${setId}-${slotName}`,
    displayName,
    rarity: 'LEGENDARY',
    reforge,
    enchantments: {},
    gems,
    container: equipped ? 'armor' : `loadout.armor.${setId}.${slotName}`,
    slot: equipped ? slot : 0,
    locations: [{
      container: equipped ? 'armor' : `loadout.armor.${setId}.${slotName}`,
      slot: equipped ? slot : 0,
    }],
  }));
}

function equipmentSet(setId, { equipped = false, reforge = null } = {}) {
  return EQUIPMENT_META.map(([index, skyblockId, displayName]) => ({
    skyblockId,
    itemUuid: `${setId}-equipment-${index}`,
    displayName,
    rarity: 'LEGENDARY',
    reforge,
    enchantments: {},
    gems: {},
    container: equipped ? 'equipment' : `loadout.equipment.${setId}.equipment_slot_${index + 1}`,
    slot: equipped ? index : 0,
    locations: [{
      container: equipped ? 'equipment' : `loadout.equipment.${setId}.equipment_slot_${index + 1}`,
      slot: equipped ? index : 0,
    }],
  }));
}

function snapshot({
  savedArmorReforge = null,
  savedEquipmentReforge = 'thorny',
  savedArmorGems = {},
  extraPets = [],
  petHeldItem = null,
} = {}) {
  return {
    skills: { farming: { level: null } },
    garden: {
      cropUpgrades: {},
      unlockedPlotCount: null,
      visitors: { uniqueNpcsServed: 0 },
    },
    items: [
      ...armorSet('equipped', { equipped: true, reforge: 'mossy' }),
      ...armorSet('saved', { reforge: savedArmorReforge, gems: savedArmorGems }),
      ...equipmentSet('equipped', { equipped: true, reforge: 'rooted' }),
      ...equipmentSet('saved', { reforge: savedEquipmentReforge }),
    ],
    pets: [
      {
        index: 0,
        uuid: 'cow',
        type: 'MOOSHROOM_COW',
        rarity: 'LEGENDARY',
        level: 100,
        experience: 1_000_000_000,
        active: true,
        heldItem: petHeldItem,
      },
      ...extraPets,
    ],
    provenance: {
      items: { status: 'AUTO', sources: [] },
      pets: { status: 'AUTO', sources: [] },
      garden: { status: 'AUTO', sources: [] },
    },
  };
}

function stateForSnapshot(profileSnapshot) {
  const setups = createDefaultSetups();
  const farming = prefillSetupFromSnapshot(setups.list[0], profileSnapshot, { overwrite: true }).setup;
  setups.list[0] = farming;
  setups.activeId = 'normal';
  return {
    selectedCrop: 'melon',
    profile: {
      inputs: { strength: 1000 },
      levels: {},
      owned: {},
      manualGain: {},
      cropProgress: {},
      toolProgress: {},
      vacuumProgress: {},
      autoApplied: {},
      setups,
      normalizedSnapshot: profileSnapshot,
    },
  };
}

function savedCowCandidate(profileSnapshot, phase = ACTIVITY_MODE.FARM) {
  return buildSetupCandidates(profileSnapshot, { phase }).find(candidate =>
    candidate.components.armorSetId === 'saved:saved'
    && candidate.components.equipmentSetId === 'saved:saved'
    && candidate.components.petId === 'pet:cow');
}

test('complete-state evaluation recomputes setup-local gear instead of adding candidate stats to the current setup', () => {
  const profileSnapshot = snapshot();
  const state = stateForSnapshot(profileSnapshot);
  const candidate = savedCowCandidate(profileSnapshot);
  const result = evaluateSetupCandidate(state, candidate);

  assert.equal(result.complete, true);
  assert.equal(result.currentSetupId, 'normal');
  assert.equal(result.phase, ACTIVITY_MODE.FARM);

  // Current: Helianthus 225 + Mossy 100 + Blossom 28 + Rooted 72 + Cow 135.
  assert.equal(result.before.totals.globalFortune, 560);
  // Candidate: Helianthus 225 + Blossom 28 + Thorny 40 + the same Cow 135.
  assert.equal(result.after.totals.globalFortune, 428);
  assert.equal(result.delta.globalFortune, -132);
  assert.equal(result.delta.effectiveFortune, -132);
  assert.equal(result.before.totals.overbloom, 0);
  assert.equal(result.after.totals.overbloom, 5);
  assert.equal(result.delta.overbloom, 5);
});

test('the comparison baseline is the stored setup for the evaluated phase, not whichever setup is currently open', () => {
  const profileSnapshot = snapshot();
  const state = stateForSnapshot(profileSnapshot);
  state.profile.setups.activeId = 'pest';

  const candidate = savedCowCandidate(profileSnapshot, ACTIVITY_MODE.FARM);
  const result = evaluateSetupCandidate(state, candidate, { phase: ACTIVITY_MODE.FARM });

  assert.equal(result.currentSetupId, 'normal');
  assert.equal(result.before.totals.globalFortune, 560);
});

test('batch evaluation preserves enumeration order and does not rank by raw Fortune', () => {
  const profileSnapshot = snapshot();
  const state = stateForSnapshot(profileSnapshot);
  const candidates = buildSetupCandidates(profileSnapshot, { phase: ACTIVITY_MODE.FARM }).slice(0, 4);
  const evaluated = evaluateSetupCandidates(state, candidates);

  assert.deepEqual(evaluated.map(row => row.candidateId), candidates.map(row => row.id));
});

test('an unmodeled farming pet makes a candidate incomplete instead of contributing a fake zero', () => {
  const profileSnapshot = snapshot({
    extraPets: [{
      index: 1,
      uuid: 'elephant',
      type: 'ELEPHANT',
      rarity: 'LEGENDARY',
      level: 100,
      experience: 1_000_000_000,
      active: false,
      heldItem: null,
    }],
  });
  const state = stateForSnapshot(profileSnapshot);
  const candidate = buildSetupCandidates(profileSnapshot).find(row =>
    row.components.armorSetId === 'saved:saved'
    && row.components.equipmentSetId === 'saved:saved'
    && row.components.petId === 'pet:elephant');

  const result = evaluateSetupCandidate(state, candidate);
  assert.equal(result.complete, false);
  assert.ok(result.after.supportGaps.some(reason => reason.includes('Elephant Pet contribution is not modeled')));
});

test('a pet item is not treated as account-global when comparing pet states', () => {
  const profileSnapshot = snapshot({ petHeldItem: 'GREEN_BANDANA' });
  const state = stateForSnapshot(profileSnapshot);
  const candidate = savedCowCandidate(profileSnapshot);

  const result = evaluateSetupCandidate(state, candidate);
  assert.equal(result.complete, false);
  assert.ok(result.after.supportGaps.some(reason => reason.includes('Green Bandana is not yet setup-local')));
  assert.ok(result.before.supportGaps.some(reason => reason.includes('Green Bandana is not yet setup-local')));
});

test('unmodeled Mantid armor reforge is explicit instead of silently valued at zero', () => {
  const profileSnapshot = snapshot({ savedArmorReforge: 'mantid' });
  const state = stateForSnapshot(profileSnapshot);
  const result = evaluateSetupCandidate(state, savedCowCandidate(profileSnapshot));

  assert.equal(result.complete, false);
  assert.ok(result.after.supportGaps.some(reason => reason.includes('armor reforge mantid is not modeled')));
});

test('non-Perfect Peridot values stay incomplete until their rarity table is modeled', () => {
  const profileSnapshot = snapshot({ savedArmorGems: { PERIDOT_0: 'FINE' } });
  const state = stateForSnapshot(profileSnapshot);
  const result = evaluateSetupCandidate(state, savedCowCandidate(profileSnapshot));

  assert.equal(result.complete, false);
  assert.ok(result.after.supportGaps.some(reason => reason.includes('FINE PERIDOT')));
});

test('stale profile ownership prevents a profile-derived candidate from becoming comparable', () => {
  const profileSnapshot = snapshot();
  profileSnapshot.provenance.items.status = 'HIDDEN';
  const state = stateForSnapshot(profileSnapshot);
  const result = evaluateSetupCandidate(state, savedCowCandidate(profileSnapshot));

  assert.equal(result.freshness.items, 'HIDDEN');
  assert.equal(result.freshness.fresh, false);
  assert.equal(result.complete, false);
  assert.ok(result.reasons.includes('candidate ownership is not currently verified by fresh item and pet profile data'));
});

test('evaluation never mutates the stored state or normalized snapshot', () => {
  const profileSnapshot = snapshot();
  const state = stateForSnapshot(profileSnapshot);
  const beforeState = structuredClone(state);
  const beforeSnapshot = structuredClone(profileSnapshot);

  evaluateSetupCandidate(state, savedCowCandidate(profileSnapshot));

  assert.deepEqual(state, beforeState);
  assert.deepEqual(profileSnapshot, beforeSnapshot);
});
