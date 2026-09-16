# Farming420

Farming420 is a profile-aware **Hypixel SkyBlock farming progression and profit planner**.

Live app: **https://djkamma420.github.io/Farming420/**

The goal is not to show a giant maxing checklist. The app should understand the player's current account, crops, physical farming tools, owned setups, unlocks and market conditions, then show the most useful next actions toward a maximized and profitable farming profile.

## Product direction

The application is designed around these layers:

**Account → Crop → Physical Tool → Setup → Profit → Next Action**

The main optimization target is long-term coin profit, while progression gates, unlock requirements, active grind time and passive/time-gated upgrades remain part of the recommendation path.

Read these files before changing progression or calculation logic:

- `AGENTS.md` — rules and source of truth for future development sessions
- `docs/PRODUCT_SPEC.md` — complete product goal and feature specification
- `docs/PROFILE_DATA_MATRIX.md` — what can be imported automatically from Hypixel and what still needs manual/external data
- `docs/PROFILE_MODEL.md` — normalized internal profile model, automatic item import and source provenance rules
- `docs/MATH_MODEL.md` — required calculation architecture and correctness rules
- `docs/VERIFIED_MECHANICS.md` — mechanics confirmed against a current source,
  with dates, plus the corrections and the gaps the verification pass found
- `docs/FARMING_HISTORY.md` — how farming has changed since 2021, which is what
  makes a verification date mean anything, plus the source's own caveats

## Current foundation

- all 13 current Garden crops are represented
- crop progress is stored separately per crop
- physical tool progress is stored separately per tool
- Sunflower and Moonflower correctly share one Eclipse Hoe state
- farming tool levels, Mk. II/Mk. III and Overclocker 3000 progression are represented
- account, crop, tool, gear, pets, Garden Chips, Attribute Shards, buffs and pests are separate layers
- local profile storage in the browser
- versioned data schema with ordered migrations
- full JSON backup and restore in Settings
- raw Hypixel Garden JSON import
- raw Hypixel profile/profiles JSON import
- Farming Skill XP detection and level derivation through Hypixel's current public skill resource table
- Garden crop-upgrade and unlocked-plot import
- live sync from your own API key, run automatically once it is entered
- synced values written straight onto the cards and marked as `synced`
- item-centric **Setups**: pick the piece, its reforge, enchantments,
  recombobulator state and gemstones, per wearable configuration
- an optional server-side proxy so the key can stay off the client
- current `pets_data.pets` import with hidden-data semantics instead of treating missing data as no pets
- normalized profile snapshots with explicit provenance and unknown/hidden states
- profile and Garden imports merge into one stable internal model instead of exposing raw API field names to future calculators
- dependency-free Base64/gzip/NBT decoding of Hypixel inventory data
- automatic generic item import for inventory, armor, equipment, Ender Chest, Personal Vault, backpacks, talisman bag and saved armor/equipment loadouts when the API exposes them
- generic extraction of SkyBlock item IDs, UUIDs, reforges, all enchantment names/levels, gemstones, attributes, Farming for Dummies, recombobulation, Cultivating counters, Overclocker levels and item tiers
- UUID de-duplication of physical items while preserving all observed locations
- hidden inventory API data keeps last-known item data as stale instead of replacing it with an empty setup
- a single validated backup contract (`src/backup.js`) shared by all backup/restore surfaces
- Settings reachable at every viewport width, including the mobile layout where the sidebar is hidden
- installable/offline PWA foundation
- coherent versioned service-worker cache so application updates do not mix old and new files
- a dependency-free test suite covering migrations, backups, Hypixel adapters, NBT decoding, item/profile normalization, data-layer invariants and CSP-safe markup
- JavaScript validation, service-worker cache completeness and tests through GitHub Actions
- automatic GitHub Pages deployment from `main`

## Getting your data in

Open **Settings** (top bar) and fill in two fields:

1. **Your Hypixel API key** — create one at
   [developer.hypixel.net](https://developer.hypixel.net/).
2. **Your Minecraft UUID** — the 32-character id of your account, with or
   without dashes.

That is all. The moment both are present Farming420 syncs on its own, and it
syncs again whenever you change either field or pick a different profile. It
reads your selected SkyBlock profile and its Garden and writes every value it
can derive onto the cards, where they show a `synced` badge. Editing such a
value by hand overrides it until the next sync.

The key is stored in your browser only, under a storage entry separate from the
app state, so it is **never** written into an exported backup, and it is sent
only to `api.hypixel.net`.

### Why a UUID and not a username

The app asks for a UUID because a static site cannot turn a username into one
reliably: Hypixel's `name` parameter is deprecated and not guaranteed correct,
`api.mojang.com` sends no CORS headers, and the `/key` endpoint that used to
return the key owner's UUID was disabled in August 2023. A UUID field needs no
third-party service and cannot silently resolve to the wrong account.

## Guide 0-60

**Guide 0-60** in the sidebar is a staged walkthrough from the first crop to a
maxed setup, and it follows your own Farming level: sync your profile and it
opens at the stage you are actually in, marks the armour sets you have reached
and names the next one.

Each of the five stages lists its concrete steps. Below them:

- **Pets** are grouped by what you are doing -- pushing levels, farming crops,
  spawning Pests, killing Pests -- and each option carries a tier (best, equal,
  slightly worse, budget) and the reason, including the real breakpoints such as
  Mooshroom Cow beating a Legendary Elephant above about 1,429 Strength. Tap the
  one you use and it is remembered.
- **Enchantments** are shown as ladders: what a level gives, the maximum, and
  where each level comes from -- plus gates like Turbo-Crop IV needing a Bronze
  contest result in that crop before it does anything.
- **The three-phase loadout** is laid out from budget to hypermax, because one
  setup for farming, spawning and killing always gives something up.

Nothing here is scored or ranked by a computed number: that needs the profit
engine, and inventing figures would break the correctness rules. The one
quantitative comparison is quoted from the source with its breakpoint.

## Setups

**Setups** in the sidebar is the gear editor. A setup is one complete
configuration you can actually wear, and setups sit beside each other -- Normal
Farming, Pest Farming, Jacob Contest by default, renameable and extendable --
because they are alternatives, never added together.

Each setup has slots for armour, equipment and the pet. Open a slot and you pick
the item, then its reforge, its enchantments and their levels, whether it is
recombobulated, and its gemstones. **Fill from sync** pre-fills the slots from
the gear your last profile sync found you wearing; a slot you filled in yourself
is never overwritten by it.

The item picker is filled from the official keyless
`/v2/resources/skyblock/items` resource, so no item list is hard-coded or
invented; reforge, enchantment and gem suggestions come from your own synced
items plus what `src/data.js` already names. Free text is accepted everywhere, so
a missing suggestion never blocks you.

Items sitting in storage are not assumed to be worn: only the armour, equipment
and active-pet data from your profile is used to pre-fill.

**Your active setup drives the gear cards.** The set-wide bonuses -- Mossy on
full armour, Pesterminator on full armour, Rooted on full equipment and so on --
are worked out from the setup you have open, and they update the moment you
change it. Take one piece out of the set and the card clears again, because a
derived value should never outlive what supports it. A class you have not
touched falls back to the gear your last sync detected, so the cards still work
before you ever open this page. Values you typed in by hand are never
recomputed away.

The farming tool is deliberately not a setup slot. It is already crop-scoped and
filled automatically by the sync, and a second manual copy would give the same
value two competing sources.

### Where do I find a value?

The app asks for values you have to read out of the game, which only helps if
you can find them. Two places answer that:

- **What to enter** in the sidebar lists everything a sync cannot fill, biggest
  win first, with each entry's explanation and a direct link to its source.
- Every card's detail drawer has a **Where do I find this?** section.

An entry is one of three things: filled by the sync and needing no lookup at
all; carrying a documented in-game location; or not documented yet, in which
case the app says so and offers the source instead of guessing at a menu path.
A wrong path is worse than none, so `src/help-locations.js` never invents one.
See [`docs/FINDING_VALUES.md`](docs/FINDING_VALUES.md).

Today 20 of 77 entries are filled by the sync, and the in-game locations for the
remaining 57 still need a research pass.

### What gets filled in

Farming Skill level, Garden plots, per-crop Garden upgrades, and — from the
decoded item NBT of your farming tools — Farming for Dummies, Overclocker 3000,
Dedication, Cultivating, Harvesting, Turbo-Crop, the reforge, a Perfect Peridot
and the Recombobulator, plus set-wide armour and equipment reforges and
enchantments when every slot is visible.

Entries that would need an item-id table this repository has not verified — tool
Mk. II/III tiers, armour set identity, accessories, pets, chips and shards — are
deliberately left for you to enter, and reported rather than silently set to
zero. `docs/PROFILE_DATA_MATRIX.md` lists exactly what is mapped and what is not.

### Without a key

- **A proxy** keeps the key on a server instead: deploy `proxy/` and put its URL
  into Settings. See [`proxy/README.md`](proxy/README.md). A proxy URL overrides
  any stored key.
- **Raw JSON import** needs no key at all and still works entirely offline.

## Hypixel API architecture

A production Hypixel API key must **not** be embedded in a public GitHub Pages frontend.

The target architecture is:

```text
Farming420 PWA / GitHub Pages
            |
            | player/profile request
            v
small server-side/serverless proxy
            |
            | private Hypixel API key
            v
Hypixel Public API
```

The proxy now exists in [`proxy/`](proxy/README.md) and is optional: by default
each visitor supplies their own key, which keeps Farming420 a pure static site
with nothing else to deploy. Raw JSON import remains available and needs no key
at all. Public resource endpoints are always called directly.

See `docs/PROFILE_DATA_MATRIX.md` for the exact automation plan and `docs/PROFILE_MODEL.md` for the internal normalized representation.

## Settings and data safety

The persistence/update model is intentionally similar to the proven patterns in `DjKamma420/StundenplanNothing`:

- user state is local-first
- backups contain format and schema versions
- newer/incompatible backups are not silently overwritten
- restore validates the backup before replacing local state
- the PWA cache is versioned as a coherent unit
- a failed update should leave the previous coherent application version available

### Data schema and migrations

`DATA_SCHEMA_VERSION` in `src/config.js` is the version of the locally stored state. `src/migrations.js` holds an ordered registry of migrations; each entry raises the stored state to one specific version and must be idempotent, because the same migration also runs when an older backup is restored.

Current schema: **3**.

- schema 1 → 2: move crop and physical-tool progress into their correct scoped buckets
- schema 2 → 3: add the persistent normalized profile snapshot boundary without fabricating imported data

Rules for changing the schema:

1. add a migration entry instead of editing an existing one — old backups still need to arrive at the old versions
2. raise `DATA_SCHEMA_VERSION`
3. add tests to `tests/migrations.test.js` covering the old shape, the migrated shape and idempotence

State written by a newer app version is never overwritten: it is loaded read-only and reported in the console, and a newer backup is refused with an explanatory message rather than partially imported.

## Project structure

```text
Farming420/
├─ AGENTS.md
├─ README.md
├─ index.html
├─ manifest.webmanifest
├─ sw.js
├─ assets/
│  └─ icon.svg
├─ docs/
│  ├─ PRODUCT_SPEC.md
│  ├─ PROFILE_DATA_MATRIX.md
│  ├─ PROFILE_MODEL.md
│  └─ MATH_MODEL.md
├─ src/
│  ├─ app.js
│  ├─ backup.js
│  ├─ config.js
│  ├─ data.js
│  ├─ enhancements.js
│  ├─ enhancements.css
│  ├─ foundation.js
│  ├─ foundation.css
│  ├─ hypixel-import.js
│  ├─ item-normalizer.js
│  ├─ migrations.js
│  ├─ nbt.js
│  ├─ profile-items.js
│  ├─ profile-normalizer.js
│  ├─ profile-sync.js
│  └─ styles.css
├─ scripts/
│  └─ check-sw-manifest.js
├─ tasks/
│  └─ todo.md
├─ tests/
│  ├─ backup.test.js
│  ├─ csp.test.js
│  ├─ data.test.js
│  ├─ hypixel-import.test.js
│  ├─ item-normalizer.test.js
│  ├─ migrations.test.js
│  ├─ nbt-fixture.js
│  ├─ nbt.test.js
│  ├─ profile-items.test.js
│  ├─ profile-normalizer.test.js
│  └─ profile-sync.test.js
└─ .github/workflows/
   ├─ validate.yml
   └─ pages.yml
```

## Run locally

No build step is required.

```bash
python3 -m http.server 4173
```

Open `http://localhost:4173`.

A local HTTP server is required for module loading, service-worker behavior and PWA testing.

## Tests

The test suite uses the built-in Node test runner and has no dependencies:

```bash
npm test
```

It covers the migration registry, backup contract, raw Hypixel JSON adapters, Base64/gzip/NBT inventory decoding, generic item normalization, profile item extraction, the normalized profile model, data-layer invariants and the markup rules the shipped Content Security Policy imposes.

Because `index.html` ships `script-src 'self'; style-src 'self'`, generated markup must not contain `style="..."` attributes or inline `on*` handlers — the browser drops both silently. Set widths through the CSSOM (`element.style.width`) and attach listeners in JavaScript.

## Calculation policy

The current planner is still an early marginal-Fortune prototype. It is **not yet the final profit recommendation engine**.

The final engine must calculate the player's before/after setup as pure, testable states and derive:

- expected coins per hour
- marginal coins per hour
- acquisition cost
- recoverable/resale value
- recurring costs
- active grind time
- passive waiting time
- payback time
- prerequisite/unlock paths
- data confidence and freshness

Normal crop drops, RNG drops, pest expected value, downtime, contest rewards and market-sale routes must be modeled explicitly rather than approximated by a single Fortune score.

## Development order

1. ~~Finish English-only runtime, versioned persistence, Settings and PWA/update safety.~~ Done.
2. **Expand raw Hypixel adapters and normalized profile coverage; build the production API proxy.** In progress; profile, Garden, pets and core item/NBT import are implemented.
3. **Turn normalized items/pets into mutually exclusive farming setup candidates and verify every mechanic in `src/data.js`.** Next correctness block.
4. Add Bazaar and auction valuation services with timestamps and confidence.
5. Build and test the crop/profit calculation engine.
6. Build prerequisite-aware action recommendations and payback views.
7. Add advanced pest, contest, RNG-drop and setup-specific models.

## Deployment

GitHub Pages is enabled and deploys from `main`.

Live app: **https://djkamma420.github.io/Farming420/**
