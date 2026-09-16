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

---

# API-key-only sync, and synced values on the cards

Three changes, from user feedback that username sync did not work in practice
while the API key did.

## 1. Username resolution removed

`src/mojang.js` and its tests are deleted, the Mojang and mirror origins are out
of the `connect-src` list again, and `syncByUsername` is now `syncProfile`,
taking the UUID the user stores in Settings.

The API key cannot replace it: the `/key` endpoint that used to return the key
owner's UUID was disabled in August 2023. So one identity field remains, and the
UUID is the right one — Hypixel's `name` parameter is deprecated and not
guaranteed correct, `api.mojang.com` sends no CORS headers, and a UUID needs no
third party and cannot silently resolve to the wrong account.

## 2. Sync runs by itself

Entering the API key, the UUID or a proxy URL triggers a sync as soon as both
halves are present. When only one is present the status line says which field is
still missing, instead of appearing to ignore what was typed.

## 3. Synced values are written onto the cards

This was the real gap: before, a sync filled the normalized snapshot but only
three entries reached the UI. `src/snapshot-apply.js` now projects the snapshot
onto the progression store and stamps each value as auto, so cards show a
`synced` badge and the drawer explains that editing overrides it until the next
sync.

What it maps is deliberately narrow, because rule 1 forbids inventing a field or
mechanic. Only self-evident links are allowed: NBT counters whose field names
the mechanic (`farming_for_dummies_count`, `levelable_overclocks`,
`rarity_upgrades`), enchantments (the `enchantments` object is keyed by the
enchantment's own id), reforges (`modifier` is the reforge's lowercase name),
gemstone slot and quality, and — for which crop a tool belongs to — the tool
names already in `src/data.js` rather than an item-id table. Turbo-Crop is read
by the `turbo_` prefix so no crop suffix has to be known.

Mk. II/III tiers, armour set identity, accessories, pets, chips and shards need
a table this repo has not verified. They stay unmapped and are reported, never
set to zero as if the API had denied them. Set-wide entries only count when
every slot is visible and carries the effect.

## Verification

- `npm test`: 150 tests, including 20 new ones for the apply layer covering tool
  matching, the shared Eclipse Hoe, both gem shapes, clamping to each entry's
  maximum, incomplete sets, the lowest-level rule across a set, manual entries
  surviving a sync, and unknown crop ids being ignored.
- Browser, Hypixel stubbed: entering the UUID does nothing, entering the key
  then syncs by itself; Farming level 3 and 5 plots appear on the account cards
  with `synced` badges without a reload, and Wheat shows crop upgrade 9/9.
- Browser with the repo's own NBT fixture (a Euclid's Wheat Hoe): 11 values
  written; Farming for Dummies 5/5, Overclocker 3/10, Cultivating 10/10,
  Harvesting 6/6, Turbo-Crop 5/5, Blessed, Perfect Peridot and Recombobulator
  all marked synced on the wheat tool, Mk. II correctly left unset, and the
  melon tool untouched.
- Six error paths each give an actionable message; Settings still fits 390px.

## Bug found while verifying

Entering the key with no UUID stored did nothing visible: `syncIfConfigured`
returned silently. It now names the missing field. The same re-render-wipes-the-
status ordering bug as before had also crept into the key, proxy and clear-key
handlers; all three now set the status after the re-render.

---

# Where do I find this value?

Feedback: the app asks for stats without saying where to find them in game, so
they cannot be entered. Screenshots were suggested.

## What was built

- `src/help-locations.js` — the source-controlled location table, with a status
  per entry (`SYNCED` / `VERIFIED` / `UNVERIFIED` / `NEEDS_RESEARCH`).
- A **What to enter** page: the 57 entries a sync cannot fill, ordered by the
  value they add, each with its explanation, its state and a direct source link.
- A **Where do I find this?** section in every card drawer.
- Location hints next to the two Fortune number inputs on Account and Crops,
  which is where people get stuck first.
- `docs/FINDING_VALUES.md` — the research protocol for filling the table.

The synced set is derived from `MAPPABLE_ENTRY_IDS` in the apply layer rather
than duplicated, so it can never disagree with what the sync actually does. A
test pins that.

## What is deliberately missing

In-game menu paths for the 57 manual entries. An in-game path is a claim about
the game, so rule 1 applies to it as it does to a formula, and a guessed path is
worse than none: it sends a player hunting for a menu that may not exist and
risks a value read off the wrong screen.

All SkyBlock sources — `wiki.hypixel.net`, `wiki.eliteskyblock.com`,
`hypixel-skyblock.fandom.com`, `hypixelskyblock.minecraft.wiki` — are blocked by
this environment's egress proxy, so no path could be verified here. Only the two
Fortune inputs carry a location, taken from the official wiki Stats page via
search results and marked `UNVERIFIED` with that caveat visible in the UI.

Filling the rest is a data-only change: the table and the UI are ready.

## On screenshots

Not added, for three reasons recorded in `docs/FINDING_VALUES.md`: they cannot
be produced from this repository, game screenshots are Hypixel/Mojang assets so
redistributing them in a public repo is a licensing question, and a screenshot
goes stale silently while a dated text path shows its own age.

## Verification

- `npm test`: 160 tests, 10 new, including that no location may claim `VERIFIED`
  without a source and a date, that every manual entry still offers a source,
  and that the synced set matches the apply layer exactly.
- Browser: the checklist renders 57 rows with 57 source links, a synced entry’s
  drawer says it needs no lookup, an undocumented entry says so rather than
  showing a path, and the page has no overflow at 390px.

---

# Item-centric setups

Feedback: the gear layer is a flat list of stat entries ("Mossy on full armor")
and is unusable. It should be item-centric: pick the helmet you have, then its
reforge, its enchantments, whether it is recombobulated, and its gemstones.

This is the **Setups** page `docs/PRODUCT_SPEC.md` already specifies and that has
never been built.

## Decisions taken with the user

- **Slot model:** named setups side by side (Normal Farming / Pest Farming /
  Jacob Contest), each with its own slots. "Helmet 1" is the helmet of setup 1.
  Matches the spec's requirement that setups are mutually exclusive alternatives
  rather than additive.
- **Option sources:** the item picker is filled live from the official keyless
  `/v2/resources/skyblock/items` resource; reforges, enchantments and gems come
  from what the player's own sync found on their items plus what `src/data.js`
  already names. Free text stays available everywhere, so a missing catalogue
  row never blocks anyone. No list is invented.

## Tasks

- [x] `src/setups.js` — pure model: slot definitions, setup creation, item
      records, prefill from a synced snapshot
- [x] Schema 3 -> 4 migration adding `profile.setups`, with tests
- [x] `src/item-catalog.js` — fetch, reduce and cache the official item
      resource; tolerant parsing that degrades to free text if the shape differs
- [x] Option sources for reforge / enchantment / gem, each tagged with where it
      came from
- [x] A **Setups** page: setup tabs, slot grid, per-item editor
- [x] "Fill from sync" to pre-fill slots from detected items
- [x] Tests and a real-browser pass

## Deliberately out of scope for this change

- Evaluating which setup earns more. That needs the profit engine, which does
  not exist yet, and would mean inventing values.
- The farming tool. It is already crop-scoped and filled automatically by the
  sync, which is better than a manual slot; duplicating it into setups would
  create two competing sources for the same value.

## Review

Built as planned. 197 tests (35 new), app version 0.11.0, data schema 4.

### Bug found while verifying

A **CPU-pegging infinite render loop**. `ensureItemCatalog` returned early only
once items had loaded, and re-rendered afterwards; the Setups page calls it from
`render`. So an item resource that came back empty or failed triggered a render,
which called the loader, which rendered again, forever. Playwright surfaced it as
"element was detached from the DOM, retrying" on every click.

Fixed by guarding on *a load was requested* rather than on *a load succeeded*,
with the flag set before the await, and by repainting only when the result
actually has something new. `tests/app-guards.test.js` pins all three
properties; reintroducing the bug fails two of them, which was verified.

### Verified in a browser

- three setup tabs, ten slots, setups independent of one another
- the helmet picker lists only helmets from the official resource
- choosing item, reforge, enchantment with level, recombobulated and a gemstone
  stores exactly the expected record and shows a readable slot summary
- **Fill from sync** filled 6 slots from worn armour, equipment and the active
  pet, kept the hand-entered boots, and ignored the spare helmet in the
  enderchest
- schema migrated 3 -> 4, no console errors, no overflow at 390px

---

# Setups drive the gear cards

The setups page shipped as a form with no effect: gear bonuses were still
derived straight from the synced items, so the same value had two competing
sources and editing a setup changed nothing.

## What changed

- `applySnapshotToProgress` now reads gear from the **active setup** when it
  holds any piece of that class, and falls back to the worn gear a sync detected
  only for a class the setup leaves empty. Deciding per class matters: a filled
  armour setup must not silence detected equipment.
- Set-wide entries are **recomputed** rather than only applied. Applying alone
  was enough while the only source was a sync, which never retracts; an editable
  setup can. Taking a piece out of the set now clears the card again.
- Clearing is limited to entries this layer stamped as auto, so a value the
  player typed in is never recomputed away.
- `hasPerfectGem` reads both recorded gem shapes -- the decoded NBT object and
  the setup editor's list -- so the rules do not care which source filled a slot.
- A setup edit re-applies immediately through `reapplyGear`.
- The badge now reads `derived`, not `synced`: the value can come from a
  hand-edited setup, and calling that "synced" claimed the API said it.

## Verified in a browser

Empty setup -> the Mossy card reads "missing / Not set". Four mossy pieces ->
"Owned", marked derived. Reforge one piece to blessed -> the card clears again.
Back to mossy -> Owned. Switch to the empty Pest setup -> cleared. No console
errors throughout.

207 tests, 10 new for the setup-driven rules. App version 0.11.1.

## Note to self

Recorded in `tasks/lessons.md`: I wrote `\u0027` inside a quoted bash heredoc
three times in this session, which a quoted heredoc passes through literally and
which breaks the JavaScript. Use double quotes for the string, and run
`node --check` in the same command that writes the file.

---

# Verification pass against a current source

The research route that had blocked every earlier attempt is solved: this
environment's egress proxy blocks all SkyBlock domains, but a server-side
extractor reaches them. The community wiki refuses plain HTTP (403) and needs a
browser tier.

## Two findings that changed the repo

**The official Hypixel Wiki was closed in July 2026.** Hypixel staff announced
on 2026-07-21 that pages would stop being browsable. Three citations in this
repo pointed at it, including two I shipped myself in `src/help-locations.js`.
All replaced; `AGENTS.md` no longer names it in the source hierarchy, and a test
fails if one is cited again.

**The specialised farming tools were renamed in-game** (Hoe ->
Sickle/Shovel/Cutter). `src/data.js` carried the pre-rename names, taken from
Fandom, which is stale. Because `cropsForToolItem` matches a decoded item's
display name against the tool name, **tool detection was silently failing for
seven of thirteen crops** -- the sync wrote nothing to those tool cards.

The browser test had passed because `tests/nbt-fixture.js` encoded the same
wrong name: a self-consistent error that only an external source could catch.
Proved empirically before changing anything: the current item name against the
old data gives NO MATCH.

## What was done

- All 13 tool names updated, each with `toolSource` and `toolVerified`.
- Matching moved to `toolMatch`, the crop-distinctive part, plus any known tool
  noun. That survives the next rename, still matches the old names so older
  data is not stranded, and the noun requirement stops a stack of the crop
  itself being read as the tool.
- **Schema 4 -> 5 migration** remaps the seven changed `toolProgress` keys.
  `toolKeyForCropId` derives the key from the tool name, so without this every
  affected tool's stored progress would have been orphaned. Merges rather than
  overwrites, and is idempotent.
- Fixture corrected to the current name.
- `Turbo-Crop` cap corrected from 5 to 7 (+35 Crop Fortune at VII), sourced and
  dated.
- `docs/VERIFIED_MECHANICS.md` records 14 confirmed values, the corrections, the
  confirmed in-game locations, and the gaps below.

## Gaps this pass exposed

Recorded rather than guessed at. Each materially affects profit, so the planner
must not claim a coins/hour figure until they are modelled:

1. Farming Fortune has **no effect on the Private Island**.
2. **Pests reduce Fortune** -- 4+ pests cut Farming Fortune and every
   crop-specific Fortune, first 5% then multiples of 15%, up to 8 pests, max
   **75% loss**. Every 100 Bonus Pest Chance allows one more pest first. The
   model has no concept of a negative term at all.
3. Pest spawn rate: base 0.2% (1 in 500) per crop broken, off cooldown.
4. Garden Bestiary: the Farming Fortune page says +102 max, the Pests page says
   0.4 per tier up to +100. Left marked as needing confirmation rather than
   picking one.

218 tests. Data schema 5, app version 0.12.0.

---

# Farming strategies and loopholes, researched

Brief: know every farming loophole and strategy. Second research pass, using the
same server-side extraction route.

## Where it landed

`HIDDEN_INTERACTIONS` in `src/data.js` already existed for "hidden and nonlinear
effects", so the findings went there rather than into prose: **15 new entries,
34 total**, each with `effect`, `why`, `handling`, a source and a
`lastVerified` date. They render on the app's Mechanics page, so the app itself
now carries them.

`docs/VERIFIED_MECHANICS.md` grew to 231 lines with the strategy summary, the
304 Bonus Pest Chance baseline table, the twelve farming attributes and their
shards, the armour chain, and the reforge progression.

## The findings that change how the planner must calculate

- **Bonus Pest Chance is a step function.** Each full 100 guarantees one more
  Pest; the remainder is a percent chance. 299 -> 300 adds a whole Pest,
  300 -> 399 adds almost nothing. Ranking it linearly would be badly wrong.
- **300+ Bonus Pest Chance inverts the pest penalty.** Eight Pests normally cost
  75% Fortune; at 300-399 they cost 15%, which makes letting Pests accumulate a
  viable low-attention strategy rather than a disaster.
- **Zorro's Cape rolls at claim time**, so it costs nothing in farming stats and
  never competes with the contest loadout.
- **Contest medals gate Turbo-Crop per crop** (Bronze -> IV, Silver -> V), so
  owning the book is not the same as it applying.
- **Gold medals raise the Farming cap** -- the last ten levels, +4 Fortune each,
  are a contest unlock rather than a grind.
- **Mk. II at tool level 15, Mk. III at 30**, and rarity scales reforges and
  gemstones, so a tier upgrade changes the value of everything already on it.
- **Freezing Garden time makes one day/night shard useless** -- only Moonflower
  needs Lunar Power.
- **A Sundial frees the boot slot** from Rancher's Boots.
- **One Mantid piece in the kill set keeps stack credit.**
- **Sunset V pulls both ways** across day and night.

## Open discrepancy, not resolved

Armour Farming Fortune differs between two pages of the same wiki: the guide
gives Tater +70 / Cropie +90 / Squash +110 / Fermento +130 / Helianthus +150 as
"base full-set", the Farming Fortune page gives +100 / +135 / +170 / +205 /
+225. Farmhand, Haymaker and Sprout agree. This repo stores no armour Fortune
number, so nothing is wrong today, but it must be resolved before the profit
engine uses one. Recorded rather than guessed.

## Still missing values

The twelve farming attributes are documented but not scored -- each needs its
own Fortune value before it can be ranked, and the app currently models three
shards. Listing them without values would add twelve dead planner cards.

220 tests. App version 0.13.0.
