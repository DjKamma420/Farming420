import assert from 'node:assert/strict';
import test from 'node:test';

import {
  LEGACY_FARMING_ENCHANT_META,
  VERIFIED_FARMING_ENCHANT_MAX,
  VERIFIED_FARMING_ENCHANT_META,
  canonicalEnchantId,
  enchantMetadata,
  enchantPresentation,
  enchantPresentationClass,
  ultimateEnchantConflict,
} from '../src/enchant-presentation.js';

test('verified farming enchant maxima are explicit sourced enchant mechanics', () => {
  const expected = {
    bug_blender: 5,
    cultivating: 10,
    dedication: 4,
    delicate: 5,
    feast: 5,
    harvesting: 6,
    replenish: 1,
    turbo_crop: 7,
    pesterminator: 6,
    thorns: 4,
    green_thumb: 5,
    crop_fever: 5,
    sunset: 5,
  };
  assert.deepEqual(VERIFIED_FARMING_ENCHANT_MAX, expected);
  for (const meta of Object.values(VERIFIED_FARMING_ENCHANT_META)) {
    assert.match(meta.source, /^https:\/\/(hypixelskyblock\.minecraft\.wiki|hypixel\.net)\//);
    assert.equal(meta.lastVerified, '2026-09-18');
    assert.ok(meta.appliesTo.length > 0);
  }
});

test('verified max enchantments receive the maxed/rainbow presentation state', () => {
  assert.deepEqual(enchantPresentation('Cultivating', 10), {
    id: 'cultivating', level: 10, maxLevel: 10, state: 'maxed',
  });
  assert.equal(enchantPresentationClass('cultivating', 10), 'enchant-maxed');
  assert.equal(enchantPresentation('green_thumb', 5).state, 'maxed');
  assert.equal(enchantPresentation('Bug Blender', 5).state, 'maxed');
  assert.equal(enchantPresentation('Delicate', 5).state, 'maxed');
  assert.equal(enchantPresentation('Replenish', 1).state, 'maxed');
  assert.equal(enchantPresentation('Feast', 5).state, 'maxed');
});

test('crop-specific Turbo NBT enchantments use the shared Turbo-Crop maximum', () => {
  assert.deepEqual(enchantPresentation('turbo_wheat', 7), {
    id: 'turbo_crop', level: 7, maxLevel: 7, state: 'maxed',
  });
  assert.equal(enchantPresentation('turbo_melon', 6).state, 'active');
});

test('ultimate NBT ids canonicalize without losing their verified metadata', () => {
  assert.equal(canonicalEnchantId('ultimate_sunset'), 'sunset');
  assert.equal(canonicalEnchantId('ultimate_crop_fever'), 'crop_fever');
  assert.equal(enchantPresentation('ultimate_sunset', 5).state, 'maxed');
  assert.equal(enchantPresentation('ultimate_crop_fever', 5).state, 'maxed');
  assert.equal(enchantMetadata('ultimate_sunset').kind, 'ultimate');
});

test('only one verified farming ultimate enchant may exist on one item', () => {
  assert.equal(ultimateEnchantConflict({ ultimate_crop_fever: 5, cultivating: 10 }), null);
  assert.deepEqual(ultimateEnchantConflict({ ultimate_crop_fever: 5, ultimate_sunset: 1 }), {
    group: 'ultimate-enchantment', enchantments: ['crop_fever', 'sunset'],
  });
});

test('Pesterminator stays item-local and uses enchant level VI', () => {
  assert.deepEqual(enchantPresentation('pesterminator', 6), {
    id: 'pesterminator', level: 6, maxLevel: 6, state: 'maxed',
  });
  assert.equal(enchantPresentation('pesterminator', 1).state, 'active');
  assert.deepEqual(enchantMetadata('pesterminator').appliesTo, ['armor']);
});

test('Thorns IV is the normal max while the event Pufferfish Hat can preserve Thorns V', () => {
  assert.equal(enchantPresentation('thorns', 4).state, 'maxed');
  assert.deepEqual(enchantPresentation('thorns', 5), {
    id: 'thorns', level: 5, maxLevel: 4, state: 'maxed',
  });
});

test('non-max verified enchantments remain active instead of rainbow', () => {
  assert.equal(enchantPresentation('Harvesting', 5).state, 'active');
  assert.equal(enchantPresentation('Sunset', 4).state, 'active');
});

test('removed Sunder is known legacy data but never presented as a current max', () => {
  assert.equal(LEGACY_FARMING_ENCHANT_META.sunder.status, 'removed');
  assert.equal(LEGACY_FARMING_ENCHANT_META.sunder.removedAt, '2026-04-28');
  assert.deepEqual(enchantPresentation('sunder', 6), {
    id: 'sunder', level: 6, maxLevel: null, state: 'unverified',
  });
});

test('unknown maxima stay neutral instead of being guessed from a high level', () => {
  assert.deepEqual(enchantPresentation('future_enchant', 99), {
    id: 'future_enchant', level: 99, maxLevel: null, state: 'unverified',
  });
});
