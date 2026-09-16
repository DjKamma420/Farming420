import assert from 'node:assert/strict';
import test from 'node:test';

import {
  VERIFIED_FARMING_ENCHANT_MAX,
  enchantPresentation,
  enchantPresentationClass,
} from '../src/enchant-presentation.js';

test('verified farming enchant maxima come from sourced runtime entries', () => {
  assert.equal(VERIFIED_FARMING_ENCHANT_MAX.dedication, 4);
  assert.equal(VERIFIED_FARMING_ENCHANT_MAX.cultivating, 10);
  assert.equal(VERIFIED_FARMING_ENCHANT_MAX.harvesting, 6);
  assert.equal(VERIFIED_FARMING_ENCHANT_MAX.turbo_crop, 7);
  assert.equal(VERIFIED_FARMING_ENCHANT_MAX.pesterminator, 6);
  assert.equal(VERIFIED_FARMING_ENCHANT_MAX.sunset, 5);
  assert.equal(VERIFIED_FARMING_ENCHANT_MAX.green_thumb, 5);
});

test('verified max enchantments receive the maxed/rainbow presentation state', () => {
  assert.deepEqual(enchantPresentation('Cultivating', 10), {
    id: 'cultivating', level: 10, maxLevel: 10, state: 'maxed',
  });
  assert.equal(enchantPresentationClass('cultivating', 10), 'enchant-maxed');
});

test('crop-specific Turbo NBT enchantments use the shared Turbo-Crop maximum', () => {
  assert.deepEqual(enchantPresentation('turbo_wheat', 7), {
    id: 'turbo_crop', level: 7, maxLevel: 7, state: 'maxed',
  });
  assert.equal(enchantPresentation('turbo_melon', 6).state, 'active');
});

test('non-max verified enchantments remain active instead of rainbow', () => {
  assert.equal(enchantPresentation('Harvesting', 5).state, 'active');
});

test('unknown enchantments are never guessed to be maxed', () => {
  assert.deepEqual(enchantPresentation('future_enchant', 99), {
    id: 'future_enchant', level: 99, maxLevel: null, state: 'unverified',
  });
});
