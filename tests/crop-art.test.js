import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

/**
 * Crop art resolves by name against the shipped pack, and a name that matches
 * nothing degrades silently back to the bare letter -- which is the state this
 * table was written to end. Thirteen tiles were showing W, C, P, Pu, Mu, WR.
 */
const manifest = JSON.parse(
  readFileSync(new URL('../assets/hypixel-pack/manifest.json', import.meta.url), 'utf8'),
);
const redesign = readFileSync(new URL('../src/skyblock-redesign.js', import.meta.url), 'utf8');
const data = readFileSync(new URL('../src/data.js', import.meta.url), 'utf8');

function cropArtTable() {
  const block = redesign.match(/const CROP_ART = Object\.freeze\(\{([\s\S]*?)\n\}\);/);
  assert.ok(block, 'CROP_ART table not found');
  const table = {};
  for (const m of block[1].matchAll(/^\s*'?([\w-]+)'?:\s*\[([^\]]*)\]/gm)) {
    table[m[1]] = [...m[2].matchAll(/'([^']+)'/g)].map(x => x[1]);
  }
  return table;
}

function cropIds() {
  const block = data.slice(data.indexOf('export const CROPS = ['));
  return [...block.slice(0, block.indexOf('\n];')).matchAll(/"id":\s*"([\w-]+)"/g)].map(m => m[1]);
}

test('every crop art key exists in the shipped pack', () => {
  const missing = [];
  for (const [crop, keys] of Object.entries(cropArtTable())) {
    for (const key of keys) if (!(key in manifest.items)) missing.push(`${crop} -> ${key}`);
  }
  assert.deepEqual(missing, [], `crop art keys matching nothing: ${missing.join(', ')}`);
});

test('every crop has art, so no tile falls back to a letter', () => {
  const table = cropArtTable();
  const bare = cropIds().filter(id => !(table[id] || []).some(key => key in manifest.items));
  assert.deepEqual(bare, [], `these crops would still show a letter: ${bare.join(', ')}`);
});

test('the table has no entry for a crop that does not exist', () => {
  const ids = cropIds();
  const unknown = Object.keys(cropArtTable()).filter(id => !ids.includes(id));
  assert.deepEqual(unknown, [], `art for unknown crops: ${unknown.join(', ')}`);
});
