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
      experience: 60120,
      level: 15,
      cropUpgrades: {},
      unlockedPlotCount: null,
      visitors: { uniqueNpcsServed: 0 },
    },
    items: [
      {
        skyblockId: 'MELON_DICER_3',
        itemUuid: 'melon-tool',
        displayName: 'Melon Dicer',
        container: 'inventory',
        slot: 0,
        locations: [{ container: 'inventory', slot: 0 }],
      },
      {
        skyblockId: 'INFINI_VACUUM_HOOVERIUS',
        itemUuid: 'vacuum',
        displayName: 'InfiniVacuum™ Hooverius',
        container: 'inventory',
        slot: 1,
        locations: [{ container: 'inventory', slot: 1 }],
      },
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

test('phase evaluation reports the observed hand-item path', () => {
  const profileSnapshot = snapshot();
  const state = stateForSnapshot(profileSnapshot);

  const farmCandidate = savedCowCandidate(profileSnapshot, ACTIVITY_MODE.FARM);
  const farm = evaluateSetupCandidate(state, farmCandidate);
  assert.equal(farm.handItem.kind, 'farming-tool');
  assert.equal(farm.handItem.observed, true);
  assert.deepEqual([...farm.handItem.itemIds], ['MELON_DICER_3']);

  const killCandidate = savedCowCandidate(profileSnapshot, ACTIVITY_MODE.PEST_KILL);
  const kill = evaluateSetupCandidate(state, killCandidate);
  assert.equal(kill.handItem.kind, 'vacuum');
  assert.equal(kill.handItem.observed, true);
  assert.deepEqual([...kill.handItem.itemIds], ['INFINI_VACUUM_HOOVERIUS']);
});

test('missing required hand item keeps a setup comparison incomplete', () => {
  const profileSnapshot = snapshot();
  profileSnapshot.items = profileSnapshot.items.filter(item => item.skyblockId !== 'MELON_DICER_3');
  const state = stateForSnapshot(profileSnapshot);
  const result = evaluateSetupCandidate(state, savedCowCandidate(profileSnapshot));

  assert.equal(result.handItem.observed, false);
  assert.equal(result.complete, false);
  assert.ok(result.reasons.includes('no observed farming-tool is available for this phase and crop'));
});

test('an empty current phase setup prevents a fake complete before/after comparison', () => {
  const profileSnapshot = snapshot();
  const state = stateForSnapshot(profileSnapshot);
  const candidate = savedCowCandidate(profileSnapshot, ACTIVITY_MODE.PEST_KILL);
  const result = evaluateSetupCandidate(state, candidate, { phase: ACTIVITY_MODE.PEST_KILL });

  assert.equal(result.before.wearableComplete, false);
  assert.equal(result.after.wearableComplete, true);
  assert.equal(result.complete, false);
  assert.ok(result.reasons.includes('current phase setup does not contain a complete armor/equipment loadout'));
});

test('batch evaluation preserves enumeration order and does not rank by raw Fortune', () => {
  const profileSnapshot = snapshot();
  const state = stateForSnapshot(profileSnapshot);
  const candidates = buildSetupCandidates(profileSnapshot, { phase: ACTIVITY_MODE.FARM }).slice(0, 4);
  const evaluated = evaluateSetupCandidates(state, candidates);

  assert.deepEqual(evaluated.map(row => row.candidateId), candidates.map(row => row.id));
});

test('Rose Dragon candidate uses Farming level, total Crop Milestones and Symbiosis instead of a fake zero', () => {
  const profileSnapshot = snapshot({
    extraPets: [{
      index: 1,
      uuid: 'dragon',
      type: 'ROSE_DRAGON',
      rarity: 'LEGENDARY',
      level: 200,
      experience: null,
      active: false,
      heldItem: null,
    }],
  });
  profileSnapshot.garden.cropMilestoneTotal = 598;
  const state = stateForSnapshot(profileSnapshot);
  state.profile.levels['account-skill-farming-skill-level'] = 60;

  const candidate = buildSetupCandidates(profileSnapshot).find(row =>
    row.components.armorSetId === 'saved:saved'
    && row.components.equipmentSetId === 'saved:saved'
    && row.components.petId === 'pet:dragon');

  const result = evaluateSetupCandidate(state, candidate);
  assert.equal(result.complete, true);
  assert.ok(!result.after.supportGaps.some(reason => reason.includes('Rose Dragon')));
  assert.ok(Math.abs(result.after.totals.globalFortune - 845.7) < 1e-9);
  assert.equal(result.after.totals.overbloom, 45);
  assert.ok(Math.abs(result.delta.globalFortune - 45.7) < 1e-9);
  assert.equal(result.delta.overbloom, 45);
  assert.equal(result.after.totals.derived.roseDragon.symbiosisPetCount, 1);
  assert.deepEqual([...result.after.totals.derived.roseDragon.symbiosisPets], ['MOOSHROOM_COW']);
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

test('Green Bandana is setup-local and derives +60 FF at Garden 15', () => {
  const profileSnapshot = snapshot({ petHeldItem: 'GREEN_BANDANA' });
  const state = stateForSnapshot(profileSnapshot);
  // A stale historical account-level toggle must not double count the item.
  state.profile.levels['pet-item-green-bandana'] = 1;
  state.profile.owned['pet-item-green-bandana'] = true;

  const result = evaluateSetupCandidate(state, savedCowCandidate(profileSnapshot));
  assert.equal(result.complete, true);
  assert.equal(result.before.petItem.globalFortune, 60);
  assert.equal(result.after.petItem.globalFortune, 60);
  assert.equal(result.before.totals.globalFortune, 620);
  assert.equal(result.after.totals.globalFortune, 488);
  assert.equal(result.delta.globalFortune, -132);
});

test('Poignant Clover swaps setup-local Fortune for +13 Overbloom without stacking Green Bandana', () => {
  const profileSnapshot = snapshot({
    petHeldItem: 'GREEN_BANDANA',
    extraPets: [{
      index: 1,
      uuid: 'cow-poignant',
      type: 'MOOSHROOM_COW',
      rarity: 'LEGENDARY',
      level: 100,
      experience: 1_000_000_000,
      active: false,
      heldItem: 'POIGNANT_LUCKY_CLOVER',
    }],
  });
  const state = stateForSnapshot(profileSnapshot);
  const candidate = buildSetupCandidates(profileSnapshot).find(row =>
    row.components.armorSetId === 'saved:saved'
    && row.components.equipmentSetId === 'saved:saved'
    && row.components.petId === 'pet:cow-poignant');

  const result = evaluateSetupCandidate(state, candidate);
  assert.equal(result.complete, true);
  assert.equal(result.before.petItem.globalFortune, 60);
  assert.equal(result.after.petItem.overbloom, 13);
  assert.equal(result.delta.globalFortune, -192);
  assert.equal(result.delta.overbloom, 18);
});

test('Brown Bandana remains incomplete until eligible Pest Bestiary tiers are known', () => {
  const profileSnapshot = snapshot({
    petHeldItem: 'BROWN_BANDANA',
  });
  const state = stateForSnapshot(profileSnapshot);
  const candidate = savedCowCandidate(profileSnapshot, ACTIVITY_MODE.PEST_SPAWN);

  const unknown = evaluateSetupCandidate(state, candidate, { phase: ACTIVITY_MODE.PEST_SPAWN });
  assert.equal(unknown.complete, false);
  assert.ok(unknown.after.supportGaps.some(reason => reason.includes('Eligible Pest Bestiary tier total')));

  const known = evaluateSetupCandidate(state, candidate, {
    phase: ACTIVITY_MODE.PEST_SPAWN,
    eligiblePestBestiaryTiers: 100,
  });
  assert.equal(known.complete, false, 'the empty current Pest setup still prevents a complete before/after comparison');
  assert.equal(known.after.petItem.bonusPestChance, 20);
  assert.equal(known.after.totals.bonusPestChance, 20);
  assert.ok(known.reasons.includes('current phase setup does not contain a complete armor/equipment loadout'));
});

test('Brown Bandana reads eligible Pest Bestiary tiers directly from the normalized snapshot', () => {
  const profileSnapshot = snapshot({ petHeldItem: 'BROWN_BANDANA' });
  profileSnapshot.bestiary = {
    eligiblePestTierTotal: 100,
    eligiblePestMaxTierTotal: 225,
    eligiblePestFamilyTiers: {},
  };
  profileSnapshot.provenance['bestiary.eligiblePestTierTotal'] = { status: 'DERIVED', sources: [] };

  const state = stateForSnapshot(profileSnapshot);
  const candidate = savedCowCandidate(profileSnapshot, ACTIVITY_MODE.PEST_SPAWN);
  const result = evaluateSetupCandidate(state, candidate, { phase: ACTIVITY_MODE.PEST_SPAWN });

  assert.equal(result.after.petItem.complete, true);
  assert.equal(result.after.petItem.bonusPestChance, 20);
  assert.equal(result.after.totals.bonusPestChance, 20);
  assert.ok(!result.after.supportGaps.some(reason => reason.includes('Eligible Pest Bestiary tier total')));
  assert.equal(result.complete, false, 'the empty current Pest setup remains the only comparison blocker here');
  assert.ok(result.reasons.includes('current phase setup does not contain a complete armor/equipment loadout'));
});

test('Brown Bandana bestiary state is irrelevant outside the Pest Spawning phase', () => {
  const profileSnapshot = snapshot({ petHeldItem: 'BROWN_BANDANA' });
  const state = stateForSnapshot(profileSnapshot);
  const result = evaluateSetupCandidate(state, savedCowCandidate(profileSnapshot), { phase: ACTIVITY_MODE.FARM });

  assert.equal(result.before.petItem.active, false);
  assert.equal(result.complete, true);
  assert.equal(result.before.totals.bonusPestChance, 0);
});

test('Mantid armor reforge is scored by rarity instead of creating a support gap', () => {
  const profileSnapshot = snapshot({ savedArmorReforge: 'mantid' });
  const state = stateForSnapshot(profileSnapshot);
  const result = evaluateSetupCandidate(state, savedCowCandidate(profileSnapshot));

  assert.equal(result.complete, true);
  assert.ok(!result.after.supportGaps.some(reason => reason.includes('mantid')));
  assert.equal(result.after.totals.derived.pestSetupGear.mantidFortune, 40);
  assert.equal(result.after.totals.globalFortune, 468);
  assert.equal(result.delta.globalFortune, -92);
});

test('Squeaky equipment reforge is a modeled setup reforge', () => {
  const profileSnapshot = snapshot({ savedEquipmentReforge: 'squeaky' });
  const state = stateForSnapshot(profileSnapshot);
  const result = evaluateSetupCandidate(state, savedCowCandidate(profileSnapshot));

  assert.equal(result.complete, true);
  assert.ok(!result.after.supportGaps.some(reason => reason.includes('squeaky')));
  assert.equal(result.after.totals.derived.pestSetupGear.squeakyFortune, 40);
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
