import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../src/app.js', import.meta.url), 'utf8');

test('obsolete navigation pages are removed completely', () => {
  assert.doesNotMatch(app, /What to enter|Mechanics|Coming Soon/);
  assert.doesNotMatch(app, /case ['"](?:setup|research|coming)['"]:/);
  assert.doesNotMatch(app, /function (?:setupPage|researchPage|comingPage)\(/);
});

test('stale saved page ids fall back to the dashboard', () => {
  assert.match(app, /if \(!NAV\.some\(\(\[id\]\) => id === loaded\.page\)\) loaded\.page = 'dashboard';/);
});
