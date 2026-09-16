import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

/**
 * `index.html` ships a strict Content Security Policy. Inline styles/scripts are
 * forbidden even though the screenshot scanner allows two explicit hosts for
 * its on-demand OCR runtime and language data.
 */
const read = name => readFileSync(new URL(`../src/${name}`, import.meta.url), 'utf8');
const RUNTIME_MODULES = ['app.js', 'enhancements.js', 'foundation.js', 'tooltip-scanner.js'];
const indexHtml = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('the shipped CSP still forbids inline styles and scripts', () => {
  const csp = indexHtml.match(/Content-Security-Policy"\s+content="([^"]+)"/)?.[1];
  assert.ok(csp, 'index.html has no Content-Security-Policy meta tag');
  assert.match(csp, /script-src\s+'self'/);
  assert.match(csp, /style-src\s+'self'(;|$)/);
  assert.ok(!csp.includes("'unsafe-inline'"));
  assert.ok(!csp.includes("'unsafe-eval'"));
});

test('OCR network access is restricted to the explicit runtime and trained-data hosts', () => {
  const csp = indexHtml.match(/Content-Security-Policy"\s+content="([^"]+)"/)?.[1] ?? '';
  assert.match(csp, /script-src[^;]*https:\/\/cdn\.jsdelivr\.net/);
  assert.match(csp, /connect-src[^;]*https:\/\/cdn\.jsdelivr\.net/);
  assert.match(csp, /connect-src[^;]*https:\/\/tessdata\.projectnaptha\.com/);
  assert.match(csp, /worker-src[^;]*blob:/);
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
