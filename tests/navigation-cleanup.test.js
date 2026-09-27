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


test('top-level navigation matches the canonical Farming420 structure', () => {
  const block = app.match(/const NAV = \[([\s\S]*?)\n\];/);
  assert.ok(block, 'NAV table not found');
  const entries = [...block[1].matchAll(/\['([^']+)',\s*'([^']+)'\]/g)].map(([, id, label]) => [id, label]);
  assert.deepEqual(entries, [
    ['dashboard', 'Dashboard'],
    ['setups', 'Loadouts / Farming System'],
    ['crops', 'Garden'],
    ['buffs', 'Effects'],
    ['tools', 'Tools'],
    ['shards', 'Shards / Accessories'],
    ['planner', 'Upgrades'],
    ['qol', 'QoL'],
    ['focus', 'Focus on Next'],
    ['info', 'Info'],
  ]);
});

test('retired top-level workspaces have no render cases', () => {
  assert.doesNotMatch(app, /case ['"](?:account|accessories|gear|pets|chips|pests|guide|setup|research|coming)['"]:/);
});
