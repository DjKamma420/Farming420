import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

import {
  BPC_SETUP_ID,
  FF_SETUP_ID,
  KILLING_SETUP_ID,
  VISIBLE_SETUP_IDS,
  createDefaultSetups,
  createEmptyItem,
  farmingKillingPetShared,
  normalizeSetups,
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
  const setups = createDefaultSetups();
  assert.equal(setups.list.find(setup => setup.id === FF_SETUP_ID).name, 'FF Set');
  assert.equal(setups.list.find(setup => setup.id === BPC_SETUP_ID).name, 'BPC Set');
  assert.ok(setups.list.some(setup => setup.id === KILLING_SETUP_ID));
});

test('legacy Killing armor and equipment are forced to the FF source of truth', () => {
  const normalized = normalizeSetups({
    modelVersion: 3,
    activeId: KILLING_SETUP_ID,
    list: [
      { id: FF_SETUP_ID, name: 'Farming', slots: { helmet: item('FF Helmet'), equipment1: item('FF Necklace') } },
      { id: BPC_SETUP_ID, name: 'Pest Spawning', slots: { helmet: item('BPC Helmet') } },
      { id: KILLING_SETUP_ID, name: 'Pest Killing', slots: { helmet: item('Old Killing Helmet'), equipment1: item('Old Killing Necklace') } },
    ],
  });
  const ff = normalized.list.find(setup => setup.id === FF_SETUP_ID);
  const killing = normalized.list.find(setup => setup.id === KILLING_SETUP_ID);
  const bpc = normalized.list.find(setup => setup.id === BPC_SETUP_ID);
  assert.equal(ff.slots.helmet.displayName, 'FF Helmet');
  assert.equal(killing.slots.helmet.displayName, 'FF Helmet');
  assert.equal(killing.slots.equipment1.displayName, 'FF Necklace');
  assert.equal(killing.slots.helmet.physicalItemId, ff.slots.helmet.physicalItemId);
  assert.equal(bpc.slots.helmet.displayName, 'BPC Helmet');
});

test('a legacy Killing-only gear slot is migrated into FF instead of being discarded', () => {
  const normalized = normalizeSetups({
    modelVersion: 3,
    activeId: KILLING_SETUP_ID,
    list: [
      { id: FF_SETUP_ID, slots: {} },
      { id: BPC_SETUP_ID, slots: {} },
      { id: KILLING_SETUP_ID, slots: { equipment2: item('Legacy Killing Cloak') } },
    ],
  });
  const ff = normalized.list.find(setup => setup.id === FF_SETUP_ID);
  const killing = normalized.list.find(setup => setup.id === KILLING_SETUP_ID);
  assert.equal(ff.slots.equipment2.displayName, 'Legacy Killing Cloak');
  assert.equal(killing.slots.equipment2.displayName, 'Legacy Killing Cloak');
});

test('writing Killing gear writes through to FF automatically', () => {
  const setups = createDefaultSetups();
  writeLinkedSetupSlot(setups, KILLING_SETUP_ID, 'boots', item('Shared Boots'));
  const ff = setups.list.find(setup => setup.id === FF_SETUP_ID);
  const killing = setups.list.find(setup => setup.id === KILLING_SETUP_ID);
  assert.equal(ff.slots.boots.displayName, 'Shared Boots');
  assert.equal(killing.slots.boots.displayName, 'Shared Boots');
  assert.equal(ff.slots.boots.physicalItemId, killing.slots.boots.physicalItemId);
});

test('Farming and Killing pets can be separate or linked by one switch', () => {
  const setups = createDefaultSetups();
  writeLinkedSetupSlot(setups, FF_SETUP_ID, 'pet', item('Farming Pet', 'ELEPHANT'));
  writeLinkedSetupSlot(setups, KILLING_SETUP_ID, 'pet', item('Killing Pet', 'HEDGEHOG'));
  assert.equal(farmingKillingPetShared(setups), false);
  assert.equal(setups.list.find(setup => setup.id === KILLING_SETUP_ID).slots.pet.skyblockId, 'HEDGEHOG');

  setFarmingKillingPetShared(setups, true);
  assert.equal(setups.list.find(setup => setup.id === KILLING_SETUP_ID).slots.pet.skyblockId, 'ELEPHANT');

  writeLinkedSetupSlot(setups, KILLING_SETUP_ID, 'pet', item('Rose Dragon Pet', 'ROSE_DRAGON'));
  assert.equal(setups.list.find(setup => setup.id === FF_SETUP_ID).slots.pet.skyblockId, 'ROSE_DRAGON');
  assert.equal(setups.list.find(setup => setup.id === KILLING_SETUP_ID).slots.pet.skyblockId, 'ROSE_DRAGON');

  setFarmingKillingPetShared(setups, false);
  writeLinkedSetupSlot(setups, KILLING_SETUP_ID, 'pet', item('Killing Pet', 'HEDGEHOG'));
  assert.equal(setups.list.find(setup => setup.id === FF_SETUP_ID).slots.pet.skyblockId, 'ROSE_DRAGON');
  assert.equal(setups.list.find(setup => setup.id === KILLING_SETUP_ID).slots.pet.skyblockId, 'HEDGEHOG');
});

test('the Setups UI has FF/BPC tabs, dual FF pet roles, and no Killing phase switch', () => {
  const app = read('src/app.js');
  const activityUi = read('src/activity-mode-ui.js');
  assert.match(app, /VISIBLE_SETUP_IDS\.map/);
  assert.match(app, /Use one pet for Farming \+ Killing/);
  assert.match(app, /Farming Pet/);
  assert.match(app, /Killing Pet/);
  assert.doesNotMatch(app, /data-setup-add|data-setup-remove|id="setupName"/);
  const switchPages = activityUi.match(/MODE_SWITCH_PAGES = new Set\(\[[^\]]+\]\)/)?.[0] || '';
  assert.doesNotMatch(switchPages, /setups/);
});
