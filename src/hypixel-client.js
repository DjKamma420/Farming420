/**
 * Thin transport for the Hypixel Public API.
 *
 * Two modes, same call sites:
 *
 * - **Proxy mode** (`proxyUrl` set): requests go to a server-side proxy that
 *   holds the key. This is the architecture `AGENTS.md` prescribes, and no
 *   secret ever reaches the browser.
 * - **Direct mode** (`apiKey` set): the browser calls Hypixel with the user's
 *   OWN key, read from local storage. This exists so the app works as a plain
 *   static GitHub Pages site with nothing else deployed. A personal key held in
 *   the user's own browser is not the shared production key baked into a public
 *   bundle that the architecture rule forbids.
 *
 * Endpoints and their key requirements follow `docs/PROFILE_DATA_MATRIX.md`.
 */
export const HYPIXEL_API_BASE = 'https://api.hypixel.net';

/** Resource endpoints are documented as keyless and are always called directly. */
export const KEYLESS_ENDPOINTS = Object.freeze(['/v2/resources/skyblock/skills']);

function buildUrl(base, path, params) {
  const url = new URL(path.replace(/^\//, ''), base.endsWith('/') ? base : `${base}/`);
  for (const [name, value] of Object.entries(params || {})) {
    if (value !== undefined && value !== null && value !== '') url.searchParams.set(name, String(value));
  }
  return url.toString();
}

/**
 * Turns a failed Hypixel response into a message that says what to do next.
 * Hypixel reports errors both through HTTP status and through a `cause` field
 * in an otherwise-200 body, so both are handled.
 */
export function describeApiFailure(status, payload) {
  const cause = typeof payload?.cause === 'string' ? payload.cause : null;
  if (status === 400) return cause || 'Hypixel rejected the request as malformed.';
  if (status === 401 || status === 403) {
    return cause
      ? `Hypixel rejected the API key: ${cause}`
      : 'Hypixel rejected the API key. Check it in Settings, or create a new one at developer.hypixel.net.';
  }
  if (status === 404) return cause || 'Hypixel has no data for that request.';
  if (status === 422) return cause || 'Hypixel could not process that request.';
  if (status === 429) return 'Hypixel rate limit reached. Wait a moment before syncing again.';
  if (status >= 500) return `Hypixel is currently unavailable (HTTP ${status}). Try again later.`;
  if (cause) return cause;
  return `Hypixel returned HTTP ${status}.`;
}

export class HypixelApiError extends Error {
  constructor(message, { status = null, endpoint = null, cause = null } = {}) {
    super(message);
    this.name = 'HypixelApiError';
    this.status = status;
    this.endpoint = endpoint;
    this.apiCause = cause;
  }
}

/**
 * @param {{apiKey?: string, proxyUrl?: string, fetchImpl?: typeof fetch, baseUrl?: string}} options
 */
export function createHypixelClient(options = {}) {
  const apiKey = String(options.apiKey || '').trim();
  const proxyUrl = String(options.proxyUrl || '').trim();
  const baseUrl = options.baseUrl || HYPIXEL_API_BASE;
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  if (typeof fetchImpl !== 'function') throw new Error('This browser provides no fetch implementation.');

  const mode = proxyUrl ? 'proxy' : (apiKey ? 'direct' : 'none');

  async function request(path, params, { keyless = false } = {}) {
    if (!keyless && mode === 'none') {
      throw new HypixelApiError(
        'No Hypixel access is configured. Add your own API key, or a proxy URL, in Settings.',
        { endpoint: path },
      );
    }

    const useProxy = !keyless && mode === 'proxy';
    const url = buildUrl(useProxy ? proxyUrl : baseUrl, path, params);
    const headers = { accept: 'application/json' };
    // The key is only ever sent to Hypixel itself, never to the proxy: in proxy
    // mode the server holds its own key.
    if (!keyless && mode === 'direct') headers['API-Key'] = apiKey;

    let response;
    try {
      response = await fetchImpl(url, { headers, signal: options.signal });
    } catch (error) {
      // A CSP `connect-src` violation also lands here as an opaque TypeError,
      // and a proxy origin cannot be in the shipped allow-list, so say so.
      const hint = useProxy
        ? ' Deploying a proxy also requires adding its origin to the connect-src list in index.html.'
        : '';
      throw new HypixelApiError(
        `Could not reach ${useProxy ? 'the configured proxy' : 'the Hypixel API'}: ${error.message}.${hint}`,
        { endpoint: path },
      );
    }

    let payload = null;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }

    if (!response.ok || payload?.success === false) {
      throw new HypixelApiError(describeApiFailure(response.status, payload), {
        status: response.status,
        endpoint: path,
        cause: payload?.cause ?? null,
      });
    }
    return payload;
  }

  return {
    mode,
    /** All SkyBlock profiles for a player, including which one is selected. */
    fetchProfiles: uuid => request('/v2/skyblock/profiles', { uuid }),
    /** Garden state for one profile id (not the player uuid). */
    fetchGarden: profileId => request('/v2/skyblock/garden', { profile: profileId }),
    /** Keyless: the official skill level table used to derive the Farming level. */
    fetchSkillResources: () => request('/v2/resources/skyblock/skills', {}, { keyless: true }),
  };
}
