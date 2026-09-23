import assert from 'node:assert/strict';
import test from 'node:test';

import { ACTIVITY_MODE } from '../src/activity-mode.js';
import {
  buildSetupCandidateInventory,
  buildSetupCandidates,
} from '../src/setup-candidates.js';
import { itemRecordsFromSnapshotPet } from '../src/setups.js';

function armorItem(slotName, slot, setIds, overrides = {}) {
  const locations = [];
  for (const setId of setIds) {
    if (setId === 'equipped') locations.push({ container: 'armor', slot });
    else locations.push({ container: `loadout.armor.${setId}.${slotName}`, slot: 0 });
  }
  return {
    skyblockId: `HELIANTHUS_${slotName.toUpperCase()}`,
    itemUuid: `${setIds.join('-')}-${slotName}`,
    displayName: `Helianthus ${slotName}`,
    rarity: 'LEGENDARY',
    locations,
    ...overrides,
  };
}

function equipmentItem(index, setIds, overrides = {}) {
  const locations = [];
  for (const setId of setIds) {
    if (setId === 'equipped') locations.push({ container: 'equipment', slot: index });
    else locations.push({ container: `loadout.equipment.${setId}.equipment_slot_${index + 1}`, slot: 0 });
  }
  return {
    skyblockId: ['BLOSSOM_NECKLACE', 'BLOSSOM_CLOAK', 'BLOSSOM_BELT', 'BLOSSOM_GLOVES'][index],
    itemUuid: `${setIds.join('-')}-equipment-${index}`,
    displayName: ['Blossom Necklace', 'Blossom Cloak', 'Blossom Belt', 'Blossom Gloves'][index],
    rarity: 'LEGENDARY',
    locations,
    ...overrides,
  };
}

function completeArmorSet(setId, overrides = {}) {
  return [
    armorItem('helmet', 3, [setId], overrides.helmet),
    armorItem('chestplate', 2, [setId], overrides.chestplate),
    armorItem('leggings', 1, [setId], overrides.leggings),
    armorItem('boots', 0, [setId], overrides.boots),
  ];
}

function completeEquipmentSet(setId, overrides = {}) {
  return [0, 1, 2, 3].map(index => equipmentItem(index, [setId], overrides[index]));
}

function freshSnapshot() {
  return {
    items: [],
    pets: [],
    provenance: {
      items: { status: 'AUTO' },
      pets: { status: 'AUTO' },
    },
  };
}

test('candidate inventory reconstructs equipped and saved armor/equipment sets from physical locations', () => {
  const snapshot = freshSnapshot();
  snapshot.items = [
    ...completeArmorSet('equipped'),
    ...completeArmorSet('spawn'),
    ...completeEquipmentSet('equipped'),
    ...completeEquipmentSet('spawn'),
  ];

  const inventory = buildSetupCandidateInventory(snapshot);
  assert.deepEqual(inventory.armorSets.map(set => set.id).sort(), ['equipped', 'saved:spawn']);
  assert.deepEqual(inventory.equipmentSets.map(set => set.id).sort(), ['equipped', 'saved:spawn']);
  assert.ok(inventory.armorSets.every(set => set.complete));
  assert.ok(inventory.equipmentSets.every(set => set.complete));
  assert.equal(inventory.armorSets.find(set => set.id === 'equipped').slots.helmet.skyblockId, 'HELIANTHUS_HELMET');
  assert.equal(inventory.equipmentSets.find(set => set.id === 'saved:spawn').slots.equipment4.skyblockId, 'BLOSSOM_GLOVES');
});

test('the same physical saved/equipped set is deduplicated and keeps the equipped identity', () => {
  const snapshot = freshSnapshot();
  snapshot.items = [
    armorItem('helmet', 3, ['saved1', 'equipped']),
    armorItem('chestplate', 2, ['saved1', 'equipped']),
    armorItem('leggings', 1, ['saved1', 'equipped']),
    armorItem('boots', 0, ['saved1', 'equipped']),
  ];

  const inventory = buildSetupCandidateInventory(snapshot);
  assert.equal(inventory.armorSets.length, 1);
  assert.equal(inventory.armorSets[0].id, 'equipped');
  assert.equal(inventory.armorSets[0].currentObserved, true);
  assert.deepEqual([...inventory.armorSets[0].origins].sort(), ['equipped', 'saved:saved1']);
});

test('candidate generation enumerates owned legal combinations without choosing a winner', () => {
  const snapshot = freshSnapshot();
  snapshot.items = [
    ...completeArmorSet('farm'),
    ...completeArmorSet('spawn'),
    ...completeEquipmentSet('farm'),
    ...completeEquipmentSet('spawn'),
  ];
  snapshot.pets = [
    { index: 0, uuid: 'cow', type: 'MOOSHROOM_COW', rarity: 'LEGENDARY', experience: 1_000_000_000, active: true, heldItem: 'GREEN_BANDANA' },
    { index: 1, uuid: 'mosquito', type: 'MOSQUITO', rarity: 'LEGENDARY', experience: 1_000_000_000, active: false, heldItem: 'BROWN_BANDANA' },
  ];

  const candidates = buildSetupCandidates(snapshot, { phase: ACTIVITY_MODE.FARM });
  assert.equal(candidates.length, 8);
  assert.ok(candidates.every(candidate => candidate.valid));
  assert.ok(candidates.every(candidate => candidate.requiredHandItemKind === 'farming-tool'));
  assert.ok(candidates.every(candidate => candidate.wearableComplete));
  assert.deepEqual(
    new Set(candidates.map(candidate => candidate.components.petId)),
    new Set(['pet:cow', 'pet:mosquito']),
  );
});

test('Farming and Spawning require crop tools while Killing requires the Vacuum', () => {
  const snapshot = freshSnapshot();
  const farm = buildSetupCandidates(snapshot, { phase: ACTIVITY_MODE.FARM })[0];
  const spawn = buildSetupCandidates(snapshot, { phase: ACTIVITY_MODE.PEST_SPAWN })[0];
  const kill = buildSetupCandidates(snapshot, { phase: ACTIVITY_MODE.PEST_KILL })[0];

  assert.equal(farm.requiredHandItemKind, 'farming-tool');
  assert.equal(spawn.requiredHandItemKind, 'farming-tool');
  assert.equal(kill.requiredHandItemKind, 'vacuum');
});

test('held pet items stay attached to the exact physical pet across candidates', () => {
  const snapshot = freshSnapshot();
  snapshot.pets = [
    { uuid: 'rose-green', type: 'ROSE_DRAGON', rarity: 'LEGENDARY', level: 200, active: true, heldItem: 'GREEN_BANDANA' },
    { uuid: 'rose-clover', type: 'ROSE_DRAGON', rarity: 'LEGENDARY', level: 200, active: false, heldItem: 'POIGNANT_LUCKY_CLOVER' },
  ];

  const candidates = buildSetupCandidates(snapshot);
  const byPet = new Map(candidates.map(candidate => [candidate.setup.slots.pet.physicalItemId, candidate]));
  assert.equal(byPet.get('pet:rose-green').setup.slots.petItem.skyblockId, 'GREEN_BANDANA');
  assert.equal(byPet.get('pet:rose-green').setup.slots.petItem.physicalItemId, 'pet-held:rose-green');
  assert.equal(byPet.get('pet:rose-clover').setup.slots.petItem.skyblockId, 'POIGNANT_LUCKY_CLOVER');
  assert.equal(byPet.get('pet:rose-clover').setup.slots.petItem.physicalItemId, 'pet-held:rose-clover');
});

test('Rose Dragon explicit level 100-200 is preserved and unknown XP is not forced through the standard pet curve', () => {
  const explicit = itemRecordsFromSnapshotPet({
    uuid: 'rose-explicit',
    type: 'ROSE_DRAGON',
    rarity: 'LEGENDARY',
    level: 180,
    experience: 1_000_000_000,
  });
  assert.equal(explicit.pet.petLevel, 180);

  const xpOnly = itemRecordsFromSnapshotPet({
    uuid: 'rose-xp-only',
    type: 'ROSE_DRAGON',
    rarity: 'LEGENDARY',
    experience: 1_000_000_000,
  });
  assert.equal(xpOnly.pet.petLevel, null);

  const standard = itemRecordsFromSnapshotPet({
    uuid: 'cow',
    type: 'MOOSHROOM_COW',
    rarity: 'LEGENDARY',
    experience: 1_000_000_000,
  });
  assert.equal(standard.pet.petLevel, 100);
});

test('non-farming pets are not promoted into farming setup candidates', () => {
  const snapshot = freshSnapshot();
  snapshot.pets = [
    { uuid: 'rose', type: 'ROSE_DRAGON', rarity: 'LEGENDARY', level: 150, active: false },
    { uuid: 'tiger', type: 'TIGER', rarity: 'LEGENDARY', experience: 1_000_000, active: true },
  ];

  const inventory = buildSetupCandidateInventory(snapshot);
  assert.deepEqual(inventory.pets.map(pet => pet.type), ['ROSE_DRAGON']);
  assert.equal(buildSetupCandidates(snapshot).length, 1);
});

test('non-farming gear is not promoted into farming setup candidates', () => {
  const snapshot = freshSnapshot();
  snapshot.items = [{
    skyblockId: 'NECRON_HELMET',
    itemUuid: 'combat-hat',
    displayName: 'Necron Helmet',
    locations: [{ container: 'armor', slot: 3 }],
  }];

  const inventory = buildSetupCandidateInventory(snapshot);
  assert.deepEqual(inventory.armorSets, []);
  const candidate = buildSetupCandidates(snapshot)[0];
  assert.equal(candidate.setup.slots.helmet, null);
  assert.equal(candidate.wearableComplete, false);
});

test('candidate freshness carries snapshot provenance instead of treating stale ownership as fresh', () => {
  const snapshot = freshSnapshot();
  snapshot.provenance.items.status = 'HIDDEN';
  snapshot.provenance.pets.status = 'UNKNOWN';

  const candidate = buildSetupCandidates(snapshot)[0];
  assert.deepEqual(candidate.sourceStatus, { items: 'HIDDEN', pets: 'UNKNOWN' });
});
