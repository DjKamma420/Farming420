import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { itemsForSlot, isFarmingEquipmentCatalogItem } from '../src/item-catalog.js';

const catalog = [
  { id: 'LOTUS_NECKLACE', name: 'Lotus Necklace', category: 'NECKLACE' },
  { id: 'BLOSSOM_NECKLACE', name: 'Blossom Necklace', category: 'NECKLACE' },
  { id: 'PESTHUNTER_NECKLACE', name: "Pesthunter's Necklace", category: 'NECKLACE' },
  { id: 'SYNTHESIZER_V1', name: 'Synthesizer v1', category: 'NECKLACE' },
  { id: 'LOTUS_CLOAK', name: 'Lotus Cloak', category: 'CLOAK' },
  { id: 'BLOSSOM_CLOAK', name: 'Blossom Cloak', category: 'CLOAK' },
  { id: 'PESTHUNTER_CLOAK', name: "Pesthunter's Cloak", category: 'CLOAK' },
  { id: 'PEST_VEST', name: 'Pest Vest', category: 'CLOAK' },
  { id: 'ZORRO_CAPE', name: "Zorro's Cape", category: 'CLOAK' },
  { id: 'MOLTEN_CLOAK', name: 'Molten Cloak', category: 'CLOAK' },
  { id: 'LOTUS_BELT', name: 'Lotus Belt', category: 'BELT' },
  { id: 'BLOSSOM_BELT', name: 'Blossom Belt', category: 'BELT' },
  { id: 'PESTHUNTER_BELT', name: "Pesthunter's Belt", category: 'BELT' },
  { id: 'LOTUS_BRACELET', name: 'Lotus Bracelet', category: 'BRACELET' },
  { id: 'BLOSSOM_BRACELET', name: 'Blossom Bracelet', category: 'BRACELET' },
  { id: 'PESTHUNTER_GLOVES', name: "Pesthunter's Gloves", category: 'GLOVES' },
];

test('setup equipment picker contains farming equipment only', () => {
  assert.deepEqual(itemsForSlot(catalog, 'equipment1').map(item => item.id), [
    'BLOSSOM_NECKLACE', 'LOTUS_NECKLACE', 'PESTHUNTER_NECKLACE',
  ]);
  assert.equal(itemsForSlot(catalog, 'equipment1').some(item => item.id === 'SYNTHESIZER_V1'), false);

  assert.deepEqual(new Set(itemsForSlot(catalog, 'equipment2').map(item => item.id)), new Set([
    'BLOSSOM_CLOAK', 'LOTUS_CLOAK', 'PESTHUNTER_CLOAK', 'PEST_VEST', 'ZORRO_CAPE',
  ]));
  assert.equal(itemsForSlot(catalog, 'equipment2').some(item => item.id === 'MOLTEN_CLOAK'), false);
});

test('farming equipment predicate accepts normal, pest and contest branches', () => {
  for (const id of ['LOTUS_BELT', 'BLOSSOM_BRACELET', 'PESTHUNTER_GLOVES', 'PEST_VEST', 'ZORRO_CAPE']) {
    assert.equal(isFarmingEquipmentCatalogItem(catalog.find(item => item.id === id)), true, id);
  }
  assert.equal(isFarmingEquipmentCatalogItem(catalog.find(item => item.id === 'SYNTHESIZER_V1')), false);
});

test('resolved setup art hides the old letter fallback', () => {
  const css = readFileSync(new URL('../src/item-art-coverage.css', import.meta.url), 'utf8');
  assert.match(css, /\.slot-portrait\.has-coverage-item-art\s*>\s*\.item-art-fallback/);
});

test('setup editor does not repeat the selected item identity', () => {
  const source = readFileSync(new URL('../src/app.js', import.meta.url), 'utf8');
  const css = readFileSync(new URL('../src/item-editor.css', import.meta.url), 'utf8');
  const start = source.indexOf('function slotEditor(slotId)');
  const end = source.indexOf('\nfunction setupsPage()', start);

  assert.notEqual(start, -1);
  assert.notEqual(end, -1);
  const slotEditor = source.slice(start, end);
  assert.match(slotEditor, /class="item-editor-head item-editor-actions"/);
  assert.match(slotEditor, /data-slot-clear/);
  assert.doesNotMatch(slotEditor, /data-item-art-slot/);
  assert.doesNotMatch(slotEditor, /class="item-identity"/);
  assert.match(css, /\.item-editor-head\.item-editor-actions\s*\{[^}]*grid-template-columns:\s*1fr/s);
  assert.match(css, /\.item-editor-head\.item-editor-actions\s*>\s*button\s*\{[^}]*width:\s*100%/s);
});

test('exact capability startup does not reload while cleaning stale state', () => {
  const source = readFileSync(new URL('../src/exact-item-capabilities-ui.js', import.meta.url), 'utf8');
  assert.match(source, /if \(changed\) save\(raw\);/);
  assert.match(source, /mutationNeedsCapabilityApply/);
  assert.doesNotMatch(source, /if \(changed\)[\s\S]{0,160}window\.location\.reload\(\)/);
});
