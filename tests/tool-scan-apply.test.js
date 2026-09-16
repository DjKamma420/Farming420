import assert from 'node:assert/strict';
import test from 'node:test';

import { applyToolScanToProgress, TOOL_ENTRY } from '../src/tool-scan-apply.js';

function emptyBucket() {
  return { levels: {}, owned: {}, costs: {}, manualGain: {} };
}

test('applies verified crop-tool fields to the progress bucket', () => {
  const scan = {
    farmingForDummies: 5,
    reforge: 'bountiful',
    enchantments: {
      cultivating: 10,
      dedication: 4,
      harvesting: 6,
      turbo_melon: 7,
    },
    gems: ['PERFECT PERIDOT'],
  };

  const result = applyToolScanToProgress(emptyBucket(), scan, 'melon');
  assert.equal(result.bucket.levels[TOOL_ENTRY.dummies], 5);
  assert.equal(result.bucket.levels[TOOL_ENTRY.cultivating], 10);
  assert.equal(result.bucket.levels[TOOL_ENTRY.dedication], 4);
  assert.equal(result.bucket.levels[TOOL_ENTRY.harvesting], 6);
  assert.equal(result.bucket.levels[TOOL_ENTRY.turbo], 7);
  assert.equal(result.bucket.owned[TOOL_ENTRY.bountiful], true);
  assert.equal(result.bucket.owned[TOOL_ENTRY.perfectPeridot], true);
});

test('does not apply a turbo enchant from another crop', () => {
  const result = applyToolScanToProgress(emptyBucket(), {
    enchantments: { turbo_wheat: 7 },
  }, 'melon');

  assert.equal(result.bucket.levels[TOOL_ENTRY.turbo], undefined);
  assert.equal(result.warnings.length, 1);
});

test('scanner-applied reforges remain mutually exclusive on the physical tool', () => {
  const bucket = emptyBucket();
  bucket.owned[TOOL_ENTRY.blessed] = true;
  bucket.levels[TOOL_ENTRY.blessed] = 1;

  const result = applyToolScanToProgress(bucket, { reforge: 'bountiful' }, 'melon');
  assert.equal(result.bucket.owned[TOOL_ENTRY.blessed], undefined);
  assert.equal(result.bucket.levels[TOOL_ENTRY.blessed], undefined);
  assert.equal(result.bucket.owned[TOOL_ENTRY.bountiful], true);
});

test('unrecognized fields do not erase existing progress', () => {
  const bucket = emptyBucket();
  bucket.levels[TOOL_ENTRY.cultivating] = 8;
  bucket.costs[TOOL_ENTRY.cultivating] = 12345;

  const result = applyToolScanToProgress(bucket, {
    reforge: null,
    enchantments: {},
    gems: [],
    farmingForDummies: null,
  }, 'melon');

  assert.equal(result.bucket.levels[TOOL_ENTRY.cultivating], 8);
  assert.equal(result.bucket.costs[TOOL_ENTRY.cultivating], 12345);
});

test('flower crops do not invent unsupported Turbo mappings', () => {
  const result = applyToolScanToProgress(emptyBucket(), {
    enchantments: { turbo_wheat: 7 },
  }, 'sunflower');

  assert.equal(result.bucket.levels[TOOL_ENTRY.turbo], undefined);
  assert.equal(result.warnings.length, 1);
});
