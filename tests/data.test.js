import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

import { COMING_SOON, CROPS, HIDDEN_INTERACTIONS, UPGRADES } from '../src/data.js';
import { toolKeyForCropId } from '../src/migrations.js';

const SECTIONS = new Set(['account', 'crops', 'tools', 'gear', 'accessories', 'pets', 'chips', 'shards', 'buffs', 'pests']);
const CROP_NAMES = new Set(CROPS.map(entry => entry.name));

test('all 13 current Garden crops are present with unique ids', () => {
  assert.equal(CROPS.length, 13);
  assert.equal(new Set(CROPS.map(entry => entry.id)).size, 13);
  for (const entry of CROPS) {
    assert.ok(entry.id && entry.name && entry.tool, `incomplete crop entry: ${JSON.stringify(entry)}`);
  }
});

test('Sunflower and Moonflower share the Eclipse Sickle and no other tool is shared', () => {
  const byTool = new Map();
  for (const entry of CROPS) {
    byTool.set(toolKeyForCropId(entry.id), [...(byTool.get(toolKeyForCropId(entry.id)) || []), entry.id]);
  }
  const shared = [...byTool.entries()].filter(([, crops]) => crops.length > 1);
  assert.deepEqual(shared, [['eclipse-sickle', ['sunflower', 'moonflower']]]);
});

test('upgrade ids are unique', () => {
  assert.equal(new Set(UPGRADES.map(item => item.id)).size, UPGRADES.length);
});

test('every upgrade has a usable shape', () => {
  for (const item of UPGRADES) {
    assert.ok(SECTIONS.has(item.section), `${item.id} has unknown section "${item.section}"`);
    assert.ok(item.name?.trim(), `${item.id} has no name`);
    assert.ok(item.category?.trim(), `${item.id} has no category`);
    assert.ok(item.metric?.trim(), `${item.id} has no metric`);
    assert.ok(item.modeScope?.trim(), `${item.id} has no mode scope`);
    assert.ok(Number.isInteger(item.max) && item.max >= 1, `${item.id} has an invalid max "${item.max}"`);
  }
});

test('every upgrade cites a source, as the correctness rules require', () => {
  for (const item of UPGRADES) {
    assert.match(String(item.source || ''), /^https?:\/\//, `${item.id} has no source URL`);
  }
});

test('a crop-limited upgrade names a crop that actually exists', () => {
  // The UI filters by crop *name*, so a typo here silently hides the entry.
  for (const item of UPGRADES.filter(entry => entry.cropScope !== 'Any')) {
    assert.ok(CROP_NAMES.has(item.cropScope), `${item.id} is scoped to unknown crop "${item.cropScope}"`);
  }
});

test('only ACTIVE entries may carry planner weight; VERIFY entries are the only other status', () => {
  for (const item of UPGRADES) {
    assert.ok(['ACTIVE', 'VERIFY'].includes(item.status), `${item.id} has unexpected status "${item.status}"`);
  }
});

test('coming-soon content never reaches the live upgrade list', () => {
  const liveIds = new Set(UPGRADES.map(item => item.id));
  for (const entry of COMING_SOON) {
    assert.ok(!liveIds.has(entry.id), `announced entry "${entry.id}" leaked into the live upgrade list`);
    assert.ok(entry.effect?.trim() && entry.treatment?.trim(), `${entry.id} is missing effect/treatment copy`);
    assert.match(String(entry.source || ''), /^https?:\/\//, `${entry.id} has no source URL`);
  }
});

test('documented hidden interactions stay sourced and explained', () => {
  assert.ok(HIDDEN_INTERACTIONS.length > 0);
  for (const entry of HIDDEN_INTERACTIONS) {
    assert.ok(entry.effect?.trim(), `${entry.id} has no effect description`);
    assert.ok(entry.why?.trim(), `${entry.id} does not say why it is modeled separately`);
    assert.ok(entry.handling?.trim(), `${entry.id} does not describe the app logic`);
    assert.match(String(entry.source || ''), /^https?:\/\//, `${entry.id} has no source URL`);
  }
});

test('no entry cites the closed official Hypixel wiki', () => {
  // The official wiki was shut down in July 2026 and its pages are gone, so
  // every wiki.hypixel.net link is dead. See AGENTS.md, source hierarchy.
  const offenders = UPGRADES.filter(entry => /(^|\/\/)(www\.)?wiki\.hypixel\.net/.test(String(entry.source || '')));
  assert.deepEqual(offenders.map(entry => entry.id), [], 'these cite the closed official wiki');

  for (const entry of [...HIDDEN_INTERACTIONS, ...COMING_SOON]) {
    assert.ok(!String(entry.source || '').includes('wiki.hypixel.net'), `${entry.id} cites the closed official wiki`);
  }
  for (const crop of CROPS) {
    assert.ok(!String(crop.toolSource || '').includes('wiki.hypixel.net'), `${crop.id} cites the closed official wiki`);
  }
});

test('a verified mechanic carries a real source and a real date', () => {
  const verified = HIDDEN_INTERACTIONS.filter(entry => entry.lastVerified);
  assert.ok(verified.length > 0, 'the verification pass recorded nothing');
  for (const entry of verified) {
    assert.match(entry.lastVerified, /^\d{4}-\d{2}-\d{2}$/, `${entry.id} has a malformed date`);
    assert.match(String(entry.source || ''), /^https?:\/\//, `${entry.id} has no source`);
    assert.ok(entry.effect?.trim() && entry.why?.trim() && entry.handling?.trim(), `${entry.id} is incomplete`);
  }
});

test('hidden interaction ids are unique', () => {
  const ids = HIDDEN_INTERACTIONS.map(entry => entry.id);
  assert.equal(new Set(ids).size, ids.length);
});

test('no verification predates a known game change to the same area', () => {
  // A lastVerified date only means something relative to when the game last
  // moved. docs/FARMING_HISTORY.md records the timeline; the newest farming
  // change known there is the August 2026 Greenhouse rebalance, so nothing may
  // claim to be verified before it.
  const NEWEST_KNOWN_GAME_CHANGE = '2026-08-01';
  const verified = HIDDEN_INTERACTIONS.filter(entry => entry.lastVerified);
  for (const entry of verified) {
    assert.ok(
      entry.lastVerified >= NEWEST_KNOWN_GAME_CHANGE,
      `${entry.id} was verified ${entry.lastVerified}, before the newest known game change ${NEWEST_KNOWN_GAME_CHANGE}`,
    );
  }
  for (const crop of CROPS) {
    assert.ok(
      crop.toolVerified >= NEWEST_KNOWN_GAME_CHANGE,
      `${crop.id} tool name verified ${crop.toolVerified}, before the newest known game change`,
    );
  }
});

test('the change history is referenced from the data layer docs', () => {
  const history = readFileSync(new URL('../docs/FARMING_HISTORY.md', import.meta.url), 'utf8');
  // The dates that matter for judging staleness must stay recorded.
  for (const date of ['2021-01-15', '2023-02-14', '2023-05-22', '2023-11-14', '2025-12-15']) {
    assert.ok(history.includes(date), `the timeline lost ${date}`);
  }
  assert.match(history, /Outdated pages/, 'the source caveat must stay recorded');
  assert.match(history, /CC BY-NC-SA/, 'the licence must stay recorded');
});

test('every documented farming attribute is modelled as its own shard entry', () => {
  // All twelve attributes are levelled the same way and listed in the same wiki
  // table, so an attribute that is researched but never entered here is invisible
  // to the planner. Each one gets a row; none of them may be silently dropped.
  const expected = new Map([
    ['Solar Power', 'Crop Yield'],
    ['Lunar Power', 'Crop Yield'],
    ['Pest Fortune', 'Crop Yield'],
    ['Infiltration', 'Crop Yield'],
    ['Pest Luck', 'Rare Crops'],
    ['Bonus Pest Chance', 'Pest Spawn'],
    ['Sprayonator Serendipity', 'Sprayonator Materials'],
    ['Pest Cooldown', 'Pest Spawn'],
    ['Enchanted Farmer', 'Enchanted Crops'],
    ['Visitor Bait', 'Visitor Speed'],
    ['Fancy Visit', 'Visitor Rarity'],
    ['Garden Wisdom', 'Farming XP'],
  ]);
  // Solar and Lunar Power share one entry: freezing Garden time makes the second
  // one permanently dead, so they are mutually exclusive rather than additive.
  const byAttribute = new Map();
  for (const item of UPGRADES.filter(entry => entry.section === 'shards')) {
    assert.ok(item.attribute?.trim(), `${item.id} does not name its attribute`);
    for (const name of item.attribute.split(', ')) byAttribute.set(name, item);
  }
  for (const [attribute, metric] of expected) {
    const hit = byAttribute.get(attribute);
    assert.ok(hit, `farming attribute "${attribute}" has no shard entry`);
    assert.equal(hit.metric, metric, `${attribute} carries the wrong metric`);
  }
});

test('a farming attribute without a sourced per-level value never scores', () => {
  // Attributes level to 10. An attribute whose per-level scaling the wiki does not
  // publish must not be given one, so it may not carry a non-zero step gain.
  for (const item of UPGRADES.filter(entry => entry.section === 'shards')) {
    if (item.status === 'VERIFY') {
      assert.equal(item.stepGain, 0, `${item.id} is unverified but still scores`);
      assert.equal(item.rawMarginal, 0, `${item.id} is unverified but still has a marginal value`);
    } else {
      assert.ok(item.stepGain > 0, `${item.id} is ACTIVE but contributes nothing`);
    }
  }
});

test('only the four Fortune attributes use the Crop Yield metric', () => {
  // The trap this pins: twelve identically-levelled attributes read as one
  // Fortune pool. Summing them would roughly triple a player's real Fortune.
  const yieldShards = UPGRADES
    .filter(item => item.section === 'shards' && item.metric === 'Crop Yield')
    .map(item => item.id)
    .sort();
  assert.deepEqual(yieldShards, [
    'attribute-shard-cricket-pest-fortune',
    'attribute-shard-earthworm-shard-formerly-termite',
    'attribute-shard-firefly-or-lunar-moth-shard',
    'attribute-shard-galaxy-fish-shard',
  ]);
});
