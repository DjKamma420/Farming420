import test from 'node:test';
import assert from 'node:assert/strict';

import { CROPS } from '../src/data.js';
import { cropReforgeRecommendations } from '../src/farming-reforges.js';
import { TOOL_TIER_CHAIN, applyChainTier, highestChainTier } from '../src/progression-chains.js';
import {
  recommendationRows,
  toolAssetForTier,
  toolTierLabel,
} from '../src/tool-presentation-ui.js';

function bucket() {
  return { levels: {}, owned: {} };
}

test('tool tier defaults to Mk. I when no higher upgrade is selected', () => {
  assert.equal(highestChainTier(bucket(), TOOL_TIER_CHAIN), 1);
  assert.equal(toolTierLabel(1), 'Mk. I');
});

test('selecting Mk. III cumulatively records Mk. II and Mk. III', () => {
  const state = bucket();
  applyChainTier(state, TOOL_TIER_CHAIN, 3);
  assert.equal(state.levels['tool-mk-ii'], 1);
  assert.equal(state.levels['tool-mk-iii'], 1);
  assert.equal(state.owned['tool-mk-ii'], true);
  assert.equal(state.owned['tool-mk-iii'], true);
  assert.equal(highestChainTier(state, TOOL_TIER_CHAIN), 3);
});

test('downgrading a cumulative chain clears later tiers only', () => {
  const state = bucket();
  applyChainTier(state, TOOL_TIER_CHAIN, 3);
  applyChainTier(state, TOOL_TIER_CHAIN, 2);
  assert.equal(state.levels['tool-mk-ii'], 1);
  assert.equal(state.owned['tool-mk-ii'], true);
  assert.equal(state.levels['tool-mk-iii'], undefined);
  assert.equal(state.owned['tool-mk-iii'], undefined);
  assert.equal(highestChainTier(state, TOOL_TIER_CHAIN), 2);
});

test('Cocoa Chopper uses the official pack asset for the selected tier', () => {
  assert.equal(toolAssetForTier('cocoa-beans', 1), 'coco_chopper');
  assert.equal(toolAssetForTier('cocoa-beans', 2), 'coco_chopper_2');
  assert.equal(toolAssetForTier('cocoa-beans', 3), 'coco_chopper_3');
});

test('verified tiered hoe assets follow the selected tier', () => {
  assert.equal(toolAssetForTier('wheat', 3), 'theoretical_hoe_wheat_3');
  assert.equal(toolAssetForTier('carrot', 2), 'theoretical_hoe_carrot_2');
  assert.equal(toolAssetForTier('potato', 1), 'theoretical_hoe_potato_1');
  assert.equal(toolAssetForTier('sugar-cane', 3), 'theoretical_hoe_cane_3');
});

test('single-texture Dicers still expose the selected tier through the Mk. label', () => {
  assert.equal(toolAssetForTier('melon', 1), 'melon_dicer');
  assert.equal(toolAssetForTier('melon', 3), 'melon_dicer');
  assert.equal(toolTierLabel(3), 'Mk. III');
});

test('every modeled crop keeps normal-profit and Feast-profit recommendations separate', () => {
  for (const crop of CROPS) {
    const rec = cropReforgeRecommendations(crop.id);
    assert.equal(rec.normalCoins, 'bountiful', crop.id);
    assert.equal(rec.feastRareCropCoins, 'overpriced', crop.id);
    assert.equal(rec.collection, 'blessed', crop.id);
  }
});

test('recommendation presentation labels Overpriced as conditional Feast coin context', () => {
  const rows = recommendationRows('cocoa-beans');
  const normal = rows.find(row => row.label === 'Normal crop coins');
  const feast = rows.find(row => row.label === 'Feast RARE-CROP coins');
  assert.equal(normal?.reforge, 'bountiful');
  assert.equal(feast?.reforge, 'overpriced');
  assert.match(feast?.note || '', /in season/i);
});
