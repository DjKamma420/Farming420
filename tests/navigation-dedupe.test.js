import assert from 'node:assert/strict';
import test from 'node:test';

import {
  DUPLICATE_PAGE_TARGETS,
  canonicalPage,
  canonicalizeStoredPage,
  removeDuplicateNavigation,
} from '../src/navigation-dedupe.js';

const EXPECTED_TARGETS = {
  account: 'crops',
  accessories: 'shards',
  gear: 'setups',
  pets: 'setups',
  chips: 'shards',
  pests: 'info',
  guide: 'info',
  setup: 'info',
  research: 'info',
  coming: 'info',
};

test('legacy and duplicate routes canonicalize to the current workspaces', () => {
  assert.deepEqual(DUPLICATE_PAGE_TARGETS, EXPECTED_TARGETS);
  for (const [legacy, canonical] of Object.entries(EXPECTED_TARGETS)) {
    assert.equal(canonicalPage(legacy), canonical);
  }
  assert.equal(canonicalPage('tools'), 'tools');
});

test('stored legacy page is rewritten without changing profile data', () => {
  let raw = JSON.stringify({ page: 'accessories', profile: { name: 'A', owned: { x: true } } });
  const storage = {
    getItem: () => raw,
    setItem: (_key, value) => { raw = value; },
  };
  assert.equal(canonicalizeStoredPage({ storage, key: 'test' }), true);
  assert.deepEqual(JSON.parse(raw), { page: 'shards', profile: { name: 'A', owned: { x: true } } });
  assert.equal(canonicalizeStoredPage({ storage, key: 'test' }), false);
});

test('duplicate sidebar destinations are removed while non-nav links are repointed', () => {
  const nav = {};
  const navElements = {};
  const contentElements = {};
  for (const page of Object.keys(EXPECTED_TARGETS)) {
    navElements[page] = { removed: false, closest: selector => selector === 'nav' ? nav : null, remove() { this.removed = true; } };
    contentElements[page] = { dataset: { page }, closest: () => null };
  }
  const root = {
    querySelectorAll(selector) {
      const match = selector.match(/^\[data-page="([^"]+)"\]$/);
      if (!match) return [];
      const page = match[1];
      return navElements[page] ? [navElements[page], contentElements[page]] : [];
    },
  };

  assert.equal(removeDuplicateNavigation(root), Object.keys(EXPECTED_TARGETS).length);
  for (const [page, target] of Object.entries(EXPECTED_TARGETS)) {
    assert.equal(navElements[page].removed, true);
    assert.equal(contentElements[page].dataset.page, target);
  }
});
