import assert from 'node:assert/strict';
import test from 'node:test';

import { buildUpstreamRequest, handleRequest } from '../proxy/hypixel-proxy.js';

const UUID = '069a79f444e94726a5befca90e38aaf5';
const KEY = '11111111-2222-3333-4444-555555555555';

test('allowed endpoints are forwarded to Hypixel', () => {
  const profiles = buildUpstreamRequest(`https://proxy.test/v2/skyblock/profiles?uuid=${UUID}`);
  assert.equal(profiles.ok, true);
  assert.equal(profiles.url, `https://api.hypixel.net/v2/skyblock/profiles?uuid=${UUID}`);

  const skills = buildUpstreamRequest('https://proxy.test/v2/resources/skyblock/skills');
  assert.equal(skills.ok, true);
  assert.equal(skills.url, 'https://api.hypixel.net/v2/resources/skyblock/skills');
});

test('a dashed id is normalized before it is forwarded', () => {
  const built = buildUpstreamRequest('https://proxy.test/v2/skyblock/profiles?uuid=069A79F4-44E9-4726-A5BE-FCA90E38AAF5');
  assert.equal(built.url, `https://api.hypixel.net/v2/skyblock/profiles?uuid=${UUID}`);
});

test('the proxy is not an open relay for other Hypixel endpoints', () => {
  for (const path of ['/v2/player', '/v2/skyblock/auctions', '/', '/v2/skyblock/bazaar']) {
    const built = buildUpstreamRequest(`https://proxy.test${path}?uuid=${UUID}`);
    assert.equal(built.ok, false, `${path} must not be forwarded`);
    assert.equal(built.status, 404);
  }
});

test('extra query parameters are dropped rather than forwarded', () => {
  const built = buildUpstreamRequest(`https://proxy.test/v2/skyblock/profiles?uuid=${UUID}&key=leaked&extra=1`);
  assert.equal(built.ok, true);
  assert.ok(!built.url.includes('leaked'));
  assert.ok(!built.url.includes('extra'));
});

test('a missing or non-id parameter is rejected', () => {
  assert.deepEqual(buildUpstreamRequest('https://proxy.test/v2/skyblock/profiles'), {
    ok: false, status: 400, error: 'Missing required parameter "uuid".',
  });
  const bad = buildUpstreamRequest('https://proxy.test/v2/skyblock/garden?profile=../../etc/passwd');
  assert.equal(bad.ok, false);
  assert.match(bad.error, /must be a Hypixel id/);
});

test('a preflight request is answered with CORS headers', async () => {
  const response = await handleRequest(new Request('https://proxy.test/v2/skyblock/profiles', { method: 'OPTIONS' }), {});
  assert.equal(response.status, 204);
  assert.equal(response.headers.get('access-control-allow-origin'), '*');
});

test('non-GET methods are refused', async () => {
  const response = await handleRequest(new Request('https://proxy.test/v2/skyblock/profiles', { method: 'POST' }), {});
  assert.equal(response.status, 405);
});

test('a proxy without a configured key says so instead of calling upstream', async () => {
  const response = await handleRequest(new Request(`https://proxy.test/v2/skyblock/profiles?uuid=${UUID}`), {});
  assert.equal(response.status, 500);
  assert.match((await response.json()).cause, /no HYPIXEL_API_KEY configured/);
});

test('the server key is attached upstream and never returned to the caller', async () => {
  const seen = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    seen.push({ url, init });
    return new Response(JSON.stringify({ success: true, profiles: [] }), {
      status: 200, headers: { 'content-type': 'application/json' },
    });
  };
  try {
    const response = await handleRequest(
      new Request(`https://proxy.test/v2/skyblock/profiles?uuid=${UUID}`),
      { HYPIXEL_API_KEY: KEY, ALLOWED_ORIGIN: 'https://djkamma420.github.io' },
    );
    assert.equal(seen[0].init.headers['API-Key'], KEY);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('access-control-allow-origin'), 'https://djkamma420.github.io');
    assert.ok(!(await response.text()).includes(KEY));
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('an upstream error status is passed through unchanged', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({ success: false, cause: 'Invalid API key' }), { status: 403 });
  try {
    const response = await handleRequest(new Request(`https://proxy.test/v2/skyblock/profiles?uuid=${UUID}`), { HYPIXEL_API_KEY: KEY });
    assert.equal(response.status, 403);
    assert.equal((await response.json()).cause, 'Invalid API key');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('an unreachable upstream becomes a 502 rather than a crash', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => { throw new TypeError('connect ECONNREFUSED'); };
  try {
    const response = await handleRequest(new Request(`https://proxy.test/v2/skyblock/profiles?uuid=${UUID}`), { HYPIXEL_API_KEY: KEY });
    assert.equal(response.status, 502);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
