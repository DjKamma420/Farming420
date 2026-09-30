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

test('Killing shares the FF Pet with two sets and gets a separate Pet only with Set 3', () => {
  const setups = createDefaultSetups();
  writeLinkedSetupSlot(setups, FF_SETUP_ID, 'pet', item('Farming Pet', 'ELEPHANT'));

  assert.equal(farmingKillingPetShared(setups), true);
  assert.equal(effectiveSetup(setups, KILLING_SETUP_ID).slots.pet.skyblockId, 'ELEPHANT');

  // Two-set mode redirects any Killing Pet edit back to FF because no separate
  // Killing Pet exists yet.
  writeLinkedSetupSlot(setups, KILLING_SETUP_ID, 'pet', item('Rose Dragon Pet', 'ROSE_DRAGON'));
  assert.equal(setups.list.find(setup => setup.id === FF_SETUP_ID).slots.pet.skyblockId, 'ROSE_DRAGON');
  assert.equal(setups.list.find(setup => setup.id === KILLING_SETUP_ID).slots.pet, null);
  assert.equal(effectiveSetup(setups, KILLING_SETUP_ID).slots.pet.skyblockId, 'ROSE_DRAGON');

  // Adding Set 3 unlocks the separate Killing Pet overlay.
  setPhysicalSetupCount(setups, 3);
  assert.equal(farmingKillingPetShared(setups), false);
  writeLinkedSetupSlot(setups, KILLING_SETUP_ID, 'pet', item('Killing Pet', 'HEDGEHOG'));
  assert.equal(setups.list.find(setup => setup.id === FF_SETUP_ID).slots.pet.skyblockId, 'ROSE_DRAGON');
  assert.equal(setups.list.find(setup => setup.id === KILLING_SETUP_ID).slots.pet.skyblockId, 'HEDGEHOG');
  assert.equal(effectiveSetup(setups, KILLING_SETUP_ID).slots.pet.skyblockId, 'HEDGEHOG');

  // Removing Set 3 hides but preserves the separate Killing Pet. Killing falls
  // back to FF until Set 3 is added again.
  setPhysicalSetupCount(setups, 2);
  assert.equal(farmingKillingPetShared(setups), true);
  assert.equal(setups.list.find(setup => setup.id === KILLING_SETUP_ID).slots.pet.skyblockId, 'HEDGEHOG');
  assert.equal(effectiveSetup(setups, KILLING_SETUP_ID).slots.pet.skyblockId, 'ROSE_DRAGON');

  setPhysicalSetupCount(setups, 3);
  assert.equal(effectiveSetup(setups, KILLING_SETUP_ID).slots.pet.skyblockId, 'HEDGEHOG');

  setups.activeId = KILLING_SETUP_ID;
  assert.equal(activeSetup(setups).slots.pet.skyblockId, 'HEDGEHOG');
});

test('the Setups UI adds the optional third set from a name dialog instead of a 2/3 header switch', () => {
  const app = read('src/app.js');
  const activityUi = read('src/activity-mode-ui.js');
  const activityCss = read('src/activity-mode-ui.css');
  assert.doesNotMatch(app, /data-physical-set-count/);
  assert.doesNotMatch(app, /data-third-setup-name/);
  assert.doesNotMatch(activityUi, /data-physical-set-count=/);
  assert.doesNotMatch(activityUi, /data-third-setup-name/);
  assert.match(activityUi, /data-add-physical-set/);
  assert.match(activityUi, /data-add-set-dialog/);
  assert.match(activityUi, /data-new-set-name/);
  assert.match(activityUi, /setPhysicalSetupCount\(next, 3\)/);
  assert.match(activityUi, /setThirdSetupName\(next, name\)/);
  assert.match(activityUi, /next\.activeId = THIRD_SETUP_ID/);
  assert.match(activityUi, /setPhysicalSetupCount\(next, 2\)/);
  assert.match(activityUi, /FF \(Farming Fortune\) Set/);
  assert.match(activityUi, /BPC \(Bonus Pest Chance\) Set/);
  assert.doesNotMatch(activityCss, /\.physical-set-switch\s*\{[^}]*overflow-x:\s*auto/);
  assert.doesNotMatch(activityCss, /@media \(max-width: 760px\)[\s\S]*?\.physical-set-switch\s*\{[^}]*flex:\s*1\s+1\s+100%/);
  assert.match(activityCss, /@media \(max-width: 760px\)[\s\S]*?\.physical-set-switch\s*\{[^}]*flex:\s*1\s+1\s+0;[^}]*flex-wrap:\s*nowrap/);
  assert.match(activityCss, /\.physical-set-switch \.physical-set-tabs button\s*\{[^}]*flex:\s*1\s+1\s+0/);
  assert.match(app, /visiblePhysicalSetupIds\(all\)/);
  assert.match(app, /Set 3 has no automatic FF, BPC or Killing role\./);
  assert.doesNotMatch(app, /data-share-farming-killing-pet/);
  assert.doesNotMatch(app, /Use one pet for Farming \+ Killing/);
  assert.match(app, /Add Set 3 to unlock a separate Killing Pet/);
  assert.match(app, /Unlocked by Set 3\. Killing still inherits Armor and Equipment from the FF Set\./);
  assert.match(app, /With two sets, Killing uses the FF Pet/);
  assert.doesNotMatch(app, /data-setup-add|data-setup-remove|id="setupName"/);
  assert.match(app, /effectiveSetup\(all, setupId \|\| all\.activeId\)/);
  assert.match(app, /data-skyblock-item-id/);
});
