import assert from 'node:assert/strict';
import test from 'node:test';

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

test('proxy mode targets the proxy and never sends the key', async () => {
  const fetchImpl = recordingFetch(ok({ success: true, profiles: [] }));
  const client = createHypixelClient({ apiKey: KEY, proxyUrl: 'https://proxy.example.dev', fetchImpl });
  assert.equal(client.mode, 'proxy', 'a proxy URL takes precedence over a stored key');
  await client.fetchProfiles(UUID);
  const call = fetchImpl.calls[0];
  assert.ok(call.url.startsWith('https://proxy.example.dev/v2/skyblock/profiles?'));
  assert.equal(call.init.headers['API-Key'], undefined);
});

test('the keyless resource call bypasses the proxy', async () => {
  const fetchImpl = recordingFetch(ok({ success: true }));
  await createHypixelClient({ proxyUrl: 'https://proxy.example.dev', fetchImpl }).fetchSkillResources();
  assert.ok(fetchImpl.calls[0].url.startsWith('https://api.hypixel.net/'));
});

test('the garden endpoint is addressed by profile id, not player uuid', async () => {
  const fetchImpl = recordingFetch(ok({ success: true, garden: {} }));
  await createHypixelClient({ apiKey: KEY, fetchImpl }).fetchGarden('abc123');
  assert.ok(fetchImpl.calls[0].url.includes('profile=abc123'));
  assert.ok(!fetchImpl.calls[0].url.includes('uuid='));
});

test('a proxy URL with a path prefix is preserved', async () => {
  const fetchImpl = recordingFetch(ok({ success: true }));
  await createHypixelClient({ proxyUrl: 'https://proxy.example.dev/api/', fetchImpl }).fetchProfiles(UUID);
  assert.ok(fetchImpl.calls[0].url.startsWith('https://proxy.example.dev/api/v2/skyblock/profiles'));
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

test('a network failure says which side could not be reached', async () => {
  const failing = async () => { throw new TypeError('Failed to fetch'); };
  await assert.rejects(
    () => createHypixelClient({ apiKey: KEY, fetchImpl: failing }).fetchProfiles(UUID),
    /Could not reach the Hypixel API/,
  );
  await assert.rejects(
    () => createHypixelClient({ proxyUrl: 'https://p.example.dev', fetchImpl: failing }).fetchProfiles(UUID),
    /Could not reach the configured proxy/,
  );
});

test('a non-JSON error body still produces a status-based message', async () => {
  const fetchImpl = recordingFetch({ ok: false, status: 502, json: async () => { throw new Error('not json'); } });
  await assert.rejects(() => createHypixelClient({ apiKey: KEY, fetchImpl }).fetchProfiles(UUID), /unavailable/i);
});

test('a proxy that cannot be reached points at the CSP allow-list', async () => {
  const failing = async () => { throw new TypeError('Failed to fetch'); };
  await assert.rejects(
    () => createHypixelClient({ proxyUrl: 'https://p.example.dev', fetchImpl: failing }).fetchProfiles(UUID),
    /connect-src list in index.html/,
  );
});
