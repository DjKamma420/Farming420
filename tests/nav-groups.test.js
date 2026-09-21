import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

/**
 * `groupSidebar` appends its groups after everything it did not move, so a page
 * missing from GROUPS is not hidden -- it is left sitting in front of the
 * groups. That is how the rail came to open with Setups and two bare letters
 * before Dashboard.
 */
const enhancements = readFileSync(new URL('../src/enhancements.js', import.meta.url), 'utf8');
const app = readFileSync(new URL('../src/app.js', import.meta.url), 'utf8');

function navEntries() {
  const block = app.match(/const NAV = \[([\s\S]*?)\n\];/);
  assert.ok(block, 'NAV table not found in app.js');
  const pages = [...block[1].matchAll(/\[\s*'([\w-]+)'/g)].map(m => m[1]);
  const utilities = [...app.matchAll(/data-nav-id="([\w-]+)"/g)].map(m => m[1]);
  return [...pages, ...utilities];
}

function groupedSections() {
  const block = enhancements.match(/const GROUPS = \[([\s\S]*?)\n\];/);
  assert.ok(block, 'GROUPS table not found in enhancements.js');
  return [...block[1].matchAll(/\['([^']+)', \[([^\]]*)\]\]/g)].map(([, label, ids]) => [
    label,
    [...ids.matchAll(/'([\w-]+)'/g)].map(match => match[1]),
  ]);
}

function groupedPages() {
  return groupedSections().flatMap(([, pages]) => pages);
}

test('every nav page is in exactly one group', () => {
  const pages = navEntries();
  const grouped = groupedPages();
  const missing = pages.filter(page => !grouped.includes(page));
  assert.deepEqual(missing, [], `ungrouped pages sit in front of the groups: ${missing.join(', ')}`);
});

test('no group lists a page that the nav does not have', () => {
  const pages = navEntries();
  const unknown = groupedPages().filter(page => !pages.includes(page));
  assert.deepEqual(unknown, [], `grouped but not in NAV: ${unknown.join(', ')}`);
});

test('no page is listed in two groups', () => {
  const grouped = groupedPages();
  const twice = grouped.filter((page, index) => grouped.indexOf(page) !== index);
  assert.deepEqual(twice, [], `listed more than once: ${twice.join(', ')}`);
});


test('navigation follows the user workflow instead of implementation categories', () => {
  assert.deepEqual(groupedSections(), [
    ['Overview', ['dashboard']],
    ['Profile', ['crops', 'tools', 'accessories', 'setups', 'gear', 'pets', 'buffs']],
    ['Advanced', ['pests', 'chips', 'shards']],
    ['Planning', ['focus', 'planner']],
    ['Guides', ['info', 'qol']],
    ['System', ['settings']],
  ]);
});

test('groups with no remaining navigation entries are skipped', () => {
  assert.match(
    enhancements,
    /const buttons = ids[\s\S]*?\.filter\(Boolean\);[\s\S]*?if \(!buttons\.length\) continue;/,
  );
});
