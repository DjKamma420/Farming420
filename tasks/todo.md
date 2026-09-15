# Farming420 — Foundation gap closure and current work

This file records the concrete architecture/correctness gaps found during repository review and the work completed against them. It is intentionally kept in the repository so another development chat can resume from the actual code state instead of reconstructing context from conversation history.

## Foundation gaps found and closed

| # | Gap | Status |
|---|-----|--------|
| 1 | No tests existed | Closed — dependency-free Node test suite is in CI |
| 2 | No versioned migration layer | Closed — ordered migrations in `src/migrations.js` |
| 3 | Old backup restore did not migrate | Closed — validated backup restore migrates first |
| 4 | Sidebar import/export bypassed backup contract | Closed — unified versioned backup contract |
| 5 | Settings unreachable on mobile | Closed — Settings entry lives in the top bar |
| 6 | Hypixel adapters mixed parsing and storage | Closed — pure extractors plus sync wrappers |
| 7 | CI checked only part of the runtime | Closed — syntax, required files, SW cache completeness and tests |
| 8 | Metadata/version drift | Closed — config/package/service worker versions aligned |
| 9 | Raw API field names would leak into future calculators | Closed — normalized profile snapshot boundary |
| 10 | Profile item data still required manual entry | Partially closed — generic NBT item import implemented; setup interpretation still pending |

## Persistence and update safety

- [x] Schema 1 -> 2: move crop and physical-tool progress into their proper scoped buckets
- [x] Schema 2 -> 3: add persistent `profile.normalizedSnapshot` without inventing imported data
- [x] Idempotent migration tests
- [x] Old backup migration tests
- [x] Refuse newer-schema backups/state instead of overwriting them
- [x] One versioned backup format for every UI backup/restore surface
- [x] Coherent versioned service-worker cache
- [x] Service-worker cache completeness check in CI
- [x] GitHub Pages deployment from `main`

## Hypixel profile automation

### Implemented

- [x] raw `/v2/skyblock/profile` and `/v2/skyblock/profiles` parsing
- [x] raw `/v2/skyblock/garden` parsing
- [x] Farming XP import
- [x] Farming level derivation from the official skill resource table
- [x] profile identity/name/game mode/selected state
- [x] Community Upgrade raw states
- [x] Garden XP, crop upgrades, unlocked plots, visitor metadata, collected resources and composter data
- [x] current `pets_data.pets` parsing plus compatibility with older direct pet arrays
- [x] missing Skills/Pets/Inventory data represented as hidden/unknown, never fabricated zero ownership
- [x] one persistent provenance-bearing normalized snapshot shared by Profile and Garden imports

### Item/NBT automation implemented

Hypixel item blobs are Base64-encoded, gzip-compressed NBT. Farming420 now decodes that format directly without a production dependency.

- [x] dependency-free NBT parser
- [x] Base64 + gzip decoding
- [x] main inventory
- [x] armor
- [x] equipment
- [x] Ender Chest
- [x] Personal Vault
- [x] backpacks
- [x] talisman bag
- [x] saved armor loadout sets
- [x] saved equipment loadout sets
- [x] UUID de-duplication while retaining all observed item locations
- [x] generic SkyBlock item ID and UUID
- [x] generic enchantment map — future enchant names are not discarded
- [x] reforge (`modifier`)
- [x] gemstones
- [x] attributes
- [x] Farming for Dummies count
- [x] recombobulation state
- [x] Cultivating counter
- [x] Overclocker level
- [x] item tier
- [x] corrupt-container isolation: one bad container does not discard all other decoded items

The item decoder stores raw facts only. It deliberately does not calculate Fortune/profit from an enchant/reforge/gem; those mechanics belong in verified game data.

## Current correctness gaps

### 1. Verify the game-data layer

**Highest priority.** `src/data.js` contains researched mechanics and source URLs, but the entries do not yet carry an honest per-entry `lastVerified` date. Do not mass-fill dates.

Required process:

1. group entries by source/mechanic
2. open the current primary/strongest source
3. verify the exact number/condition/scope against the current game version
4. add `lastVerified` only after verification
5. downgrade uncertain entries to `VERIFY` or remove planner weight rather than guessing
6. add/update tests that require active planner mechanics to have `lastVerified`

### 2. Build farming setup candidates from normalized facts

The profile snapshot can now see raw items and pets. It still needs a pure setup layer that understands mutually exclusive choices without double counting:

- normal crop farming setup
- pest farming/vacuum setup
- Jacob Contest setup
- budget/progression setup
- endgame/max-profit setup
- separate armor/equipment loadout sets
- one active pet + one pet item per candidate
- progression path such as Elephant/Mooshroom Cow/Hedgehog/Rose Dragon according to verified mechanics and use case

Do **not** implement those choices until each mechanic/value used by the setup evaluator is sourced and current.

### 3. Live profile proxy

Raw JSON import is safe but inconvenient. Production live sync needs a small server-side/serverless proxy so the Hypixel API key is never embedded in GitHub Pages.

### 4. Market data and valuation

Still required:

- Bazaar sell routes and timestamps
- NPC prices where appropriate
- auction-derived values for non-Bazaar items
- confidence/liquidity
- current setup replacement/liquidation value
- upgrade acquisition cost and recoverable resale value kept separate

### 5. Profit engine

Still required after mechanics verification:

- real sustained BPS model rather than an unexplained hard-coded 19.5
- crop base drops and crop-specific mechanics
- Farming Fortune and Crop Fortune application order
- RNG-drop expected value
- pest spawn/drop expected value and pest downtime
- recurring spray/consumable costs
- contest rewards/value and progression effects
- before/after setup comparison
- coins/hour, marginal coins/hour, payback, active time and passive wait time

## Browser/CSP notes

`index.html` intentionally forbids inline scripts/styles. Runtime-generated markup must not rely on inline `style` or inline `on*` handlers.

Two bugs already found by real-browser verification and now tested:

- progress bar inline widths were blocked by CSP; widths now use CSSOM
- drawer inline click handlers were blocked; backdrop handling is now event-target based

## Current release state

- App version: `0.7.0`
- Local data schema: `3`
- Pages URL: `https://djkamma420.github.io/Farming420/`
- CI: syntax checks, required-file checks, service-worker completeness and full test suite

## Next development sequence

1. **Current-mechanics verification pass for `src/data.js` with real `lastVerified` values.**
2. Build pure farming setup candidate generation from normalized items/pets.
3. Add server-side live-profile proxy.
4. Add market data/valuation.
5. Implement the tested profit engine.
6. Build prerequisite-aware next-action recommendations.
7. Add advanced pest/contest/RNG strategies.

---

# Live profile sync from a username

Closes item 3 of the next development sequence ("Live profile proxy"). The
merged work already normalized raw JSON payloads; what was missing was the live
path that produces those payloads.

## What was built

| File | Purpose |
| --- | --- |
| `src/mojang.js` | Username -> UUID through an ordered resolver chain |
| `src/hypixel-client.js` | Hypixel transport, direct-key and proxy modes behind one interface |
| `src/credentials.js` | API key storage, deliberately outside the app state |
| `src/live-sync.js` | Orchestration: username -> profiles -> garden -> normalizers |
| `proxy/hypixel-proxy.js` | Optional server-side proxy (portable `fetch` handler) |
| `proxy/README.md` | Deployment for Workers / Deno / Netlify / Vercel / Node |

Settings gained a Live sync section (username, profile picker, Sync now, last
sync summary, per-sync warnings), a Hypixel access section (own key or proxy
URL) and a Manual import section that keeps the existing keyless workflows.

## Decisions worth recording

- **Hypixel's `name` parameter is never used.** It is documented as deprecated,
  separately rate limited and not guaranteed correct.
- **`api.mojang.com` sends no CORS headers**, so a static site cannot resolve
  usernames through it alone. The resolver chain tries official Mojang services
  first and falls back to a CORS-enabled community mirror, warns when the mirror
  answered, and skips any response it cannot parse into a valid UUID.
- **The API key never touches the app state.** `src/backup.js` serializes the
  whole state into a downloadable file; a key stored there would travel inside
  every backup. It lives under its own storage entry, and a test asserts it
  cannot appear in an exported backup.
- **A personal key in the user's own browser is not the forbidden case.**
  `AGENTS.md` forbids embedding a shared production key in client code. The
  proxy remains available for anyone who wants the key server-side.
- **Failure policy is explicit**: profiles failing aborts the sync, Garden
  failing keeps the profile data with a warning, and a missing skill table
  leaves the Farming level `null` rather than guessed.

## Verification

- `npm test`: 141 tests (up from 83), covering the resolver chain and its
  fallbacks, both transport modes, every Hypixel error shape, key isolation
  from backups, the full sync orchestration and the proxy's allow-list.
- Real browser, Hypixel and Mojang stubbed at the network layer: entering a
  username and pressing Sync fills UUID, profile name, Farming XP 400 -> level 3
  (DERIVED), three crop upgrades, four plots, Garden XP, visitor counts and the
  pet list; the wheat crop card shows upgrade level 9; the profile picker lists
  both profiles; the key stays out of the stored state and is sent only to
  `api.hypixel.net`; no console errors; usable at 390px width.
- Error paths verified in the browser: unconfigured access, invalid key format,
  too-short username, unresolvable username, a Hypixel 403 and an unreachable
  proxy each produce a specific, actionable message.

## Bugs found and fixed while verifying

1. Sync resolved the username **before** checking that any access was
   configured, so an unconfigured user got "could not be resolved" instead of
   "no key configured", after spending three resolver requests.
2. A user-configured proxy origin is blocked by the page CSP, because a `<meta>`
   CSP cannot be extended at runtime. The error now names the required
   `connect-src` edit, and Settings and `proxy/README.md` say it up front.
3. The sync success message was wiped by the re-render that followed it.
4. Pre-existing, from the parallel work on `main`: `src/scopes.js` shipped
   without being listed in the service worker cache, which would have let an
   update mix old and new files. `scripts/check-sw-manifest.js` caught it.

## Still open

Unchanged and still the largest gap: `src/data.js` has no `lastVerified` dates,
which `AGENTS.md` rule 2 requires. That needs a real verification pass, not a
code change.

## CI fix after the first PR run

`tests/live-sync.test.js` "a missing skill table leaves the level underived"
failed on CI while passing locally. Not a flake and not an environment quirk —
a real bug that local egress blocking had been hiding.

`importProfilePayload` resolved its skill table with
`options.skillResources || await fetchSkillResources()`. When live sync had
already tried the table and failed, it passes `skillResources: null` to say so;
`||` treated that as "nothing supplied" and issued a second, real request to
`api.hypixel.net`. Locally that request was blocked, so the level stayed null
and the test passed. On the CI runner the request succeeded, the level was
derived from a table the sync had reported as unavailable, and the assertion
failed.

Fixed by making transport ownership explicit: a caller that supplies
`skillResources` owns it, including when it supplies `null`. Only a caller that
omits the option entirely — raw file import, which has no other source — gets
the built-in fetch.

The test was also strengthened so it cannot pass for the wrong reason again:
`tests/live-sync.test.js` now installs a `globalThis.fetch` guard that records
and rejects any real network call, and asserts after every sync that none was
made. Reverting the fix makes that test fail locally, which was verified.
Two direct tests in `tests/hypixel-import.test.js` cover the supplied-null and
supplied-table cases. 143 tests total.
