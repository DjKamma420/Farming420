import assert from 'node:assert/strict';
import test from 'node:test';

import { normalizeDecodedItem, rarityFromLore } from '../src/item-normalizer.js';
import { itemRecordFromDecoded, normalizeSetups } from '../src/setups.js';
import {
  baseRarityFromDisplayed,
  effectiveSetupItemRarity,
} from '../src/setup-rarity.js';

test('rarity is read from a formatted SkyBlock lore footer', () => {
  assert.equal(rarityFromLore(['§7Some lore', '§6§lLEGENDARY NECKLACE']), 'LEGENDARY');
  assert.equal(rarityFromLore(['§d§lMYTHIC']), 'MYTHIC');
  assert.equal(rarityFromLore(['§7No rarity here']), null);
});

test('normalized item rarity survives into a synced setup record', () => {
  const decoded = normalizeDecodedItem({
    tag: {
      display: {
        Name: '§5Blossom Necklace',
        Lore: ['§7Equipment', '§6§lLEGENDARY NECKLACE'],
      },
      ExtraAttributes: { id: 'BLOSSOM_NECKLACE', modifier: 'rooted' },
    },
  }, { container: 'equipment', slot: 0 });

  assert.equal(decoded.rarity, 'LEGENDARY');
  const record = itemRecordFromDecoded(decoded);
  assert.equal(record.rarity, 'LEGENDARY');
  assert.equal(record.rarityBasis, 'base');
  assert.equal(record.reforge, 'rooted');
});

test('synced recombobulated lore is converted back to base rarity exactly once', () => {
  const decoded = normalizeDecodedItem({
    tag: {
      display: {
        Name: '§dFermento Helmet',
        Lore: ['§7Armor', '§d§lMYTHIC HELMET'],
      },
      ExtraAttributes: {
        id: 'FERMENTO_HELMET',
        rarity_upgrades: 1,
      },
    },
  }, { container: 'armor', slot: 3 });

  assert.equal(decoded.rarity, 'MYTHIC', 'profile decoder correctly reports the displayed lore rarity');
  assert.equal(decoded.recombobulated, 1);

  const record = itemRecordFromDecoded(decoded);
  assert.equal(record.rarity, 'LEGENDARY', 'setup stores the physical base rarity');
  assert.equal(record.rarityBasis, 'base');
  assert.equal(record.recombobulated, true);
  assert.equal(effectiveSetupItemRarity(record), 'MYTHIC', 'display/calculator reapplies the Recombobulator once');
});

test('legacy synced setup records with effective rarity migrate without double recomb', () => {
  const normalized = normalizeSetups({
    activeId: 'normal',
    list: [{
      id: 'normal',
      name: 'Normal',
      slots: {
        helmet: {
          displayName: 'Fermento Helmet',
          rarity: 'MYTHIC',
          recombobulated: true,
          source: 'sync',
        },
      },
    }],
  });

  const helmet = normalized.list[0].slots.helmet;
  assert.equal(helmet.rarity, 'LEGENDARY');
  assert.equal(helmet.rarityBasis, 'base');
  assert.equal(effectiveSetupItemRarity(helmet), 'MYTHIC');

  const normalizedAgain = normalizeSetups(normalized);
  assert.equal(normalizedAgain.list[0].slots.helmet.rarity, 'LEGENDARY', 'base rarity is not downgraded twice');
});

test('rarity helpers cover normal and special ladders without inventing a second recomb step', () => {
  assert.equal(baseRarityFromDisplayed('MYTHIC', true), 'LEGENDARY');
  assert.equal(effectiveSetupItemRarity({ rarity: 'LEGENDARY', recombobulated: true }), 'MYTHIC');
  assert.equal(effectiveSetupItemRarity({ rarity: 'LEGENDARY', recombobulated: false }), 'LEGENDARY');
  assert.equal(effectiveSetupItemRarity({ rarity: 'SPECIAL', recombobulated: true }), 'VERY SPECIAL');
  assert.equal(effectiveSetupItemRarity({ rarity: 'RARE', recombobulated: true }, 'LEGENDARY'), 'MYTHIC', 'official base tier wins over stale local rarity');
  assert.equal(effectiveSetupItemRarity({ rarity: null, recombobulated: true }), null);
});
