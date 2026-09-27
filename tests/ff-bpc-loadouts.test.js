import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

import {
  BPC_SETUP_ID,
  FF_SETUP_ID,
  KILLING_SETUP_ID,
  VISIBLE_SETUP_IDS,
  activeSetup,
  createDefaultSetups,
  createEmptyItem,
  effectiveSetup,
  farmingKillingPetShared,
  prepareFfBpcSetups,
  setFarmingKillingPetShared,
  writeLinkedSetupSlot,
} from '../src/setups.js';

const root = new URL('../', import.meta.url);
const read = path => readFileSync(new URL(path, root), 'utf8');

function item(name, id = name.toUpperCase().replace(/\s+/g, '_')) {
  return { ...createEmptyItem(), displayName: name, skyblockId: id };
}

test('only FF and BPC are visible physical sets', () => {
  assert.deepEqual(VISIBLE_SETUP_IDS, [FF_SETUP_ID, BPC_SETUP_ID]);
  assert.equal(VISIBLE_SETUP_IDS.includes(KILLING_SETUP_ID), false);
  assert.equal(createDefaultSetups().list.length, 3, 'Killing keeps an internal pet overlay');
});

test('legacy Killing gear migrates to FF and is no longer duplicated in storage', () => {
  const normalized = prepareFfBpcSetups({
    modelVersion: 4,
    activeId: KILLING_SETUP_ID,
    list: [
      { id: FF_SETUP_ID, slots: { helmet: item('FF Helmet'), equipment1: item('FF Necklace') } },
      { id: BPC_SETUP_ID, slots: { helmet: item('BPC Helmet') } },
      { id: KILLING_SETUP_ID, slots: { helmet: item('Old Killing Helmet'), equipment1: item('Old Killing Necklace') } },
    ],
  });
  const ff = normalized.list.find(setup => setup.id === FF_SETUP_ID);
  const killingStored = normalized.list.find(setup => setup.id === KILLING_SETUP_ID);
  const killingEffective = effectiveSetup(normalized, KILLING_SETUP_ID);
  assert.equal(ff.slots.helmet.displayName, 'FF Helmet');
  assert.equal(killingStored.slots.helmet, null);
  assert.equal(killingStored.slots.equipment1, null);
  assert.equal(killingEffective.slots.helmet.displayName, 'FF Helmet');
  assert.equal(killingEffective.slots.equipment1.displayName, 'FF Necklace');
});

test('a legacy Killing-only gear slot is preserved by moving it into FF once', () => {
  const normalized = prepareFfBpcSetups({
    modelVersion: 4,
    activeId: KILLING_SETUP_ID,
    list: [
      { id: FF_SETUP_ID, slots: {} },
      { id: BPC_SETUP_ID, slots: {} },
      { id: KILLING_SETUP_ID, slots: { equipment2: item('Legacy Killing Cloak') } },
    ],
  });
  const ff = normalized.list.find(setup => setup.id === FF_SETUP_ID);
  const killingStored = normalized.list.find(setup => setup.id === KILLING_SETUP_ID);
  assert.equal(ff.slots.equipment2.displayName, 'Legacy Killing Cloak');
  assert.equal(killingStored.slots.equipment2, null);
  assert.equal(effectiveSetup(normalized, KILLING_SETUP_ID).slots.equipment2.displayName, 'Legacy Killing Cloak');
});

test('writing Killing gear writes through to FF without persisting a second copy', () => {
  const setups = createDefaultSetups();
  writeLinkedSetupSlot(setups, KILLING_SETUP_ID, 'boots', item('Shared Boots'));
  const ff = setups.list.find(setup => setup.id === FF_SETUP_ID);
  const killingStored = setups.list.find(setup => setup.id === KILLING_SETUP_ID);
  assert.equal(ff.slots.boots.displayName, 'Shared Boots');
  assert.equal(killingStored.slots.boots, null);
  assert.equal(effectiveSetup(setups, KILLING_SETUP_ID).slots.boots.displayName, 'Shared Boots');
});

test('Farming and Killing pets can be separate or resolved from one shared configuration', () => {
  const setups = createDefaultSetups();
  writeLinkedSetupSlot(setups, FF_SETUP_ID, 'pet', item('Farming Pet', 'ELEPHANT'));
  writeLinkedSetupSlot(setups, KILLING_SETUP_ID, 'pet', item('Killing Pet', 'HEDGEHOG'));
  assert.equal(farmingKillingPetShared(setups), false);
  assert.equal(effectiveSetup(setups, KILLING_SETUP_ID).slots.pet.skyblockId, 'HEDGEHOG');

  setFarmingKillingPetShared(setups, true);
  assert.equal(setups.list.find(setup => setup.id === KILLING_SETUP_ID).slots.pet, null);
  assert.equal(effectiveSetup(setups, KILLING_SETUP_ID).slots.pet.skyblockId, 'ELEPHANT');

  writeLinkedSetupSlot(setups, KILLING_SETUP_ID, 'pet', item('Rose Dragon Pet', 'ROSE_DRAGON'));
  assert.equal(setups.list.find(setup => setup.id === FF_SETUP_ID).slots.pet.skyblockId, 'ROSE_DRAGON');
  assert.equal(effectiveSetup(setups, KILLING_SETUP_ID).slots.pet.skyblockId, 'ROSE_DRAGON');

  setFarmingKillingPetShared(setups, false);
  writeLinkedSetupSlot(setups, KILLING_SETUP_ID, 'pet', item('Killing Pet', 'HEDGEHOG'));
  assert.equal(setups.list.find(setup => setup.id === FF_SETUP_ID).slots.pet.skyblockId, 'ROSE_DRAGON');
  assert.equal(effectiveSetup(setups, KILLING_SETUP_ID).slots.pet.skyblockId, 'HEDGEHOG');

  setups.activeId = KILLING_SETUP_ID;
  assert.equal(activeSetup(setups).slots.pet.skyblockId, 'HEDGEHOG');
});

test('the Setups UI exposes FF/BPC physical sets and Killing only as a pet role', () => {
  const app = read('src/app.js');
  assert.match(app, /VISIBLE_SETUP_IDS\.map/);
  assert.match(app, /Use one pet for Farming \+ Killing/);
  assert.match(app, /Farming Pet/);
  assert.match(app, /Killing Pet/);
  assert.match(app, /Only the pet can differ for Killing; Armor and Equipment stay identical to the FF Set\./);
  assert.doesNotMatch(app, /data-setup-add|data-setup-remove|id="setupName"/);
  assert.match(app, /return setupId === BPC_SETUP_ID \? 'BPC Set' : 'FF Set'/);
  assert.match(app, /effectiveSetup\(all, setupId \|\| all\.activeId\)/);
  assert.match(app, /data-skyblock-item-id/);
});
