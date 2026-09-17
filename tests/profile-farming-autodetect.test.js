import test from 'node:test';
import assert from 'node:assert/strict';

import { detectFarmingProfile } from '../src/profile-farming-autodetect.js';
import { PROFILE_DATA_STATUS, createEmptyProfileSnapshot } from '../src/profile-normalizer.js';

function snapshotWithFreshSources() {
  const snapshot = createEmptyProfileSnapshot();
  snapshot.provenance.items = { status: PROFILE_DATA_STATUS.AUTO, sources: [] };
  snapshot.provenance.pets = { status: PROFILE_DATA_STATUS.AUTO, sources: [] };
  snapshot.provenance.garden = { status: PROFILE_DATA_STATUS.AUTO, sources: [] };
  return snapshot;
}

test('autodetect separates farming tools, pest vacuums, armor and equipment', () => {
  const snapshot = snapshotWithFreshSources();
  snapshot.items = [
    {
      skyblockId: 'THEORETICAL_HOE_WHEAT_3', itemUuid: 'tool', displayName: "Euclid's Wheat Sickle",
      locations: [{ container: 'inventory', slot: 0 }],
    },
    {
      skyblockId: 'INFINI_VACUUM_HOOVERIUS', itemUuid: 'vac', displayName: 'InfiniVacuum™ Hooverius',
      locations: [{ container: 'inventory', slot: 1 }],
    },
    {
      skyblockId: 'FERMENTO_HELMET', itemUuid: 'helmet', displayName: '§6Fermento Helmet', skullTexture: 'texture-hash',
      locations: [{ container: 'armor', slot: 3 }, { container: 'loadout.armor.farm.helmet', slot: 0 }],
    },
    {
      skyblockId: 'LOTUS_NECKLACE', itemUuid: 'necklace', displayName: 'Peony Necklace',
      locations: [{ container: 'equipment', slot: 0 }],
    },
  ];

  const detected = detectFarmingProfile(snapshot);
  assert.equal(detected.physical.tools.length, 1);
  assert.equal(detected.physical.tools[0].toolName, "Euclid's Wheat Sickle");
  assert.equal(detected.physical.tools[0].tier, 3);
  assert.equal(detected.physical.vacuums.length, 1);
  assert.equal(detected.physical.armor.length, 1);
  assert.equal(detected.physical.equipment.length, 1);
  assert.equal(detected.active.armor.items[0].skyblockId, 'FERMENTO_HELMET');
  assert.equal(detected.active.equipment.items[0].skyblockId, 'LOTUS_NECKLACE');
  assert.equal(detected.physical.armor[0].model.skullTexture, 'texture-hash');
  assert.deepEqual(detected.setupHints.farming.autoTools, ['THEORETICAL_HOE_WHEAT_3']);
  assert.deepEqual(detected.setupHints.pest.autoVacuums, ['INFINI_VACUUM_HOOVERIUS']);
});

test('armor equipment and pets are never auto-assigned to farming versus pest context', () => {
  const snapshot = snapshotWithFreshSources();
  snapshot.pets = [{ type: 'ELEPHANT', uuid: 'pet-1', active: true, heldItem: 'GREEN_BANDANA' }];
  const detected = detectFarmingProfile(snapshot);

  assert.equal(detected.setupHints.farming.armorSelection, 'manual-context');
  assert.equal(detected.setupHints.pest.equipmentSelection, 'manual-context');
  assert.equal(detected.setupHints.farming.petSelection, 'manual-context');
  assert.equal(detected.rules.armorIsNotAutoAssignedBetweenFarmingAndPest, true);
  assert.equal(detected.rules.petsAreNotAutoAssignedBetweenFarmingAndPest, true);
  assert.equal(detected.active.pet.status, PROFILE_DATA_STATUS.AUTO);
  assert.equal(detected.active.pet.pet.type, 'ELEPHANT');
  assert.equal(detected.physical.pets[0].heldItem, 'GREEN_BANDANA');
});

test('missing active-pet booleans remain unknown instead of selecting a pet', () => {
  const snapshot = snapshotWithFreshSources();
  snapshot.pets = [{ type: 'MOOSHROOM_COW', uuid: 'pet-1', active: null }];
  const detected = detectFarmingProfile(snapshot);
  assert.equal(detected.active.pet.status, PROFILE_DATA_STATUS.UNKNOWN);
  assert.equal(detected.active.pet.pet, null);
});

test('multiple active pets are treated as an API conflict', () => {
  const snapshot = snapshotWithFreshSources();
  snapshot.pets = [
    { type: 'ELEPHANT', uuid: 'pet-1', active: true },
    { type: 'MOOSHROOM_COW', uuid: 'pet-2', active: true },
  ];
  const detected = detectFarmingProfile(snapshot);
  assert.equal(detected.active.pet.status, PROFILE_DATA_STATUS.UNKNOWN);
  assert.equal(detected.active.pet.conflict, true);
});

test('physical Garden Chip items never become redeemed account chip levels', () => {
  const snapshot = snapshotWithFreshSources();
  snapshot.items = [{
    skyblockId: 'HYPERCHARGE_GARDEN_CHIP',
    itemUuid: 'chip-1',
    displayName: 'Hypercharge Chip',
    locations: [{ container: 'inventory', slot: 4 }],
  }];

  const detected = detectFarmingProfile(snapshot);
  assert.equal(detected.physical.gardenChipItems.length, 1);
  assert.equal(detected.physical.gardenChipItems[0].chipId, 'hypercharge');
  assert.equal(detected.account.gardenChips.status, PROFILE_DATA_STATUS.UNKNOWN);
  assert.equal(detected.account.gardenChips.redeemedLevels, null);
  assert.equal(detected.rules.physicalChipItemDoesNotImplyRedeemedChip, true);
});

test('hidden item API keeps ownership freshness hidden even if a stale snapshot has items', () => {
  const snapshot = snapshotWithFreshSources();
  snapshot.provenance.items = { status: PROFILE_DATA_STATUS.HIDDEN, sources: [] };
  snapshot.items = [{
    skyblockId: 'MELON_DICER_3', itemUuid: 'stale-tool', displayName: 'Melon Dicer',
    locations: [{ container: 'inventory', slot: 0 }],
  }];

  const detected = detectFarmingProfile(snapshot);
  assert.equal(detected.physical.status, PROFILE_DATA_STATUS.HIDDEN);
  assert.equal(detected.physical.tools.length, 1);
  assert.equal(detected.active.armor.status, PROFILE_DATA_STATUS.HIDDEN);
});

test('Garden progression is account state while shards and temporary buffs stay unobserved', () => {
  const snapshot = snapshotWithFreshSources();
  snapshot.skills.farming = { xp: 123, level: 60, cap: 60, status: PROFILE_DATA_STATUS.DERIVED };
  snapshot.garden.cropUpgrades = { wheat: 9 };
  snapshot.garden.unlockedPlotCount = 24;
  snapshot.garden.visitors.totalCompleted = 1000;

  const detected = detectFarmingProfile(snapshot);
  assert.equal(detected.account.farmingSkill.level, 60);
  assert.equal(detected.account.gardenProgress.cropUpgrades.wheat, 9);
  assert.equal(detected.account.gardenProgress.unlockedPlotCount, 24);
  assert.equal(detected.account.farmingShards.status, PROFILE_DATA_STATUS.UNKNOWN);
  assert.equal(detected.account.temporaryModifiers.status, PROFILE_DATA_STATUS.UNKNOWN);
  assert.ok(detected.account.temporaryModifiers.knownModifierIds.includes('crop-fever'));
});
