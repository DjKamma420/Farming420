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
- `docs/PROFILE_MODEL.md` — normalized internal profile model and source provenance rules
- `docs/MATH_MODEL.md` — required calculation architecture and correctness rules

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
- normalized profile snapshots with explicit provenance and unknown/hidden states
- profile and Garden imports merge into one stable internal model instead of exposing raw API field names to future calculators
- a single validated backup contract (`src/backup.js`) shared by all backup/restore surfaces
- Settings reachable at every viewport width, including the mobile layout where the sidebar is hidden
- installable/offline PWA foundation
- coherent versioned service-worker cache so application updates do not mix old and new files
- a dependency-free test suite covering migrations, backups, Hypixel adapters, normalized profile data, data-layer invariants and CSP-safe markup
- JavaScript validation, service-worker cache completeness and tests through GitHub Actions
- automatic GitHub Pages deployment from `main`

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

Until that proxy exists, the app supports importing raw Hypixel JSON responses. Public resource endpoints can still be used directly where appropriate.

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
│  ├─ migrations.js
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
│  ├─ migrations.test.js
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

It covers the migration registry, backup contract, raw Hypixel JSON adapters, normalized profile model, data-layer invariants (all 13 crops, the shared Eclipse Hoe, sourced entries, coming-soon content staying out of the live list) and the markup rules the shipped Content Security Policy imposes.

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
2. **Expand raw Hypixel adapters and normalized profile coverage; build the production API proxy.** In progress.
3. Decode profile item NBT for farming tools, armor, equipment, enchantments, reforges, gemstones and counters.
4. Add Bazaar and auction valuation services with timestamps and confidence.
5. Build and test the crop/profit calculation engine.
6. Build prerequisite-aware action recommendations and payback views.
7. Add advanced pest, contest, RNG-drop and setup-specific models.

## Deployment

GitHub Pages is enabled and deploys from `main`.

Live app: **https://djkamma420.github.io/Farming420/**
