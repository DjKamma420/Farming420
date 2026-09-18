import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

/**
 * Every page in the nav must remain reachable on a phone.
 *
 * Mobile navigation is a named left-side rail. It may scroll vertically, but
 * no page may be hidden to make the rail shorter. Keeping the text labels
 * visible is deliberate: several SkyBlock item icons are visually similar and
 * the label is the primary orientation cue.
 */

const root = new URL('../', import.meta.url);
const read = path => readFileSync(new URL(path, root), 'utf8');

/** Every stylesheet the page loads, by name. */
function stylesheets() {
  return readdirSync(new URL('src/', root)).filter(name => name.endsWith('.css'));
}

test('no stylesheet hides a nav link for a specific page', () => {
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

test('the mobile navigation stays on the side with visible labels', () => {
  const mobile = read('src/mobile-taskbar.css');

  assert.match(mobile, /\.sidebar\.sb-rail \{[^}]*position:\s*sticky/);
  assert.match(mobile, /\.sidebar\.sb-rail \{[^}]*bottom:\s*auto/);
  assert.match(mobile, /\.sb-rail nav \{[^}]*overflow-y:\s*auto/);
  assert.match(mobile, /\.sb-nav-label \{[^}]*display:\s*block\s*!important/);

  assert.doesNotMatch(mobile, /\.sidebar\.sb-rail \{[^}]*position:\s*fixed/);
  assert.doesNotMatch(mobile, /\.sidebar\.sb-rail \{[^}]*bottom:\s*0/);
  assert.doesNotMatch(mobile, /nav-link:nth-child\([^)]*\)\s*\{[^}]*display:\s*none/);
});

test('content scroll is isolated from the side navigation', () => {
  const redesign = read('src/skyblock-redesign.css');

  assert.match(redesign, /\.skyblock-redesign body \{[^}]*height:\s*100dvh;[^}]*overflow:\s*hidden/);
  assert.match(redesign, /\.skyblock-redesign \.app-shell \{[^}]*height:\s*100dvh;[^}]*overflow:\s*hidden/);
  assert.match(redesign, /\.skyblock-redesign \.main \{[^}]*height:\s*100dvh;[^}]*overflow-y:\s*auto/);
  assert.match(redesign, /\.skyblock-redesign \.sidebar\.sb-rail \{[^}]*height:\s*100dvh;[^}]*overflow:\s*hidden/);
});

test('named side rail stays compact at desktop and mobile widths', () => {
  const redesign = read('src/skyblock-redesign.css');
  const mobile = read('src/mobile-taskbar.css');

  assert.match(redesign, /grid-template-columns:\s*176px minmax\(0, 1fr\)/);
  assert.match(redesign, /grid-template-columns:\s*152px minmax\(0, 1fr\)/);
  assert.match(redesign, /grid-template-columns:\s*124px minmax\(0, 1fr\)/);
  assert.match(mobile, /width:\s*124px/);
});

test('the setup page keeps its own direct navigation entry', () => {
  const app = read('src/app.js');
  assert.match(app, /\['setup',\s*'What to enter'\]/);

  const linkers = readdirSync(new URL('src/', root))
    .filter(name => name.endsWith('.js'))
    .filter(name => /clickPage\(['"]setup['"]\)|goToPage\(['"]setup['"]\)/.test(read(`src/${name}`)));
  assert.deepEqual(linkers, [], 'setup gained another entry point; keep the direct nav entry unless UX is redesigned intentionally');
});
