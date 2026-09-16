import test from 'node:test';
import assert from 'node:assert/strict';

import { UPGRADES } from '../src/data.js';
import { CARROLYN_CROP_FORTUNE_ENTRIES } from '../src/runtime-data-patches.js';

function entry(id) {
  return UPGRADES.find(item => item.id === id);
}

test('Filled Rosewater Flask is modeled as five +1 permanent Farming Fortune steps', () => {
  const item = entry('consumable-rosewater-flask-permanent-stacks');
  assert.equal(item.status, 'ACTIVE');
  assert.equal(item.max, 5);
  assert.equal(item.stepGain, 1);
});

test('Mutation Analysis is modeled as a verified +30 permanent Farming Fortune source', () => {
  const item = entry('greenhouse-mutation-analysis-rewards');
  assert.equal(item.status, 'ACTIVE');
  assert.equal(item.max, 1);
  assert.equal(item.stepGain, 30);
});

test('Carrolyn bonuses exist only for supported crops and grant +12 crop fortune', () => {
  const expected = ['wheat', 'carrot', 'pumpkin', 'mushroom', 'cocoa-beans', 'nether-wart', 'wild-rose'];
  assert.deepEqual(CARROLYN_CROP_FORTUNE_ENTRIES.map(item => item.id.replace(/^carrolyn-/, '').replace(/-fortune$/, '')), expected);
  for (const item of CARROLYN_CROP_FORTUNE_ENTRIES) {
    assert.equal(item.status, 'ACTIVE');
    assert.equal(item.section, 'crops');
    assert.equal(item.max, 1);
    assert.equal(item.stepGain, 12);
  }
});

test('legacy generic exportable entry no longer participates in crop progression', () => {
  const item = entry('permanent-crop-item-exportable-item-selected-crop');
  assert.equal(item.section, 'legacy');
  assert.equal(item.stepGain, 0);
});

test('Garden/Pest Bestiary remains VERIFY while current sources conflict', () => {
  const item = entry('garden-pest-garden-bestiary-ff');
  assert.equal(item.status, 'VERIFY');
  assert.equal(item.stepGain, 0);
});
