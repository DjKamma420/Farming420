import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

test('armor picker scope documents the current farming progression', () => {
  const text = readFileSync(new URL('../docs/armor-picker-scope.md', import.meta.url), 'utf8');
  for (const name of ['Farmhand', 'Haymaker', 'Sprout', 'Tater', 'Cropie', 'Squash', 'Fermento', 'Helianthus']) {
    assert.match(text, new RegExp(name));
  }
  assert.match(text, /Pufferfish/);
});
