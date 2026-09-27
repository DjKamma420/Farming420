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

const FARMING_ENCHANTS = Object.freeze({
  bug_blender: 5,
  crop_fever: 5,
  cultivating: 10,
  dedication: 4,
  delicate: 5,
  feast: 5,
  green_thumb: 5,
  harvesting: 6,
  pesterminator: 6,
  replenish: 1,
  sunset: 5,
  thorns: 4,
  turbo_crop: 7,
});

test('only farming-relevant enchantments are offered by the verified metadata', () => {
  assert.deepEqual(
    Object.keys(VERIFIED_FARMING_ENCHANT_META).sort(),
    Object.keys(FARMING_ENCHANTS).sort(),
  );
  for (const [id, max] of Object.entries(FARMING_ENCHANTS)) {
    assert.equal(VERIFIED_FARMING_ENCHANT_MAX[id], max);
    const meta = VERIFIED_FARMING_ENCHANT_META[id];
    assert.match(meta.source, /^https:\/\/(hypixelskyblock\.minecraft\.wiki|hypixel\.net)\//);
    assert.equal(meta.lastVerified, '2026-09-28');
    assert.ok(meta.appliesTo.length > 0);
    assert.ok(meta.minLevel >= 1);
    assert.ok(meta.trueMaxLevel >= meta.maxLevel);
  }
});

test('combat, defense, mana, and unrelated equipment enchants are not Farming420 choices', () => {
  for (const id of ['protection', 'growth', 'bank', 'wisdom', 'cayenne', 'prosperity', 'quantum']) {
    assert.equal(enchantMetadata(id), null, `${id} should not be offered as farming-relevant`);
    assert.equal(enchantPresentation(id, 5).state, 'unverified');
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

test('farming ultimate NBT ids canonicalize without losing verified metadata', () => {
  assert.equal(canonicalEnchantId('ultimate_sunset'), 'sunset');
  assert.equal(canonicalEnchantId('ultimate_crop_fever'), 'crop_fever');
  assert.equal(enchantPresentation('ultimate_sunset', 5).state, 'maxed');
  assert.equal(enchantPresentation('ultimate_crop_fever', 5).state, 'maxed');
  assert.equal(enchantMetadata('ultimate_sunset').kind, 'ultimate');
});

test('only one verified farming ultimate may exist on one item', () => {
  assert.equal(ultimateEnchantConflict({ ultimate_sunset: 5, pesterminator: 6 }), null);
  assert.deepEqual(ultimateEnchantConflict({ ultimate_crop_fever: 5, ultimate_sunset: 1 }), {
    group: 'ultimate-enchantment', enchantments: ['crop_fever', 'sunset'],
  });
});

test('Pesterminator stays item-local and uses enchant level VI', () => {
  assert.deepEqual(enchantPresentation('pesterminator', 6), {
    id: 'pesterminator', level: 6, maxLevel: 6, trueMaxLevel: 6, state: 'maxed',
  });
  assert.equal(enchantPresentation('pesterminator', 1).state, 'active');
  assert.deepEqual(enchantMetadata('pesterminator').appliesTo, ['armor']);
});

test('Thorns remains farming-relevant through Thorny equipment and keeps the Century Hat exception', () => {
  assert.equal(enchantPresentation('thorns', 4).state, 'maxed');
  assert.deepEqual(enchantPresentation('thorns', 5), {
    id: 'thorns', level: 5, maxLevel: 4, trueMaxLevel: 5, state: 'special-maxed',
  });
  assert.equal(enchantPresentation('thorns', 6).state, 'unverified');
  assert.deepEqual(enchantMetadata('thorns').conflicts, ['reflection']);
});

test('non-max verified enchantments remain active instead of rainbow', () => {
  assert.equal(enchantPresentation('Harvesting', 5).state, 'active');
  assert.equal(enchantPresentation('Sunset', 4).state, 'active');
});

test('removed Sunder is known legacy data but never presented as a current choice', () => {
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
