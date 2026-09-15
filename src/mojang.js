/**
 * Username -> UUID resolution.
 *
 * Hypixel's own `name` parameter is documented as deprecated, separately rate
 * limited, not guaranteed correct and removable at any time, so it is never
 * used here. Mojang's `api.mojang.com` sends no `Access-Control-Allow-Origin`
 * header, so a browser cannot read its response either.
 *
 * Farming420 therefore tries an ordered chain of resolvers and uses the first
 * one that returns a well-formed UUID. Official Mojang services come first; a
 * CORS-enabled community mirror is only the fallback, and every result records
 * which resolver answered so the UI can show that provenance.
 */
const USERNAME_PATTERN = /^[A-Za-z0-9_]{3,16}$/;
const UNDASHED_UUID = /^[0-9a-f]{32}$/;

export const USERNAME_RESOLVERS = Object.freeze([
  Object.freeze({
    id: 'minecraftservices',
    label: 'Mojang profile lookup',
    origin: 'https://api.minecraftservices.com',
    official: true,
    url: name => `https://api.minecraftservices.com/minecraft/profile/lookup/name/${encodeURIComponent(name)}`,
  }),
  Object.freeze({
    id: 'mojang',
    label: 'Mojang accounts API',
    origin: 'https://api.mojang.com',
    official: true,
    url: name => `https://api.mojang.com/users/profiles/minecraft/${encodeURIComponent(name)}`,
  }),
  Object.freeze({
    id: 'playerdb',
    label: 'PlayerDB (community mirror)',
    origin: 'https://playerdb.co',
    official: false,
    url: name => `https://playerdb.co/api/player/minecraft/${encodeURIComponent(name)}`,
  }),
]);

export function isValidUsername(value) {
  return USERNAME_PATTERN.test(String(value ?? '').trim());
}

/** Accepts dashed or undashed input and returns the undashed lowercase form. */
export function normalizeUuid(value) {
  const undashed = String(value ?? '').replaceAll('-', '').trim().toLowerCase();
  return UNDASHED_UUID.test(undashed) ? undashed : null;
}

/**
 * Reads a UUID out of a resolver response without assuming one exact schema.
 *
 * Different resolvers name the field differently, and this code cannot verify
 * every upstream schema, so it collects the candidate fields it knows and
 * validates the result. A response it cannot parse yields `null`, which makes
 * the caller move on to the next resolver instead of storing a wrong id.
 */
export function parseUuidLookup(payload) {
  if (!payload || typeof payload !== 'object') return null;
  const player = payload.data?.player;
  const candidates = [
    payload.id,
    payload.uuid,
    payload.uuid_dashed,
    player?.raw_id,
    player?.id,
    player?.uuid,
  ];
  for (const candidate of candidates) {
    const uuid = normalizeUuid(candidate);
    if (uuid) return uuid;
  }
  return null;
}

/** The display name a resolver reported, when it reported one. */
export function parseResolvedName(payload, fallback) {
  const player = payload?.data?.player;
  const name = payload?.name ?? payload?.username ?? player?.username ?? player?.name;
  return typeof name === 'string' && name.trim() ? name.trim() : fallback;
}

/**
 * Resolves a Minecraft username to a UUID.
 *
 * @param {string} username
 * @param {{fetchImpl?: typeof fetch, resolvers?: object[], signal?: AbortSignal}} options
 * @returns {Promise<{uuid: string, name: string, resolver: string, official: boolean, attempts: object[]}>}
 * @throws {Error} when no resolver produced a usable UUID
 */
export async function resolveUsername(username, options = {}) {
  const name = String(username ?? '').trim();
  if (!isValidUsername(name)) {
    throw new Error('Enter a Minecraft username of 3-16 characters using letters, digits or underscore.');
  }

  const fetchImpl = options.fetchImpl || globalThis.fetch;
  if (typeof fetchImpl !== 'function') throw new Error('This browser provides no fetch implementation.');
  const resolvers = options.resolvers || USERNAME_RESOLVERS;
  const attempts = [];

  for (const resolver of resolvers) {
    try {
      const response = await fetchImpl(resolver.url(name), {
        headers: { accept: 'application/json' },
        signal: options.signal,
      });
      // 204/404 is Mojang's "no such player"; that is an answer, not an outage,
      // but a mirror may still know the name, so the chain continues.
      if (response.status === 204 || response.status === 404) {
        attempts.push({ resolver: resolver.id, outcome: 'not-found' });
        continue;
      }
      if (!response.ok) {
        attempts.push({ resolver: resolver.id, outcome: `http-${response.status}` });
        continue;
      }
      const payload = await response.json();
      const uuid = parseUuidLookup(payload);
      if (!uuid) {
        attempts.push({ resolver: resolver.id, outcome: 'unparsable' });
        continue;
      }
      return {
        uuid,
        name: parseResolvedName(payload, name),
        resolver: resolver.id,
        official: Boolean(resolver.official),
        attempts,
      };
    } catch (error) {
      // A CORS rejection surfaces here as a TypeError with no useful detail.
      attempts.push({ resolver: resolver.id, outcome: `unreachable: ${error.message}` });
    }
  }

  const detail = attempts.map(attempt => `${attempt.resolver}: ${attempt.outcome}`).join('; ');
  throw new Error(
    `"${name}" could not be resolved to a UUID (${detail || 'no resolver was tried'}). `
    + 'Check the spelling, or enter the UUID directly in Settings.',
  );
}
