import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { SET_ART, packArtKeyFor } from '../src/pack-item-art.js';

/**
 * Set art stands in for gear the official item resource cannot picture. A key
 * that matches nothing in the pack degrades to the hand-drawn outline, or for
 * equipment to a two-letter badge, with nothing reported -- which is the state
 * this table exists to end.
 */
const manifest = JSON.parse(
  readFileSync(new URL('../assets/hypixel-pack/manifest.json', import.meta.url), 'utf8'),
);

test('every set art key exists in the shipped pack', () => {
  const missing = SET_ART.filter(([, key]) => !(key in manifest.items)).map(([token, key]) => `${token} -> ${key}`);
  assert.deepEqual(missing, [], `set art keys matching nothing: ${missing.join(', ')}`);
});

test('the four armour pieces of a set resolve to that set', () => {
  for (const piece of ['HELMET', 'CHESTPLATE', 'LEGGINGS', 'BOOTS']) {
    assert.equal(packArtKeyFor({ id: `HELIANTHUS_${piece}`, name: `Helianthus ${piece}` }), 'helianthus');
    assert.equal(packArtKeyFor({ id: `FERMENTO_${piece}`, name: `Fermento ${piece}` }), 'fermento');
    assert.equal(packArtKeyFor({ id: `CROPIE_${piece}`, name: `Cropie ${piece}` }), 'cropie');
    assert.equal(packArtKeyFor({ id: `SQUASH_${piece}`, name: `Squash ${piece}` }), 'squash');
  }
});

test('the lotus tiers do not collapse into the base lotus', () => {
  assert.equal(packArtKeyFor({ id: 'LOTUS_NECKLACE', name: 'Lotus Necklace' }), 'lotus');
  assert.equal(packArtKeyFor({ id: 'SILVER_LOTUS_CLOAK', name: 'Silver Lotus Cloak' }), 'silver_lotus');
  assert.equal(packArtKeyFor({ id: 'GOLD_LOTUS_BELT', name: 'Gold Lotus Belt' }), 'gold_lotus');
  assert.equal(packArtKeyFor({ id: 'DIAMOND_LOTUS_BRACELET', name: 'Diamond Lotus Bracelet' }), 'diamond_lotus');
});

test('a condensed set keeps its own art rather than the plain one', () => {
  assert.equal(packArtKeyFor({ id: 'CONDENSED_FERMENTO', name: 'Condensed Fermento' }), 'condensed_fermento');
  assert.equal(packArtKeyFor({ id: 'CONDENSED_HELIANTHUS', name: 'Condensed Helianthus' }), 'condensed_helianthus');
});

test('the blossom equipment gets its stand-in', () => {
  assert.equal(packArtKeyFor({ id: 'BLOSSOM_CLOAK', name: 'Blossom Cloak' }), 'bachelors_rose');
  assert.equal(packArtKeyFor({ id: 'BLOSSOM_BELT', name: 'Blossom Belt' }), 'bachelors_rose');
});

test('a reforge in the display name does not change the set', () => {
  // The catalogue name is clean, but matching also reads the id, and a caller
  // may pass a synced display name straight through.
  assert.equal(packArtKeyFor({ id: 'HELIANTHUS_CHESTPLATE', name: 'Mossy Helianthus Chestplate' }), 'helianthus');
  assert.equal(packArtKeyFor({ id: 'BLOSSOM_CLOAK', name: 'Thorny Blossom Cloak' }), 'bachelors_rose');
});

test('items belonging to no known set answer null', () => {
  assert.equal(packArtKeyFor({ id: 'RECOMBOBULATOR_3000', name: 'Recombobulator 3000' }), null);
  assert.equal(packArtKeyFor({ id: 'FARM_SUIT_CHESTPLATE', name: 'Farm Suit Chestplate' }), null);
  assert.equal(packArtKeyFor({ id: 'MELON_HELMET', name: 'Melon Helmet' }), null);
});

test('nothing at all answers null rather than throwing', () => {
  assert.equal(packArtKeyFor(null), null);
  assert.equal(packArtKeyFor(undefined), null);
  assert.equal(packArtKeyFor({}), null);
  assert.equal(packArtKeyFor({ id: '', name: '' }), null);
  assert.equal(packArtKeyFor({ id: '___', name: '   ' }), null);
});

test('the specific tokens are ordered ahead of the general ones', () => {
  const index = token => SET_ART.findIndex(([name]) => name === token);
  assert.ok(index('CONDENSED_FERMENTO') < index('FERMENTO'), 'CONDENSED_FERMENTO must be tested first');
  assert.ok(index('CONDENSED_HELIANTHUS') < index('HELIANTHUS'), 'CONDENSED_HELIANTHUS must be tested first');
  for (const tier of ['DIAMOND_LOTUS', 'SILVER_LOTUS', 'GOLD_LOTUS']) {
    assert.ok(index(tier) < index('LOTUS'), `${tier} must be tested before LOTUS`);
  }
});
