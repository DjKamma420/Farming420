import assert from 'node:assert/strict';
import test from 'node:test';

import { scopeIncludesCrop, scopeLabel } from '../src/scopes.js';

test('Any scope applies to every crop', () => {
  assert.equal(scopeIncludesCrop('Any', 'Wheat'), true);
  assert.equal(scopeIncludesCrop('Any', 'Wild Rose'), true);
});

test('single crop scope only applies to that crop', () => {
  assert.equal(scopeIncludesCrop('Cocoa Beans', 'Cocoa Beans'), true);
  assert.equal(scopeIncludesCrop('Cocoa Beans', 'Wheat'), false);
});

test('multi-crop scope applies only to listed crops', () => {
  const scope = ['Wheat', 'Carrot', 'Nether Wart'];
  assert.equal(scopeIncludesCrop(scope, 'Wheat'), true);
  assert.equal(scopeIncludesCrop(scope, 'Nether Wart'), true);
  assert.equal(scopeIncludesCrop(scope, 'Sunflower'), false);
});

test('scope labels are readable and deterministic', () => {
  assert.equal(scopeLabel('Any'), 'Any');
  assert.equal(scopeLabel(['Wheat', 'Carrot']), 'Wheat, Carrot');
  assert.equal(scopeLabel(null), 'Unknown');
});
