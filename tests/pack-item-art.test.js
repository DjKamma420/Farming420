import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { SET_ART, packArtKeyFor } from '../src/pack-item-art.js';

/**
 * Set art stands in only where no stronger physical model exists. Armour is
 * excluded because the official item resource carries its head skin or its
 * vanilla material and dye colour.
 */
const manifest = JSON.parse(
  readFileSync(new URL('../assets/hypixel-pack/manifest.json', import.meta.url), 'utf8'),
);

test('every set art key exists in the shipped pack', () => {
  const missing = SET_ART.filter(([, key]) => !(key in manifest.items)).map(([token, key]) => `${token} -> ${key}`);
  assert.deepEqual(missing, [], `set art keys matching nothing: ${missing.join(', ')}`);
});

test('armor pieces never resolve to their crop ingredient as a stand-in', () => {
  for (const set of ['HELIANTHUS', 'FERMENTO', 'CROPIE', 'SQUASH']) {
    for (const piece of ['HELMET', 'CHESTPLATE', 'LEGGINGS', 'BOOTS']) {
      assert.equal(packArtKeyFor({ id: `${set}_${piece}`, name: `${set} ${piece}` }), null);
    }
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

test('a reforge in the display name does not turn armor back into set art', () => {
  assert.equal(packArtKeyFor({ id: 'HELIANTHUS_CHESTPLATE', name: 'Mossy Helianthus Chestplate' }), null);
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

test('a gemstone shows the gem, not the armour it sits in', () => {
  // These are not stand-ins. The pack ships the actual gem for every Peridot
  // tier, so an upgrade that *is* a gemstone gets its own picture instead of
  // the leather outline of whatever it was socketed into.
  const cases = [
    ['Perfect Peridot on full armor', 'perfect_peridot_gem'],
    ['Flawless Peridot on Farming Tool', 'flawless_peridot_gem'],
    ['Fine Peridot', 'fine_peridot_gem'],
    ['Flawed Peridot', 'flawed_peridot_gem'],
    ['Rough Peridot', 'rough_peridot_gem'],
    ['Peridot slot unlock', 'peridot_crystal'],
  ];
  for (const [name, key] of cases) {
    assert.equal(packArtKeyFor({ id: '', name }), key, name);
  }
});

test('the Peridot tiers are ordered before the bare token', () => {
  // PERFECT_PERIDOT contains PERIDOT, so the general token must be tested
  // last -- the same trap CONDENSED_FERMENTO and DIAMOND_LOTUS already set.
  const index = token => SET_ART.findIndex(([name]) => name === token);
  const bare = index('PERIDOT');
  assert.ok(bare >= 0);
  for (const tier of ['PERFECT_PERIDOT', 'FLAWLESS_PERIDOT', 'FINE_PERIDOT', 'FLAWED_PERIDOT', 'ROUGH_PERIDOT']) {
    const at = index(tier);
    assert.ok(at >= 0, `${tier} missing`);
    assert.ok(at < bare, `${tier} must be tested before the bare PERIDOT token`);
  }
});

test('a reforge named for an item shows that item', () => {
  // "Every reforge has a design." Where the pack ships the thing the reforge
  // is named for, that thing reads immediately.
  assert.equal(packArtKeyFor({ id: '', name: 'Thorny on full Mythic equipment' }), 'blooming_thorns');
  assert.equal(packArtKeyFor({ id: '', name: 'Rooted on full equipment' }), 'deep_root');
});

test('set art never claims a key the shipped pack does not have', () => {
  // This is the check that makes the table safe to extend: a mistyped key
  // would otherwise fall through to the outline with nothing reporting it.
  for (const [token, key] of SET_ART) {
    assert.ok(manifest.items[key]?.texture, `${token} -> ${key} has no texture in the shipped pack`);
  }
});
