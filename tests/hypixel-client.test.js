import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

import { HypixelApiError, createHypixelClient, describeApiFailure } from '../src/hypixel-client.js';

const KEY = '11111111-2222-3333-4444-555555555555';
const UUID = '069a79f444e94726a5befca90e38aaf5';

function recordingFetch(response) {
  const calls = [];
  const impl = async (url, init) => {
    calls.push({ url, init });
    return typeof response === 'function' ? response(url) : response;
  };
  impl.calls = calls;
  return impl;
}

const ok = body => ({ ok: true, status: 200, json: async () => body, headers: new Map() });

test('without a key or a proxy the client refuses keyed calls with advice', async () => {
  const client = createHypixelClient({ fetchImpl: recordingFetch(ok({})) });
  assert.equal(client.mode, 'none');
  await assert.rejects(() => client.fetchProfiles(UUID), /No Hypixel access is configured/);
});

test('the keyless resource endpoint works without any credential', async () => {
  const fetchImpl = recordingFetch(ok({ success: true, skills: {} }));
  const client = createHypixelClient({ fetchImpl });
  await client.fetchSkillResources();
  assert.equal(fetchImpl.calls.length, 1);
  assert.match(fetchImpl.calls[0].url, /\/v2\/resources\/skyblock\/skills$/);
  assert.equal(fetchImpl.calls[0].init.headers['API-Key'], undefined);
});

test('Bazaar and item resources are keyless live-price inputs', async () => {
  const fetchImpl = recordingFetch(url => ok(url.includes('/bazaar')
    ? { success: true, lastUpdated: 1, products: {} }
    : { success: true, lastUpdated: 1, items: [] }));
  const client = createHypixelClient({ fetchImpl });
  await client.fetchBazaar();
  await client.fetchItemResources();
  assert.equal(fetchImpl.calls.length, 2);
  assert.match(fetchImpl.calls[0].url, /\/v2\/skyblock\/bazaar$/);
  assert.match(fetchImpl.calls[1].url, /\/v2\/resources\/skyblock\/items$/);
  assert.equal(fetchImpl.calls[0].init.headers['API-Key'], undefined);
  assert.equal(fetchImpl.calls[1].init.headers['API-Key'], undefined);
});

test('direct mode sends the key as an API-Key header to Hypixel', async () => {
  const fetchImpl = recordingFetch(ok({ success: true, profiles: [] }));
  const client = createHypixelClient({ apiKey: KEY, fetchImpl });
  assert.equal(client.mode, 'direct');
  await client.fetchProfiles(UUID);
  const call = fetchImpl.calls[0];
  assert.equal(call.init.headers['API-Key'], KEY);
  assert.ok(call.url.startsWith('https://api.hypixel.net/v2/skyblock/profiles?'));
  assert.ok(call.url.includes(`uuid=${UUID}`));
});

test('the garden endpoint is addressed by profile id, not player uuid', async () => {
  const fetchImpl = recordingFetch(ok({ success: true, garden: {} }));
  await createHypixelClient({ apiKey: KEY, fetchImpl }).fetchGarden('abc123');
  assert.ok(fetchImpl.calls[0].url.includes('profile=abc123'));
  assert.ok(!fetchImpl.calls[0].url.includes('uuid='));
});

test('every HTTP failure becomes an actionable message', () => {
  assert.match(describeApiFailure(403, null), /Check it in Settings/);
  assert.match(describeApiFailure(403, { cause: 'Invalid API key' }), /Invalid API key/);
  assert.match(describeApiFailure(429, null), /rate limit/i);
  assert.match(describeApiFailure(503, null), /unavailable/i);
  assert.match(describeApiFailure(400, { cause: 'Malformed UUID' }), /Malformed UUID/);
  assert.match(describeApiFailure(418, null), /HTTP 418/);
});

test('a 200 response carrying success:false is still treated as a failure', async () => {
  const fetchImpl = recordingFetch({ ok: true, status: 200, json: async () => ({ success: false, cause: 'Invalid API key' }) });
  await assert.rejects(
    () => createHypixelClient({ apiKey: KEY, fetchImpl }).fetchProfiles(UUID),
    error => {
      assert.ok(error instanceof HypixelApiError);
      assert.equal(error.apiCause, 'Invalid API key');
      assert.equal(error.endpoint, '/v2/skyblock/profiles');
      return true;
    },
  );
});

test('a network failure names Hypixel as the side that could not be reached', async () => {
  const failing = async () => { throw new TypeError('Failed to fetch'); };
  await assert.rejects(
    () => createHypixelClient({ apiKey: KEY, fetchImpl: failing }).fetchProfiles(UUID),
    /Could not reach the Hypixel API/,
  );
});

test('a key is the only way to configure access', () => {
  // The proxy URL was removed: it could not work without hand-editing the
  // shipped connect-src list, so it was a setting nobody could actually use.
  assert.equal(createHypixelClient({ apiKey: KEY, fetchImpl: async () => ok({}) }).mode, 'direct');
  assert.equal(createHypixelClient({ fetchImpl: async () => ok({}) }).mode, 'none');
  const source = readFileSync(new URL('../src/hypixel-client.js', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /options\.proxyUrl/);
});

test('a non-JSON error body still produces a status-based message', async () => {
  const fetchImpl = recordingFetch({ ok: false, status: 502, json: async () => { throw new Error('not json'); } });
  await assert.rejects(() => createHypixelClient({ apiKey: KEY, fetchImpl }).fetchProfiles(UUID), /unavailable/i);
});


test('Settings offers no proxy URL and no manual JSON import', () => {
  // Both were removed on request. The proxy could not work without hand-editing
  // the shipped connect-src list, and the raw-JSON import duplicated what the
  // key-based sync already does.
  const foundation = readFileSync(new URL('../src/foundation.js', import.meta.url), 'utf8');
  assert.doesNotMatch(foundation, /data-proxy-url/);
  assert.doesNotMatch(foundation, /data-profile-json|data-garden-json/);
  assert.doesNotMatch(foundation, /Manual import/);
  assert.doesNotMatch(foundation, /proxyUrl/);
  // The key stays the one and only way in.
  assert.match(foundation, /data-api-key/);
  assert.match(foundation, /data-player-uuid/);
});
