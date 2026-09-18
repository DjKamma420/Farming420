import assert from 'node:assert/strict';
import test from 'node:test';

import {
  EXCLUSIVE_ENTRY_GROUPS,
  exclusiveGroupForEntry,
  exclusiveSelectionViolations,
  setupConstraintViolations,
} from '../src/exclusivity.js';
import { FARMING_TOOL_REFORGES } from '../src/farming-reforges.js';
import { createSetup, createEmptyItem } from '../src/setups.js';

test('every current farming tool reforge is in one max-one active group', () => {
  const group = EXCLUSIVE_ENTRY_GROUPS.find(entry => entry.id === 'farming-tool-reforge');
  assert.ok(group);
  assert.equal(group.itemClass, 'farming-tool');
  assert.equal(group.maxActive, 1);
  assert.deepEqual(
    group.members,
    FARMING_TOOL_REFORGES.map(reforge => `tool-reforge-${reforge.id}-reforge`),
  );
  assert.deepEqual(group.members, [
    'tool-reforge-bountiful-reforge',
    'tool-reforge-blessed-reforge',
    'tool-reforge-overpriced-reforge',
    'tool-reforge-deep-fried-reforge',
    'tool-reforge-earthy-reforge',
  ]);
});

test('any two current farming tool reforges conflict on the same physical tool', () => {
  const members = EXCLUSIVE_ENTRY_GROUPS.find(entry => entry.id === 'farming-tool-reforge').members;
  for (let left = 0; left < members.length; left += 1) {
    for (let right = left + 1; right < members.length; right += 1) {
      const violations = exclusiveSelectionViolations([members[left], members[right]]);
      assert.equal(violations.length, 1, `${members[left]} + ${members[right]} must conflict`);
      assert.equal(violations[0].groupId, 'farming-tool-reforge');
      assert.equal(violations[0].itemClass, 'farming-tool');
      assert.equal(violations[0].maxActive, 1);
    }
  }
});

test('upgraded Crop Fortune accessories cannot be active as additive peers', () => {
  const group = EXCLUSIVE_ENTRY_GROUPS.find(entry => entry.id === 'crop-fortune-accessory');
  assert.ok(group);
  assert.equal(group.itemClass, 'accessory-family');
  assert.deepEqual(group.members, [
    'accessory-fermento-artifact',
    'accessory-helianthus-relic',
  ]);
  const violations = exclusiveSelectionViolations(group.members);
  assert.equal(violations.length, 1);
  assert.equal(violations[0].groupId, 'crop-fortune-accessory');
});

test('a vacuum reforge is not falsely exclusive with a separate farming tool reforge', () => {
  assert.deepEqual(exclusiveSelectionViolations([
    'tool-reforge-bountiful-reforge',
    'vacuum-reforge-beady-pest-only-farming-fortune',
  ]), []);
});

test('one selected farming-tool reforge does not violate the group', () => {
  for (const reforge of FARMING_TOOL_REFORGES) {
    const id = `tool-reforge-${reforge.id}-reforge`;
    assert.deepEqual(exclusiveSelectionViolations([id]), []);
    assert.equal(exclusiveGroupForEntry(id)?.id, 'farming-tool-reforge');
  }
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
