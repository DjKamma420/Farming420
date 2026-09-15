import assert from 'node:assert/strict';
import test from 'node:test';

import {
  USERNAME_RESOLVERS,
  isValidUsername,
  normalizeUuid,
  parseResolvedName,
  parseUuidLookup,
  resolveUsername,
} from '../src/mojang.js';

const UUID = '069a79f444e94726a5befca90e38aaf5';

function fakeFetch(routes) {
  const calls = [];
  const impl = async url => {
    calls.push(url);
    const route = Object.entries(routes).find(([fragment]) => url.includes(fragment));
    if (!route) throw new TypeError('Failed to fetch');
    const [, handler] = route;
    if (typeof handler === 'function') return handler(url);
    return handler;
  };
  impl.calls = calls;
  return impl;
}

const ok = body => ({ ok: true, status: 200, json: async () => body });
const status = code => ({ ok: false, status: code, json: async () => ({}) });

test('usernames are validated against Minecraft rules', () => {
  for (const name of ['Notch', 'a_b_c', 'Player123', 'abc', 'x'.repeat(16)]) {
    assert.ok(isValidUsername(name), `${name} should be valid`);
  }
  for (const name of ['ab', 'x'.repeat(17), 'has space', 'bad-dash', 'emoji😀', '', null]) {
    assert.ok(!isValidUsername(name), `${JSON.stringify(name)} should be invalid`);
  }
});

test('UUIDs are normalized from dashed and undashed input', () => {
  assert.equal(normalizeUuid('069a79f4-44e9-4726-a5be-fca90e38aaf5'), UUID);
  assert.equal(normalizeUuid(UUID.toUpperCase()), UUID);
  assert.equal(normalizeUuid('not-a-uuid'), null);
  assert.equal(normalizeUuid(undefined), null);
});

test('a UUID is read from each resolver response shape', () => {
  assert.equal(parseUuidLookup({ id: UUID, name: 'Notch' }), UUID);
  assert.equal(parseUuidLookup({ uuid: '069a79f4-44e9-4726-a5be-fca90e38aaf5' }), UUID);
  assert.equal(parseUuidLookup({ data: { player: { raw_id: UUID } } }), UUID);
  assert.equal(parseUuidLookup({ data: { player: { id: '069a79f4-44e9-4726-a5be-fca90e38aaf5' } } }), UUID);
});

test('an unrecognised response yields null instead of a guessed UUID', () => {
  assert.equal(parseUuidLookup({ something: 'else' }), null);
  assert.equal(parseUuidLookup({ id: 'short' }), null);
  assert.equal(parseUuidLookup(null), null);
  assert.equal(parseUuidLookup('text'), null);
});

test('the resolved display name falls back to the requested name', () => {
  assert.equal(parseResolvedName({ name: 'Notch' }, 'notch'), 'Notch');
  assert.equal(parseResolvedName({ data: { player: { username: 'Notch' } } }, 'notch'), 'Notch');
  assert.equal(parseResolvedName({}, 'notch'), 'notch');
});

test('an invalid username is rejected before any request is made', async () => {
  const fetchImpl = fakeFetch({});
  await assert.rejects(() => resolveUsername('no', { fetchImpl }), /3-16 characters/);
  assert.equal(fetchImpl.calls.length, 0);
});

test('the first official resolver that answers is used', async () => {
  const fetchImpl = fakeFetch({ 'api.minecraftservices.com': ok({ id: UUID, name: 'Notch' }) });
  const result = await resolveUsername('Notch', { fetchImpl });
  assert.equal(result.uuid, UUID);
  assert.equal(result.name, 'Notch');
  assert.equal(result.resolver, 'minecraftservices');
  assert.equal(result.official, true);
  assert.equal(fetchImpl.calls.length, 1, 'later resolvers must not be called');
});

test('a CORS rejection falls through to the next resolver and is recorded', async () => {
  const fetchImpl = fakeFetch({
    // A blocked cross-origin request surfaces as a TypeError with no detail.
    'playerdb.co': ok({ data: { player: { raw_id: UUID, username: 'Notch' } } }),
  });
  const result = await resolveUsername('Notch', { fetchImpl });
  assert.equal(result.uuid, UUID);
  assert.equal(result.resolver, 'playerdb');
  assert.equal(result.official, false);
  assert.equal(result.attempts.length, 2);
  assert.ok(result.attempts.every(attempt => attempt.outcome.startsWith('unreachable')));
});

test('a 404 from one resolver still lets a later one answer', async () => {
  const fetchImpl = fakeFetch({
    'api.minecraftservices.com': { ok: false, status: 404, json: async () => ({}) },
    'api.mojang.com': ok({ id: UUID }),
  });
  const result = await resolveUsername('Notch', { fetchImpl });
  assert.equal(result.resolver, 'mojang');
  assert.deepEqual(result.attempts, [{ resolver: 'minecraftservices', outcome: 'not-found' }]);
});

test('an unparsable body is skipped rather than trusted', async () => {
  const fetchImpl = fakeFetch({
    'api.minecraftservices.com': ok({ unexpected: 'shape' }),
    'api.mojang.com': ok({ id: UUID }),
  });
  assert.equal((await resolveUsername('Notch', { fetchImpl })).resolver, 'mojang');
});

test('when every resolver fails the error names each attempt', async () => {
  const fetchImpl = fakeFetch({
    'api.minecraftservices.com': status(500),
    'api.mojang.com': status(429),
    'playerdb.co': { ok: false, status: 404, json: async () => ({}) },
  });
  await assert.rejects(
    () => resolveUsername('Ghost', { fetchImpl }),
    error => {
      assert.match(error.message, /"Ghost" could not be resolved/);
      assert.match(error.message, /minecraftservices: http-500/);
      assert.match(error.message, /mojang: http-429/);
      assert.match(error.message, /playerdb: not-found/);
      assert.match(error.message, /enter the UUID directly/);
      return true;
    },
  );
});

test('official Mojang resolvers are tried before the community mirror', () => {
  const officialCount = USERNAME_RESOLVERS.filter(entry => entry.official).length;
  assert.ok(officialCount >= 1);
  USERNAME_RESOLVERS.slice(0, officialCount).forEach(entry => assert.equal(entry.official, true));
  assert.equal(USERNAME_RESOLVERS.at(-1).official, false);
});

test('usernames are URL-encoded into every resolver URL', () => {
  for (const resolver of USERNAME_RESOLVERS) {
    assert.ok(resolver.url('a_b').startsWith(resolver.origin));
    assert.ok(!resolver.url('a b').includes(' '));
  }
});
