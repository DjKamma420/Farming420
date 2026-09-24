import test from 'node:test';
import assert from 'node:assert/strict';

import { normalizeSearchText, scoreSearchEntry, searchEntries } from '../src/global-search.js';

test('normalizes punctuation and accents for search text', () => {
  assert.equal(normalizeSearchText('  Pest-Fortune / Café  '), 'pest fortune cafe');
});

test('fuzzy search tolerates a one-letter typo', () => {
  const results = searchEntries([
    { id: 'shards', title: 'Attribute Shards', subtitle: 'Shards' },
    { id: 'tools', title: 'Tools', subtitle: 'Farming tools' },
  ], 'shars');

  assert.equal(results[0]?.id, 'shards');
});

test('intent priority can keep explanatory topics above raw upgrade entries', () => {
  const results = searchEntries([
    {
      id: 'upgrade-recomb',
      title: 'Recombobulator effect on tool stats',
      subtitle: 'Tool upgrade',
      keywords: ['recomb'],
    },
    {
      id: 'info-recomb',
      title: 'Recombobulator 3000',
      subtitle: 'What it does and why rarity matters',
      keywords: ['recomb', 'rarity'],
      priority: 1000,
    },
  ], 'recomb');

  assert.equal(results[0]?.id, 'info-recomb');
});

test('all query tokens must match somewhere in the entry', () => {
  const entry = {
    title: 'Perfect Peridot',
    subtitle: 'Gemstone upgrade',
    keywords: ['farming fortune', 'gem slot'],
  };
  assert.ok(Number.isFinite(scoreSearchEntry(entry, 'perfect gem')));
  assert.equal(scoreSearchEntry(entry, 'perfect mosquito'), Number.NEGATIVE_INFINITY);
});
