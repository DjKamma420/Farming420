/**
 * Optional Farming420 Hypixel proxy.
 *
 * `AGENTS.md` prescribes a server-side proxy so a Hypixel API key is never
 * embedded in client code. Farming420 also works without one, using the
 * visitor's own key from their browser, so this proxy is the deployment for
 * anyone who wants the key to stay on a server: put its URL into
 * Settings -> Hypixel access -> Proxy URL and the browser stops using a key.
 *
 * This is a standard Web `fetch` handler, so it runs unmodified on Cloudflare
 * Workers, Deno Deploy, Netlify Edge Functions and Vercel Edge Functions. See
 * `proxy/README.md` for a Node adapter and per-platform deployment steps.
 *
 * It deliberately does very little: allow-list the endpoints Farming420 needs,
 * forward only the parameters those endpoints take, attach the server-held key,
 * and return the upstream JSON with CORS headers.
 */

/** Only these paths are forwarded, with only these query parameters. */
const ALLOWED_ENDPOINTS = new Map([
  ['/v2/skyblock/profiles', ['uuid']],
  ['/v2/skyblock/garden', ['profile']],
  ['/v2/resources/skyblock/skills', []],
]);

const UUID_PATTERN = /^[0-9a-f]{32}$/i;
const UPSTREAM = 'https://api.hypixel.net';

function corsHeaders(allowOrigin) {
  return {
    'access-control-allow-origin': allowOrigin,
    'access-control-allow-methods': 'GET, OPTIONS',
    'access-control-allow-headers': 'accept',
    'access-control-max-age': '86400',
  };
}

function json(body, status, allowOrigin) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', ...corsHeaders(allowOrigin) },
  });
}

/**
 * Validates an incoming request and builds the upstream URL.
 * Exported so the behaviour can be tested without a network or a key.
 *
 * @returns {{ok: true, url: string} | {ok: false, status: number, error: string}}
 */
export function buildUpstreamRequest(requestUrl) {
  let url;
  try {
    url = new URL(requestUrl);
  } catch {
    return { ok: false, status: 400, error: 'Malformed request URL.' };
  }

  const allowedParams = ALLOWED_ENDPOINTS.get(url.pathname);
  if (!allowedParams) {
    return { ok: false, status: 404, error: `This proxy does not forward ${url.pathname}.` };
  }

  const upstream = new URL(url.pathname, UPSTREAM);
  for (const param of allowedParams) {
    const value = url.searchParams.get(param);
    if (!value) return { ok: false, status: 400, error: `Missing required parameter "${param}".` };
    // Both allowed parameters are Hypixel ids; rejecting anything else keeps
    // this from being turned into a general-purpose open relay.
    if (!UUID_PATTERN.test(value.replaceAll('-', ''))) {
      return { ok: false, status: 400, error: `Parameter "${param}" must be a Hypixel id.` };
    }
    upstream.searchParams.set(param, value.replaceAll('-', '').toLowerCase());
  }
  return { ok: true, url: upstream.toString() };
}

/**
 * @param {Request} request
 * @param {{HYPIXEL_API_KEY?: string, ALLOWED_ORIGIN?: string}} env
 */
export async function handleRequest(request, env = {}) {
  const allowOrigin = env.ALLOWED_ORIGIN || '*';

  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(allowOrigin) });
  if (request.method !== 'GET') return json({ success: false, cause: 'Only GET is supported.' }, 405, allowOrigin);

  const built = buildUpstreamRequest(request.url);
  if (!built.ok) return json({ success: false, cause: built.error }, built.status, allowOrigin);

  const apiKey = env.HYPIXEL_API_KEY;
  if (!apiKey) {
    return json({ success: false, cause: 'The proxy has no HYPIXEL_API_KEY configured.' }, 500, allowOrigin);
  }

  let upstream;
  try {
    upstream = await fetch(built.url, { headers: { 'API-Key': apiKey, accept: 'application/json' } });
  } catch (error) {
    return json({ success: false, cause: `Upstream request failed: ${error.message}` }, 502, allowOrigin);
  }

  const body = await upstream.text();
  return new Response(body, {
    status: upstream.status,
    headers: {
      'content-type': upstream.headers.get('content-type') || 'application/json; charset=utf-8',
      // Short shared cache: enough to absorb repeated syncs without serving
      // stale profile data.
      'cache-control': 'public, max-age=30',
      ...corsHeaders(allowOrigin),
    },
  });
}

export default { fetch: handleRequest };
