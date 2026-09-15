# Farming420 Hypixel proxy (optional)

Farming420 runs as a plain static site on GitHub Pages and needs **no** server.
By default each user stores their own Hypixel API key in their own browser, and
that key is sent only to `api.hypixel.net`.

This proxy exists for the other case: when the key must stay on a server, which
is the architecture `AGENTS.md` prescribes. Deploy it if you want visitors to
use Farming420 without holding a key of their own.

## What it does

`hypixel-proxy.js` is a standard Web `fetch` handler. It:

- forwards only `/v2/skyblock/profiles`, `/v2/skyblock/garden` and
  `/v2/resources/skyblock/skills`
- forwards only the one parameter each of those endpoints takes, and only when
  it looks like a Hypixel id, so the proxy cannot be used as an open relay
- attaches the server-held key as the `API-Key` header
- returns the upstream JSON and status unchanged, with CORS headers

It stores nothing and logs nothing.

## Configuration

| Variable | Required | Meaning |
| --- | --- | --- |
| `HYPIXEL_API_KEY` | yes | Your key from https://developer.hypixel.net/ |
| `ALLOWED_ORIGIN` | no | Origin allowed to call the proxy. Defaults to `*`; set it to your Pages origin (for example `https://djkamma420.github.io`) to keep other sites from spending your rate limit. |

Never commit the key. Set it as a platform secret/environment variable.

## Deploying

The handler's default export is `{ fetch }`, which is the module format
Cloudflare Workers, Deno Deploy, Netlify Edge Functions and Vercel Edge
Functions all expect.

### Cloudflare Workers

```bash
npx wrangler deploy proxy/hypixel-proxy.js --name farming420-proxy --compatibility-date 2026-01-01
npx wrangler secret put HYPIXEL_API_KEY
```

### Deno Deploy

```bash
deno run --allow-net --allow-env proxy/hypixel-proxy.js
```

Deploy the same file and set `HYPIXEL_API_KEY` in the project settings.

### Netlify / Vercel Edge Functions

Place the file in the platform's functions directory (`netlify/edge-functions/`
or `api/`), keep the default export, and set `HYPIXEL_API_KEY` in the project's
environment variables.

### Node (Railway, Render, a container)

```js
import { createServer } from 'node:http';
import { handleRequest } from './hypixel-proxy.js';

createServer(async (req, res) => {
  const request = new Request(new URL(req.url, `http://${req.headers.host}`), { method: req.method });
  const response = await handleRequest(request, process.env);
  res.writeHead(response.status, Object.fromEntries(response.headers));
  res.end(await response.text());
}).listen(process.env.PORT || 8787);
```

## Pointing the app at it

Two steps, both required:

1. Add the proxy origin to the `connect-src` list in `index.html`. The page
   ships a strict Content Security Policy and a `<meta>` CSP cannot be extended
   at runtime, so a proxy origin that is not in that list is blocked by the
   browser before the request leaves.
2. Enter the proxy URL in **Settings → Hypixel access → Proxy URL**.

A proxy URL takes precedence over any key stored in the browser, and no key is
sent to the proxy: it uses its own.
