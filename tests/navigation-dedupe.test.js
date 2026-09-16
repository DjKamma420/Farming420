import assert from 'node:assert/strict';
import test from 'node:test';

import {
  DUPLICATE_PAGE_TARGETS,
  canonicalPage,
  canonicalizeStoredPage,
  removeDuplicateNavigation,
} from '../src/navigation-dedupe.js';

test('duplicate gear and pet routes canonicalize to setups', () => {
  assert.deepEqual(DUPLICATE_PAGE_TARGETS, { gear: 'setups', pets: 'setups' });
  assert.equal(canonicalPage('gear'), 'setups');
  assert.equal(canonicalPage('pets'), 'setups');
  assert.equal(canonicalPage('tools'), 'tools');
});

test('stored legacy duplicate page is rewritten without changing profile data', () => {
  let raw = JSON.stringify({ page: 'gear', profile: { name: 'A', owned: { x: true } } });
  const storage = {
    getItem: () => raw,
    setItem: (_key, value) => { raw = value; },
  };
  assert.equal(canonicalizeStoredPage({ storage, key: 'test' }), true);
  assert.deepEqual(JSON.parse(raw), { page: 'setups', profile: { name: 'A', owned: { x: true } } });
  assert.equal(canonicalizeStoredPage({ storage, key: 'test' }), false);
});

test('duplicate sidebar destinations are removed while non-nav links are repointed', () => {
  const navGear = { removed: false, remove() { this.removed = true; } };
  const navPets = { removed: false, remove() { this.removed = true; } };
  const gearLink = { dataset: { page: 'gear' } };
  const petsLink = { dataset: { page: 'pets' } };
  const root = {
    querySelectorAll(selector) {
      if (selector === 'nav [data-page="gear"]') return [navGear];
      if (selector === 'nav [data-page="pets"]') return [navPets];
      if (selector === '[data-page="gear"]:not(nav [data-page="gear"])') return [gearLink];
      if (selector === '[data-page="pets"]:not(nav [data-page="pets"])') return [petsLink];
      return [];
    },
  };
  assert.equal(removeDuplicateNavigation(root), 2);
  assert.equal(navGear.removed, true);
  assert.equal(navPets.removed, true);
  assert.equal(gearLink.dataset.page, 'setups');
  assert.equal(petsLink.dataset.page, 'setups');
});
