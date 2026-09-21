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

test('verified setup enchant metadata is sourced and current', () => {
  const required = {
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
  for (const [id, max] of Object.entries(required)) assert.equal(VERIFIED_FARMING_ENCHANT_MAX[id], max);
  assert.ok(Object.keys(VERIFIED_FARMING_ENCHANT_META).length >= 50);
  for (const meta of Object.values(VERIFIED_FARMING_ENCHANT_META)) {
    assert.match(meta.source, /^https:\/\/(hypixelskyblock\.minecraft\.wiki|hypixel\.net)\//);
    assert.equal(meta.lastVerified, '2026-09-21');
    assert.ok(meta.appliesTo.length > 0);
    assert.ok(meta.minLevel >= 1);
    assert.ok(meta.trueMaxLevel >= meta.maxLevel);
  }
});

test('verified max enchantments receive the maxed/rainbow presentation state', () => {
  assert.deepEqual(enchantPresentation('Cultivating', 10), {
    id: 'cultivating', level: 10, maxLevel: 10, trueMaxLevel: 10, state: 'maxed',
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
    id: 'turbo_crop', level: 7, maxLevel: 7, trueMaxLevel: 7, state: 'maxed',
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

test('only one verified ultimate enchant may exist on one item', () => {
  assert.equal(ultimateEnchantConflict({ ultimate_sunset: 5, protection: 7 }), null);
  assert.deepEqual(ultimateEnchantConflict({ ultimate_bank: 5, ultimate_sunset: 1 }), {
    group: 'ultimate-enchantment', enchantments: ['bank', 'sunset'],
  });
  assert.deepEqual(ultimateEnchantConflict({ ultimate_the_one: 5, ultimate_sunset: 1 }), {
    group: 'ultimate-enchantment', enchantments: ['the_one', 'sunset'],
  });
});

test('Pesterminator stays item-local and uses enchant level VI', () => {
  assert.deepEqual(enchantPresentation('pesterminator', 6), {
    id: 'pesterminator', level: 6, maxLevel: 6, trueMaxLevel: 6, state: 'maxed',
  });
  assert.equal(enchantPresentation('pesterminator', 1).state, 'active');
  assert.deepEqual(enchantMetadata('pesterminator').appliesTo, ['armor']);
});

test('Thorns separates the normal maximum from the Century Pufferfish intrinsic level', () => {
  assert.equal(enchantPresentation('thorns', 4).state, 'maxed');
  assert.deepEqual(enchantPresentation('thorns', 5), {
    id: 'thorns', level: 5, maxLevel: 4, trueMaxLevel: 5, state: 'special-maxed',
  });
  assert.equal(enchantPresentation('thorns', 6).state, 'unverified');
});

test('non-max verified enchantments remain active instead of rainbow', () => {
  assert.equal(enchantPresentation('Harvesting', 5).state, 'active');
  assert.equal(enchantPresentation('Sunset', 4).state, 'active');
});

test('removed Sunder is known legacy data but never presented as a current max', () => {
  assert.equal(LEGACY_FARMING_ENCHANT_META.sunder.status, 'removed');
  assert.equal(LEGACY_FARMING_ENCHANT_META.sunder.removedAt, '2026-04-28');
  assert.deepEqual(enchantPresentation('sunder', 6), {
    id: 'sunder', level: 6, maxLevel: null, trueMaxLevel: null, state: 'unverified',
  });
});

test('unknown maxima stay neutral instead of being guessed from a high level', () => {
  assert.deepEqual(enchantPresentation('future_enchant', 99), {
    id: 'future_enchant', level: 99, maxLevel: null, trueMaxLevel: null, state: 'unverified',
  });
});

test('documented normal-enchant conflict groups are explicit', () => {
  assert.deepEqual([...enchantMetadata('protection').conflicts].sort(), ['blast_protection', 'fire_protection', 'projectile_protection']);
  assert.deepEqual(enchantMetadata('big_brain').conflicts, ['small_brain']);
  assert.deepEqual(enchantMetadata('rejuvenate').conflicts, ['respite']);
  assert.deepEqual([...enchantMetadata('hardened_vitality').conflicts].sort(), ['strong_vitality', 'vampiric_vitality', 'vivacious_vitality']);
});

test('special starting tiers are represented instead of inventing tier I', () => {
  assert.equal(enchantMetadata('big_brain').minLevel, 3);
  assert.equal(enchantMetadata('transylvanian').minLevel, 4);
  assert.equal(enchantMetadata('cayenne').minLevel, 4);
  assert.equal(enchantMetadata('the_one').minLevel, 4);
});
