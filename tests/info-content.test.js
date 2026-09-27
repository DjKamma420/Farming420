import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { CROPS } from '../src/data.js';
import { INFO_ENTRIES, INFO_SECTIONS, allInfoEntries, cropStrategyInfo } from '../src/info-content.js';

const root = new URL('../', import.meta.url);
const read = path => readFileSync(new URL(path, root), 'utf8');

test('Info records are complete, sourced and linkable', () => {
  const entries = allInfoEntries(CROPS);
  assert.ok(entries.length >= 25);
  assert.equal(new Set(entries.map(entry => entry.id)).size, entries.length);
  assert.equal(new Set(entries.map(entry => entry.anchor)).size, entries.length);

  for (const entry of entries) {
    assert.ok(entry.id);
    assert.ok(entry.anchor.startsWith('info-'));
    assert.ok(entry.section);
    assert.ok(entry.label);
    assert.ok(entry.title);
    assert.ok(entry.what);
    assert.ok(entry.why);
    assert.ok(entry.when);
    assert.ok(entry.where);
    assert.ok(Array.isArray(entry.keywords) && entry.keywords.length > 0);
    assert.match(entry.source, /^https:\/\//);
    assert.doesNotMatch(entry.source, /^https:\/\/wiki\.hypixel\.net\//);
    assert.match(entry.lastVerified, /^\d{4}-\d{2}-\d{2}$/);
  }
});

test('Info covers the requested beginner mechanic and item topics', () => {
  const ids = new Set(INFO_ENTRIES.map(entry => entry.id));
  for (const id of [
    'farming-mechanics',
    'farming-fortune',
    'crop-fortune',
    'overbloom',
    'bonus-pest-chance',
    'pest-grade',
    'pest-spawning',
    'pest-loot',
    'vacuum',
    'recombobulator',
    'gemstones',
    'reforges',
    'enchantments',
    'rarity',
    'item-acquisition',
    'garden',
    'garden-desk',
    'skymart',
    'pesthunter-phillip',
  ]) {
    assert.ok(ids.has(id), 'missing Info topic ' + id);
  }
});

test('every farming crop gets a stable crop-specific strategy entry', () => {
  const entries = cropStrategyInfo(CROPS);
  assert.equal(entries.length, CROPS.length);

  for (const crop of CROPS) {
    const entry = entries.find(row => row.id === 'crop-' + crop.id);
    assert.ok(entry, 'missing crop strategy for ' + crop.name);
    assert.equal(entry.anchor, 'info-crop-' + crop.id);
    assert.equal(entry.source, crop.toolSource);
    assert.equal(entry.lastVerified, crop.toolVerified);
    assert.ok(entry.what.includes(crop.name));
    assert.ok(entry.what.includes(crop.tool));
    assert.match(entry.where, /not guessed/i);
  }
});

test('Info sections keep explanations out of account settings', () => {
  assert.deepEqual(
    INFO_SECTIONS.map(section => section.id),
    ['mechanics', 'items', 'pests', 'places', 'crops'],
  );
  for (const entry of INFO_ENTRIES) {
    assert.notEqual(entry.section, 'settings');
    assert.notEqual(entry.section, 'account');
  }
});

test('global search routes every Info result to its individual anchor', () => {
  const app = read('src/app.js');
  assert.match(app, /for \(const topic of allInfoEntries\(CROPS\)\)/);
  assert.match(app, /target: \{ type: 'info', page: 'info', anchor: topic\.anchor \}/);
  assert.match(app, /scrollToSearchAnchor\(target\.anchor\)/);
  assert.match(app, /id="\$\{esc\(entry\.anchor\)\}"/);
});

test('obsolete explanatory pages are not navigation entries', () => {
  const app = read('src/app.js');
  const nav = app.match(/const NAV = \[[\s\S]*?\n\];/)?.[0] || '';
  assert.ok(nav);
  assert.doesNotMatch(nav, /Mechanics|Coming Soon|What to enter/i);
  assert.match(nav, /\['info', 'Info'\]/);
});

test('old undocumented-location placeholder is gone from the relevant UI and docs', () => {
  for (const path of ['src/app.js', 'src/info-content.js', 'src/help-locations.js', 'README.md']) {
    assert.doesNotMatch(read(path), /Ingame location not documented/i, path);
  }
  assert.doesNotMatch(read('README.md'), /\*\*What to enter\*\*/i);
});
