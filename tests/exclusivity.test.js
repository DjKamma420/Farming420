import assert from 'node:assert/strict';
import test from 'node:test';

import {
  EXCLUSIVE_ENTRY_GROUPS,
  exclusiveGroupForEntry,
  exclusiveSelectionViolations,
  setupConstraintViolations,
} from '../src/exclusivity.js';
import { createSetup, createEmptyItem } from '../src/setups.js';

test('farming tool reforges are a max-one active group on the same tool', () => {
  const group = EXCLUSIVE_ENTRY_GROUPS.find(entry => entry.id === 'farming-tool-reforge');
  assert.ok(group);
  assert.equal(group.itemClass, 'farming-tool');
  assert.equal(group.maxActive, 1);
  assert.deepEqual(group.members, [
    'tool-reforge-blessed-reforge',
    'tool-reforge-bountiful-reforge',
  ]);
});

test('Blessed and Bountiful cannot be active on the same farming tool', () => {
  const violations = exclusiveSelectionViolations([
    'tool-reforge-blessed-reforge',
    'tool-reforge-bountiful-reforge',
  ]);
  assert.equal(violations.length, 1);
  assert.equal(violations[0].groupId, 'farming-tool-reforge');
  assert.equal(violations[0].itemClass, 'farming-tool');
  assert.equal(violations[0].maxActive, 1);
});

test('a vacuum reforge is not falsely exclusive with a separate farming tool reforge', () => {
  assert.deepEqual(exclusiveSelectionViolations([
    'tool-reforge-bountiful-reforge',
    'vacuum-reforge-beady-pest-only-farming-fortune',
  ]), []);
});

test('one selected farming-tool reforge does not violate the group', () => {
  assert.deepEqual(exclusiveSelectionViolations(['tool-reforge-bountiful-reforge']), []);
  assert.equal(exclusiveGroupForEntry('tool-reforge-bountiful-reforge')?.id, 'farming-tool-reforge');
});

test('a setup item has one scalar reforge, not a stack of reforges', () => {
  const setup = createSetup('normal', 'Normal Farming');
  setup.slots.helmet = { ...createEmptyItem(), displayName: 'Example Helmet', reforge: 'mossy' };
  assert.deepEqual(setupConstraintViolations(setup), []);

  setup.slots.helmet.reforge = ['mossy', 'ancient'];
  assert.deepEqual(setupConstraintViolations(setup), [
    { type: 'reforge-cardinality', slotId: 'helmet', maxActive: 1 },
  ]);
});

test('every wearable setup slot has cardinality one', () => {
  const setup = createSetup('normal', 'Normal Farming');
  setup.slots.boots = [createEmptyItem(), createEmptyItem()];
  assert.deepEqual(setupConstraintViolations(setup), [
    { type: 'slot-cardinality', slotId: 'boots', maxActive: 1 },
  ]);
});
