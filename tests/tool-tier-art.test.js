import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync, existsSync } from 'node:fs';

const source = readFileSync(new URL('../src/skyblock-redesign.js', import.meta.url), 'utf8');
const manifestUrl = new URL('../assets/hypixel-pack/manifest.json', import.meta.url);

function tierTable() {
  const block = source.match(/const TOOL_TIER_ART = Object\.freeze\(\{([\s\S]*?)\n\}\);/)[1];
  const table = {};
  for (const [, crop, list] of block.matchAll(/^\s*'?([\w-]+)'?:\s*\[([^\]]+)\]/gm)) {
    table[crop] = [...list.matchAll(/'([^']+)'/g)].map(m => m[1]);
  }
  return table;
}

test('every tool names a real picture in the shipped pack', () => {
  // The Cocoa Chopper showed a bare letter placeholder because the table said
  // cocoa_chopper and the pack calls it coco_chopper. Nothing caught it,
  // because a missing key looks exactly like a tool the pack does not cover.
  if (!existsSync(manifestUrl)) return; // the pack is synced separately
  const items = JSON.parse(readFileSync(manifestUrl, 'utf8')).items;
  const missing = [];
  for (const [crop, keys] of Object.entries(tierTable())) {
    for (const key of keys) if (!items[key]) missing.push(`${crop} -> ${key}`);
  }
  assert.deepEqual(missing, [], `tool art keys that no longer exist in the pack:\n${missing.join('\n')}`);
});

test('the tiers are listed lowest first, so an unset tool draws its base model', () => {
  // The table used to put _3 first and fall back to _1, so every tool was drawn
  // as its fully upgraded model whatever the player owned.
  const table = tierTable();
  for (const [crop, keys] of Object.entries(table)) {
    const numbered = keys.filter(key => /_(\d)$/.test(key)).map(key => Number(key.match(/_(\d)$/)[1]));
    const ascending = [...numbered].sort((a, b) => a - b);
    assert.deepEqual(numbered, ascending, `${crop} lists its tiers out of order: ${keys.join(', ')}`);
  }
  assert.deepEqual(table.melon, ['melon_dicer', 'melon_dicer_2', 'melon_dicer_3']);
  assert.deepEqual(table.pumpkin, ['pumpkin_dicer', 'pumpkin_dicer_2', 'pumpkin_dicer_3']);
});

test('the picker only rebuilds when the selection or a tier changed', () => {
  // It is driven by a MutationObserver and replaces its own section, so an
  // unconditional rebuild would wedge the page. Fourth-occurrence rule.
  assert.match(source, /dataset\.sbSignature === signature/);
  assert.match(source, /portrait\.dataset\.sbToolArt === signature/);
});
