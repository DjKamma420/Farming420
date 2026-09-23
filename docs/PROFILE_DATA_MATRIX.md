# Profile Data Matrix

This document tracks what Farming420 can obtain automatically and what still requires manual input or a derived model.

Last research pass: **2026-09-15**.

## Source hierarchy

1. Official Hypixel Public API documentation: `https://api.hypixel.net/`
2. Official Hypixel PublicAPI repository/discussions: `https://github.com/HypixelDev/PublicAPI`
3. Official Hypixel patch notes/forums
4. Official Hypixel Wiki where available
5. Elite SkyBlock / farming-community sources
6. Mature open-source profile viewers such as SkyCrypt for implementation/reference patterns

Third-party profile viewers are not authoritative for game mechanics. They are useful for discovering parsers, field mappings and edge cases that must then be verified.

## Architecture constraint

Hypixel endpoints that return player/profile data require an API key. A production key must not be embedded in a public browser bundle.

Therefore:

- **Production:** Farming420 frontend -> Farming420 serverless proxy -> Hypixel API.
- **Development/static fallback:** import raw Hypixel JSON files.
- Never ask users to paste a shared Farming420 production API key into the client.

## Player identity

Every keyed endpoint is addressed by UUID, and the app asks for that UUID
directly. Resolving a username in the browser is not possible without adding a
third party, for three separate reasons:

1. Hypixel's own `name` parameter is documented as **deprecated**, separately
   rate limited, not guaranteed to return correct data and removable at any
   time.
2. `api.mojang.com` sends no `Access-Control-Allow-Origin` header, so a browser
   cannot read its response.
3. The `/key` endpoint that used to return the key owner's UUID was **disabled
   in August 2023**, so the API key itself no longer identifies a player.

An earlier build resolved usernames through a chain of Mojang endpoints with a
CORS-enabled community mirror as fallback. It was removed: it did not work
reliably in practice, and a UUID field needs no third party, cannot silently
return the wrong account and keeps the username out of any external request.

## Access modes

| Mode | Where the key lives | When to use |
| --- | --- | --- |
| Own key | The visitor's `localStorage`, under a storage entry separate from the app state so it is never written into a backup. Sent only to `api.hypixel.net`. | Default. Needs no deployment; the app stays a static GitHub Pages site. |
| Proxy | A server-side deployment (`proxy/`). The browser holds no key. | When the key must not be in a browser. Requires adding the proxy origin to `connect-src` in `index.html`. |

A personal key that the user pastes into their own browser is not the shared
production key baked into a public bundle that the architecture constraint
above forbids.

## Live sync request sequence

`src/live-sync.js` performs the smallest sequence that fills the most fields:

1. `/v2/resources/skyblock/skills` (keyless) for the Farming level table
2. `/v2/skyblock/profiles?uuid=...` -> profile selection, Farming XP, pets,
   community upgrades, Pest Bestiary kill counters, item NBT
3. `/v2/skyblock/garden?profile=...` -> crop upgrades, plots, visitors,
   composter, resources collected

Failure policy:

- a failed profiles request aborts the sync; there is nothing to normalize
- a failed Garden request keeps the profile data and reports a warning
- a failed skill table leaves the Farming level `null` rather than guessed;
  the raw XP is still stored

Both payloads go through the same normalizers as raw JSON import, so live sync
and file import produce identical, provenance-bearing snapshots.

## What a sync writes onto the cards

The snapshot records what the API said; `src/snapshot-apply.js` projects it onto
the progression entries the app's cards read, and stamps each one as auto so the
UI can show a `synced` badge.

A mapping is only allowed where the link is self-evident rather than remembered,
because rule 1 forbids inventing a field or mechanic:

| Source | Written to | Why it is safe |
| --- | --- | --- |
| Derived Farming level | Farming Skill level | Already derived from the official skill table. |
| `garden.unlocked_plots_ids` | Garden plots unlocked | Counted, then clamped to the entry maximum. |
| `garden.crop_upgrade_levels` | Crop upgrade, per crop | Direct per-crop field. |
| `farming_for_dummies_count` | Farming for Dummies | The NBT field names the mechanic. |
| `levelable_overclocks` | Overclocker 3000 | The NBT field names the mechanic. |
| `rarity_upgrades` | Recombobulator effect | The NBT field names the mechanic. |
| `enchantments.dedication` / `.cultivating` / `.harvesting` | the matching tool entries | `enchantments` is keyed by the enchantment's own id. |
| `enchantments.turbo_*` | Turbo-Crop | Matched by prefix, so no crop suffix has to be known. |
| `enchantments.pesterminator` / `.sunset` / `.green_thumb` | the matching set entries | Same keying, applied only when every slot carries it. |
| `modifier` | Blessed / Bountiful / Mossy / Rooted / Beady | `modifier` is the reforge's own lowercase name. |
| `gems` | Perfect Peridot entries | Slot type and quality are already in the decoded object. |

Which crop a tool belongs to is decided by matching the item's display name
against the tool names already in `src/data.js`, not against an item-id table.

### Deliberately not mapped

These need an item-id or effect table this repository has not verified, so they
stay unmapped and are reported to the user instead of being left at zero as if
the API had denied them:

- Tool Mk. II / Mk. III tiers
- armour and equipment set identity (Helianthus, Blossom, Zorro's Cape)
- accessories, relics and permanent consumables
- pet choice and pet items
- Garden Chips, Attribute Shards, buffs and pest setups

Set-wide entries ("on full armor", "on full equipment") are only written when
every slot is visible and carries the effect; an incomplete set is reported.

## Official Hypixel endpoints relevant to Farming420

| Endpoint | Key required | Use |
| --- | --- | --- |
| `/v2/skyblock/profiles?uuid=...` | yes | Find all SkyBlock profiles for a player and selected profile state. |
| `/v2/skyblock/profile?profile=...` | yes | Full profile/member data. Exact fields can depend on the player's in-game API settings. |
| `/v2/skyblock/garden?profile=...` | yes | Garden XP, visitor/commission data, crop upgrades, unlocked plots, collected resources, composter data. |
| `/v2/skyblock/museum?profile=...` | yes | Museum items/value where useful for ownership cross-checks. |
| `/v2/skyblock/bazaar` | yes | Current Bazaar order books/summary data for crop and drop valuation. |
| `/v2/skyblock/auction` | yes | Auction data by player/profile/auction UUID. |
| `/v2/skyblock/auctions_ended` | no key shown in current docs | Recently ended auctions; useful as one input for market estimates, not a complete historical price source. |
| `/v2/resources/skyblock/skills` | no | Skill level definitions/XP requirements. |
| `/v2/resources/skyblock/items` | no | Canonical item metadata and IDs. |
| `/v2/resources/skyblock/election` | no | Current mayor/election effects where farming profit changes. |

## Garden endpoint: confirmed automatic fields

The current official Garden response documents these fields directly:

| Data | Official field | Farming420 use | Status |
| --- | --- | --- | --- |
| Crop upgrade levels | `garden.crop_upgrade_levels` | Set per-crop crop-upgrade progress automatically. | AUTO |
| Unlocked plots | `garden.unlocked_plots_ids` | Account/Garden progression and plot Fortune. | AUTO |
| Garden XP | `garden.garden_experience` | Derive Garden level when level table is verified. | AUTO/DERIVED |
| Collected crop resources | `garden.resources_collected` | Raw cumulative Garden crop collection counters. | AUTO |
| Crop Milestones | derived from `garden.resources_collected` against the current 13 crop threshold tables | Rose Dragon Rosy Scales, Dedication/context and progression. Maximum current total is 598 (13 × 46). Missing counters stay unknown. | DERIVED |
| Visitor visits | `garden.commission_data.visits` | Visitor progress/context. | AUTO |
| Completed visitors | `garden.commission_data.completed` | Visitor progress. | AUTO |
| Total visitors completed | `garden.commission_data.total_completed` | Equipment/visitor scaling models. | AUTO |
| Unique NPCs served | `garden.commission_data.unique_npcs_served` | Green Thumb/visitor-dependent effects. | AUTO |
| Composter state | `garden.composter_data` | Garden economics/progression if modeled later. | AUTO |
| Composter upgrades | `garden.composter_data.upgrades` | Unlock/progression state. | AUTO |
| Active Garden commissions | `garden.active_commissions` | Optional task/progression support. | AUTO |

## Profile endpoint: automatic/derivable areas

The official docs state that profile data contains SkyBlock stats/objectives and that SkyBlock inventory/item data is delivered as base64 encoded gzipped NBT where applicable. Exact availability can depend on the player's API settings.

### High-confidence automatic targets

| Area | What to derive | Notes |
| --- | --- | --- |
| Farming Skill | Farming XP -> Farming level | Read member skill XP, map against `/v2/resources/skyblock/skills`. Field mapping must be verified against current v2 profile structure before production parser is finalized. |
| Selected profile | `selected` profile flag | Profiles endpoint. |
| Profile name/mode | cute name, Ironman/etc. | Profiles/profile endpoint. |
| Community upgrades | claimed/current upgrade state | Profile exposes `community_upgrades`; map exact farming-related upgrade IDs before enabling automatic recommendations. |
| Booster Cookie active state | profile field exists according to Hypixel PublicAPI feature history | Verify current v2 path in a real/current payload before parser activation. |
| Pets | owned pets, level/XP, held items where exposed | Profile data; validate active/equipped state. |
| Pest Bestiary | `member.bestiary.kills` -> eligible Pest family tiers for Brown Bandana | Normalized automatically for the 15 current eligible Pest families. Missing or unmigrated Bestiary data stays unknown; Zombuddy and Timestalk Clone are excluded from Brown Bandana. |
| Armor/equipment | item NBT | Requires inventory API visibility and NBT parsing. |
| Farming tools | item NBT across accessible inventories/storage | Parse item ID, rarity, upgrades, enchantments, gemstones, counters and custom data. Storage coverage must be verified. |
| Enchantments | item NBT | Can generally be parsed from item data when the item itself is visible. This means many tool/armor enchantments should not require manual entry. |
| Reforge | item NBT/modifier data | Auto when item visible. |
| Gemstones | item NBT | Auto when item visible and schema mapping is implemented. |
| Recombobulation/rarity upgrades | item NBT | Auto when item visible. |
| Farming for Dummies/books | item extra attributes where encoded | Verify exact current NBT key. |
| Tool counters/levels | item extra attributes where encoded | Verify current Greenhouse tool NBT representation. |
| Accessories | accessory bag/inventory data when API-visible | Needed for Fermento Artifact, Helianthus Relic, Relic of Power, Anita accessory line, etc. |
| Sacks/material inventory | profile fields where available | Useful for net worth and owned consumables, not necessarily proof of permanent consumption. |

### Data that may be automatic but requires field verification

Do not implement these from memory. Each needs a real payload/schema research task first.

- Anita Extra Farming Fortune tier
- Garden Bestiary Farming Fortune beyond the Brown Bandana-specific eligible Pest tier sum
- Greenhouse Mutation Analysis rewards
- permanent consumables such as Rosewater Flask stacks
- exportable crop items / permanent crop bonuses
- Chocolate Factory farming bonuses
- Garden Chips and their levels
- Attribute Shards and active shard configuration
- personal-best farming contest perk
- current temporary Pesthunter Phillip buff
- God Potion/mixin state and exact active mixins
- Garden time/day-night setting used by conditional shards
- Hypercharge state/level and which temporary sources it affects

These are **AUTO_CANDIDATE**, not `AUTO`, until a current API path is confirmed.

## Known incomplete/missing areas

### Jacob's Contests

The current official API documentation does not show a dedicated Jacob's Contest endpoint. Hypixel PublicAPI discussions still identify Jacob's Contest history as a requested/missing feature. Community tools may obtain contest data through mod/crowdsourced methods.

Current Farming420 treatment:

- contest schedule: external/current event source may be added later
- personal contest history/PB: manual or external adapter until official/current source is verified
- contest gear/setup: automatic from owned items where possible
- projected contest score: calculated by Farming420 from current setup once the farming-output model is complete

### Private island/Garden world contents

Hypixel staff have stated that island/Garden world data is not planned to be exposed as raw world data. Therefore items stored only in world containers/displays/minions cannot be assumed visible through the profile API.

This matters for net worth and ownership detection.

### One-time consumed/permanent effects

Some permanent consumables or account flags may not have a documented direct API field. They must be handled per mechanic:

- if an authoritative profile flag exists -> automatic
- if inferable without ambiguity -> derived, with documented rule
- if only detectable from a tooltip/in-game UI -> manual

Never infer a consumed permanent item merely because the player once owned the item.

## Data status vocabulary

Every profile-backed field should carry one of these statuses:

- `AUTO`: directly read from a verified API field.
- `DERIVED`: computed deterministically from verified API fields and a sourced formula/table.
- `AUTO_CANDIDATE`: likely exposed but current path/semantics not yet verified.
- `MANUAL`: cannot currently be derived reliably.
- `EXTERNAL`: requires a source other than official Hypixel profile/Garden data.
- `HIDDEN`: API setting disabled or data unavailable.
- `UNKNOWN`: parser does not understand the data yet.

The UI should show data provenance rather than making automatic and manual values look identical.

## Required profile adapter output

All upstream APIs should normalize into one internal structure instead of leaking raw Hypixel field names throughout the UI.

Example target shape:

```js
{
  identity: {
    playerUuid,
    playerName,
    profileId,
    profileName,
    gameMode,
    selected
  },
  sync: {
    fetchedAt,
    source,
    warnings: []
  },
  skills: {
    farming: { xp, level, cap, status: 'DERIVED' }
  },
  garden: {
    xp,
    level,
    unlockedPlots: [],
    cropUpgrades: {},
    resourcesCollected: {},
    visitors: {},
    uniqueVisitors: 0
  },
  accountUpgrades: {},
  items: [],
  pets: [],
  buffs: {},
  unknown: []
}
```

## Raw JSON import milestones

### Phase A

Import `/v2/skyblock/garden` JSON:

- crop upgrades
- plots
- Garden XP metadata
- visitors
- resources collected

### Phase B

Import `/v2/skyblock/profiles` or `/v2/skyblock/profile` JSON:

- select member/profile
- Farming Skill XP
- community upgrades
- pets
- inventories

### Phase C

Decode NBT and normalize farming items:

- armor/equipment
- tools
- enchantments
- reforges
- gemstones
- counters/levels
- pet items
- accessories

## Market-data automation

Market state is not profile state but should also be automatic.

### Bazaar

Use Hypixel Bazaar data and store:

- product ID
- instant-sell estimate
- sell-order estimate
- instant-buy estimate
- buy-order estimate
- volume/liquidity indicators
- fetched timestamp

### Auction House

Do not value unique gear from the cheapest active listing alone.

Required later:

- canonicalized item signature
- comparable auction samples
- recent ended sale observations where available
- outlier filtering
- confidence level

## Sources researched for this matrix

- Hypixel Public API documentation: `https://api.hypixel.net/`
- Hypixel Developer Dashboard/API policy: `https://developer.hypixel.net/`
- Hypixel PublicAPI discussion #618, missing/added Farming Fortune API data
- Hypixel PublicAPI discussion #642, API additions including Garden data and Booster Cookie flag
- Hypixel PublicAPI discussion #621, island/Garden world data limitations
- SkyCrypt Backend repository, current architecture demonstrating server-held Hypixel API key and processed profile data
