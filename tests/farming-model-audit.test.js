import assert from 'node:assert/strict';
import test from 'node:test';

import { buildFarmingModelAudit } from '../scripts/audit-farming-models.js';
import { ITEM_MODEL_SOURCE } from '../src/item-model-coverage.js';

const MANIFEST = {
  schemaVersion: 1,
  pack: { id: 'SkyBlock', hash: 'fixture-pack' },
  items: {
    theoretical_hoe_wheat_1: {
      texture: 'textures/item/wheat_tool.png',
      source: 'garden/theoretical_hoe_wheat_1',
    },
  },
};

const CATALOG = [
  {
    id: 'HELIANTHUS_HELMET',
    name: 'Helianthus Helmet',
    category: 'HELMET',
    skin: 'a'.repeat(64),
    material: 'SKULL_ITEM',
  },
  {
    id: 'THEORETICAL_HOE_WHEAT_1',
    name: "Euclid's Wheat Sickle",
    category: 'HOE',
    skin: null,
    material: 'DIAMOND_HOE',
  },
  {
    id: 'SKYMART_VACUUM',
    name: 'SkyMart Vacuum',
    category: 'MISC',
    skin: null,
    material: 'STONE_HOE',
  },
  {
    id: 'FERMENTO_CHESTPLATE',
    name: 'Fermento Chestplate',
    category: 'CHESTPLATE',
    skin: null,
    material: null,
  },
  {
    id: 'ASPECT_OF_THE_END',
    name: 'Aspect of the End',
    category: 'SWORD',
    skin: null,
    material: 'DIAMOND_SWORD',
  },
];

test('sync audit classifies official heads, exact pack models, fallbacks, and unresolved farming items', () => {
  const audit = buildFarmingModelAudit(CATALOG, MANIFEST, { generatedAt: '2026-09-17T00:00:00.000Z' });
  assert.equal(audit.totalFarmingPhysicalItems, 4, 'non-farming catalog items are excluded');
  assert.equal(audit.resolved, 3);
  assert.equal(audit.unresolvedCount, 1);
  assert.equal(audit.directModelCount, 2);
  assert.equal(audit.fallbackModelCount, 1);
  assert.deepEqual(audit.bySource, {
    [ITEM_MODEL_SOURCE.OFFICIAL_SKIN]: 1,
    [ITEM_MODEL_SOURCE.RESOURCE_PACK_ITEM]: 1,
    [ITEM_MODEL_SOURCE.RESOURCE_PACK_SET]: 0,
    [ITEM_MODEL_SOURCE.VANILLA_MATERIAL]: 1,
    [ITEM_MODEL_SOURCE.UNRESOLVED]: 1,
  });
  assert.deepEqual(audit.unresolved.map(item => item.id), ['FERMENTO_CHESTPLATE']);
});

test('non-pack list exposes head and fallback coverage instead of pretending every model came from the pack', () => {
  const audit = buildFarmingModelAudit(CATALOG, MANIFEST, { generatedAt: '2026-09-17T00:00:00.000Z' });
  assert.deepEqual(audit.nonPackItems.map(item => [item.id, item.source]), [
    ['HELIANTHUS_HELMET', ITEM_MODEL_SOURCE.OFFICIAL_SKIN],
    ['SKYMART_VACUUM', ITEM_MODEL_SOURCE.VANILLA_MATERIAL],
    ['FERMENTO_CHESTPLATE', ITEM_MODEL_SOURCE.UNRESOLVED],
  ]);
  assert.equal(audit.records.find(item => item.id === 'THEORETICAL_HOE_WHEAT_1')?.source, ITEM_MODEL_SOURCE.RESOURCE_PACK_ITEM);
});
