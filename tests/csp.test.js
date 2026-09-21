import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

/**
 * `index.html` ships a strict Content Security Policy. Inline styles/scripts are
 * forbidden. Runtime scripts stay first-party and network access is limited to
 * the APIs and image hosts the application still uses.
 */
const read = name => readFileSync(new URL(`../src/${name}`, import.meta.url), 'utf8');
const RUNTIME_MODULES = ['app.js', 'enhancements.js', 'foundation.js'];
const indexHtml = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('the shipped CSP still forbids inline styles and scripts', () => {
  const csp = indexHtml.match(/Content-Security-Policy"\s+content="([^"]+)"/)?.[1];
  assert.ok(csp, 'index.html has no Content-Security-Policy meta tag');
  assert.match(csp, /script-src\s+'self'/);
  assert.match(csp, /style-src\s+'self'(;|$)/);
  assert.ok(!csp.includes("'unsafe-inline'"));
  assert.ok(!csp.includes("'unsafe-eval'"));
});

test('the removed OCR runtime has no remaining CSP privileges', () => {
  const csp = indexHtml.match(/Content-Security-Policy"\s+content="([^"]+)"/)?.[1] ?? '';
  assert.doesNotMatch(csp, /cdn\.jsdelivr\.net/);
  assert.doesNotMatch(csp, /tessdata\.projectnaptha\.com/);
  assert.match(csp, /script-src\s+'self'(;|$)/);
  assert.match(csp, /connect-src\s+'self'\s+https:\/\/api\.hypixel\.net(;|$)/);
});

test('the CSP meta tag carries no directive that a meta tag cannot apply', () => {
  const csp = indexHtml.match(/Content-Security-Policy"\s+content="([^"]+)"/)?.[1] ?? '';
  for (const directive of ['frame-ancestors', 'report-uri', 'sandbox']) {
    assert.ok(!csp.includes(directive), `"${directive}" is ignored in a <meta> CSP`);
  }
});

test('no runtime module emits a style attribute', () => {
  for (const name of RUNTIME_MODULES) {
    const offenders = [...read(name).matchAll(/\bstyle\s*=\s*["'`]/g)];
    assert.equal(offenders.length, 0, `${name} emits a style attribute, which the CSP drops`);
  }
});

test('no runtime module emits an inline event handler attribute', () => {
  for (const name of RUNTIME_MODULES) {
    const offenders = [...read(name).matchAll(/\son(?:click|change|input|submit|load|error|mouse[a-z]+|key[a-z]+)\s*=\s*["'`]/gi)];
    assert.equal(offenders.length, 0, `${name} emits an inline event handler, which the CSP drops`);
  }
});

test('no runtime module writes styles through setAttribute, which the CSP also blocks', () => {
  for (const name of RUNTIME_MODULES) {
    assert.ok(!/setAttribute\(\s*['"`]style['"`]/.test(read(name)), `${name} uses setAttribute('style', ...)`);
  }
});

test('index.html loads every runtime module and stylesheet it needs', () => {
  for (const asset of ['src/styles.css', 'src/enhancements.css', 'src/foundation.css', 'src/app.js', 'src/enhancements.js', 'src/foundation.js']) {
    assert.ok(indexHtml.includes(asset), `index.html does not reference ${asset}`);
  }
});
