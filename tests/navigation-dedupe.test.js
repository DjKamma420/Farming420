import assert from 'node:assert/strict';
import test from 'node:test';

import {
  DUPLICATE_PAGE_TARGETS,
  canonicalPage,
  canonicalizeStoredPage,
  removeDuplicateNavigation,
} from '../src/navigation-dedupe.js';

test('legacy and duplicate routes canonicalize to their shared workspaces', () => {
  assert.deepEqual(DUPLICATE_PAGE_TARGETS, { account: 'crops', gear: 'setups', pets: 'setups', guide: 'dashboard' });
  assert.equal(canonicalPage('account'), 'crops');
  assert.equal(canonicalPage('gear'), 'setups');
  assert.equal(canonicalPage('pets'), 'setups');
  assert.equal(canonicalPage('guide'), 'dashboard');
  assert.equal(canonicalPage('tools'), 'tools');
});

test('stored legacy duplicate page is rewritten without changing profile data', () => {
  let raw = JSON.stringify({ page: 'account', profile: { name: 'A', owned: { x: true } } });
  const storage = {
    getItem: () => raw,
    setItem: (_key, value) => { raw = value; },
  };
  assert.equal(canonicalizeStoredPage({ storage, key: 'test' }), true);
  assert.deepEqual(JSON.parse(raw), { page: 'crops', profile: { name: 'A', owned: { x: true } } });
  assert.equal(canonicalizeStoredPage({ storage, key: 'test' }), false);
});

test('duplicate sidebar destinations are removed while non-nav links are repointed', () => {
  const nav = {};
  const navGear = { removed: false, closest: selector => selector === 'nav' ? nav : null, remove() { this.removed = true; } };
  const navPets = { removed: false, closest: selector => selector === 'nav' ? nav : null, remove() { this.removed = true; } };
  const navGuide = { removed: false, closest: selector => selector === 'nav' ? nav : null, remove() { this.removed = true; } };
  const gearLink = { dataset: { page: 'gear' }, closest: () => null };
  const petsLink = { dataset: { page: 'pets' }, closest: () => null };
  const guideLink = { dataset: { page: 'guide' }, closest: () => null };
  const root = {
    querySelectorAll(selector) {
      if (selector === '[data-page="gear"]') return [navGear, gearLink];
      if (selector === '[data-page="pets"]') return [navPets, petsLink];
      if (selector === '[data-page="guide"]') return [navGuide, guideLink];
      return [];
    },
  };
  assert.equal(removeDuplicateNavigation(root), 3);
  assert.equal(navGear.removed, true);
  assert.equal(navPets.removed, true);
  assert.equal(navGuide.removed, true);
  assert.equal(gearLink.dataset.page, 'setups');
  assert.equal(petsLink.dataset.page, 'setups');
  assert.equal(guideLink.dataset.page, 'dashboard');
});
