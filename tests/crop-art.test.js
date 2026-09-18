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


function cropSpriteTable() {
  const block = redesign.match(/const CROP_SPRITES = Object\\.freeze\\(\\{([\\s\\S]*?)\\n\\}\\);/);
  assert.ok(block, 'CROP_SPRITES table not found');
  const table = {};
  for (const m of block[1].matchAll(/^\\s*'?([\\w-]+)'?:\\s*'([^']+)'/gm)) {
    table[m[1]] = m[2];
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
  const sprites = cropSpriteTable();
  const bare = cropIds().filter(id => !sprites[id] && !(table[id] || []).some(key => key in manifest.items));
  assert.deepEqual(bare, [], `these crops would still show a letter: ${bare.join(', ')}`);
});

test('embedded crop sprites are valid PNG data URIs', () => {
  const invalid = Object.entries(cropSpriteTable())
    .filter(([, url]) => !url.startsWith('data:image/png;base64,iVBORw0KGgo'))
    .map(([id]) => id);
  assert.deepEqual(invalid, [], `invalid embedded crop sprites: ${invalid.join(', ')}`);
});

test('crop tiles never use farming tool artwork', () => {
  const toolNames = /theoretical_hoe_|(?:melon|pumpkin)_dicer|coco_chopper|fungi_cutter|cactus_knife/;
  const wrong = Object.entries(cropArtTable())
    .flatMap(([crop, keys]) => keys.filter(key => toolNames.test(key)).map(key => `${crop} -> ${key}`));
  assert.deepEqual(wrong, [], `tool art leaked into crop tiles: ${wrong.join(', ')}`);
});

test('the art tables have no entry for a crop that does not exist', () => {
  const ids = cropIds();
  const unknown = [...Object.keys(cropArtTable()), ...Object.keys(cropSpriteTable())]
    .filter((id, index, all) => !ids.includes(id) && all.indexOf(id) === index);
  assert.deepEqual(unknown, [], `art for unknown crops: ${unknown.join(', ')}`);
});
