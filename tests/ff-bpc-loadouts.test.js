import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

import {
  BPC_SETUP_ID,
  FF_SETUP_ID,
  KILLING_SETUP_ID,
  THIRD_SETUP_ID,
  VISIBLE_SETUP_IDS,
  activeSetup,
  createDefaultSetups,
  createEmptyItem,
  effectiveSetup,
  farmingKillingPetShared,
  physicalSetupCount,
  prepareFfBpcSetups,
  setFarmingKillingPetShared,
  setPhysicalSetupCount,
  setThirdSetupName,
  thirdSetupName,
  visiblePhysicalSetupIds,
  writeLinkedSetupSlot,
} from '../src/setups.js';

const root = new URL('../', import.meta.url);
const read = path => readFileSync(new URL(path, root), 'utf8');

function item(name, id = name.toUpperCase().replace(/\s+/g, '_')) {
  return { ...createEmptyItem(), displayName: name, skyblockId: id };
}

test('two physical sets are the default and an optional third set stays independent', () => {
  const setups = createDefaultSetups();
  assert.deepEqual(VISIBLE_SETUP_IDS, [FF_SETUP_ID, BPC_SETUP_ID]);
  assert.deepEqual(visiblePhysicalSetupIds(setups), [FF_SETUP_ID, BPC_SETUP_ID]);
  assert.equal(physicalSetupCount(setups), 2);
  assert.equal(VISIBLE_SETUP_IDS.includes(KILLING_SETUP_ID), false);
  assert.equal(setups.list.length, 3, 'Killing keeps an internal pet overlay');

  setPhysicalSetupCount(setups, 3);
  assert.equal(physicalSetupCount(setups), 3);
  assert.deepEqual(visiblePhysicalSetupIds(setups), [FF_SETUP_ID, BPC_SETUP_ID, THIRD_SETUP_ID]);
  assert.equal(thirdSetupName(setups), 'Set 3');

  setThirdSetupName(setups, 'Mushroom Set');
  writeLinkedSetupSlot(setups, THIRD_SETUP_ID, 'helmet', item('Third Helmet'));
  assert.equal(thirdSetupName(setups), 'Mushroom Set');
  assert.equal(setups.list.find(setup => setup.id === THIRD_SETUP_ID).slots.helmet.displayName, 'Third Helmet');

  setups.activeId = THIRD_SETUP_ID;
  setPhysicalSetupCount(setups, 2);
  assert.equal(setups.activeId, FF_SETUP_ID);
  assert.deepEqual(visiblePhysicalSetupIds(setups), [FF_SETUP_ID, BPC_SETUP_ID]);
  assert.equal(thirdSetupName(setups), 'Mushroom Set', 'hiding Set 3 keeps its custom name');
  assert.equal(setups.list.find(setup => setup.id === THIRD_SETUP_ID).slots.helmet.displayName, 'Third Helmet');

  setPhysicalSetupCount(setups, 3);
  assert.equal(thirdSetupName(setups), 'Mushroom Set');
  assert.equal(setups.list.find(setup => setup.id === THIRD_SETUP_ID).slots.helmet.displayName, 'Third Helmet');
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

test('the Setups UI exposes a 2/3-set switch, fixed FF/BPC names and a custom third name', () => {
  const app = read('src/app.js');
  assert.match(app, /data-physical-set-count/);
  assert.match(app, /data-third-setup-name/);
  assert.match(app, /visiblePhysicalSetupIds\(all\)/);
  assert.match(app, /FF \(Farming Fortune\) Set/);
  assert.match(app, /BPC \(Bonus Pest Chance\) Set/);
  assert.match(app, /Switching back to 2 sets only hides Set 3; its items and name stay saved\./);
  assert.match(app, /Use one pet for Farming \+ Killing/);
  assert.match(app, /Farming Pet/);
  assert.match(app, /Killing Pet/);
  assert.match(app, /Only the pet can differ for Killing; Armor and Equipment stay identical to the FF Set\./);
  assert.doesNotMatch(app, /data-setup-add|data-setup-remove|id="setupName"/);
  assert.match(app, /effectiveSetup\(all, setupId \|\| all\.activeId\)/);
  assert.match(app, /data-skyblock-item-id/);
});
