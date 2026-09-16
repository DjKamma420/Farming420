import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const ROOT = new URL('../research/knowledge-base/', import.meta.url);
const AI_ENTRY = new URL('../research/AI_KNOWLEDGE.md', import.meta.url);
const REQUIRED = [
  'README.md',
  '00-ontology-and-model-rules.md',
  '10-core-farming-and-garden.md',
  '20-items-armor-equipment-tools.md',
  '30-strategy-and-economics.md',
  'SOURCES.md',
];

function read(name) {
  return readFileSync(new URL(name, ROOT), 'utf8');
}

test('offline Farming knowledge base ships every required chapter', () => {
  for (const name of REQUIRED) assert.ok(read(name).length > 500, `${name} is unexpectedly small`);
});

test('knowledge chapters carry the current verification date', () => {
  for (const name of REQUIRED) assert.match(read(name), /2026-09-16/, `${name} has no current verification date`);
});

test('the physical-item rule is explicit and set bonuses stay separate', () => {
  const index = read('README.md');
  const ontology = read('00-ontology-and-model-rules.md');
  assert.match(index, /physical item is the atomic object/i);
  assert.match(index, /set|tiered/i);
  assert.match(ontology, /Armor and equipment are item-local by default/i);
  assert.match(ontology, /explicit collective bonuses/i);
  assert.match(ontology, /one active compatible reforge/i);
});

test('knowledge base never cites the closed official wiki as a current source', () => {
  for (const name of REQUIRED) {
    const text = read(name);
    const urls = [...text.matchAll(/https?:\/\/[^\s)`]+/g)].map(match => match[0]);
    assert.equal(urls.some(url => /^https?:\/\/wiki\.hypixel\.net/i.test(url)), false, `${name} cites closed wiki`);
  }
});

test('source index records maintained wiki and uncertainty policy', () => {
  const sources = read('SOURCES.md');
  assert.match(sources, /hypixelskyblock\.minecraft\.wiki/);
  assert.match(sources, /VERIFY-AS-INDEX/);
  assert.match(sources, /Unknown is not zero/i);
});

test('AI_KNOWLEDGE is the canonical detailed single-file master corpus', () => {
  const entry = readFileSync(AI_ENTRY, 'utf8');
  const largestModule = Math.max(...REQUIRED.map(name => read(name).length));
  assert.ok(entry.length > 20_000, `AI_KNOWLEDGE is too small: ${entry.length}`);
  assert.ok(entry.length > largestModule, 'AI_KNOWLEDGE must be more comprehensive than any single modular chapter');
  assert.match(entry, /canonical single-file offline knowledge source/i);
  assert.match(entry, /physical item is the atomic unit/i);
  assert.match(entry, /Green Thumb/i);
  assert.match(entry, /Helianthus/i);
  assert.match(entry, /Overbloom/i);
  assert.match(entry, /Jacob's Farming Contest/i);
  assert.match(entry, /API, NBT, lore, OCR/i);
  assert.match(entry, /Best-next-upgrade algorithm/i);
  assert.match(entry, /Unknown is not zero/i);
});
