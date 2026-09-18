import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { RARITY_LADDER, bumpRarity, deriveRarity, describeRarity } from '../src/tool-rarity.js';

/**
 * Rarity is something the app can already answer: the official item resource
 * states it and a Recombobulator raises it one step. The editor used to ask
 * through a dropdown that started at "Unknown".
 */

test('the ladder stops where farming tools stop', () => {
  assert.deepEqual([...RARITY_LADDER], ['COMMON','UNCOMMON','RARE','EPIC','LEGENDARY','MYTHIC']);
});

test('a recombobulator is exactly one step', () => {
  assert.equal(deriveRarity({ base: 'RARE', recombobulated: true }), 'EPIC');
  assert.equal(deriveRarity({ base: 'EPIC', recombobulated: true }), 'LEGENDARY');
  assert.equal(deriveRarity({ base: 'LEGENDARY', recombobulated: true }), 'MYTHIC');
});

test('without one, the item keeps its own rarity', () => {
  for (const rarity of RARITY_LADDER) {
    assert.equal(deriveRarity({ base: rarity, recombobulated: false }), rarity);
  }
});

test('the top of the ladder is clamped, never exceeded', () => {
  assert.equal(deriveRarity({ base: 'MYTHIC', recombobulated: true }), 'MYTHIC');
  assert.equal(bumpRarity('MYTHIC', 5), 'MYTHIC');
  assert.equal(bumpRarity('COMMON', -5), 'COMMON');
});

test('an unknown base stays unknown rather than being guessed', () => {
  // Guessing would silently change rarity-scaled Peridot Fortune.
  assert.equal(deriveRarity({ base: null, recombobulated: true }), null);
  assert.equal(deriveRarity({ base: '', recombobulated: false }), null);
  assert.equal(deriveRarity({ base: 'DIVINE', recombobulated: false }), null);
  assert.equal(deriveRarity({}), null);
  assert.equal(deriveRarity(), null);
});

test('casing and spacing in the official value are tolerated', () => {
  assert.equal(deriveRarity({ base: 'legendary' }), 'LEGENDARY');
  assert.equal(deriveRarity({ base: '  Epic  ' }), 'EPIC');
});

test('the derived value explains itself', () => {
  assert.deepEqual(describeRarity({ base: 'EPIC', recombobulated: true }),
    { rarity: 'LEGENDARY', note: 'recombobulated from EPIC' });
  assert.deepEqual(describeRarity({ base: 'EPIC' }),
    { rarity: 'EPIC', note: 'from the official item data' });
  assert.deepEqual(describeRarity({ base: 'MYTHIC', recombobulated: true }),
    { rarity: 'MYTHIC', note: 'already at MYTHIC; a Recombobulator adds nothing' });
  assert.equal(describeRarity({ base: null }), null);
});

test('the editor no longer asks when it can derive', () => {
  const src = readFileSync(new URL('../src/workspace-ui.js', import.meta.url), 'utf8');
  const start = src.indexOf('function rarityRow(');
  assert.ok(start > 0, 'rarityRow is missing');
  const fn = src.slice(start, src.indexOf('\n}\n', start));
  assert.match(fn, /describeRarity\(/, 'the row must derive the rarity');
  assert.match(fn, /data-tool-rarity-derived/, 'the derived value must be rendered read-only');
  assert.ok(
    fn.indexOf('select data-tool-rarity') > fn.indexOf('if (described)'),
    'the dropdown may only appear after the derivation has failed',
  );
});

test('the gemstone fortune uses the derived rarity, not the recorded one', () => {
  const src = readFileSync(new URL('../src/workspace-ui.js', import.meta.url), 'utf8');
  assert.match(src, /toolGemstoneFortune\(bucket\.gemSlots, effectiveRarity, count\)/);
  assert.match(src, /const effectiveRarity = deriveRarity\(/);
});

/**
 * The step is per item, not class-wide. The research says the Recombobulator is
 * "+1 item rarity tier where applicable" and "do not assign a fixed Farming
 * Fortune delta globally"
 * (research/special-farming-item-costs-2026-09-17.json, entry 3).
 */

test('an item that cannot be recombobulated keeps its own rarity', () => {
  assert.equal(
    deriveRarity({ base: 'EPIC', recombobulated: true, canRecombobulate: false }),
    'EPIC',
    'applying the step here would invent a rarity the game never shows, and every '
      + 'rarity-scaled reforge and gemstone value would be wrong with it',
  );
});

test('the blocked case explains itself rather than looking like a bug', () => {
  assert.deepEqual(
    describeRarity({ base: 'EPIC', recombobulated: true, canRecombobulate: false }),
    { rarity: 'EPIC', note: 'this item cannot be recombobulated, so it stays EPIC' },
  );
});

test('an eligible item still takes the step', () => {
  assert.equal(deriveRarity({ base: 'RARE', recombobulated: true, canRecombobulate: true }), 'EPIC');
  assert.deepEqual(
    describeRarity({ base: 'RARE', recombobulated: true, canRecombobulate: true }),
    { rarity: 'EPIC', note: 'recombobulated from RARE' },
  );
});

test('eligibility only matters once the item is recombobulated', () => {
  for (const canRecombobulate of [true, false, null, undefined]) {
    assert.equal(
      deriveRarity({ base: 'LEGENDARY', recombobulated: false, canRecombobulate }),
      'LEGENDARY',
    );
  }
});

test('the editor passes the per-item gate, not a constant', () => {
  const src = readFileSync(new URL('../src/workspace-ui.js', import.meta.url), 'utf8');
  assert.match(
    src,
    /rarityRow\(bucket, catalogItem, entryLevel\(bucket, RECOMB_ID\) > 0, canRecomb\)/,
    'the row must receive this item\'s eligibility',
  );
  assert.match(
    src,
    /canRecombobulate: canRecombobulateItem\('tool', catalogItem\)/,
    'the gemstone Fortune must use the same per-item gate',
  );
});


test('tool Recombobulator toggle, rarity color and gemstone rarity use the same persisted state', () => {
  const src = readFileSync(new URL('../src/workspace-ui.js', import.meta.url), 'utf8');
  assert.match(src, /function entryEnabled\(bucket, id\).*bucket\?\.owned\?\.\[id\] === true/);
  assert.match(src, /rarityRow\(bucket, catalogItem, entryEnabled\(bucket, RECOMB_ID\), canRecomb\)/);
  assert.match(src, /recombobulated: entryEnabled\(bucket, RECOMB_ID\)/);
  assert.match(src, /data-tool-recomb \$\{entryEnabled\(bucket, RECOMB_ID\)\?'checked':''\}/);
});


test('Melon Dicer Mk. III uses the current EPIC base rarity, not the legacy Legendary rarity', () => {
  const workspace = readFileSync(new URL('../src/workspace-ui.js', import.meta.url), 'utf8');
  const backgrounds = readFileSync(new URL('../src/rarity-background-ui.js', import.meta.url), 'utf8');
  assert.match(workspace, /farmingToolTierRarity\(tier\) \|\| catalogItem\?\.tier/);
  assert.match(backgrounds, /farmingToolTierRarity\(tier\) \|\| item\?\.tier/);
  assert.equal(deriveRarity({ base: 'EPIC', recombobulated: false }), 'EPIC');
  assert.equal(deriveRarity({ base: 'EPIC', recombobulated: true }), 'LEGENDARY');
});
