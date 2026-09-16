import test from 'node:test';
import assert from 'node:assert/strict';
import { FARMING_TOOL_PACK_KEYS, farmingToolPackKey, hasVerifiedFarmingToolArt } from '../src/farming-tool-art.js';

test('verified farming tool art covers known manifest-backed tool families', () => {
  assert.deepEqual(Object.keys(FARMING_TOOL_PACK_KEYS).sort(), [
    'Cactus Knife',
    'Fungi Cutter',
    'Melon Dicer',
    'Pumpkin Dicer',
  ]);
});

test('tool art follows Mk I through Mk III variants', () => {
  assert.equal(farmingToolPackKey('Melon Dicer', 1), 'melon_dicer');
  assert.equal(farmingToolPackKey('Melon Dicer', 2), 'melon_dicer_2');
  assert.equal(farmingToolPackKey('Melon Dicer', 3), 'melon_dicer_3');
  assert.equal(farmingToolPackKey('Pumpkin Dicer', 3), 'pumpkin_dicer_3');
  assert.equal(farmingToolPackKey('Fungi Cutter', 3), 'fungi_cutter_3');
  assert.equal(farmingToolPackKey('Cactus Knife', 3), 'cactus_knife_3');
});

test('unknown tools are never guessed into a pack key', () => {
  assert.equal(farmingToolPackKey("Euclid's Wheat Sickle", 3), null);
  assert.equal(hasVerifiedFarmingToolArt("Euclid's Wheat Sickle"), false);
});
