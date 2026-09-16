import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

import {
  ENCHANT_LABELS,
  GEM_QUALITIES,
  GEM_TYPES,
  RARITY_COLORS,
  enchantLabel,
  enchantRowsFor,
  gemOptionValues,
  itemSummary,
  parseGem,
  rarityClass,
  rarityColor,
  slotKind,
  withEnchantLevel,
  withEnchantToggled,
} from '../src/item-editor.js';
import { VERIFIED_FARMING_ENCHANT_META } from '../src/enchant-presentation.js';
import { SETUP_SLOTS } from '../src/setups.js';

test('every setup slot knows which enchantment family it belongs to', () => {
  // A slot with no kind silently renders an empty enchantment list, which reads
  // as "this item takes none" rather than as a gap in the mapping.
  for (const slot of SETUP_SLOTS) {
    assert.ok(slotKind(slot.id), `slot "${slot.id}" has no enchantment kind`);
  }
});

test('a slot offers exactly the verified enchantments that apply to it', () => {
  const helmet = enchantRowsFor('helmet', {});
  assert.deepEqual(helmet.map(row => row.id), ['pesterminator', 'sunset']);
  assert.deepEqual(enchantRowsFor('equipment1', {}).map(row => row.id), ['green_thumb']);
  // Pets take no enchantments, so the editor shows the section as absent rather
  // than as an empty box waiting to be filled.
  assert.equal(enchantRowsFor('pet', {}).length, 0);
});

test('every offered level is inside the sourced maximum', () => {
  for (const slot of SETUP_SLOTS) {
    for (const row of enchantRowsFor(slot.id, {})) {
      assert.equal(row.maxLevel, VERIFIED_FARMING_ENCHANT_META[row.id].maxLevel);
      assert.ok(row.maxLevel >= 1, `${row.id} has no usable maximum`);
    }
  }
});

test('ultimate enchantments sort last so the common ones are not buried', () => {
  const rows = enchantRowsFor('helmet', {});
  assert.equal(rows.at(-1).kind, 'ultimate');
  assert.equal(rows[0].kind, 'normal');
});

test('an enchantment the app has not verified is shown, never dropped', () => {
  // A synced profile can carry an enchant this repo has not researched. Hiding
  // it would let the next save quietly delete something the player really has.
  const rows = enchantRowsFor('helmet', { enchantments: { pesterminator: 3, mystery_thing: 2 } });
  const extra = rows.find(row => row.id === 'mystery_thing');
  assert.ok(extra, 'an unverified enchantment disappeared from the editor');
  assert.equal(extra.known, false);
  assert.equal(extra.maxLevel, null, 'an unverified enchantment must not be given an invented maximum');
  assert.equal(extra.level, 2);
});

test('a crop-specific Turbo enchant keeps its own storage key through an edit', () => {
  // All Turbo-Crop variants share one row. Writing an edit back to the canonical
  // id would swap the player's Turbo-Melon for a generic enchantment.
  const item = { enchantments: { turbo_melon: 5 } };
  const turbo = enchantRowsFor('tool', item).find(row => row.id === 'turbo_crop');
  assert.equal(turbo.storageKey, 'turbo_melon');
  assert.equal(turbo.level, 5);
  assert.deepEqual(withEnchantLevel(item, turbo.storageKey, 7, turbo.maxLevel), { turbo_melon: 7 });
  assert.deepEqual(withEnchantToggled(item, turbo.storageKey, false), {});
});

test('turning an enchantment on starts it at level 1, not at its maximum', () => {
  // Assuming the best case credits Fortune nobody claimed. Understating is the
  // cheaper error for a planner.
  assert.deepEqual(withEnchantToggled({ enchantments: {} }, 'dedication', true), { dedication: 1 });
});

test('a level can never be saved above the sourced maximum, and zero turns it off', () => {
  assert.deepEqual(withEnchantLevel({ enchantments: {} }, 'dedication', 99, 4), { dedication: 4 });
  assert.deepEqual(withEnchantLevel({ enchantments: {} }, 'dedication', '3', 4), { dedication: 3 });
  assert.deepEqual(withEnchantLevel({ enchantments: { dedication: 3 } }, 'dedication', 0, 4), {});
});

test('rarity colours are the lore codes the game writes, covering every rarity the app parses', () => {
  const parsed = readFileSync(new URL('../src/item-normalizer.js', import.meta.url), 'utf8');
  const listed = parsed.match(/const RARITIES = Object\.freeze\(\[([^\]]+)\]\)/)[1]
    .split(',').map(value => value.trim().replace(/^'|'$/g, '')).filter(Boolean);
  for (const rarity of listed) {
    assert.ok(RARITY_COLORS[rarity], `no colour for the rarity "${rarity}" the normalizer reads`);
    assert.match(rarityColor(rarity).hex, /^#[0-9a-f]{6}$/);
  }
  assert.equal(rarityClass('VERY SPECIAL'), 'rarity-very-special');
  assert.equal(rarityClass(null), 'rarity-unknown');
  assert.equal(rarityClass('NOT A RARITY'), 'rarity-unknown');
});

test('gemstone choices are a closed set, so a typo cannot invent a gem', () => {
  assert.equal(gemOptionValues().length, GEM_QUALITIES.length * GEM_TYPES.length);
  assert.deepEqual(parseGem('perfect peridot'), { quality: 'PERFECT', type: 'PERIDOT', value: 'PERFECT PERIDOT' });
  assert.equal(parseGem('PERFECT UNOBTAINIUM'), null);
  assert.equal(parseGem('SHINY PERIDOT'), null);
});

test('every verified enchantment has a readable label', () => {
  for (const id of Object.keys(VERIFIED_FARMING_ENCHANT_META)) {
    assert.ok(ENCHANT_LABELS[id], `enchantment "${id}" would be shown as a raw identifier`);
  }
  assert.equal(enchantLabel('mystery_thing'), 'Mystery Thing');
});

test('the collapsed card summarises the item without claiming an empty slot is filled', () => {
  assert.equal(itemSummary('helmet', null), 'Empty');
  assert.equal(itemSummary('helmet', { displayName: 'Helianthus Helmet' }), 'No upgrades yet');
  assert.equal(
    itemSummary('helmet', {
      displayName: 'Helianthus Helmet',
      reforge: 'mossy',
      enchantments: { pesterminator: 6 },
      recombobulated: true,
      gems: ['PERFECT PERIDOT'],
    }),
    'mossy reforge · 1 enchant (1 maxed) · recombobulated · 1 gem',
  );
});
