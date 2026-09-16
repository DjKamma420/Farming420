import assert from 'node:assert/strict';
import test from 'node:test';

import {
  VERIFIED_FARMING_ENCHANT_MAX,
  VERIFIED_FARMING_ENCHANT_META,
  enchantPresentation,
  enchantPresentationClass,
} from '../src/enchant-presentation.js';

test('verified farming enchant maxima are explicit sourced enchant mechanics', () => {
  assert.equal(VERIFIED_FARMING_ENCHANT_MAX.dedication, 4);
  assert.equal(VERIFIED_FARMING_ENCHANT_MAX.cultivating, 10);
  assert.equal(VERIFIED_FARMING_ENCHANT_MAX.harvesting, 6);
  assert.equal(VERIFIED_FARMING_ENCHANT_MAX.turbo_crop, 7);
  assert.equal(VERIFIED_FARMING_ENCHANT_MAX.pesterminator, 6);
  for (const meta of Object.values(VERIFIED_FARMING_ENCHANT_META)) {
    assert.ok(meta.source.startsWith('https://hypixelskyblock.minecraft.wiki/'));
    assert.equal(meta.lastVerified, '2026-09-16');
  }
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

test('set-wide boolean progression max does not collapse Pesterminator VI to level I', () => {
  assert.deepEqual(enchantPresentation('pesterminator', 6), {
    id: 'pesterminator', level: 6, maxLevel: 6, state: 'maxed',
  });
  assert.equal(enchantPresentation('pesterminator', 1).state, 'active');
});

test('non-max verified enchantments remain active instead of rainbow', () => {
  assert.equal(enchantPresentation('Harvesting', 5).state, 'active');
});

test('unverified maxima stay neutral instead of being guessed from a card name', () => {
  assert.equal(enchantPresentation('sunset', 5).state, 'unverified');
  assert.equal(enchantPresentation('green_thumb', 5).state, 'unverified');
  assert.deepEqual(enchantPresentation('future_enchant', 99), {
    id: 'future_enchant', level: 99, maxLevel: null, state: 'unverified',
  });
});
