import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../src/app.js', import.meta.url), 'utf8');

function dashboardSource() {
  const match = app.match(/function dashboard\(\) \{([\s\S]*?)\n\}\n\nfunction accountPage\(\)/);
  assert.ok(match, 'dashboard() source not found');
  return match[1];
}

test('dashboard is a read-only computed-stat overview', () => {
  const source = dashboardSource();

  for (const label of [
    'Effective Farming Fortune',
    'Global Farming Fortune',
    'Crop Fortune',
    'Pest Fortune',
    'Overbloom',
    'Bonus Pest Chance',
    'All crops',
  ]) {
    assert.match(source, new RegExp(label), `dashboard should expose ${label}`);
  }

  assert.match(source, /computeStatTotals\(state,/);
  assert.doesNotMatch(source, /Next upgrade|Account layer|Open upgrade planner|cropFocusCard\(\)/);
  assert.doesNotMatch(source, /data-open=|data-page=/, 'dashboard results must not contain editing/navigation actions');
});
