import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

/**
 * Every page in the nav must remain reachable on a phone.
 *
 * Mobile navigation is a collapsible left-side rail. The closed state keeps
 * only a small three-dot handle; opening it overlays the page and exposes the
 * full named list. The open list may scroll vertically, but no page may be
 * dropped to make it shorter.
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

test('the mobile navigation stays fixed and exposes named tabs when opened', () => {
  const mobile = read('src/mobile-taskbar.css');

  assert.match(mobile, /\.sidebar\.sb-rail \{[^}]*position:\s*fixed/);
  assert.match(mobile, /\.sidebar\.sb-rail \{[^}]*inset:\s*0 auto 0 0/);
  assert.match(mobile, /\.sidebar\.sb-rail\.nav-open > nav \{[^}]*overflow-y:\s*auto/);
  assert.match(mobile, /\.sidebar\.sb-rail\.nav-open \.sb-nav-label \{[^}]*display:\s*block\s*!important/);
  assert.match(mobile, /\.sidebar\.sb-rail:not\(\.nav-open\) > nav[^}]*display:\s*none\s*!important/);
  assert.match(mobile, /\.nav-toggle \{[^}]*margin:\s*0 0 6px/);

  assert.doesNotMatch(mobile, /\.sidebar\.sb-rail \{[^}]*position:\s*sticky/);
  assert.doesNotMatch(mobile, /nav-link:nth-child\([^)]*\)\s*\{[^}]*display:\s*none/);
});

test('content scroll is isolated from the fixed side navigation', () => {
  const redesign = read('src/skyblock-redesign.css');

  assert.match(redesign, /html\.skyblock-redesign,\s*html\.skyblock-redesign body \{[^}]*overflow:\s*hidden/);
  assert.match(redesign, /\.skyblock-redesign \.app-shell \{[^}]*height:\s*100dvh;[^}]*overflow:\s*hidden/);
  assert.match(redesign, /\.skyblock-redesign \.sidebar\.sb-rail \{[^}]*position:\s*fixed;[^}]*inset:\s*0 auto 0 0/);
  assert.match(redesign, /\.skyblock-redesign \.main \{[^}]*height:\s*100dvh;[^}]*overflow-y:\s*auto/);
});

test('collapsed rail reserves only the handle while the open rail overlays content', () => {
  const mobile = read('src/mobile-taskbar.css');

  assert.match(mobile, /\.sidebar\.sb-rail \{[^}]*width:\s*44px/);
  assert.match(mobile, /\.main \{[^}]*margin-left:\s*44px/);
  assert.match(mobile, /\.sidebar\.sb-rail\.nav-open \{[^}]*width:\s*144px/);
  assert.doesNotMatch(mobile, /\.main \{[^}]*margin-left:\s*144px/);

  assert.match(mobile, /@media \(max-width:\s*650px\)[\s\S]*\.sidebar\.sb-rail \{[^}]*width:\s*40px/);
  assert.match(mobile, /@media \(max-width:\s*650px\)[\s\S]*\.main \{[^}]*margin-left:\s*40px/);
  assert.match(mobile, /\.sidebar\.sb-rail\.nav-open \{[^}]*width:\s*min\(158px,\s*calc\(100vw - 14px\)\)/);
});

test('navigation CSS is cache-busted in the page shell', () => {
  const index = read('index.html');
  assert.match(index, /src\/skyblock-redesign\.css\?v=20260918-5/);
  assert.match(index, /src\/mobile-taskbar\.css\?v=20260918-5/);
});

test('the setup page keeps its own direct navigation entry', () => {
  const app = read('src/app.js');
  assert.match(app, /\['setup',\s*'What to enter'\]/);

  const linkers = readdirSync(new URL('src/', root))
    .filter(name => name.endsWith('.js'))
    .filter(name => /clickPage\(['"]setup['"]\)|goToPage\(['"]setup['"]\)/.test(read(`src/${name}`)));
  assert.deepEqual(linkers, [], 'setup gained another entry point; keep the direct nav entry unless UX is redesigned intentionally');
});
