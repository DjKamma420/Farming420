import test from 'node:test';
import assert from 'node:assert/strict';
import { classifySweepTransportErrors } from '../scripts/sweep-error-classification.mjs';
import { probeExitCode } from '../scripts/browser-error-classification.mjs';

const base = 'http://127.0.0.1:4173';
const history = 'https://sky.coflnet.com/api/bazaar/FARMING_FOR_DUMMIES/history?start=2026-07-07&end=2026-10-05';
const failed = url => ({ url, method: 'GET', resourceType: 'fetch', error: 'net::ERR_FAILED' });
const resource = url => ({ text: 'Failed to load resource: net::ERR_FAILED', url });
const cors = (url, origin = base, location = base + '/?t=1') => ({
  text: `Access to fetch at '${url}' from origin '${origin}' has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present on the requested resource.`,
  url: location,
});

test('correlated Bazaar and auction transport failures retain full evidence as notes', () => {
  for (const url of [history, 'https://sky.coflnet.com/api/item/price/RAREFINDER_CHIP/history/full']) {
    const rows = [cors(url), resource(url)];
    for (const input of [rows, rows.toReversed()]) {
      const result = classifySweepTransportErrors(input, [failed(url)], base);
      assert.deepEqual(result.remainingConsoleErrors, []);
      assert.equal(result.marketTransportNotes.length, 2);
      assert.deepEqual(result.marketTransportNotes.map(n => n.message), input.map(r => r.text));
      assert.ok(result.marketTransportNotes.every(n => n.url === url && n.requestFailure === 'net::ERR_FAILED'
        && n.method === 'GET' && n.resourceType === 'fetch'));
    }
  }
});

test('missing or different request URL, method, resource type and failure remain fatal', () => {
  const rows = [cors(history), resource(history)];
  for (const failures of [[], [failed(history + '&other=1')],
    [{ ...failed(history), method: 'POST' }], [{ ...failed(history), resourceType: 'script' }],
    [{ ...failed(history), resourceType: 'image' }], [{ ...failed(history), error: 'net::ERR_ABORTED' }],
    [{ url: history }]]) {
    const result = classifySweepTransportErrors(rows, failures, base);
    assert.deepEqual(result.remainingConsoleErrors, rows);
    assert.deepEqual(result.marketTransportNotes, []);
  }
});

test('local, foreign, insecure, credentialed and non-history failures stay errors', () => {
  for (const url of [base + '/api/bazaar/WHEAT/history',
    'https://other.invalid/api/bazaar/WHEAT/history',
    'https://sky.coflnet.com.evil.invalid/api/bazaar/WHEAT/history',
    'http://sky.coflnet.com/api/bazaar/WHEAT/history',
    'https://user@sky.coflnet.com/api/bazaar/WHEAT/history',
    'https://sky.coflnet.com:444/api/bazaar/WHEAT/history',
    'https://sky.coflnet.com/api/bazaar/WHEAT', history + '#fragment', 'not a URL']) {
    const rows = [cors(url), resource(url)];
    const result = classifySweepTransportErrors(rows, [failed(url)], base);
    assert.deepEqual(result.remainingConsoleErrors, rows);
    assert.deepEqual(result.marketTransportNotes, []);
  }
});

test('CORS requires the served origin and local console provenance', () => {
  for (const row of [cors(history, 'https://foreign.invalid'),
    cors(history, base, 'https://foreign.invalid/script.js'), cors(history, base, ''),
    { ...cors(history), text: 'Error: ' + cors(history).text },
    { ...cors(history), text: cors(history).text.slice(0, 180) }]) {
    const result = classifySweepTransportErrors([row], [failed(history)], base);
    assert.deepEqual(result.remainingConsoleErrors, [row]);
    assert.deepEqual(result.marketTransportNotes, []);
  }
});

test('a simultaneous runtime-like console error keeps the sweep fatal despite notes', () => {
  const errors = [
    { text: 'Error: AUDIT_INJECTED_RUNTIME_ERROR', url: base + '/src/app.js' },
    { text: 'TypeError: Failed to fetch', url: history },
    { text: 'Market failed: ' + history, url: base },
    resource('https://other.invalid/api/bazaar/WHEAT/history'),
  ];
  const result = classifySweepTransportErrors([cors(history), resource(history), ...errors], [failed(history)], base);
  assert.equal(result.marketTransportNotes.length, 2);
  assert.deepEqual(result.remainingConsoleErrors, errors);
  assert.equal(probeExitCode([{ status: 'NOTE' }, { status: 'FAIL' }]), 1);
});
