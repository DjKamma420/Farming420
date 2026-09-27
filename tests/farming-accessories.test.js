import assert from 'node:assert/strict';
import test from 'node:test';

import {
  FARMING_ACCESSORIES,
  FARMING_ACCESSORY_GROUPS,
  FARMING_ACCESSORY_VERIFIED,
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
  assert.deepEqual(groups.get('freshly-baked').items.map(item => item.itemId), [
    'FRESHLY_BAKED_TALISMAN',
    'FRESHLY_BAKED_RING',
    'FRESHLY_BAKED_ARTIFACT',
    'FRESHLY_BAKED_RELIC',
    'FRESHLY_BAKED_HEIRLOOM',
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
  assert.equal(FARMING_ACCESSORIES.length, 27);
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


test('accessory research uses current sources and explicit recommendation targets', () => {
  assert.equal(FARMING_ACCESSORY_VERIFIED, '2026-09-27');
  assert.ok(FARMING_ACCESSORIES.every(item => !String(item.source || '').includes('fandom.com')));

  const freshly = farmingAccessoryByItemId('FRESHLY_BAKED_HEIRLOOM');
  assert.deepEqual([...freshly.recommendationTargets], ['overbloom']);

  const pesthunter = farmingAccessoryByItemId('PESTHUNTER_RELIC');
  assert.deepEqual([...pesthunter.recommendationTargets], ['bonus-pest-chance']);

  const bioanalysis = farmingAccessoryByItemId('BIOANALYSIS_ARTIFACT');
  assert.deepEqual([...bioanalysis.recommendationTargets], []);
});
