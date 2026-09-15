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
