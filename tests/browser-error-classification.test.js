import test from 'node:test';
import assert from 'node:assert/strict';
import { marketAccessControlUrl, classifyBrowserErrors, probeExitCode } from '../scripts/browser-error-classification.mjs';

const url = 'https://sky.coflnet.com/api/bazaar/WHEAT/history?start=2026-07-04&end=2026-10-02';
const message = value => 'Fetch API cannot load ' + value + ' due to access control checks.';

test('only exact correlated WebKit market transport failures become explicit notes', () => {
  for (const text of [message(url), message(url.replace('https://', 'https: /')), 'Error: ' + message(url)]) {
    const result = classifyBrowserErrors('webkit', [text], [{ url, error: 'access control' }]);
    assert.deepEqual(result.runtimeErrors, []);
    assert.deepEqual(result.marketTransportNotes, [{ kind:'market-access-control',url,message:text,requestFailure:'access control' }]);
  }
  const auction = 'https://sky.coflnet.com/api/item/price/RAREFINDER_CHIP/history/full';
  assert.equal(marketAccessControlUrl('webkit', message(auction)), auction);
});

test('uncaught script errors and uncorrelated lookalikes remain failures', () => {
  for (const [engine, text, failures] of [
    ['webkit', 'Error: AUDIT_INJECTED_RUNTIME_ERROR', [{ url, error:'access control' }]],
    ['webkit', 'TypeError: Load failed', [{ url, error:'access control' }]],
    ['webkit', message(url), []],
    ['webkit', message(url), [{ url:url + '&other=1', error:'access control' }]],
    ['chromium', message(url), [{ url, error:'access control' }]],
    ['firefox', message(url), [{ url, error:'access control' }]],
  ]) {
    const result = classifyBrowserErrors(engine, [text], failures);
    assert.deepEqual(result.runtimeErrors, [text]);
    assert.deepEqual(result.marketTransportNotes, []);
    assert.equal(probeExitCode([{status:result.runtimeErrors.length?'FAIL':'PASS'}]), 1);
  }
});

test('local, other-owner, malformed and non-history access errors are not market notes', () => {
  for (const value of [
    'http://127.0.0.1:4173/api/bazaar/WHEAT/history',
    'https://other.invalid/api/bazaar/WHEAT/history',
    'https://sky.coflnet.com/api/bazaar/WHEAT',
    'https://sky.coflnet.com/api/items',
    'https://sky.coflnet.com.evil.invalid/api/bazaar/WHEAT/history',
    'https://user@sky.coflnet.com/api/bazaar/WHEAT/history',
    'https://sky.coflnet.com:444/api/bazaar/WHEAT/history',
    url + '#fragment',
  ]) {
    assert.equal(marketAccessControlUrl('webkit', message(value)), null);
    assert.deepEqual(classifyBrowserErrors('webkit', [message(value)], [{url:value,error:'access control'}]).runtimeErrors, [message(value)]);
  }
});

test('explicit notes cannot swallow a simultaneous runtime error or blocked probe', () => {
  const result = classifyBrowserErrors('webkit', [message(url), 'Error: AUDIT_INJECTED_RUNTIME_ERROR'], [{url,error:'access control'}]);
  assert.equal(result.marketTransportNotes.length, 1);
  assert.deepEqual(result.runtimeErrors, ['Error: AUDIT_INJECTED_RUNTIME_ERROR']);
  assert.equal(probeExitCode([{status:'NOTE'},{status:'FAIL'}]), 1);
  assert.equal(probeExitCode([{status:'PASS'},{status:'BLOCKED'}]), 1);
  assert.equal(probeExitCode([{status:'PASS'},{status:'NOTE'}]), 0);
});
