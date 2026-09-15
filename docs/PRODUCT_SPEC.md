# Farming420 Product Specification

## Mission

Farming420 is a decision-support and progression application for Hypixel SkyBlock farming.

The app should answer four questions with as little manual input as possible:

1. **What does my farming profile look like right now?**
2. **What should I do or buy next?**
3. **How much does that step improve coins per hour, progression, unlocks or future options?**
4. **What is the most profitable farming setup for a specific crop and activity right now?**

The product must optimize for correctness before convenience. A recommendation is only useful when the underlying game mechanic, market value, probability and prerequisite chain are modeled correctly.

## Core principles

### 1. Profit-first, progression-aware

The main ranking target is expected long-term coin profit. However, the planner must also recommend progression steps when they unlock substantially better future profit or are hard gates.

Examples:

- Farming Skill levels
- Garden levels
- crop upgrades
- Garden plots
- tool tier/level gates
- Anita upgrades
- Community Shop upgrades
- visitor milestones
- account-bound unlocks
- collection or contest prerequisites

A recommendation can therefore be an item purchase, a grind, an account upgrade, an unlock, a contest target or a waiting/time-gated action.

### 2. Profile-aware instead of checklist-based

The app must evaluate the player's current state. It must not assume that every possible Farming Fortune source can be active simultaneously.

Examples of separate states/setups:

- normal crop farming armor versus pest-focused armor
- Rose Dragon versus Mooshroom Cow versus Hedgehog or other progression pets
- different pet items
- different tools and shared tools such as Eclipse Hoe
- Blessed versus Bountiful or other mutually exclusive reforges
- contest-specific swaps
- temporary buff states
- day/night conditional Attribute Shards
- pest-on-plot conditional effects

### 3. Source-driven math

Every model must state:

- the formula
- the source of each constant
- the unit
- whether the value is exact, derived, market-dependent or uncertain
- the date it was last verified

Unknown mechanics must remain manual/unknown. The engine must never fill gaps with plausible-looking guesses.

### 4. Local-first and update-safe

Inspired by the mature persistence/update patterns in `DjKamma420/StundenplanNothing`:

- user data survives application updates
- profile data uses a versioned schema
- migrations are explicit
- backup/restore is available in Settings
- imported backups are validated and sanitized
- an incompatible newer data schema must never be overwritten by an older app version
- service-worker updates must not mix old and new application files
- the app remains usable offline with the last valid cached version

### 5. English only

The complete project is English-only:

- UI
- code
- comments
- docs
- tests
- errors
- file names where practical

## Main navigation

The target navigation should stay small even when the underlying data model grows.

### Dashboard

Shows only:

- current profile and selected SkyBlock profile
- data freshness/API status
- selected crop/activity
- expected current coins/hour
- next recommended action
- next 3-5 alternatives
- major blockers/unlocks
- account/crop/tool/setup completion summaries

### Profile

Contains automatically detected and manually overridden account state:

- Farming Skill
- Garden level/XP
- account upgrades
- Anita progression
- Garden plots
- visitors
- permanent account bonuses
- API visibility status
- last sync

### Crops

One workspace per crop. Each crop workspace contains tabs/layers for:

- Progression
- Tool
- Normal Farming Setup
- Pest Setup
- Contest Setup
- Profit

### Setups

Reusable setup editor for:

- armor
- equipment
- pet
- pet item
- accessory-dependent state
- shards
- chips
- temporary buffs

The same owned item can participate in multiple saved setup presets without being double-counted in net worth.

### Planner

Ranks actions, not just items.

Each recommendation should show:

- action
- prerequisite chain
- cost
- recoverable/resale value
- active grind time
- passive wait time
- estimated profit/hour before and after
- marginal coins/hour
- payback time
- Farming Fortune/stat delta where relevant
- unlocks enabled by the action
- confidence/data quality

### Profit Calculator

Calculates expected value for a selected crop, setup and activity.

Inputs include:

- blocks broken per second
- effective uptime
- crop-specific mechanics
- Farming Fortune
- crop yield multipliers
- pet effects
- armor/equipment effects
- rare drops
- RNG drops
- pest spawn/drop expected value
- visitor/contest value where attributable
- Bazaar/NPC/Auction sale route
- consumable/temporary costs

The UI may expose a conventional target such as 20 blocks/s, but the default realistic sustained assumption should be modeled separately and must be evidence-based. Do not hard-code 19.5 blocks/s until the exact model and assumptions are documented in `MATH_MODEL.md`.

### Settings

Use the settings quality bar from StundenplanNothing.

Sections:

- Profile & API
- Calculation assumptions
- Prices
- Backup & Restore
- App & Updates
- Advanced/Developer

Required capabilities:

- export current Farming420 data as a JSON file
- import a JSON backup
- schema/version metadata in every backup
- reset with explicit confirmation
- raw Hypixel JSON import for development/fallback
- install/PWA instructions or install button where browser-supported
- show app version and data schema version
- show last profile sync and price sync
- optional auto-backup support where File System Access API is available

## Profile synchronization architecture

### Production target

A public production Hypixel API key must not be shipped in browser JavaScript.

Target architecture:

```text
Browser/PWA (GitHub Pages)
        |
        | player/profile request
        v
Small serverless proxy
        |
        | server-held Hypixel API key
        v
Hypixel Public API
```

The proxy should:

- keep the Hypixel key secret
- enforce rate limits
- cache expensive/profile-neutral resources
- normalize upstream errors
- expose only fields Farming420 needs where practical
- never store user profiles permanently unless explicitly designed later

### Static fallback

Before the proxy exists, or for debugging/privacy workflows:

- import raw `/v2/skyblock/profiles` JSON
- import raw `/v2/skyblock/profile` JSON
- import raw `/v2/skyblock/garden` JSON
- optionally import exported processed profile snapshots

## Market data

### Bazaar

Use current Bazaar data for items with a Bazaar market.

Keep both:

- instant-sell value
- realistic sell-order value

Never treat a displayed buy price as obtainable liquidation value.

### Auction House

Auction-derived prices need a separate estimator because current auctions are listings, not guaranteed sales.

The estimator must consider where possible:

- recent ended auctions
- item ID
- rarity
- recombobulation
- enchantments
- gemstones
- item upgrades
- counters/tool levels
- attributes/shards where encoded

For difficult unique items, mark valuation confidence rather than pretending there is a precise single price.

### NPC

NPC value is a valid floor/alternative route for relevant drops.

## Net worth / setup value

The app should provide at least two values:

- **liquidation value:** expected recoverable coins if the farming assets are sold now
- **replacement value:** estimated cost to rebuild the detected farming setup

Account-bound/untradeable progress is not given fake coin value. It can instead show time/progression value.

## Recommendation engine

The planner operates on actions with prerequisites.

An action record should eventually resemble:

```js
{
  id,
  type,                 // purchase, grind, unlock, upgrade, wait, contest, craft
  appliesTo,
  prerequisites,
  currentState,
  targetState,
  directCost,
  resaleDelta,
  recurringCost,
  activeTimeSeconds,
  passiveTimeSeconds,
  statDelta,
  profitDeltaPerHour,
  unlocks,
  confidence,
  sources,
  lastVerified
}
```

Ranking must support multiple views:

- best immediate profit improvement
- best payback
- best zero/low-cost action
- required unlock path
- long-term maxing path

Do not collapse all of these into one misleading score unless the weighting is explicit and user-visible.

## Farming setups to model explicitly

At minimum:

- normal crop farming
- pest spawning/farming
- pest vacuum/drop collection
- Jacob's Contest
- crop-specific profit setup
- progression/budget setup
- maxed/endgame setup

Pets must be modeled as alternatives rather than additive stats. Early/midgame alternatives such as Mooshroom Cow and Hedgehog must remain part of the path even when an endgame pet such as Rose Dragon is the final target.

## Pest expected value

Pest profit must eventually account for:

- pest spawn rate/chance
- number of pests generated over time
- pest type distribution when relevant
- normal drops
- rare/RNG drops
- Farming Fortune/drop multipliers that apply to those drops
- vacuum-related effects
- pest-specific temporary buffs
- time spent leaving crop farming to kill/vacuum pests
- downtime/opportunity cost

The engine must not simply add pest loot EV to crop profit without subtracting the time cost of handling pests.

## Contest modeling

Jacob's Contests should eventually model:

- crop-specific contest target
- personal best/current medals if data is available
- score projection from current setup
- expected medal/ticket/reward value
- contest-only gear swaps and buffs
- opportunity cost versus normal farming
- progression unlocks that require contest participation/rewards

Current official API documentation does not expose a dedicated Jacob's Contest endpoint. Treat contest history/current personal-best data as partially manual or external-source-dependent until verified otherwise.

## Definition of done for calculations

A calculation feature is not complete until:

1. formula is documented
2. constants have sources
3. units are explicit
4. boundary cases are tested
5. mutually exclusive state is tested
6. missing API data has a defined fallback
7. market data has a timestamp
8. update/migration does not destroy saved user data

## Near-term implementation order

### Foundation

- English-only conversion
- versioned state schema
- Settings page
- backup/restore
- PWA/service worker/update safety
- source-of-truth docs

### Profile import

- raw JSON import adapters
- profile selection
- Farming Skill XP -> level
- Garden crop upgrades
- Garden plots/XP/visitor data
- Community Shop/account upgrades
- item/inventory NBT decoding
- automatic tool/armor/equipment/pet detection

### Economics

- Bazaar price service
- NPC fallback
- auction valuation layer
- setup value

### Calculation engine

- crop throughput
- expected crop value
- rare-drop EV
- pest EV
- downtime model
- contest projection

### Planner

- prerequisite graph
- action generation
- marginal profit calculation
- payback/time-to-unlock views
- endgame path validation
