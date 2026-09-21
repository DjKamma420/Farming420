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

---

# How farming changed since the beginning

Brief: go deeper, read tutorials, learn how the farming system has changed since
the start.

## The insight this produced

A `lastVerified` date is worthless on its own. What matters is whether the game
changed **after** it. Nothing in this repo tracked the second date, which is
precisely how the specialised tool rename sat here undetected and silently broke
tool detection for seven of thirteen crops.

`docs/FARMING_HISTORY.md` now records the timeline for that comparison, and
`AGENTS.md` correctness rule 2 requires the check. A test enforces it: nothing
may claim a `lastVerified` older than the newest known game change.

## Four eras, and why old numbers do not transfer

1. **Before the Garden (2021 - early 2023)** - Farming Fortune existed, farming
   happened on the Private Island. A different game.
2. **Garden, no pests (2023-02 - 2023-11)** - Crop Fortune existed but was
   **hidden**, so community numbers from this window were reverse-engineered by
   hand. Least trustworthy era.
3. **Pests era (2023-11 - 2025-12)** - pests, the Fortune penalty, Bonus Pest
   Chance. Most surviving community guidance dates from here.
4. **Greenhouse and Chips era (2025-12 - now)** - Sowdust, Chips, Greenhouse,
   and repeated Greenhouse rebalances including August 2026. Era 3 profit maths
   does not carry over.

## Two things I had to correct about my own earlier work

**I overclaimed.** The community wiki's Farming Fortune page carries the wiki's
own `Outdated pages` and `Confirmations needed` markers, even though it was
edited 2026-09-14. So the 14 values I reported as "confirmed" are *consistent
with the best available public source*, not verified against the live game.
`docs/VERIFIED_MECHANICS.md` now says so at the top of that section, and this is
the likely cause of the armour-Fortune discrepancy.

**Licensing.** The wiki is CC BY-NC-SA 3.0 and its operator ships an explicit
anti-AI-scraper signal. Recorded in the history doc: attribution is required
and already satisfied by the per-entry source URLs, non-commercial and
share-alike apply, extraction stays minimal, and the official API is preferred
for anything it exposes. Nothing in this repo reproduces wiki prose.

## Still missing

The **date of the tool rename** is not pinned. It is the single most valuable
missing entry, because it is the change that proved this file was needed.

222 tests. App version 0.13.1.

---

# The Farming 0-60 guide

Brief: a complete guide from Farming 0 to a maxed setup, every intermediate step
shown, alternative pets that are equal or slightly worse offered as choices, and
enchantments at their different levels.

## What was built

`src/progression.js` - the sourced model: five stages covering 0-60 with no gap,
the eight-set armour chain, eight enchantment ladders, pet options for four
activity phases, and the three-phase loadout from budget to hypermax.

A **Guide 0-60** page that reads the player's synced Farming level and opens at
the stage they are in, marks reached armour sets, names the next one, and lets
them pick among the pet alternatives, which persist.

## Two things it deliberately does not do

- **No computed ranking.** Scoring the options needs the profit engine, which
  does not exist, and inventing numbers to fill it would break rule 1. Options
  carry a sourced qualitative tier and the reason instead.
- **No coins-per-hour claim.** The single quantitative comparison (Mooshroom Cow
  beats a Legendary Elephant above ~1,429 Strength, worth roughly 700k/hour) is
  quoted from the source with its breakpoint, not derived here.

The armour Fortune figures are flagged `disputed` from Tater upward, because the
two wiki pages disagree; a test pins that flag so it cannot quietly be dropped.

## Bug found while testing

`Number(null)` is `0`, so an unsynced player would have been told they were in
stage 1 at level 0 -- a confident answer built from nothing. `stageForLevel`,
`armorProgress` and `nextArmorSet` now reject null, undefined and empty string
explicitly and return null, while a genuine level 0 still resolves. Tests pin
both halves.

## Also recorded in lessons.md

I cut a branch from a stale local `origin/main` twice in this session, which
showed up as the test count silently going backwards. The fetch and the branch
belong in the same command. A stash across that rebase also silently dropped
version bumps in files with no other change.

238 tests. App version 0.14.0.

## Farming attribute Fortune values (0.15.0)

### Plan

- [x] Source a per-level value for each of the twelve documented farming attributes
- [x] Score the ones that have a published value; refuse to score the ones that do not
- [x] Give each attribute its own metric so the twelve can never be summed into Farming Fortune
- [x] Pin the whole set with tests and prove the tests fail when the data regresses
- [x] Rewrite the attribute section of `docs/VERIFIED_MECHANICS.md` against the live source

### What changed

`docs/VERIFIED_MECHANICS.md` listed twelve farming attributes with no values,
explicitly because none had been sourced. All twelve now carry a sourced
per-level value read from the wiki's Attributes list on 2026-09-16, and the
eight that were missing entirely are now shard entries in `src/data.js`
(`shards` grew from 4 to 12 entries; `UPGRADES` from 77 to 85).

Attributes cap at Level X, so every published range is a level 1 to level 10
span and the per-level step is one tenth of it. That is the whole derivation —
nothing is extrapolated beyond it.

### The two traps this closes

1. **Only four of the twelve give Farming Fortune.** Solar Power (+5/level),
   Lunar Power (+5), Pest Fortune (+5) and Infiltration (+3) do; the other eight
   give Overbloom, pest spawn rate, visitor behaviour, materials or Wisdom. All
   twelve level identically and sit in the same Hunting Box, which is exactly why
   they read as one Fortune pool. Each entry now carries its own `metric`, so the
   planner structurally cannot add them together, and a test asserts that exactly
   four shard entries use `Crop Yield`.
2. **Three of those four are conditional** — day, night, and "a Pest is in the
   plot you are standing on". Only Ultimate DNA (Galaxy Fish) is unconditional,
   and the wiki shows it also covers Mining and Foraging Fortune, which the old
   note did not say.

### What is deliberately *not* scored

Pest Cooldown (Moth Shard) prints a flat "0.5s" on both the attribute list and
the shard page, with no level range, while all eleven others print one. Assuming
0.5s per level would invent a 5s reduction no source states, so it is a `VERIFY`
entry with `stepGain: 0` — it appears in the list and renders as "dynamic",
contributing nothing derived. A test asserts that no `VERIFY` shard can score.

### Verification

- 241 tests pass (was 238).
- The three new tests were each proved to fail against a deliberately regressed
  `src/data.js` (attribute name removed, unverified entry given a step gain).
- Real-browser sweep: the Shards page renders 12 entries with the correct
  per-step labels and metrics, Moth renders as `verify` / `dynamic`, the planner
  ranks without errors, and the console is clean.

## Item-centric gear editor (0.18.0)

### Plan

- [x] Drive each slot's enchantment list from the verified metadata instead of free text
- [x] A lever per enchantment plus a level select bounded by the sourced maximum
- [x] Item art, rarity colour and a readable identity header per slot
- [x] Never drop an enchantment the app has not verified
- [x] Tests, proved to fail against a regressed module

### What changed

Editing a piece of gear used to mean typing enchantment identifiers into a text
box. An empty box gives no hint that Pesterminator exists, none that it stops at
VI, and no protection against a typo silently creating a second enchantment.
Worse, the suggestion list was built only from the player's own synced profile,
so before a first sync there were no suggestions at all.

Each slot now shows a fixed list of exactly the enchantments that can sit on it,
read from `VERIFIED_FARMING_ENCHANT_META`, with a lever for "I have this" and a
level select whose options stop at the sourced maximum. Recombobulated is the
same lever. Gemstones are a closed list of the five qualities across the twelve
types rather than free text.

`src/item-editor.js` holds all of it as pure functions over one item record and
touches no DOM, so every rule above is testable without a browser.

### Decisions worth recording

- **Toggling on starts at level I, never at the maximum.** A planner that
  assumes the best case credits Fortune the player never claimed; understating
  is the cheaper error.
- **An unverified enchantment is shown, not hidden.** A synced profile can carry
  an enchant this repo has not researched. Dropping it from the editor would let
  the next save quietly delete a real value, so it renders with a "not verified"
  tag and no invented maximum.
- **A crop-specific Turbo enchant keeps its own storage key.** All Turbo-Crop
  variants share one row; each row carries the key it actually came from, so
  editing the level of a Turbo-Melon writes back `turbo_melon` rather than
  replacing it with a generic `turbo_crop`.
- **Rarity colours are not a design choice.** They are the colour codes the game
  writes into the item lore footer, which `rarityFromLore` already reads back. A
  test asserts every rarity the normalizer parses has one.
- Picking an item from the official list now carries Hypixel's own `tier` into
  the record, so the name is coloured correctly without anyone typing a rarity.

### Known limitation

`assets/hypixel-pack/` is empty in the repository, so `item-art-ui.js` finds no
manifest and the portraits fall back to a rarity-tinted placeholder. The pack is
fetched by `scripts/sync-hypixel-pack.py`, which needs `api.hypixel.net` and
`resourcepacks.hypixel.net`; both are blocked from this sandbox, so the sync
could not be run here. Running it locally fills every portrait with the official
texture without any further change.

### Verification

- 345 tests pass (was 333); 12 are new.
- The new tests were proved to fail against a deliberately regressed
  `src/item-editor.js` (slot kind removed, toggle defaulting to the maximum):
  3 failures, then green again on restore.
- Real-browser sweep: all ten slots render an editor without console errors;
  a lever + level edit persists through a reload; turning an enchantment off
  clears its level and disables the select; turning it back on starts at I;
  gemstone add and recombobulated both round-trip to storage.

## The physical tool as one item (0.19.0)

### Plan

- [x] Give the Tools page the same item-centric panel the gear slots got
- [x] Write to the existing tool progression, never to a second copy of it
- [x] Respect the reforge exclusivity the game enforces
- [x] Pin the panel against a renamed or forgotten entry

### What changed

The Tools page was fourteen cards, each hiding its control behind a drawer. It
now opens with the tool itself: its name, how many of its parts are set, and one
line per part with a lever and a level.

The panel writes to the same `toolProgress` bucket the cards already read, so
there is exactly one stored value per part and the cards below the panel stay
in step automatically. They keep their job — the Fortune each part contributes
and the source behind it — under a heading that says so.

`SETUP_SLOTS` still has no tool slot, deliberately. The tool is already
crop-scoped and filled by a profile sync; a copy inside a setup would give the
same value two competing owners, which is the thing the setups module was
written to avoid.

### Decisions worth recording

- **The reforge group is exclusive in the UI, not just in the maths.** Picking
  Bountiful clears Blessed, because the game only lets a tool carry one.
- **The control follows the level count.** One level is a lever, up to ten is a
  roman-numeral select, more than that is a number field: fifty numerals in a
  dropdown is not a control anyone can use.
- **The vacuum stays off the tool panel.** Beady is a vacuum reforge; showing it
  beside the tool reforges would imply a crop tool can carry it.
- **Turning a part on starts it at its first level**, matching the gear editor.

### Verification

- 354 tests pass (was 348); 6 are new.
- The new tests were proved to fail against a regressed `src/item-editor.js`
  (an entry dropped from the panel, the select threshold widened to 60):
  2 failures, green again on restore.
- Real-browser sweep: picking Blessed cleared Bountiful; a level of 999 clamped
  to the entry maximum of 50; the card below the panel reported the same
  "Level 4/4 max" as the panel; switching crop switched the tool being edited
  and kept each tool's values separate; console clean.

## Getting the official item art into the app (0.19.1)

### The gap

`src/item-assets.js` and `src/item-art-ui.js` already read `assets/hypixel-pack/`
and paint its textures onto every slot card and item editor.
`scripts/sync-hypixel-pack.py` already fetches and verifies that pack. Nothing
ever ran the script, so the directory did not exist and every item showed a
placeholder.

The sync needs `api.hypixel.net` and `resourcepacks.hypixel.net`, both blocked
from this sandbox. A GitHub runner has neither restriction, and an earlier
inspection run proved it: the script succeeded there and produced a **1.53 MB**
artifact, so size was never the obstacle either.

### What changed

`.github/workflows/sync-pack.yml` runs the sync on demand and weekly, verifies
what came out, runs the repository's own checks against it, and opens a pull
request. It does not push: the pack is a third party's asset tree, so its
contents and size are reviewed before they land. A run that finds the same
pack SHA-1 downloads nothing and opens nothing.

### A latent bug this uncovered

`scripts/check-sw-manifest.js` listed `assets/` without distinguishing files
from directories, so the moment `assets/hypixel-pack/` existed it reported that
directory as an uncached shipped file and failed. Anyone running the sync — the
workflow included — would have hit it immediately. Proved by creating the
directory and running the old checker: it exits 1 with
`sw.js does not cache: ./assets/hypixel-pack`.

The pack is now explicitly named as not precached, with the reason: it is around
a thousand textures the app only fetches for items the player owns, so
precaching it would make every install download the whole pack to show at most a
dozen pictures. Item art falls back to the placeholder when a texture is not
cached, which is the intended offline behaviour.

### Verification

- 356 tests pass; 2 are new.
- The old checker was proved to fail against a synced pack, and the new one to
  pass with the same directory present.
- The workflow YAML parses, and the commit message and PR body were confirmed to
  come out at column 0 rather than carrying the block scalar's indentation.

### Still the user's call

Merging the pull request the workflow opens. That is what puts Hypixel's
textures into the repository.

## Reading a photograph of a tooltip (0.20.0)

### What was actually wrong

The user sent the failing input: a phone photograph of a monitor, 2160x3840.
Reproduced locally with native Tesseract against that exact file:

| | before | after |
| --- | --- | --- |
| image handed to Tesseract | 8.29 MP | 1.44 MP |
| native Tesseract time | 12.3 s | 0.55 s |
| expected strings recognised | 0 of 11 | 11 of 11 |

Native Tesseract is several times faster than the WebAssembly build the browser
runs, so twelve seconds here is minutes there. That is the hang.

Two separate causes, both measured rather than reasoned about:

1. **The image was never reduced.** `ocrCanvasScale` clamped to a minimum of 1,
   so the 1600px normalisation could only ever magnify. An eight-megapixel photo
   went to Tesseract whole.
2. **The binarisation destroyed the text.** A fixed `value > 95 -> white` cut was
   written for a clean screenshot. On a photograph the blue tooltip panel is
   itself brighter than that, so the panel and the text both went white and the
   OCR returned noise.

### What changed

- **Crop to the tooltip first.** A Minecraft tooltip is a strongly blue panel and
  nothing else on a farming HUD is; photographed it measures about
  (53, 106, 174) against a warm grey surround. `findTooltipRegion` finds it in
  7 ms in the browser and returns null when nothing stands out, in which case the
  whole image is scanned as before.
- **Fit to a long side of 1600**, in both directions.
- **Luminance, then a histogram stretch, then invert**, instead of a fixed
  threshold. Inverting matters on its own: Tesseract is trained on dark text on
  light paper, and a tooltip is the opposite.
- **Page segmentation SINGLE_COLUMN** rather than SINGLE_BLOCK. A tooltip is one
  column of text at varying sizes, and it read every enchantment line where
  SINGLE_BLOCK lost some.

### Parsing what the camera actually produces

The remaining errors were in the text, not the image. This font under a camera
reads V as U, M as H, and I as l or T. Since the app knows every enchantment and
reforge it cares about, matching inside that closed vocabulary is safe:

- `romanLevel` maps the confusions and then takes the longest valid numeral, so
  `Il...` is II, `UI` is VI, and `Delicate UW` is V.
- `closestVocabularyMatch` is a bounded edit distance against the closed set, so
  `Turbo-Helon` resolves and `Efficiency` still matches nothing.
- Enchantment lines are split by trying the longest name first, so `Crop Fever
  Il...` is not read as an enchantment called "Crop".
- The rarity footer is matched as a standalone word anywhere in the line, since
  the game frames it with decoration and a photograph adds more.

### The one thing the scan could not read

OCR truncated the title to `Melon |`, so the tool could not be identified from
the name. `toolTarget` now falls back to evidence the tooltip repeats: another
line naming the tool, then the Turbo enchantment, which names exactly one crop.
For this photo that resolves to `melon-dicer`, correctly. The fallback is never
silent: the result panel says which evidence was used and a warning asks the
player to check it before applying.

The scanner still does not repair the name itself. It reports `Melon |` as read.

### Verification

- 366 tests pass; 10 are new.
- The real OCR output is checked in as `tests/ocr-fixture.js` and asserted
  against: reforge `bountiful`, rarity `LEGENDARY`, and all six farming
  enchantments at their true levels.
- The scale test was proved to fail against the old rule.
- Run in a real browser against the user's actual photograph: 8.29 MP to
  1.44 MP, detection in 7 ms, clean console.

## Item art from the player's own profile (0.21.0)

### Why this and not the resource pack

Hypixel's official pack only carries textures it overrides, and #41 established
that it contains none of the farming armour, equipment or pets. In the game
those are player heads, and their picture is a Minecraft skin served from
Mojang's texture host. The reference travels inside the item's own NBT, so a
synced profile already carries everything needed — no bundled assets, no repo
weight, and the picture is the one the game itself shows.

### What changed

- `src/skull-art.js` reads the texture id out of `SkullOwner.Properties.textures`
  and describes where the head sits on the skin sheet. Pure; no DOM, no network.
- `item-normalizer.js` captures it, `setups.js` carries it into the slot record.
  Older saves gain the field through `normalizeSetups`, so no migration.
- `item-art-ui.js` prefers the head over the pack texture, and falls back to the
  placeholder when an item has neither.
- The CSP gains `https://textures.minecraft.net` in `img-src` only.

### Decisions worth recording

- **Displayed, never read back.** Mojang's host sends no CORS header, so cropping
  the head in a canvas would fail. Two CSS layers with `background-position`
  achieve the same crop and need nothing but permission to display. That is also
  why the host has no business in `connect-src`.
- **The texture id is validated, not trusted.** It is interpolated into a URL the
  page loads, so anything that is not plain lowercase hex is refused.
- **Both sheet heights are handled.** A skin is 64 wide and either 64 or 32 tall,
  and a percentage offset is measured against the rendered height, so the layout
  waits for the image to report which arrived rather than assuming.

### Two bugs found by running it

Both reproduced in a browser, neither visible in the diff:

1. **A render loop that froze the page.** The guard asked whether the card held a
   pack texture; a head is a different element, so it never matched, and the
   observer saw its own insertion. Now guarded on a container class set on every
   successful pass.
2. **Two pictures per slot.** The selector matched a slot card *and* the portrait
   inside it. Now only the innermost container is selected.

### Verification

- 375 tests pass; 9 are new, and two of them were proved to fail against the
  reverted guard and the reverted id validation.
- Rendered in a real browser against generated 64x64 and 64x32 skins whose head
  squares are distinct flat colours. The rendered pixel came out (128, 100, 128),
  which is exactly 50% magenta hat over green face — so both layers are cropped
  to the right squares and composited in the right order. A wrong crop would have
  shown red, blue, yellow or grey.
- An item with no head keeps its placeholder; the placeholder hides when a head
  renders; the editor portrait shows exactly one.

### Limitation

Mojang's texture host is blocked from this sandbox, so the verification above
used a local server standing in for it. What is unverified is only that the real
host responds as expected.

## Garden chip pictures from the official pack (0.22.0)

### Two separate faults, both needed fixing

#41 established that the pack is 17 MB and holds none of the farming gear. What
it does hold is the Garden items, the ten chips among them — and the app scores
exactly those ten. They still showed nothing, for two reasons:

1. **Every lookup missed.** The pack files its definitions in folders, so the
   manifest was keyed `jacob/melon_dicer`. The app has `MELON_DICER`, lower-cases
   it, and looks up `melon_dicer`. Not one key ever matched.
2. **The art layer never reached them.** It rendered into setup slots and the
   item editor portrait. A chip is an entry in the upgrade list, not something
   worn in a slot, so the Garden Chips page was never touched.

Fixing only the first would have shipped megabytes that still showed nothing,
which is the mistake #41 was closed to avoid.

### What changed

- The manifest is keyed by the definition's basename, which is the SkyBlock id.
  Replayed over the real pack: 1082 keys, and all ten chips resolve.
- Five ids collide, all opal gems. Rather than pick one and risk showing the
  wrong item's picture, the id is dropped and listed under `ambiguous`, so the
  loss is visible in the manifest instead of silent on the page.
- Only `textures/` is written to disk. The definitions and models are still read
  out of the archive to resolve which texture belongs to which item, but nothing
  reads them afterwards, and they were two thirds of the tree: 5.0 MB of
  definitions and 5.7 MB of models against 5.8 MB of pictures. **17 MB to
  about 6 MB.**
- `itemAssetForSkyblockId` no longer hands out a `definition` path, because that
  file is no longer shipped. It returns `source` instead, named as provenance.
- The ten chip entries carry `packAsset`, and progression cards render it.

### Why `packAsset` and not `skyblockId`

The basename is almost certainly the SkyBlock id — `melon_dicer_2` lines up with
`MELON_DICER_2`. But Hypixel's item resource is unreachable from this sandbox, so
that stays an inference. `packAsset` says exactly what the value is: the key this
entry's picture is filed under. No claim is made that it is also the item id.

The sync workflow now fails if `src/data.js` names a picture the freshly built
pack does not contain, so the inference is checked against the real pack on every
run rather than trusted.

### Verification

- 382 tests pass; 7 are new, and two were proved to fail against a removed
  `packAsset` and the reverted folder-path keying.
- The new keying was replayed over the real 1092-entry manifest from the earlier
  sync: 1082 keys, 5 ambiguous, all ten chips present.
- Rendered in a browser against a stand-in pack at the real path: all ten cards
  show their picture, the images actually load, and a second observer pass adds
  nothing — the container guard holds.

## The click freeze (0.24.0)

### What it was

`src/tool-presentation-ui.js` observes `#app` with `{childList: true, subtree:
true}` and its callback wrote into that same subtree on every run:

    goals.innerHTML = markup;      // every call, even when markup was identical
    badge.textContent = label;     // every call

Both replace the child nodes even when the value is unchanged, so each write
produced a mutation, which produced another callback, which wrote again. The tab
wedged. It stayed invisible on load because the function returns early unless
the active page is Tools, so the first click that rendered Tools started it.

### How it was found

Bisect forward from the minimal core: add one module, run a click sweep, repeat.
Modules one to eight passed. The ninth, `tool-presentation-ui`, crashed the
renderer process outright. Notably `farming-tool-art-ui` -- the module the hotfix
series had blamed and disabled -- passed cleanly at step eight. It was never the
cause.

Two earlier hypotheses were tested and **withdrawn**, both because a local test
server returned 304 Not Modified on files whose timestamps had not moved:
"a stale service worker pins the browser to the old build" and "the tombstone
worker never activates". With the timestamps corrected, a stuck browser recovers
within about three reloads on its own. Neither belonged in the diagnosis.

### The fix

Idempotent writes first: nothing is assigned unless the value actually changed.
Then the structural guard, because idempotence relies on every future writer
remembering: the observer is disconnected around the writes, `takeRecords()`
drops whatever queued, and it is reattached afterwards.

### The other half of the problem

The hotfix series had cut `index.html` down to a core of three modules, leaving
**39 of 56 unreferenced** -- Settings, the whole API sync, the screenshot
scanner and every item-art layer among them. That is why so much of the app did
nothing when clicked: it was not loaded. All of it is referenced again.

`scripts/check-sw-manifest.js` now accepts a worker that precaches nothing,
since the deployed worker exists only to remove its predecessor.

### Verification

- 420 tests pass.
- Full click sweep with every module enabled: 161 clicks on desktop with empty
  state, 161 with a filled profile at tool tier 3, 84 on a 390px phone
  viewport. No freeze, no renderer crash, no console errors.
- A test pins the exact lines that mattered, and a second one fails if
  `index.html` ever references a file that does not exist.

### Deliberately not tested

Whether a module "guards against re-entering itself" is not checkable by pattern
matching. Two attempts raised false alarms on correct code, and a check that
fires on correct code teaches people to ignore it. The other twelve observer
modules were audited by hand instead; the result and the rule are in
`tasks/lessons.md`.


## 0.26.0 -- Tools page dedupe and exclusive controls

### What the page looked like before

Three tool selectors stacked on one page: the `.sb-tool-picker` cards, the
native `#workspaceToolSelect`, and a lever list built on top of that select.
The tool's name appeared **six times** on a 420px screen.

### Changes

- `workspace-direct-picker.js` no longer builds a parallel lever list. It hides
  `#workspaceToolSelect` with a class and leaves it in the DOM, because the
  workspace listens to its `change` event -- removing it would have broken
  selection silently.
- The reforge chooser is a `role="radiogroup"` with **No reforge** as the first
  option, so "this item has no reforge" is selectable instead of implied.
- The reforge panel replaces itself on re-render, keyed by a
  `crop|reforge|goal` signature, and re-entry with unchanged inputs touches
  nothing.
- `.tool-context-addon` is hidden rather than removed; `enhancements.js` owns
  that node.
- Tool art follows the owned tier: Mk1/Mk2/Mk3 art for the highest tier the
  profile actually has, degrading downwards when a tier has no art in the pack.

### Verification

- 414 node tests + 7 Python tests pass.
- Measured in a real 420px viewport: tool pickers `cards=12, lever list=0,
  native select hidden`; tool name occurrences `3` (was 6); reforge options
  `No reforge, Bountiful, Blessed, Earthy, Deep Fried, Overpriced` with
  `radiogroup` semantics; picking Bountiful then No reforge round-trips and
  clears the stored value; page still responsive after idle.
- `tests/tools-page-dedupe.test.js` pins four invariants: the physical tool is
  chosen in exactly one place, the reforge set is single-choice with an
  explicit none, the panel replaces itself and not its neighbour, and nothing
  removes a node another module recreates.

### Still open

Condensing beyond the Tools page, and the navigation taskbar.


## Click sweep harness (0.26.1)

`npm run sweep` walks every page of a running build and reports which ones
survive being clicked. It exists because the previous ad-hoc sweep could run
past any patience: a single process walked every page, and a frozen renderer
makes each Playwright call wait out its own timeout.

    npm run serve      # in one shell, port 4173
    npm run sweep      # in another

Knobs: `SWEEP_URL` (default `http://127.0.0.1:4173`), `SWEEP_JOBS` (default 4),
`VARIANT_BUDGET_MS` (default 35000), `SWEEP_OUT` (log directory),
`PLAYWRIGHT_MODULE` for a non-default browser install.

Each page is a separate process with its own deadline and its own `timeout`
wrapper, so one hanging area cannot stall the run. Every area is swept in three
variants: empty desktop, desktop with a filled profile at tool tier 3, and a
390px phone.

### What it caught

- The planner's old list stays in the DOM as `.planner-v1-source` with
  `display:none`. Twenty 0x0 nodes were eating 3s each in click timeouts while
  the page's real UI -- 30 revenue rows and 7 mode tabs -- went untested. The
  sweep now only clicks elements with a layout box.
- Below 780px the sidebar is `display:none`, so clicking a nav button does
  nothing at all. The earlier run reported a pass for every phone page while
  never leaving the dashboard. It now navigates through
  `.mobile-page-select-addon` and reads the stored page back to confirm it
  arrived.
- `gear` and `pets` are folded into `setups` by `navigation-dedupe.js`. That is
  reported as "no such page", distinct from a page that exists with no way in.

### Result on 0.26.1

All 16 areas pass in all three variants. Identical click counts across desktop
and phone are the evidence that navigation actually happened -- when they
diverged, the phone run was doing nothing.


## 0.26.2 -- the tool icon painted over the topbar

Reported from a phone: an overlay on the Tools page "liegt doppelt". Scrolled,
the tool art was drawn on top of the sticky header bar.

`.sb-pack-icon` carries `z-index: 2` to sit above the letter fallback behind it.
`.topbar` also carries `z-index: 2`. Equal values are decided by document order,
and the icon comes later, so it won. The icon's number was never the problem:
`.sb-tool-art` is `position: relative` with no z-index and so creates no
stacking context, which let a value meant for a 52x52 box compete with the page.

`isolation: isolate` on `.sb-tool-art`, `.sb-reforge-art` and `.item-portrait`
(tier badge, z-index 4). No layout change, no number changed.

Verified by hit test rather than by reading properties: scroll until icon and
bar overlap, then `elementFromPoint` on the overlapping strip. 8 of 8 samples
had the icon on top before, 0 of 8 after. `tests/stacking-isolation.test.js`
pins the containment and was itself checked by removing the fix and watching it
fail.


## 0.27.0 -- the navigation taskbar

The thirteen-entry dropdown in the topbar is gone. Navigation is the icon rail:
a side rail on desktop and tablet, a fixed bar along the bottom on phones.

### The rail already existed and had never once been seen

`skyblock-redesign.css` had defined it for a while, including the bottom bar
below 650px. It never appeared, because `styles.css` hides the sidebar outright
below 780px -- a leftover from when the topbar select was the only phone
navigation. The redesign's rules override width, position, padding and border,
but none of them touched `display`, so `display: none` stood. One rule fixed
it, and the bar that was written long ago works now.

### No second copy

With the rail visible everywhere, the topbar select was a second copy of the
same sixteen destinations, so `addMobileNavigation` and the select are deleted
rather than hidden -- nothing recreates it, so there is nothing to hide.

### Icons

Twelve of sixteen entries were drawing a bare letter, because their candidate
names are not in the pack at all: `garden`, `personal_bank`, `wardrobe`,
`booster_cookie`, `calculator`, `clock`, `book`, `paper` and the rest. The pack
ships SkyBlock's own items only, so there is no vanilla book, paper, clock or
armour texture to reach for.

Ten entries now carry real art, each key checked against the manifest:
dashboard `garden_scythe`, account `visitors_gratitude`, crops `cropie`, tools
`theoretical_hoe_wheat_3`, setups `fermento`, gear `squash`, pets
`jolly_pink_rock`, chips `cropshot_chip`, shards `earth_shard`, buffs
`goblin_omelette`, pests `pest_trap`, planner `wishing_compass`.

Guide, What to enter, Mechanics and Coming Soon keep the letter on purpose:
nothing in the pack fits them, and a wrong icon reads worse than a letter.
`tests/nav-art.test.js` fails if any key stops resolving -- the same silent
degradation that once drew the Cocoa Chopper as a letter because the table said
`cocoa_chopper` and the pack says `coco_chopper`.

### Verified

390, 412, 760 and 1280px: rail visible at all four, 14 links visible at each,
10 with art and 4 with letters, no select anywhere, and tapping Tools actually
lands on Tools. All 16 sweep areas pass in all three variants; 420 node tests
and 7 Python tests pass.

### Still open

The crop selector still sits in the topbar. Moving it into the planner is the
other half of the request and is not in this change.


## 0.27.1 -- the taskbar showed two rows

Reported: "Sie ist doppelt." The bottom bar was rendering group headings
("PROGRESS", "LOADOUT", a clipped "SPE...") interleaved with icons across two
rows in a bar 68px tall.

`enhancements.js` wraps the nav in four titled groups. As a side rail that
reads well. In the bottom bar the nav is a flex row, so those four groups
became four columns, each a heading stacked over its buttons -- two rows of
content in a one-row bar, clipped.

`display: contents` on `.nav-group-addon` below 650px drops the group boxes out
of the layout, so the buttons become direct children of the nav's flex row.
The titles are hidden there. No DOM change: the grouping module keeps owning
the structure it built.

### The order was wrong too

`groupSidebar` appends its groups after everything it did not move, so a page
missing from GROUPS is not dropped -- it is left sitting in front of them.
`setups`, `guide` and `setup` were missing, so the rail opened with an item and
two bare letters before Dashboard. All sixteen pages are grouped now, with
`setups` in Loadout and a new "Getting started" group holding `guide` and
`setup` at the end. `tests/nav-groups.test.js` fails if a page is missing,
unknown or listed twice.

### Correction to the 0.27.0 notes

Those notes said the crop selector was still in the topbar and that moving it
was outstanding. That was wrong. It is already hidden there
(`workspace-hidden-crop-switch`), and the planner already carries its own
chooser with **Global** as the first option followed by all 13 crops, under an
"Evaluation scope" heading. That half of the request was done before this
change.

### Verified

412px screenshots of Dashboard, Tools and Planner: one row of icons, Dashboard
first, no group titles, no dropdown. 426 node tests and 7 Python tests pass.


## 0.27.2 -- crop art and the overlay audit

### Thirteen crop tiles were letters

W, C, P, Pu, Mu, WR and the rest. The pack ships SkyBlock's own items only, so
there is no plain wheat, melon or cocoa texture in it. Eight crops have their
own produce in the pack and now use it: carrot `carrot_bait` (a basket of
carrots), pumpkin `polished_pumpkin`, mushroom `glowing_mushroom`, cactus
`potted_cactus`, nether wart `mutant_nether_wart`, and the three greenhouse
crops `compacted_sunflower`, `compacted_moonflower`, `compacted_wild_rose`.

Wheat, potato, melon, sugar cane and cocoa have no produce texture at all, so
they take that crop's Mk. I tool. It repeats the Tools page art, but the tile
names the tool right beside it and a recognisable tool beats a letter. Every
key was checked as an image, not by name: `fine_flour` is a brown sack and
`deepfries` are chips, so neither was used for wheat or potato.

**The Recombobulator has no texture in this pack** -- zero matches. It keeps
its placeholder rather than wearing something misleading.

### An audit that was lying by omission

`scripts/overlay-audit.mjs` (`npm run audit:overlay`) hit-tests every page in
four viewports at three scroll positions for content painting over the chrome,
boxes escaping their parent, clipped text and sideways page scroll. Two real
bugs came out of it and are fixed:

- The crops grid used `1fr 1fr` on phones. `1fr` is `minmax(auto, 1fr)`, so a
  column may exceed its share when its content cannot shrink -- long tool names
  did exactly that, giving columns of 188px and 205px in 362px of space and
  scrolling the page sideways by 26px. Now `repeat(2, minmax(0, 1fr))`, with
  the names allowed to wrap.
- The tool grid's tablet rule *shrank* the minimum column to 180px, producing
  three narrow columns at 760px and leaving the name 85px to live in, clipped
  by 31px. Now 240px, so fewer and wider columns.

The audit's first version only looked inside `.content`, which is why it missed
the side rail entirely: at 88px the group headings were cut mid-word
("SPECIALI"). Fixed here, and the first fix -- `overflow-wrap: anywhere` --
was itself wrong, turning it into "SPECIALIZE" + "D", which reads no better
than the clipping. It fits on one line now.

### Duplicate removed

The bottom-bar flattening added in 0.27.1 duplicated rules already shipped in
`mobile-taskbar.css`, which loads after `skyblock-redesign.css` and therefore
won regardless. Mine never applied and is gone.


## 0.27.3 -- nothing left wearing a letter

Correction to 0.27.2. Those notes said the Recombobulator "has no texture in
this pack" and that four nav pages had "no honest match". Both statements
answered the wrong question.

The Recombobulator does have art: `item-art-coverage.js` already maps it to
`RECOMBOBULATOR_3000`, and the reforges to `GOLDEN_BALL`, `BLESSED_FRUIT`,
`LARGE_WALNUT`, `HASHBROWN` and `OVERPRICED_DRINK`. That art comes from the
official SkyBlock item resource, not from the resource pack -- many SkyBlock
items are player heads and have no pack texture at all. Searching the pack and
concluding "it does not exist" was looking in one drawer and declaring the
house empty.

The four letter-only nav pages were the same mistake in a smaller form. They
are app pages, not SkyBlock items, so no literal match exists -- but an item
that *means* the same thing does:

- Mechanics: `plant_diagnostics_tool`, a clipboard for reading how something
  behaves.
- Coming Soon: `greenhouse_blueprint`, a plan for what is not built yet.
- What to enter: `builders_ruler`, for the figures you measure and type in.
- Guide 0-60: `box_of_seeds`, for starting out.

All 13 nav entries carry art now, and `tests/nav-art.test.js` fails if any page
in `NAV` would fall back to a letter, rather than allowing a documented
exception list.

### Not verifiable here

The reforge and gear-slot placeholders still show letters in this sandbox
because `api.hypixel.net` is blocked by the egress proxy, so the official item
catalog cannot load. They belong to the coverage-art system and are very likely
fine in a real browser; nothing about them is claimed either way.


## 0.27.4 -- why the gear showed silhouettes and letters

Reported with screenshots: the Mossy Helianthus set renders as flat white, grey
and yellow armour outlines, and the Blossom equipment as two-letter badges on a
hatched square. "Das sind nicht die richtigen Modelle."

### What was measured

Seeding a setup whose slots carry a head texture renders that texture: all
eight armour and equipment portraits produced `.skull-art` and the silhouette
never appeared. So the rendering path is sound, and the portraits in the
screenshots mean those slots reached the renderer with **no** `skullTexture`.

### The reader knew one NBT shape out of several

`skullTextureFromTag` only understood `SkullOwner.Properties.textures[].Value`.
Minecraft 1.20.5 replaced `SkullOwner` with a `profile` data component whose
properties are a list of `{name: 'textures', value: '<base64>'}` -- lowercase
`value` -- and serialisers along the way case these keys differently. For every
shape it did not recognise the reader answered "not a head", which is
indistinguishable from the truth for the many items that really are not heads.
Nothing logged, nothing failed; the grid just fell back to silhouettes.

It now tries each known shape: classic `SkullOwner`, a `profile` component, a
bare `profile`, either casing of `Value`/`value`, a lowercased owner key, a
texture URL, and a bare hash. `tests/skull-texture-shapes.test.js` covers all
of them plus the cases that must still answer null. Seven of its ten cases
failed against the previous reader.

### What this does not establish

Whether it is the cause of the screenshots. The egress proxy here blocks
`api.hypixel.net` and `resourcepacks.hypixel.net`, so the actual NBT of those
items cannot be inspected and neither can the upstream pack. If Helianthus
armour is not a head item at all, its slots will still carry no texture and the
silhouette is the honest fallback -- in which case the fix is different art for
that fallback, not this.

The check is one sync: if the armour comes back with real models, this was it.

### The fallback itself is still poor

`armorSvg` in `item-art-coverage.js` draws four hand-made outlines filled with
one flat colour, and equipment has no shape at all, which is why those slots
show letters. The shipped pack does carry the set items (`helianthus`,
`fermento`, `cropie`, `squash`), which would read far better than a grey
T-shirt. That file belongs to the other agent's current work, so it is not
touched here.


## 0.28.0 -- set art instead of silhouettes

The gear grid drew a hand-made outline filled with one flat colour for armour,
and for equipment nothing at all, so those slots showed a two-letter badge.
That is what the reported screenshots were: a grey T-shirt for the Mossy
Helianthus Chestplate and "CLTB" for the Thorny Blossom Cloak.

The pack ships no armour or equipment pieces, but it ships the item each set is
built from, and those read instantly: a Helianthus flower for Helianthus
armour, the Fermento fruit for Fermento, Cropie, Squash, and the four Lotus
flowers for the four Lotus equipment tiers. One icon serves a whole set, which
costs nothing here because the slot already prints HELMET, CHESTPLATE or CLOAK
beside it.

`BLOSSOM` is marked a stand-in in the table itself: the set has no item of its
own in the pack, and `bachelors_rose` is a real blossom from the Garden's own
wild-rose line. Its proper picture is the item's head texture, and that path
still takes precedence whenever the sync supplies one.

### Kept out of the way

`src/pack-item-art.js` is new and holds the table, the lookup and the node. The
change to `item-art-coverage.js` -- the other agent's current file -- is one
import and three lines inside `itemArtNode`, placed between the head-texture
branch and the outline it already drew. Nothing was removed or rewritten there.

### The one-shot adoption

The coverage layer stamps a container with the identity of the art it placed
and will not replace art of the same identity. Since the pack manifest arrives
asynchronously, a plain second pass would leave the outline drawn before it
landed. So the stamp is cleared exactly once, after the manifest resolves, and
then a re-render is requested. Once, deliberately: repeating it per mutation
would be two modules taking turns rebuilding one node, which is the hang this
project has already paid for twice.

### Verified

End to end with a seeded catalogue, because `api.hypixel.net` is unreachable
here: all eight armour and equipment slots render pack art, no outline and no
visible letter badge. 514 node tests and 7 Python tests pass, the overlay audit
reports nothing, and the setups sweep is clean in all three variants.

### Still on a letter

Pets and pet items, which have no pack item and rely on their head texture, and
any farming set the pack does not carry -- Farm Suit, Melon, Rabbit. Those keep
the existing fallback.


## 0.28.1 -- two tools in one portrait

Reported from a zoomed screenshot, and read correctly on sight: a Mk. I Melon
Dicer sitting behind the Mk. III, slightly offset.

Measured, the portrait held three layers:

| layer | source | picture | box |
|---|---|---|---|
| front | `img.sb-pack-icon` | `melon_dicer_3.png` (right) | 50x50 at +11,+11 |
| behind | `img.official-item-art` | `melon_dicer.png` (Mk. I) | 60x60 at +6,+6 |
| badge | `span.workspace-tier-badge` | Mk. III | reaches +77 inside a 72px box |

The five pixels of offset are exactly +11 against +6. `item-art-ui` resolves
the tool's *base* item id, and the base id's texture is always Mk. I; the
redesign draws the tier the profile actually owns. Both were painting.

The tier-correct picture wins; the other is hidden where a tier icon exists,
and only there, so portraits that rely on `.official-item-art` alone keep their
art. Hidden, never removed -- the module that creates it puts it back
immediately, and that fight is a hang this project has already paid for twice.

The badge was being sliced by `overflow: hidden` on the portrait: it sits at
`right: -7px; bottom: -7px` and is 21px tall in a 72px box, so its rounded
corner died against the frame. It breaks out of the square now, which is the
intended look and what was asked for.

`tests/portrait-single-layer.test.js` pins all three points and was checked by
removing each fix and watching it fail.


## 0.29.0 -- the tool editor sits under its tool

The Tools page listed twelve cards and then, 4800 pixels further down, one
editor for whichever was selected. Choosing a tool meant scrolling past every
other tool to reach its settings.

There is still exactly one editor; it is moved into the card grid, directly
after the selected card, spanning the full row. "Clicking another tool closes
the first one" falls out of that for free: the editor cannot be in two places,
so the previous card simply no longer has it. Verified by clicking through
three tools -- the editor's page offset moves 985 -> 516 -> 1219 and the
document never holds more than one.

The move is idempotent. This module re-enters through an observer on the same
subtree it writes into, so once the editor is the selected card's next sibling
there is nothing left to do -- the rule this project has now paid for three
times.

### The empty bar under the heading

Found by looking at a screenshot, not by measuring: a dark rounded bar with
nothing in it. `elementFromPoint` down the middle of the page named it
`.workspace-context`, 384x30, holding text that does not fit in 30px.

It was my own fallout. Hiding the duplicate `#workspaceToolSelect` in 0.26.0
left its wrapper behind, and that wrapper kept painting a border, a background
and 14px of padding around a 1x1 clipped child. It has been shipping since.

Collapsed with `:has(> .workspace-tool-picker-hidden:only-child)`. The
`:only-child` is the guard: the moment that container holds anything else, the
rule stops applying and the bar returns on its own. Page height fell from 4866
to 4818.


## 0.30.0 -- rarity is derived, not asked for

The tool editor asked for an item's rarity through a dropdown that started at
"Unknown". That is a question the app can already answer: the official item
resource states each item's own rarity, and a Recombobulator raises it by
exactly one rung. Two facts already in hand, turned into a third the user was
being asked to supply.

The row shows the derived value read-only and says where it came from -- "from
the official item data", or "recombobulated from EPIC", or "already at MYTHIC;
a Recombobulator adds nothing". The rarity-scaled Peridot Fortune uses the
derived value too, not the hand-recorded one.

### The dropdown survives exactly one case

When the official data has no rarity for this item there is nothing to derive
from. Guessing would silently change Fortune values, so the row keeps the
dropdown and says why: "Official item data has no rarity for this item yet, so
it cannot be derived." That is the state this sandbox is permanently in, since
`api.hypixel.net` is unreachable from here.

### One ladder, one rule

`exact-farming-items.js` already carried a rarity ladder and the
Recombobulator step, for the vacuums. Adding a second copy would have been two
tables to keep in step, so `RARITY_ORDER` and `bumpRarity` are exported from
there and both the vacuums and the tools use them. `vacuumEffectiveRarity` now
calls `bumpRarity` rather than repeating the clamp.

### Verified

Nine unit tests cover the derivation: one rung per Recombobulator, clamped at
MYTHIC, unknown stays unknown rather than being guessed, casing tolerated, and
the explanation strings. Two more pin that the editor derives before it offers
the dropdown and that the gemstone Fortune uses the derived value. 556 node
tests and 7 Python tests pass, audit clean, tools sweep clean.

**Not verified here:** the derived row rendering in a live browser. The
catalogue cannot load in this sandbox, so every local run takes the fallback
branch. The logic is covered by unit tests and the fallback was observed
directly; the derived branch needs a browser with API access to see.


## 0.30.1 -- the rarity step is per item, not class-wide

0.30.0 raised rarity one rung whenever the Recombobulator box was ticked. The
research is explicit that this is wrong as a blanket rule:

> `per_unit`: "+1 item rarity tier **where applicable**"
> `stat_model_rule`: "Value is contextual because rarity can increase
> reforge/gemstone/other rarity-scaled effects. **Do not assign a fixed Farming
> Fortune delta globally.**"
> -- research/special-farming-item-costs-2026-09-17.json, tool_and_vacuum_modifiers[3]

The base rung was already per item, taken from that item's own rarity in the
official resource. The step now is too: it is gated on
`canRecombobulateItem('tool', catalogItem)`, which was already in the file for
deciding whether to offer the checkbox at all. It answers per item, using the
official `can_recombobulate` flag when present and the item family only when
that flag is silent.

An item that cannot take the step keeps its own rarity and the row says so --
"this item cannot be recombobulated, so it stays EPIC" -- rather than showing an
unchanged number that reads like a bug. The gemstone Fortune uses the same gate,
so a rarity the item cannot reach can no longer inflate Peridot values.

Five more unit tests, fourteen in total on this derivation.


## 0.31.0 -- money moves into the background

The planner opened by asking for "Normal crop Coins/h", "RARE CROP Coins/h" and
Overbloom before it would answer anything. The page's job is to say what to
upgrade next; coin figures are an input to that ranking, not something the
reader has to hold in their head.

Those inputs live behind a disclosure now, closed on arrival, labelled
"Optional. Only sharpens coin and payback ranking." Nothing was deleted -- the
prices are still in the app and still feed the ranking, and rows without a
recorded cost already said so. Measured: closed, 0 of 2 inputs painted and none
hit-testable; open, both appear. Page height 3062 against 3320.

The Tools page also printed "N Coins in recorded unlock costs" beside the
gemstone Fortune, which read "0 Coins" until costs happened to be recorded. The
Fortune is the answer there; the coin total is gone and the per-slot cost inputs
stay.

### Two traps on the way

A `<summary>` given `display: flex` stops counting as the disclosure summary in
Chromium. The `<details>` is then left without one and every child renders as if
the panel were permanently open. The flex row moved to an inner div.

And my first two readings of "is it collapsed" were wrong, not the collapse: I
checked `getBoundingClientRect().height`, but modern Chromium collapses
`<details>` with `content-visibility: hidden`, under which descendants keep a
box while not being painted. `Element.checkVisibility({ contentVisibilityAuto:
true })` is the question that actually gets asked.


## 0.32.0 -- coverage made measurable, and the calculator core found orphaned

### The calculator core is not wired to anything

Looking for the calculator design, `research/knowledge-base/40-calculator-model-strategy-gap-audit.md`
turns out to be exactly it: the live Farming baseline with sources, what the old
planner did, the generic profit engine, the `unknown != 0` rule, the strategy
contexts, item-model coverage, and a priority order for the next data pass.

Checking what of it runs:

| module | imported by source | reachable at runtime | tests |
|---|---|---|---|
| `profit-engine.js` | only `strategy-model.js` | **no** | 2 |
| `strategy-model.js` | nobody | **no** | 1 |
| `item-model-coverage.js` | nobody | **no** | 1 |
| `revenue-ranking.js` | `revenue-planner.js` | yes | 1 |

The engine, the strategy layer and the coverage auditor are tested but on no
runtime path, and none is referenced from `index.html`. The planner still uses
the older manual-baseline ranking. The audit document warned about a research
document being mistaken for implemented coverage; the same is now true of the
code.

### Item model coverage, measured

`item-model-coverage.js` exists so a missing model is "a measurable coverage
failure rather than an invisible generic badge fallback". Nothing measured it.
`tests/item-model-coverage-audit.test.js` now audits every id the app knows
offline -- twelve tools at three tiers plus five Garden vacuums, 41 in total --
against the shipped pack.

Result: **41 of 41 resolve to their own exact pack texture.** None unresolved,
none dropping to a vanilla material. The official-skin path cannot be exercised
in CI, so this is the pack-only view: the weaker of the two, which makes it the
useful one to pin. One test proves the audit can fail, on a made-up id.

### Item prices: the gap is the link, not the research

`docs/ITEM_PRICE_COVERAGE.md` is generated from `src/data.js` and the shipped
price research. Six research files carry 76 named cost records. Of the 85
entries the planner can rank, **7** have a cost a machine can reach.

The reason is structural: the entries carry no cost field. Their fields are
`category, cropScope, hypercharge, id, manualDefault, max, metric, modeScope,
name, notes, rawMarginal, section, source, status, stepGain, workbookRank` --
no `cost`, no `price`, no `timeToObtain`. Price research and ranked entries are
two disconnected data sets, which is why the planner asks for Coins/h by hand.

The document says plainly what its matching can and cannot show: normalised
name overlap produces false negatives, so a line there means "no link exists",
not "no research exists". Entries that are earned rather than bought are marked
`time` instead of `coins`, since one number mixing both would be the fake
universal conversion the scoring model already refuses.

`tests/item-price-coverage.test.js` recomputes the figure, fails if the document
drifts from the data, fails if coverage drops below the current 7, and fails if
the document lists an entry that no longer exists.


## 0.33.0 -- the price link

The ranked upgrade entries and the price research were two disconnected data
sets. The entries carried no cost field; the research is keyed by SkyBlock item
id. Nothing could get from one to the other without a person reading a
document, which is why the planner had to ask for Coins/h by hand.

`src/upgrade-costs.js` is that link, generated by
`scripts/build-upgrade-costs.py` (`npm run build:costs`) from the shipped
research. Every one of the 85 entries now has a record.

| | Entries |
|---|---|
| Priced from research | 12 |
| Covered by another entry | 2 |
| Earned, not bought (needs a time figure) | 11 |
| No price research linked yet | 60 |

The twelve priced ones each carry the item ids they sum, their sources, a
verification date, and the weakest confidence of the parts -- a set costed from
one LOW piece is not a HIGH figure. The Helianthus set comes out at 283,439,000
coins across four HIGH-confidence pieces; two enchantment prices are carried
through with their own `STALE_FALLBACK_SNAPSHOT` flag rather than laundered
into clean numbers.

### Rules the generator enforces

`unknown != 0`. An entry without a sourced price gets `coins: null` and a
reason. Zero would make it look free and win every ranking it appears in.

Nothing is counted twice. Several entries describe effects of one purchase --
the Helianthus set's base stats, its Feast set bonus and its BPC value are the
same four pieces -- so one carries the cost and the others carry `includedIn`.

A deferral must point at something real. The Thorny equipment pair originally
deferred to an entry that is itself unpriced, which loses the cost rather than
sharing it; both are now unlinked with a reason that names the pairing. My own
test caught that.

The link table refuses to build if it names an upgrade id that `src/data.js`
does not have. That is not hypothetical: the first version linked three
consumables to invented ids and they silently counted as "unlinked".

### Three bugs my own tests found

- Consumables were priced per unit. Several are stacked, where one unit buys
  nothing; the total for the required quantity is the acquisition cost.
- Three priced entries shipped with no verification date, because that file
  says `as_of` while the armour file says `lastVerified`. The loader accepts
  either spelling now.
- The deferral problem above.

`docs/ITEM_PRICE_COVERAGE.md` is generated from the table in the same run, so
the readable list and the data cannot drift. The generator is deterministic:
building twice produces byte-identical files.

### What this does not do

It does not make the planner use the costs yet, and the figures are research
snapshots rather than live prices -- the research states that policy itself:
refresh live Bazaar prices before showing a player-facing recommendation.

## 0.34.0 -- the planner reads the table

- [x] Resolve every planner row's cost through the generated table
- [x] Say where each cost came from, per row
- [x] Rank by cost per Fortune when no profit baseline exists
- [x] Fix the two container collisions this exposed

### Review

The cost precedence lives in `src/upgrade-cost-resolution.js`, apart from the
DOM module so it can be tested by running it rather than by reading it:

    recorded price  >  research snapshot  >  unknown

A price the player typed in wins, because they paid it and the table holds an
average. Neither existing leaves the cost unknown -- `coins: 0` with
`origin: 'unknown'` and the reason the generator recorded -- and the row prints
that reason where the number would be. Zero is never presented as a cost: a
free-looking upgrade takes first place in every ranking sorted by value for
money, which is the one thing this ranking must not get wrong.

Each row now names its own source under the figure: `your recorded price`,
`research, high confidence`, `research snapshot, stale`, or the reason there is
none. A stale Bazaar snapshot is visibly a stale snapshot.

### Reading the table changed the ranking

Payback needs Coins/h. Cost per point of Farming Fortune does not, so the
ranking is now useful before the player has measured anything: without a
baseline the rows are ordered by researched cost per FF equivalent, and the
heading says `Best value per Coin` instead of claiming it is waiting for input.
Rows with no researched cost sort *behind* the priced ones -- unknown is not
cheap -- and they are still listed, with their reason.

### Two collisions the verification exposed

Neither was caused by this change; both were found by looking at the page
instead of at the diff.

**The revenue ranking was never on screen.** Three modules render into the
planner page and all three reached for `.planner-list` by bare class name.
`revenue-planner.js` inserts its own list *before* the core one, so
`querySelector('.planner-list')` stopped meaning "the core list" the moment the
revenue ranking existed -- and `activity-mode-ui.js`, which loads later,
overwrote it wholesale. No error, no duplicate, just the wrong list: the whole
cost and payback column was replaced by rows that have neither. Whoever writes
into the core list now says which list it means.

**A goal mode showed two rankings.** `planner-mode-ui.js` sets `hidden` on the
revenue panel, but `.revenue-planner-v2 { display: grid }` outranks the UA
`[hidden] { display: none }`, so the coin ranking stayed above the goal list.
One rule fixed it. `hidden` is not a guarantee once a class sets `display`.

### Verified

591 node + 7 python tests, `npm run audit:overlay` at 0 findings, the planner
sweep clean on desktop-empty, desktop-filled and phone-filled, and the three
planner states read back out of a real browser: no baseline ranks by cost per
Fortune, a baseline ranks by payback, and a goal mode leaves exactly one
ranking on the page.

## 0.35.0 -- the Pests page

- [x] Teach the two pipelines and which stat acts on which
- [x] The researched pest/crop/vinyl mapping, with art
- [x] The Pesthunter Phillip conversion, cap and all
- [x] Borrow the crop-art table instead of starting a second one

### Review

The page held one card, with no art, marked VERIFY -- on a page whose entire
subject is that two pipelines take different stats. `src/pest-model.js` now
holds the mechanics with their sources, and `src/pests-page.js` renders them.

**Spawn, then loot, and they do not share a stat.** Bonus Pest Chance decides
whether a pest appears. Overbloom decides what a dead one gives. Farming
Fortune touches only the guaranteed drops in between. The page states the rule
outright, because the number involved is large enough that nobody guesses it:
since 2026-05-14 the listed non-guaranteed pest drops scale with Overbloom, so
a +100 Pest Farming Fortune reforge changes the rare-drop chance by nothing.
The four stat sides are colour-coded on the two that get confused -- green for
the stat that works on the rare-drop roll, amber for the one that does not
despite its size.

**Thirteen pests, thirteen crops, thirteen vinyls**, verbatim from the research
table, which closes with "do not invent Stereo mappings for special Pest types
that are not part of this standard mapping" -- so the list gains no rows by
guesswork, and a test pins the count and the three uniqueness constraints. Each
row borrows its crop's art, which is what fixed "card without art": the app
already had all thirteen crop textures.

**The crop-art table is borrowed, not copied.** `CROP_ART` and a new
`cropArtUrl()` are exported from `skyblock-redesign.js`. This repo has already
shipped two rarity ladders and two taskbar rules; a second crop-art table would
have been the third of that kind.

### Where two sources disagreed

Pesthunter Phillip converts pest currency into temporary Farming Fortune. Both
sources agree on 5 Farming Fortune per pest and disagree on the ceiling: the
master research file's `_0_27`-tagged values give 200 pests for +1,000, while
`VACUUM_RESEARCH.md` records +200 at 40 pests. The version-tagged figure is the
one used, and the older one stays on the page with its source, so a player
seeing the smaller cap in game can tell which number is theirs. Inventing a
single "correct" ceiling would have been the easy thing and the wrong one.

A bad pest count returns `null`, not zero Fortune -- including `null` itself,
which `Number()` would otherwise turn into a confident 0. An empty input field
stays a real answer: spend nothing, get nothing.

### Verified

608 node + 7 python tests, overlay audit at 0 findings, pests sweep clean on
all three profiles, and read back out of a real browser at 1280px and 412px:
one panel (not one per mutation), 13 rows, 13 textures resolved, no sideways
scroll, and the converter capping 500 pests to 200 for +1,000.

### 0.35.0 addendum -- gemstones, two reforges, and an honest gap list

Six more entries have a real picture. The Peridot gemstones are **not**
stand-ins: the pack ships the actual gem for every tier, so "Perfect Peridot on
full armor" now shows the gem instead of the leather outline of whatever it was
socketed into. Tier order is load-bearing the same way `CONDENSED_*` already
was -- `PERFECT_PERIDOT` contains `PERIDOT`, so the bare token is tested last,
and a test pins that.

Thorny and Rooted get the item each reforge is named for, in the same in-family
class as `BLOSSOM`. Both give way to a head texture the moment one exists.

`docs/ITEM_ART_COVERAGE.md` records what cannot be pictured from this repo and
why, rather than leaving it as something I would have to rediscover: pets and
pet items, three reforges with no matching pack item, Zorro's Cape, and the
enchantments -- an enchantment is not an item and has no model of its own.

Farm Suit, Melon and Rabbit armour turned out **not to be entries in this app
at all**. They exist only in the live setup catalogue, where the head-texture
and vanilla-material rungs already cover them. Inventing pack stand-ins for
items the repo does not contain would have been fabricating coverage.

### 0.35.0 addendum -- freeze safety

`main` gained `docs/RENDER_FREEZE_SAFETY.md` while this branch was open, after a
`MutationObserver` froze the app in PR #90. The Pests page is exactly the shape
that incident describes -- it observes the subtree it writes into -- so it was
walked against the checklist rather than assumed safe:

- **What wakes it up:** a `MutationObserver` on `#app`, because the core
  rewrites `#app` wholesale and the panel has to be rebuilt after each render.
- **What makes the second pass a no-op:** the panel's own presence.
- **Text writes** go through the shared `setTextIfChanged`, not a second copy of
  it. Assigning the same string still replaces the text node and emits another
  `childList` mutation, which is precisely how PR #90 looped.
- **No storage write and no `state-changed` dispatch at all**, so the observer
  cannot cause a render.

Measured in a real browser rather than argued: 12 forced re-renders produced 12
inserts -- one each, no amplification, one panel at the end -- and five
identical inputs produced two writes in total, from the first one only.

## 0.36.0 -- two walls of prose, and a page with no way in

- [x] Fold the Mechanics page
- [x] Fold the "what to enter" tail, keep its top open
- [x] Make "what to enter" reachable on a phone
- [x] Stop tracking Python bytecode

### Review

Measured at 1280px before: **setup 12,715px**, **research 10,887px**, against
3,290px for the next tallest page. Each buried its own headline.

After: **setup 2,374px (-81%)**, **research 5,652px (-48%)**.

**Mechanics.** Thirty-six rules at four paragraphs each. The name, status and
effect are what the page is scanned for and stay in the `<summary>`; why a rule
is modeled separately and what the app does about it move into the body. The
three rules marked VERIFY open themselves -- folding away the only entries that
want a human to look at them would have been the wrong saving.

**What to enter.** Ordered most-valuable-first and rendering all 75 entries at
once. The top twelve stay *fully* open -- notes and in-game location included,
because "where do I find this" is the question the page exists to answer -- and
the remaining 63 fold away behind a labelled count rather than being cut. A
search shows every match, since a search has already narrowed the set.

Both use `<details>`, and both keep the flex row on an inner div: a `<summary>`
given `display: flex` stops counting as the disclosure summary in Chromium and
every card renders permanently open. That has already cost this repo one round
on the planner panel, so a test now asserts it for both.

### The bug the sweep had been reporting all along

`[setup] phone-filled UNREACHABLE: page exists but no visible way to open it`.

`mobile-taskbar.css` hid the nav link with the comment *"'What to enter' is not
useful as a permanent mobile taskbar destination"* -- and nothing else in the
app links to that page. So on a phone it had no entry point at all: 75
interactive elements and 63 folded entries, unreachable.

The taskbar already scrolls horizontally. Twelve 44px slots overflow a 412px
phone as it is, so the slot the rule was saving did not exist. Unhidden, the
nav scrolls itself (596px of content in a 400px box) with no sideways page
scroll, all thirteen links painted, and the sweep goes from 0 clicks to 75.

Verified on `main` first, by stashing: **identical there**, so this was not
caused by the folding work in the same release.

A test now walks every stylesheet and fails on any rule that hides a nav link
for a specific page. A page may be de-emphasised, reordered or put behind a
scroll; it may not be the one page with no way in.

## 0.37.0 -- the calculator core is no longer an orphan

- [x] Give `profit-engine.js` a real entry point
- [x] Ask only for what a player can measure
- [x] Say what is missing in the player's words
- [x] Never let a zero Fortune pass as an answer

### Review

`src/profit-engine.js` had been in this repo complete, tested, and imported by
nothing. `strategy-model.js` imported it and was itself imported by nobody.
Neither appeared in `index.html`.

It was left unwired for a good reason: a full farm model needs constants the
research marks unverified, and wiring it as one would have made it return
`null` everywhere. Section 9 of the calculator audit says what to do instead --
*"the new calculator core should accept measured/manual inputs and expose
incompleteness rather than synthesize values"* -- so that is what it does.

`src/measured-baseline.js` asks for the four numbers a player can read off
their own farm in ten seconds: breaks per second, how much of the hour they
really farm, crops per break, and the sell price. It borrows the Fortune the
app already computes, and returns either Coins/h or a list of what it still
needs. The panel lives inside the planner's existing baseline disclosure,
because a second economics panel elsewhere would be two writers for one
concern -- the exact bug that hid the revenue ranking in 0.34.0.

### What it refuses to claim

**Rare crops stay unknown.** No verified base probability for rare crops
outside a Harvest Feast exists in the research. The two rare fields are
optional, and leaving them empty produces `null` for that stream and a full
answer for the normal one -- half an optional measurement must not cost the
whole result.

**An engine path is not an error message.** The engine reports
`normalDrops[normal].unitValueCoins`, which is right for a diagnostic and wrong
on screen. Every path has words a player can act on, and a test fails on any
that still reads like a path.

**A zero Fortune is stated, not swallowed.** This one only showed up in a
browser. A computed Fortune of zero is a real value -- a player who has entered
nothing has no *known* Fortune -- so the engine accepted it and called the
measurement complete. The result was arithmetically right and practically
misleading: 1.84m/h read as a finished number while quietly assuming no Fortune
at all. The panel now prints the Fortune it multiplied by
("Multiplied by the 256 Fortune your profile works out"), and when there is
none it says so and says what to do about it. Axes `computeStatTotals` could
not resolve are a *different* problem and get their own sentence -- the
`incomplete` flag tracks unmodelled formulas, not an unfilled profile, and
conflating the two would have been a plausible-looking mistake.

### Freeze safety

Typing recomputes in place and writes only the stored measurement. Dispatching
a render per keystroke would rebuild the panel under the cursor -- a lost caret,
and the loop shape rule 5 exists to prevent. Applying is a click, so that is
where storage and the render belong. Text goes through the shared
`setTextIfChanged`.

Measurements are stored per crop **and** per activity, for the same reason the
baselines are: a Farm measurement does not describe a Pest loadout.

### Verified

752 node + 7 python tests, overlay audit at 0 findings, planner sweep clean on
all three profiles, and driven end to end in a real browser: the missing list
shrinking field by field, 1.84m/h at no Fortune with the warning, 6.54m/h at
256 Fortune without it, the rare stream appearing only once both its fields are
filled, "Use as baseline" writing 1,836,000 and 275,400,000 into the planner's
own inputs, and the measurements surviving a reload.

## 0.38.0 -- live Bazaar prices

- [x] Keep one fresh Bazaar snapshot
- [x] Fill the crop price from it, without overriding the player
- [x] Never show a stale number as current

### Review

`src/live-prices.js` was a complete Bazaar model -- payload normalization,
freshness windows, buy-order vs sell-offer sides, NPC fallback, caching -- and
nothing in the app called it. Meanwhile the measured panel asked the player to
look up their own crop price, and the cost research says outright what should
happen instead:

> "Fresh Hypixel Bazaar data must override snapshot prices whenever a Bazaar
> product exists." -- `runtimePriceRule`

`src/live-price-refresh.js` keeps one snapshot fresh and owns no DOM.
`src/live-crop-price.js` turns it into a price for the selected crop, or a
stated reason there is none.

**The product id is data, not a guess.** `ACTIVE_CROP_MODELS` already carries an
`itemId` per crop. Deriving it from the crop name would work for `MELON` and
fail for `CARROT_ITEM`, which is exactly why it is looked up. A test asserts
there is no `toUpperCase()` in the module.

**`RED_MUSHROOM/BROWN_MUSHROOM` has no single price.** A Garden mushroom layout
can break either, so that crop reports no-product rather than resolving to
whichever half comes first.

**The side matters.** Selling crops means the buy-order side, which is what the
player receives. Using the sell-offer side would have overstated every farm in
the app by the spread.

### What it will not do

- **Show a stale number as current.** `bazaarSnapshotFresh` owns that decision,
  and an hour-old snapshot resolves to no quote rather than to a price.
- **Override the player.** A live quote fills the field's *placeholder* and is
  used only while the field is empty. Anything typed wins, because the player
  may be selling elsewhere or at a different order depth. Verified both ways in
  a browser: 6.14m/h from the live 5.9, 103m/h after typing 99, and back to
  6.14m/h once cleared.
- **Render on a timer.** A snapshot is announced only when a genuinely new one
  arrives. Firing on a cache hit would be a render every five minutes forever,
  which is rule 5 of the freeze doc -- a state-changing event from something
  other than a user action.
- **Fail loudly.** `api.hypixel.net` is unreachable from this environment, so
  the failure path is the one that runs here: no throw, no retry storm, no
  render, and a field hint that says what to do instead.

One round lost to my own test harness: a synchronous `finally` around an async
body restored the fake `localStorage` before the awaits inside it ran, so every
cache read saw no storage at all.

### Verified

774 node + 7 python tests, overlay audit at 0 findings, planner sweep clean on
all three profiles, the startup smoke test passing on Chromium 141, and the
panel driven in a browser with a seeded snapshot and without one.

## 0.39.0 -- the orphan audit

- [x] List every module nothing imports
- [x] Delete the one that was a regression
- [x] Make the contest mode a model rather than a keyword search
- [x] Fix the unknown-as-zero bug that audit exposed

### The audit

Ten modules were reached by no runtime path. I had assumed they were all
unfinished features. One was the opposite.

**`workspace-capability-refresh.js` is deleted.** It rewrote the gemstone copy
at runtime, turning "first at Farming Tool level 5" into "level 1". The
verified value is 5: `gemstone-slots.js` sources it to the official item API
data, carries a verification date, and `tool-gemstone-thresholds.test.js` pins
it with ten assertions. So it was not a fix waiting to be wired but a wrong
number waiting to be shipped -- adding its script tag would have made the app
contradict its own tests. It also wrote `textContent` unconditionally from a
`state-changed` handler, which is the PR #90 freeze shape.

### The contest mode is now a model

`jacob-contest-model.js` shipped with the medal brackets, the 20-minute
duration, the personal-best Fortune table and Anita's accessory tiers, every
one of them sourced -- and no caller. Meanwhile the planner's "Collection /
Contest" mode ranked upgrades by a keyword match on the word "contest", which
is a text search dressed as a model.

`src/contest-estimate.js` feeds it the measurements the profit baseline already
collects, so a player who measured their farm once gets a contest estimate for
free: 346,800 melons in a 20-minute contest at 20 breaks/s, 85% uptime and 240
Farming Fortune. The one input only the player has -- their personal best for
this crop -- is the one thing asked for, because the sourced table turns it
into contest-only Crop Fortune: 1,000,000 melons becomes +20, and the estimate
rises to 367,200.

**No medal is guessed.** The model states why, and its sentence is shown rather
than paraphrased: a crop score cannot determine a percentile, because the
bracket depends on everyone else's scores that hour. The brackets are shown as
what they are -- the reward table.

`wheat` has no source-verified drop count, so it reports that instead of a
number. That is the whole point of the crop model carrying a status.

### The bug the wiring exposed

`jacob-contest-model.js` guarded its inputs with `Number(value)` before testing
finiteness. `Number(null)`, `Number(undefined)` and `Number('')` are all 0, and
0 is a finite non-negative number -- so **every absent input passed as a
measured zero**. A contest estimate with no breaking speed came back
`complete: true`, with a collection of 0 and participation not reached.

`profit-engine.js` had it right all along: it rejects `null`, `undefined` and
`''` before coercing. Two models, one convention, one of them wrong. Fixed in
the shared helper, so the four inputs that used it are all covered at once.

### Verified

785 node + 7 python tests, overlay audit at 0 findings, full sweep clean, the
startup smoke test passing, and the panel driven in a browser at 1280px and
412px: 346,800 measured, an em-dash plus the missing list when unmeasured,
+20 after typing a personal best, the value stored per crop, and the revenue
ranking correctly absent from the goal mode.


## 0.39.1 -- strategy metrics keep unknown distinct from zero

- [x] Audit numeric coercion across the calculation models after the contest fix
- [x] Keep absent explicit strategy objectives unknown
- [x] Preserve an explicit measured zero as a valid objective value
- [x] Pin all four non-coin strategy objective fields with regression tests

### Why this was still wrong

The 0.39.0 contest fix established the correct rule: reject absence before
calling `Number()`. The generic strategy layer still used `Number(value)`
directly. That made `null` and an empty string become zero, so a strategy with
no measured contest score, Farming XP/hour, Tool XP/hour or progression/hour
could be marked complete with an objective value of 0.

The profit engine, Greenhouse model, Mooshroom Cow model and their explicit
known-value helpers were checked in the same pass and already guard absence.
The remaining unsafe helper was `strategy-model.js`.

### Rule

An absent explicit metric is `null`, never zero. A literal numeric zero is
still valid when it was actually measured or supplied. This keeps incomplete
strategies out of comparable rankings without erasing legitimate zero results.

## 0.41.0 -- the architecture diagram, checked

- [x] Verify every edge of the supplied diagram against the import graph
- [x] Redraw it correctly
- [x] Make it impossible to get wrong again

### What was wrong

Twelve of twenty edges. Grouped by the kind of mistake:

**Reversed.** `app.js -> revenue-planner.js`, `app.js -> profile-sync.js` and
`profile-sync.js -> hypixel-client.js` all point the wrong way. `app.js`
imports no enhancement module at all; twenty-four of them observe `#app` and
patch what it rendered. And `live-sync.js` owns the API client, handing
payloads *to* `profile-sync.js`.

**Invented.** The profit adapter was drawn using live prices, computed stats
and the pest model. It imports none of the three -- only `profit-engine.js` and
`farming-mechanics-data.js`. The revenue planner was drawn calling
`progression.js`; that is `app.js` and `dashboard-guide.js`.

**Hops missing.** `revenue-planner -> profit adapter` skips
`measured-baseline.js`; `profile-items -> nbt.js` skips `item-normalizer.js`.

**Not a system.** "Bazaar Service" is a path on `api.hypixel.net`, fetched by
`live-price-refresh.js` directly rather than through the API client.

**A box pointing at itself.** `Application Shell [app.js] -> Dashboard UI
[app.js]`.

**Absent.** The cost table and its precedence chain, the measured baseline, the
planner modes, the resource pack, and the two external hosts that are not
Hypixel.

### The part that will last

`docs/ARCHITECTURE.md` uses module filenames as its Mermaid node ids, and
`tests/architecture-diagram.test.js` reads them back. A solid arrow must be a
real import. A dotted arrow must be a real *non*-import, so "observes" cannot
silently become "calls". The observer count stated in the prose is checked
against the actual count, and the corrections table may only name modules that
exist.

Verified by breaking it on purpose: three of the original mistakes put back,
two tests fail, file restored.

892 node + 7 python tests.
## 0.40.0 -- the Greenhouse yield table

- [x] Surface the 55 sourced loot multipliers
- [x] Keep base crops and mutations apart
- [x] Claim no Coins/h

### Review

`greenhouse-model.js` held the live loot multipliers from the August 20, 2026
balance patch, the Garden level that unlocks the Greenhouse, its 10x10 grid,
the 72-hour base-crop decay window and three announced-but-unreleased changes
-- all sourced, and reached by nothing. The Sowdust mode meanwhile filtered
upgrades by the words "sowdust" or "greenhouse".

**No Coins/h is claimed**, and that is the model's own position: those
multipliers "are NOT sufficient to infer a plant's base harvest amount, growth
duration, water requirement, mutation spread chance, or minigame outcome". Each
of those would be needed. What the page gets instead is the true and useful
half: the ranked table, the rules with their numbers, and the announced changes
marked as not scored.

**Base crops and mutations are two lists.** A base crop is what you plant, a
mutation is what you hope spreads, and their ranges do not overlap -- the best
base crop is x0.29 and the best mutation is x25. One list would have read as
advice to plant Snoozling.

**The decay boundary keeps the model's refusal.** Exactly 72 hours returns
`boundary`, not rounded into safe or decayed, because the model will not guess
server tick order at the instant the timer expires. The panel says so in words.

### Verified

794 node + 7 python tests, overlay audit at 0 findings, planner sweep clean,
startup smoke test passing, and driven in a browser at 1280px and 412px: one
panel, 53 plants, 3 facts, 3 announced changes, the decay read-out answering
Still growing / boundary / Decayed / unknown for 10, 72, 100 and empty hours,
no sideways scroll, and no panel at all in the other modes.

## 0.46.0 -- the code against the research

Audited every value the app ships against the research layer, as AGENTS.md
requires. Three real findings, one of them a wrong number in shipped data.

### Bookworm's Favorite Book was still pre-0.27

`+10` Vacuum Damage per application. `research/VACUUM_RESEARCH.md` records the
0.27 correction in a section titled exactly that: **"+20 Damage each, not
+10"**, with "+100 max", and warns that old guides are unsafe for Vacuum damage.

It survived because three things vouched for it: a `lastVerified` of the same
day the correction was recorded, a `confidence: "official-high"` source pointing
at a closed-wiki page (and the wrong page for that book), and a test asserting
`stepGain === 10`. The suite meant to protect the value was holding it in place.

### Two source citations to a wiki that closed in July 2026

`src/pest-mechanics-data.js` and `src/vacuum-data-patches.js`, plus five URLs in
the research JSON. AGENTS.md forbids `wiki.hypixel.net` as a source; there were
per-file guards for `data.js`, `help-locations.js`, core fortune and progression
-- and these sat outside that list.

Where the community wiki carries the same page and the repository already cites
it, the URL is substituted. Where it cannot be backed, the entry keeps
`retiredUrl`, loses its `official-high` confidence and says the page is gone and
the claim needs re-verification. No URL was invented.

### The Greenhouse table read as a ranking

kb-45 is explicit: *"Do not rank a mutation as universally best from its loot
multiplier alone."* My own panel, merged the day before, said "Stoplight Petal
at x25 is 86x the best base crop". It now names the sort as a sort and carries
the offsetting factors kb-45 lists -- growth duration, layout, spread chance,
upkeep, opportunity cost, base loot table, decay risk and the player's goal.

### Checked and found correct

- Thorny fortune/Overbloom tables are read from `research/`, not restated, and
  match the master file exactly.
- The Century Pufferfish Hat's intrinsic Thorns V is modelled from the id alone,
  and the ordinary hat correctly does not inherit it.
- The three-phase Farming/Spawning/Killing model matches knowledge-base 50,
  including the labels.
- The Greenhouse table holds the 53 entries kb-45 says it holds.
- No verification date anywhere predates the newest recorded game change.

Base Vacuum damage (Turbo 150 / Hyper 200 / Infini 300 / Hooverius 400) is
recorded in the research but not modelled in the app at all. That is a gap, not
an error, and is left rather than invented.

### Verified

908 node + 7 python tests, overlay audit at 0 findings, planner sweep clean,
startup smoke test passing, and the Greenhouse panel re-driven in a browser.
Both findings re-broken on purpose to prove the new tests catch them.

## 0.47.0 -- can your Vacuum one-shot a pest?

The Pests page already said a pest has 600 HP and that damage is judged against
that "not in the abstract" -- and then left the reader to do it. Meanwhile
`research/VACUUM_RESEARCH.md` held every number needed, reached by nothing.
0.46.0 recorded the gap rather than inventing values; this fills it from the
research.

`research/vacuum-damage.js` holds the tables, `src/vacuum-damage.js` the model,
and the Pests page asks the question the Pest Killing phase is entirely about.

**Order of operations is the whole thing.** Flat additions first, Buzzing
doubles after. The research's worked example is the check -- Hooverius 400,
five books +100, Buzzing x2 = 1,000 -- and it warns in bold that the 900 still
quoted in older Hooverius trivia is stale after 0.27. Doubling before adding
gives exactly 900, so a test pins that it does not.

**Pulls, not seconds.** Pull rate, range and travel are not in the research, so
a seconds-per-kill figure would turn a verified threshold into an invented one.

**Pest Fortune stays apart from general Fortune.** Beady's +100 is Pest-only,
and since 2026-05-14 non-guaranteed pest drops scale with Overbloom -- so it
must never be summed into a general figure or a rare-drop roll. `pestOnly` is a
separate field, and a test asserts the two never merge.

**Neither reforge wins.** The research forbids a universal rule either way:
Buzzing doubles damage, Beady trades that threshold for the Pest Fortune. The
advice names only the levers the model has, and says plainly when a Vacuum
cannot reach one pull at all -- a SkyMart Vacuum maxes at (100+100)x2 = 400,
under 600.

### A live bug found on the way

`src/loadout-capabilities-ui.js` had
`const totalPestFortune = ... killStats ...` written into `writeVacuumEntry`,
which has no `killStats`. Two things were broken on `main`:

- the render threw `totalPestFortune is not defined`, so the Vacuum loadout
  panel **never appeared** on the Pests page;
- every save of a Vacuum entry threw `killStats is not defined`.

Both are runtime scope errors inside a DOM enhancer, which is why no unit test
saw them. The panel now renders with all four stat tiles. A regression test
asserts the writer never reaches for render-scope stats.

### Verified

921 node + 7 python tests, overlay audit at 0 findings, pests sweep clean on all
three profiles, startup smoke test passing, and the panel driven in a browser at
1280px and 412px: 1,000 damage shown as `(400 base +100 books) x2`, one pull
normal and two under Derpy, 525 for the Beady build, and an honest "no
combination reaches one pull" on a SkyMart Vacuum. Both defect classes
re-introduced on purpose -- four tests fail.

## 0.48.0 -- what goes in each phase loadout

ChatGPT's `pest_loadout_progression` research landed on main. Audited against
the code first, then implemented the one gap worth closing now.

### The audit

Five data-model rules in the new research, checked against the app:

| Rule | State |
| --- | --- |
| three phase loadouts `farming` / `pest-spawn` / `pest-kill` | present |
| multiple pet copies with different pet items | works; each phase holds its own pet slot |
| never infer duplicate armor from phase separation | **not violated** -- nothing aggregates cost across setups, and synced items already dedupe by `itemUuid` |
| references from each phase to physical objects | missing -- each phase holds full copies |
| a tier distinguishing the two-armor baseline from the optional third | missing |

The timing rule -- the spawn loadout is a short phase, not the gear worn for
the whole cooldown -- is **not violated either**: the planner keeps three
separate Coins/h baselines and never blends them into one per-hour figure, so
it cannot be understating crop output. It simply does not model the split.

So: no wrong numbers anywhere. Two real gaps.

### What shipped

The Setups page showed three tabs and said nothing about what belongs in them
-- and three empty wardrobes imply you need three, which the research denies
outright. It now shows the researched loadout for the active phase, states the
**two**-set baseline in the place that implied three, and offers the one action
that baseline implies: copy the Farming armor into the Killing loadout.

The progression tier is selectable, and the third set is labelled a luxury with
the research's own reason -- it "must not be treated as the prerequisite".

### Copying, not referencing, and why

The research asks for references to shared physical objects. Ten modules read
`setup.slots` directly today, and quietly changing what that means under all of
them is how regressions happen. Copying records the truth -- the player really
does wear those pieces in both phases -- and since nothing infers ownership
from setup count, no figure is double-counted either way. The reference model
is the right end state and is recorded as the deeper follow-up.

### Two of my own mistakes, both repeats

I rebuilt the phase-to-setup-id mapping instead of importing
`setupIdForActivity`. The ids are not the mode names -- Spawning is stored as
`pest` -- so the Spawning phase silently showed the *Farming* loadout. A browser
probe caught it; no unit test would have.

And for the third time, a test forbade a phrase that the module's own comment
uses to reject that very claim. That is a helper now.

### Verified

932 node + 7 python tests, overlay audit at 0 findings, setups sweep clean on
all three profiles, startup smoke test passing, and all three phases plus the
luxury tier driven in a browser at 1280px and 412px. The architecture-diagram
test caught the new observer module and the diagram was updated to 25.
