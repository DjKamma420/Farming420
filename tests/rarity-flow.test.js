import assert from 'node:assert/strict';
import test from 'node:test';

import { normalizeDecodedItem, rarityFromLore } from '../src/item-normalizer.js';
import { itemRecordFromDecoded } from '../src/setups.js';

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
  assert.equal(record.reforge, 'rooted');
});
