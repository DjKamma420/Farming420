import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

/**
 * Nav icons resolve by name against the shipped resource pack, and a name that
 * matches nothing degrades silently to a bare letter. That is how twelve of
 * sixteen nav entries came to be letters: `garden`, `personal_bank`,
 * `wardrobe`, `booster_cookie`, `calculator` and others simply do not exist in
 * the pack. The same typo class once drew the Cocoa Chopper as a letter,
 * because the table said `cocoa_chopper` and the pack says `coco_chopper`.
 */

const manifest = JSON.parse(
  readFileSync(new URL('../assets/hypixel-pack/manifest.json', import.meta.url), 'utf8'),
);
const source = readFileSync(new URL('../src/skyblock-redesign.js', import.meta.url), 'utf8');

/** Pages that intentionally show a letter: the pack has no honest match. */
const LETTER_ONLY_PAGES = new Set(['guide', 'setup', 'research', 'coming']);

function navArtTable() {
  const block = source.match(/const NAV_ART = Object\.freeze\(\{([\s\S]*?)\n\}\);/);
  assert.ok(block, 'NAV_ART table not found');
  const table = {};
  const row = /^\s*'?([\w-]+)'?:\s*\[([^\]]*)\]/gm;
  let match;
  while ((match = row.exec(block[1]))) {
    table[match[1]] = [...match[2].matchAll(/'([^']+)'/g)].map(m => m[1]);
  }
  return table;
}

test('every nav art candidate exists in the shipped pack', () => {
  const table = navArtTable();
  assert.ok(Object.keys(table).length >= 10, 'NAV_ART parsed as suspiciously small');
  const missing = [];
  for (const [page, candidates] of Object.entries(table)) {
    for (const key of candidates) {
      if (!(key in manifest.items)) missing.push(`${page} -> ${key}`);
    }
  }
  assert.deepEqual(missing, [], `these nav art keys match nothing in the pack: ${missing.join(', ')}`);
});

test('every nav art entry resolves to at least one real icon', () => {
  const table = navArtTable();
  const letterOnly = Object.entries(table)
    .filter(([, candidates]) => !candidates.some(key => key in manifest.items))
    .map(([page]) => page);
  assert.deepEqual(letterOnly, [], `these pages would fall back to a letter: ${letterOnly.join(', ')}`);
});

test('pages with no pack art are left out of the table on purpose', () => {
  const table = navArtTable();
  for (const page of LETTER_ONLY_PAGES) {
    assert.ok(
      !(page in table),
      `${page} has no fitting pack art; listing it invites a name that resolves to nothing`,
    );
  }
});
