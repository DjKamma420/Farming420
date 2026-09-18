import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

import {
  activeSetupFromStoredState,
  itemForSetupSlot,
  setupItemAsset,
} from '../src/item-art-ui.js';

const manifest = {
  schemaVersion: 1,
  pack: { id: 'SkyBlock', hash: 'pack-hash' },
  items: {
    melon_dicer_3: {
      source: 'island_relevant/garden/melon_dicer_3',
      texture: 'textures/item/melon_dicer_3.png',
    },
  },
};

const state = {
  profile: {
    setups: {
      activeId: 'normal',
      list: [
        {
          id: 'normal',
          slots: {
            helmet: { skyblockId: 'MELON_DICER_3', displayName: 'Melon Dicer 3.0' },
            chestplate: { skyblockId: null, displayName: 'Manual Item' },
          },
        },
        { id: 'pest', slots: { helmet: { skyblockId: 'OTHER' } } },
      ],
    },
  },
};

test('setup art lookup uses the active setup only', () => {
  assert.equal(activeSetupFromStoredState(state).id, 'normal');
  assert.equal(itemForSetupSlot(state, 'helmet').skyblockId, 'MELON_DICER_3');
  assert.equal(itemForSetupSlot(state, 'boots'), null);
});

test('setup art resolves from real skyblockId and never display-name guesses', () => {
  assert.deepEqual(setupItemAsset(manifest, state, 'helmet'), {
    key: 'melon_dicer_3',
    textureUrl: './assets/hypixel-pack/textures/item/melon_dicer_3.png',
    source: 'island_relevant/garden/melon_dicer_3',
    packHash: 'pack-hash',
  });
  assert.equal(setupItemAsset(manifest, state, 'chestplate'), null);
});

test('manual equipment ids use their exact head model before the letter fallback', () => {
  const source = readFileSync(new URL('../src/item-art-ui.js', import.meta.url), 'utf8');
  assert.match(source, /item\.skullTexture \|\| knownSkyblockHeadTexture\(item\.skyblockId\)/);
  assert.match(source, /const skull = skullNode\(textureId, item(?:,|\))/);
});

test('invalid or missing setup state degrades to no asset', () => {
  assert.equal(activeSetupFromStoredState({}), null);
  assert.equal(itemForSetupSlot({}, 'helmet'), null);
  assert.equal(setupItemAsset(manifest, {}, 'helmet'), null);
});
