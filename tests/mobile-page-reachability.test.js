import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

/**
 * Every page in the nav must be reachable on a phone.
 *
 * "What to enter" was hidden from the mobile taskbar as not worth a permanent
 * slot. Nothing else in the app links to it, so the page became unreachable:
 * 75 interactive elements and 63 folded entries with no entry point at all,
 * and the click sweep reported it as `UNREACHABLE: page exists but no visible
 * way to open it` for however long that rule stood.
 *
 * The taskbar already scrolls horizontally -- twelve 44px slots overflow a
 * 412px phone as it is -- so the slot the rule was saving did not exist.
 */

const root = new URL('../', import.meta.url);
const read = path => readFileSync(new URL(path, root), 'utf8');

/** Every stylesheet the page loads, by name. */
function stylesheets() {
  return readdirSync(new URL('src/', root)).filter(name => name.endsWith('.css'));
}

test('no stylesheet hides a nav link for a specific page', () => {
  // A page may be de-emphasised, reordered or moved behind a scroll. It may
  // not be the one page with no way in.
  const offenders = [];
  for (const name of stylesheets()) {
    const css = read(`src/${name}`).replace(/\/\*[\s\S]*?\*\//g, '');
    const pattern = /([^{}]*nav-link\[data-page=[^{}]*)\{([^{}]*)\}/g;
    let match;
    while ((match = pattern.exec(css))) {
      if (/display:\s*none/.test(match[2])) offenders.push(`${name}: ${match[1].trim()}`);
    }
  }
  assert.deepEqual(offenders, [], `a nav link is hidden by CSS:\n${offenders.join('\n')}`);
});

test('the taskbar is allowed to scroll rather than drop entries', () => {
  // This is what makes the rule above affordable: the nav overflows and
  // scrolls itself, so a thirteenth page costs nothing but a swipe.
  assert.match(read('src/styles.css'), /\.sidebar nav\{[^}]*overflow:auto/);
  // And the taskbar rule sizes the slots without capping how many there are.
  const taskbar = read('src/mobile-taskbar.css');
  assert.match(taskbar, /\.sb-rail \.nav-link \{[^}]*flex: 0 0 44px/);
  assert.doesNotMatch(taskbar, /nav-link:nth-child\([^)]*\)\s*\{[^}]*display:\s*none/);
});

test('the reason this page had no entry point is still true', () => {
  // If something ever does link to "what to enter" from a page the taskbar
  // reaches, the hide-it rule becomes defensible again -- so record why it
  // is not defensible now, and let this fail if that changes.
  const linkers = readdirSync(new URL('src/', root))
    .filter(name => name.endsWith('.js'))
    .filter(name => /clickPage\(['"]setup['"]\)|goToPage\(['"]setup['"]\)/.test(read(`src/${name}`)));
  assert.deepEqual(linkers, [], 'something now links to setup; the taskbar rule can be revisited');
});
