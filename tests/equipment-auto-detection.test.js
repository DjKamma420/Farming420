import assert from 'node:assert/strict';
import test from 'node:test';

import '../src/runtime-data-patches.js';
import { applySnapshotToProgress, isAutoApplied } from '../src/snapshot-apply.js';
import { createEmptyProfileSnapshot } from '../src/profile-normalizer.js';

function stateWithEquipment(pieces) {
  const slots = {
    helmet: null,
    chestplate: null,
    leggings: null,
    boots: null,
    equipment1: pieces[0] || null,
    equipment2: pieces[1] || null,
    equipment3: pieces[2] || null,
    equipment4: pieces[3] || null,
    pet: null,
    petItem: null,
  };
  return {
    profile: {
      levels: {}, owned: {}, manualGain: {}, cropProgress: {}, toolProgress: {},
      setups: { modelVersion: 1, activeId: 'normal', list: [{ id: 'normal', name: 'Normal', slots }] },
    },
  };
}

function blossom(slot, overrides = {}) {
  const names = ['Blossom Necklace', 'Blossom Cloak', 'Blossom Belt', 'Blossom Bracelet'];
  return {
    displayName: names[slot],
    rarity: 'LEGENDARY',
    reforge: 'rooted',
    enchantments: { green_thumb: 5 },
    gems: [],
    ...overrides,
  };
}

function snapshot() {
  return createEmptyProfileSnapshot();
}

test('Blossom base Fortune is auto-derived per equipped piece', () => {
  const state = stateWithEquipment([blossom(0), blossom(1), blossom(2)]);
  applySnapshotToProgress(state, snapshot());
  assert.equal(state.profile.levels['equipment-blossom-set-base-stats'], 3);
  assert.equal(state.profile.owned['equipment-blossom-set-base-stats'], true);
  assert.ok(isAutoApplied(state, 'account', 'equipment-blossom-set-base-stats'));
});

test('four Legendary Rooted equipment pieces derive exactly +72 Fortune', () => {
  const state = stateWithEquipment([0, 1, 2, 3].map(i => blossom(i)));
  applySnapshotToProgress(state, snapshot());
  assert.equal(state.profile.levels['equipment-reforge-rooted-on-full-equipment'], 1);
  assert.equal(state.profile.manualGain['equipment-reforge-rooted-on-full-equipment'], 72);
});

test('Rooted uses the actual rarity mix instead of assuming +72', () => {
  const state = stateWithEquipment([
    blossom(0, { rarity: 'EPIC' }),
    blossom(1, { rarity: 'LEGENDARY' }),
    blossom(2, { rarity: 'MYTHIC' }),
    blossom(3, { rarity: 'LEGENDARY' }),
  ]);
  applySnapshotToProgress(state, snapshot());
  assert.equal(state.profile.manualGain['equipment-reforge-rooted-on-full-equipment'], 72);

  state.profile.setups.list[0].slots.equipment3.rarity = 'EPIC';
  applySnapshotToProgress(state, snapshot());
  assert.equal(state.profile.manualGain['equipment-reforge-rooted-on-full-equipment'], 66);
});

test('unknown Rooted rarity is recognized but its Fortune is not guessed', () => {
  const state = stateWithEquipment([
    blossom(0), blossom(1), blossom(2), blossom(3, { rarity: '' }),
  ]);
  const result = applySnapshotToProgress(state, snapshot());
  assert.equal(state.profile.levels['equipment-reforge-rooted-on-full-equipment'], 1);
  assert.equal(state.profile.manualGain['equipment-reforge-rooted-on-full-equipment'], 0);
  assert.ok(result.skipped.some(note => /rarity is unknown/i.test(note)));
});

test('removing Rooted clears only the previous auto-derived dynamic gain', () => {
  const state = stateWithEquipment([0, 1, 2, 3].map(i => blossom(i)));
  applySnapshotToProgress(state, snapshot());
  assert.equal(state.profile.manualGain['equipment-reforge-rooted-on-full-equipment'], 72);

  state.profile.setups.list[0].slots.equipment4.reforge = 'blooming';
  applySnapshotToProgress(state, snapshot());
  assert.equal(state.profile.levels['equipment-reforge-rooted-on-full-equipment'], undefined);
  assert.equal(state.profile.manualGain['equipment-reforge-rooted-on-full-equipment'], undefined);
});
