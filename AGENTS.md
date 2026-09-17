# Farming420 Agent Rules

This file is the source of truth for future ChatGPT/Codex sessions working on this repository.

## Language

- The application UI must be English only.
- Source code, comments, identifiers, documentation, tests, commit messages and user-facing error messages must be English only.
- Do not add German fallback text.

## Product goal

Farming420 helps a Hypixel SkyBlock player move from their current farming profile to the most profitable sensible next state with as little manual data entry as possible.

The app is not a static maxing checklist. It must model the player's actual profile, current unlocks, owned gear, crop/tool progress, mutually exclusive farming setups, temporary buffs, pests, market prices and time requirements.

The primary optimization target is long-term coin profit. Progression gates, unlock requirements, account level benefits and time-gated upgrades are also valid recommendations when they improve or unlock later profit.

## Correctness rules

1. Never invent a SkyBlock mechanic, value, formula, drop chance, item price, API field or interaction.
2. Every non-trivial mechanic must have a source and a `lastVerified` date in the research/data layer. A `lastVerified` date is only meaningful against the last time the game changed: check it against the timeline in `docs/FARMING_HISTORY.md`, and treat any value verified before the newest relevant change as stale regardless of how confidently it was recorded.
3. Prefer official Hypixel patch notes and official Hypixel API documentation. **The official Hypixel Wiki was closed in July 2026** and its pages are gone, so `wiki.hypixel.net` is no longer a usable source and must not be cited. The community wiki at `hypixelskyblock.minecraft.wiki` is actively maintained and is the working reference for game mechanics; `hypixel-skyblock.fandom.com` is stale and has been observed carrying pre-rename item names, so prefer the community wiki over it and treat Fandom-only claims as uncertain. Use Elite SkyBlock/community sources for farming-specific mechanics where they are better. Mark uncertain information explicitly.
4. Coming-soon or Alpha-only content must never affect live recommendations or profit calculations.
5. Never add mutually exclusive setups together. Examples include active pets, incompatible reforges, alternative armor configurations and conditional buff states.
6. Calculate marginal value from the player's current setup. Do not rank upgrades by raw Farming Fortune alone.
7. All money calculations must distinguish acquisition cost, resale value, consumable cost, recurring cost and opportunity cost.
8. All time calculations must distinguish active play time, passive waiting/time gates and market/order waiting.
9. Preserve user data across app updates. Data schema changes require migrations and tests.
10. If a value cannot be derived reliably, keep it explicitly manual rather than silently estimating it.

## Architecture direction

- Frontend: installable offline-capable PWA, suitable for GitHub Pages.
- Persistent data: local-first, versioned browser storage with JSON backup/restore.
- Static fallback: support importing raw Hypixel JSON responses for development and privacy-first/manual workflows.
- Market data: cache Bazaar and auction-derived prices with timestamps and source metadata.
- Calculation engine: pure functions separated from UI so formulas can be unit tested.
- Research/data: source-controlled data files, not hard-coded scattered constants.

## Required major areas

- Account progression
- Garden progression
- All current crops
- Physical farming tools, including tools shared by multiple crops
- Armor and equipment
- Pets and pet items
- Accessories and permanent consumables
- Enchantments, reforges, gemstones and item upgrades
- Garden Chips
- Attribute Shards
- Pests and pest-specific farming setups
- Temporary buffs, God Potion/mixins/cookie-dependent effects
- Jacob's Contests and relevant unlock/reward progression
- Bazaar/Auction/NPC value inputs
- Profit calculator including normal crop drops, RNG/rare drops and pest EV
- Upgrade planner
- Setup/net-worth estimate
- Settings, backup/restore, app install/update status and data migration tools

## AI research knowledge base

Before changing Farming mechanics, progression, upgrade ranking, profit calculations, Pest/Overbloom logic, Greenhouse logic, Contest logic or recommendation logic, read `research/AI_KNOWLEDGE.md` and the canonical machine-readable knowledge file at `research/hypixel_farming_master_ai_2026-09-16.json`.

The machine-readable file is research input, not infallible game truth. Newer verified live Hypixel behavior overrides it. If it is older than the newest relevant Farming change, reverify and update the research layer before relying on it for calculations.

## UX direction

Use `DjKamma420/StundenplanNothing` as a structural quality reference, not as a visual copy. Important patterns to carry over:

- clear top-level navigation and compact settings hub
- local-first storage with explicit backup and restore
- schema/version-aware migrations
- offline service worker with coherent cache versioning
- update safety: never mix old and new application files
- installable PWA behavior
- mobile-first responsive design
- error states that explain what failed without destroying saved data
- validation workflows/tests for persistence and migration behavior

Keep the Farming420 interface layered and concise. The user should see the next useful decision, not every underlying data point at once.

## Merge policy

The repository owner has given a standing instruction: **merge a pull request as
soon as it is green, without asking again.**

"Green" means all of the following, checked rather than assumed:

1. every required check on the PR's current head has concluded `success`
2. `mergeable_state` is `clean` — no conflict against the base branch
3. the PR is not a draft
4. no review thread is waiting on an answer, and no reviewer has requested
   changes that are still open

If any of those does not hold, fix it and re-check. Do not merge past a red
check, and do not merge a PR whose head has moved since the checks ran: wait for
the new run.

This instruction covers merging only. It does not authorise force-pushing over
someone else's branch, rewriting published history, or skipping the correctness
rules above to get a check green.

## Development order

1. Establish versioned persistence, settings, backup/restore, PWA/update safety and English-only UI.
2. Build a documented profile-data adapter layer and raw JSON import.
4. Normalize items, tools, pets, gear and progression states from API data.
5. Build price service and source/timestamp handling.
6. Build mathematically tested profit engine.
7. Build recommendation engine with prerequisites and mutually exclusive setup logic.
8. Add advanced pest, contest and RNG expected-value models.

Read `docs/PRODUCT_SPEC.md`, `docs/PROFILE_DATA_MATRIX.md` and `docs/MATH_MODEL.md` before changing progression or calculation logic.
