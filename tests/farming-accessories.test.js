import assert from 'node:assert/strict';
import test from 'node:test';

import {
  FARMING_ACCESSORIES,
  FARMING_ACCESSORY_GROUPS,
  farmingAccessoryByItemId,
} from '../src/farming-accessories.js';

test('farming accessory catalog uses exact unique SkyBlock ids', () => {
  const ids = FARMING_ACCESSORIES.map(item => item.itemId);
  assert.equal(new Set(ids).size, ids.length);
  for (const id of ids) assert.match(id, /^[A-Z0-9_:]+$/);
});

test('all current farming accessory progression families are represented', () => {
  const groups = new Map(FARMING_ACCESSORY_GROUPS.map(group => [group.id, group]));
  assert.deepEqual(groups.get('crop-fortune').items.map(item => item.itemId), [
    'CROPIE_TALISMAN',
    'SQUASH_RING',
    'FERMENTO_ARTIFACT',
    'HELIANTHUS_RELIC',
  ]);
  assert.deepEqual(groups.get('jacob').items.map(item => item.itemId), [
    'ANITA_TALISMAN',
    'ANITA_RING',
    'ANITA_ARTIFACT',
  ]);
  assert.deepEqual(groups.get('pesthunter').items.map(item => item.itemId), [
    'PESTHUNTER_BADGE',
    'PESTHUNTER_RING',
    'PESTHUNTER_ARTIFACT',
    'PESTHUNTER_RELIC',
  ]);
  assert.deepEqual(groups.get('greenhouse').items.map(item => item.itemId), [
    'BIOANALYSIS_TALISMAN',
    'BIOANALYSIS_RING',
    'BIOANALYSIS_ARTIFACT',
  ]);
  assert.deepEqual(groups.get('visitors').items.map(item => item.itemId), [
    'COPPER_TALISMAN',
    'COPPER_RING',
    'COPPER_ARTIFACT',
  ]);
  assert.equal(FARMING_ACCESSORIES.length, 22);
});

test('Relic of Power uses the live SkyBlock id', () => {
  assert.equal(farmingAccessoryByItemId('power_relic')?.name, 'Relic of Power');
  assert.equal(farmingAccessoryByItemId('RELIC_OF_POWER'), null);
});

test('calculator-backed accessory cards point at existing progression ids', () => {
  const linked = FARMING_ACCESSORIES.filter(item => item.upgradeId);
  assert.ok(linked.some(item => item.itemId === 'FERMENTO_ARTIFACT'));
  assert.ok(linked.some(item => item.itemId === 'HELIANTHUS_RELIC'));
  assert.ok(linked.some(item => item.itemId === 'ANITA_ARTIFACT'));
  assert.ok(linked.some(item => item.itemId === 'ATMOSPHERIC_FILTER'));
  assert.ok(linked.some(item => item.itemId === 'MAGIC_8_BALL'));
  assert.ok(linked.some(item => item.itemId === 'POWER_RELIC'));
});
