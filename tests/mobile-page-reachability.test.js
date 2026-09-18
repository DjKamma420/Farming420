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

test('the mobile navigation stays fixed on the side with visible labels', () => {
  const mobile = read('src/mobile-taskbar.css');

  assert.match(mobile, /\.sidebar\.sb-rail \{[^}]*position:\s*fixed/);
  assert.match(mobile, /\.sidebar\.sb-rail \{[^}]*inset:\s*0 auto 0 0/);
  assert.match(mobile, /\.sb-rail nav \{[^}]*overflow-y:\s*auto/);
  assert.match(mobile, /\.sb-nav-label \{[^}]*display:\s*block\s*!important/);

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

test('named side rail stays compact at desktop and mobile widths', () => {
  const redesign = read('src/skyblock-redesign.css');
  const mobile = read('src/mobile-taskbar.css');

  assert.match(redesign, /width:\s*156px/);
  assert.match(redesign, /margin-left:\s*156px/);
  assert.match(redesign, /width:\s*136px/);
  assert.match(redesign, /margin-left:\s*136px/);
  assert.match(redesign, /width:\s*108px/);
  assert.match(redesign, /margin-left:\s*108px/);
  assert.match(mobile, /width:\s*108px/);
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
