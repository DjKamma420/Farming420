# Package 18 — correlated market transport diagnostics

October 5, 2026, 12:21 CEST continuation. Baseline: `353387dedf2f75aebf90b2a76e19ee4db1b9c066`, draft PR [#301](https://github.com/DjKamma420/Farming420/pull/301).

The retained [b54face failure](sweep-market-access-failure-b54face-2026-10-05.json) exits 123 on desktop-empty crops/setups/buffs. All clicks finish and the 24 Phillip cases pass; external SkyCofl history CORS and ERR_FAILED console messages make the strict Chromium sweep fail. The later unchanged-code 353387d CI passes, which does not resolve that counterexample.

The response listener cannot identify a fetch which fails before obtaining a response. Playwright documents that HTTP error responses do not trigger `requestfailed`, whereas network failures such as ERR_FAILED do: [Page requestfailed](https://playwright.dev/docs/api/class-page#page-event-request-failed). The sweep now captures failed requests separately from HTTP responses.

Only exact failed GET/fetch/ERR_FAILED requests at the existing HTTPS SkyCofl Bazaar-history or auction-history endpoints correlate to transport notes. Chromium CORS diagnostics also require the served origin and local console provenance. Resource diagnostics require the exact failed URL; all other console errors continue through the existing fatal checks. The new path never receives pageerrors. Full messages, URL, method, resource type and failure remain visible; this is handled unknown-price input, not successful external delivery. Application runtime and calculation/source data are unchanged.

The shared endpoint validator preserves the existing WebKit-only classifier's rules. New pure regressions cover both endpoints and console-event order, mismatched/missing correlation, methods/resource types, local/foreign/insecure/credentialed/malformed URLs, origin provenance and simultaneous script-like errors. Existing unknown-price/no-cache and aggregation tests remain.

Native fixtures execute the real sweep worker in three retained variants:

| Fixture | Real browser stimulus | Required result |
|---|---|---|
| failed | Known history routes use documented [`route.abort('failed')`](https://playwright.dev/docs/api/class-route#route-abort) | Exit 0; both market endpoints observed, null quotes, no cached price, full transport notes |
| cors | History responses carry an incorrect Access-Control-Allow-Origin header | Exit 0; both genuine browser CORS diagnostics observed, null quotes, no cached price |
| local | Known transport failures plus a caught failed same-origin fetch | Exit 1; local failed-resource diagnostic remains fatal alongside market notes |
| runtime | Known transport failures plus actual thrown AUDIT_INJECTED_RUNTIME_ERROR | Exit 1; uncaught error remains fatal alongside market notes |

Fixtures are opt-in audit routes. Ordinary area sweeps, overlay checks, renderer budgets and exit gates retain their previous behavior. A fixture with no observed endpoint diagnostics fails; silence cannot count as a positive result. No blanket CORS or ERR_FAILED suppression was added.

Local verification: 18 targeted tests; full npm session 89080 exit 0, 1,398 Node and 8 Python PASS; syntax, whitespace and workflow YAML/shell parsing PASS. The initial aggregation run failed with `ENOENT` creating `/tmp/farming420-gate-XXXXXX`; a writable workspace TMPDIR resolved the environment issue without editing that test. Native local-browser acceptance is not claimed.

Next: verify all automatic runs on the exact saved implementation SHA and retain their fixture/ordinary/negative evidence before closing package 18. Package 12 still requires dated current live lore; packages 14/15/17 retain their source/account blocks. Main, other PRs and the original four dirty files are preserved; no merge/deployment.
